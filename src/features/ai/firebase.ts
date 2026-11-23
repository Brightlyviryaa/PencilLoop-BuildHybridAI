import type { FirebaseApp } from 'firebase/app'
import { appCheckConfig, firebaseConfig, isFirebaseConfigured } from './config'

/**
 * Lazily initialises Firebase + App Check the first time any cloud-capable
 * feature is used. The game itself never waits on this.
 */
let appPromise: Promise<FirebaseApp | null> | null = null
let appCheckState: 'off' | 'active' | 'error' = 'off'
let appCheckError: string | null = null

declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined
}

export function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null)
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps } = await import('firebase/app')
      const app = getApps()[0] ?? initializeApp(firebaseConfig as Required<typeof firebaseConfig>)
      await initAppCheck(app)
      return app
    })()
  }
  return appPromise
}

async function initAppCheck(app: FirebaseApp) {
  try {
    const { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } = await import('firebase/app-check')
    if (appCheckConfig.debugToken) {
      // Development only: registers a private debug token from .env.local.
      globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckConfig.debugToken
    }
    const siteKey = appCheckConfig.siteKey
    if (!siteKey && !appCheckConfig.debugToken) {
      appCheckState = 'off'
      return
    }
    // When only a debug token exists, the provider is never contacted, but
    // App Check still requires one to be passed.
    const key = siteKey ?? 'debug-only'
    const provider =
      appCheckConfig.provider === 'recaptcha-v3' ? new ReCaptchaV3Provider(key) : new ReCaptchaEnterpriseProvider(key)
    initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true })
    appCheckState = 'active'
  } catch (e) {
    appCheckState = 'error'
    appCheckError = e instanceof Error ? e.message : String(e)
  }
}

export function getAppCheckStatus() {
  return { state: appCheckState, error: appCheckError }
}

/**
 * Public Firebase web configuration, read from Vite env vars.
 * These values identify the project; they are not server secrets.
 * Never put service-account keys or App Check debug tokens in the repo.
 */
const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
}

export type AppCheckProviderKind = 'recaptcha-enterprise' | 'recaptcha-v3'

export const appCheckConfig = {
  provider: ((env.VITE_APPCHECK_PROVIDER as string | undefined) ?? 'recaptcha-enterprise') as AppCheckProviderKind,
  siteKey: env.VITE_APPCHECK_SITE_KEY as string | undefined,
  /** Dev-only. Set in .env.local (gitignored), never committed. */
  debugToken: env.DEV ? (env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined) : undefined,
}

/**
 * Cloud fallback model. Default is the documented hybrid default for
 * Firebase JS SDK v13 (`gemini-3.5-flash-lite`). Override without code
 * changes via VITE_AI_CLOUD_MODEL.
 */
export const CLOUD_MODEL = (env.VITE_AI_CLOUD_MODEL as string | undefined) || 'gemini-3.5-flash-lite'

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

export function isAppCheckConfigured(): boolean {
  return Boolean(appCheckConfig.siteKey) || Boolean(appCheckConfig.debugToken)
}

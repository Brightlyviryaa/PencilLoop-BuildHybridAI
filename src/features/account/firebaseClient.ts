import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { getFirebaseApp } from '../ai/firebase'

/**
 * Lazy Firebase Auth + Firestore. Nothing here runs until the account layer
 * asks for it, and the game never waits on it.
 */
export interface Services {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  A: typeof import('firebase/auth')
  F: typeof import('firebase/firestore')
}

const env = import.meta.env
/** Set VITE_USE_EMULATORS=true (tests / local dev) to talk to the Emulator Suite. */
export const USE_EMULATORS = env.VITE_USE_EMULATORS === 'true'

let services: Promise<Services | null> | null = null

export function getServices(): Promise<Services | null> {
  if (!services) {
    services = (async () => {
      const app = await getFirebaseApp()
      if (!app) return null
      const [A, F] = await Promise.all([import('firebase/auth'), import('firebase/firestore')])
      // getAuth() in the browser persists the session in IndexedDB, so the
      // same (anonymous) user is restored after a refresh.
      const auth = A.getAuth(app)
      const db = F.getFirestore(app)
      if (USE_EMULATORS) {
        A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
        F.connectFirestoreEmulator(db, '127.0.0.1', 8080)
      }
      return { app, auth, db, A, F }
    })()
    services.catch(() => {
      services = null
    })
  }
  return services
}

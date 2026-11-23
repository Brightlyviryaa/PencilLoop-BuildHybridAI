import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

/**
 * Runs against the Firestore emulator:
 *   npm run test:rules
 */
let env: RulesTestEnvironment

const prefs = { muted: false, volume: 0.7, motion: 'system', cloudPhotos: false, cloudHints: false, autoPrepareAI: true }
const user = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 2,
  accountType: 'anonymous',
  ageGroup: 'under13',
  language: 'id',
  onboardingCompleted: true,
  preferences: prefs,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
})
const level = (over: Record<string, unknown> = {}) => ({
  completed: true,
  stars: 3,
  bestScore: 380,
  bestMoves: 3,
  attempts: 2,
  completedAt: Timestamp.fromMillis(Date.now() - 1000),
  updatedAt: serverTimestamp(),
  ...over,
})

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pencilloop',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await env.clearFirestore()
})

const as = (uid: string) => env.authenticatedContext(uid).firestore()

describe('users/{uid}', () => {
  it('owner can create, read and update their own profile', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice'), user()))
    await assertSucceeds(getDoc(doc(db, 'users/alice')))
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), { language: 'en', updatedAt: serverTimestamp() }))
  })

  it('nobody can read or write another uid', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), user()))
    const bob = as('bob')
    await assertFails(getDoc(doc(bob, 'users/alice')))
    await assertFails(setDoc(doc(bob, 'users/alice'), user()))
    await assertFails(deleteDoc(doc(bob, 'users/alice')))
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')))
  })

  it('collections cannot be listed', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), user()))
    await assertFails(getDocs(collection(as('alice'), 'users')))
  })

  it('children cannot store a name or gender; adults can store a short nickname', async () => {
    await assertFails(setDoc(doc(as('kid'), 'users/kid'), user({ displayName: 'Rara' })))
    await assertFails(setDoc(doc(as('kid'), 'users/kid'), user({ gender: 'female' })))
    await assertFails(setDoc(doc(as('teen'), 'users/teen'), user({ ageGroup: 'teen', displayName: 'Budi' })))
    await assertSucceeds(setDoc(doc(as('mom'), 'users/mom'), user({ ageGroup: 'adult', displayName: 'Mama', gender: 'female' })))
    await assertFails(setDoc(doc(as('dad'), 'users/dad'), user({ ageGroup: 'adult', displayName: 'x'.repeat(21) })))
  })

  it('rejects unknown fields such as a birthday, and bad values', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice'), user({ dateOfBirth: '2015-01-01' })))
    await assertFails(setDoc(doc(db, 'users/alice'), user({ language: 'fr' })))
    await assertFails(setDoc(doc(db, 'users/alice'), user({ preferences: { ...prefs, volume: 3 } })))
    await assertFails(setDoc(doc(db, 'users/alice'), user({ createdAt: Timestamp.fromMillis(0) })))
  })

  it('createdAt cannot change after creation', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice'), user()))
    await assertFails(updateDoc(doc(db, 'users/alice'), { createdAt: Timestamp.fromMillis(0), updatedAt: serverTimestamp() }))
  })
})

describe('users/{uid}/progress/{levelId}', () => {
  it('owner can save known levels with valid values', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice/progress/first-steps'), level()))
    await assertSucceeds(setDoc(doc(db, 'users/alice/progress/winding-road'), level({ completed: false, stars: 0, bestMoves: null, completedAt: null })))
    await assertSucceeds(getDocs(collection(db, 'users/alice/progress')))
  })

  it('rejects unknown levels, out-of-range values and other users', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice/progress/secret-level'), level()))
    await assertFails(setDoc(doc(db, 'users/alice/progress/first-steps'), level({ stars: 4 })))
    await assertFails(setDoc(doc(db, 'users/alice/progress/first-steps'), level({ completed: false, stars: 2 })))
    await assertFails(setDoc(doc(db, 'users/alice/progress/first-steps'), level({ note: 'hi' })))
    await assertFails(setDoc(doc(as('bob'), 'users/alice/progress/first-steps'), level()))
    await assertSucceeds(setDoc(doc(db, 'users/alice/progress/first-steps'), level()))
    await assertFails(getDocs(collection(as('bob'), 'users/alice/progress')))
  })
})

describe('users/{uid}/achievements/{badgeId}', () => {
  it('badges can be created once and never edited', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice/achievements/first-win'), { unlockedAt: Timestamp.now() }))
    await assertFails(setDoc(doc(db, 'users/alice/achievements/first-win'), { unlockedAt: Timestamp.fromMillis(0) }))
    await assertFails(setDoc(doc(db, 'users/alice/achievements/made-up'), { unlockedAt: Timestamp.now() }))
    await assertFails(setDoc(doc(as('bob'), 'users/alice/achievements/explorer'), { unlockedAt: Timestamp.now() }))
  })

  it('a full sync batch (as the app writes it) is accepted', async () => {
    const db = as('alice')
    const b = writeBatch(db)
    b.set(doc(db, 'users/alice'), user(), { merge: true })
    b.set(doc(db, 'users/alice/progress/first-steps'), level())
    b.set(doc(db, 'users/alice/achievements/first-run'), { unlockedAt: Timestamp.now() })
    await assertSucceeds(b.commit())
  })

  it('the owner can delete everything', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice'), user()))
    await assertSucceeds(setDoc(doc(db, 'users/alice/progress/first-steps'), level()))
    const b = writeBatch(db)
    b.delete(doc(db, 'users/alice/progress/first-steps'))
    b.delete(doc(db, 'users/alice'))
    b.delete(doc(db, 'progress/alice'))
    await assertSucceeds(b.commit())
  })
})

describe('legacy progress/{uid}', () => {
  it('is read/delete only for the owner', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'progress/alice'), { schemaVersion: 1, levels: {}, updatedAt: 1 })
    })
    await assertSucceeds(getDoc(doc(as('alice'), 'progress/alice')))
    await assertFails(getDoc(doc(as('bob'), 'progress/alice')))
    await assertFails(setDoc(doc(as('alice'), 'progress/alice'), { schemaVersion: 1, levels: {}, updatedAt: 2 }))
    await assertSucceeds(deleteDoc(doc(as('alice'), 'progress/alice')))
  })
})

describe('everything else', () => {
  it('is denied', async () => {
    await assertFails(setDoc(doc(as('alice'), 'leaderboard/alice'), { score: 1 }))
    await assertFails(getDoc(doc(as('alice'), 'leaderboard/alice')))
  })
})

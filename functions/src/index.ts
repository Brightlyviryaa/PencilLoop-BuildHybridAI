/**
 * PencilLoop guardian consent workflow (Cloud Functions for Firebase, v2).
 *
 * NOT DEPLOYED in the hackathon prototype: Cloud Functions needs the Blaze
 * plan, and sending email needs a transactional mail integration. This code
 * uses the official "Trigger Email from Firestore" extension (it reads the
 * `mail` collection). Install it, then set CONSENT_APP_URL and OPERATOR_NAME,
 * deploy, and build the web app with VITE_CONSENT_FUNCTIONS=1.
 *
 * Collections (all Admin SDK only; Firestore rules deny client access):
 *   consentRequests/{requestId}  status, tokenHash, clientKeyHash, contact (deleted after answer/expiry)
 *   guardianConsents/{uid}       { status, requestId, verifiedAt } readable by the player, never writable
 *   mail/{id}                    outbox for the Trigger Email extension
 *
 * Guardian verification is proportional for a prototype: control of the
 * guardian's email inbox plus an explicit declaration of parental authority.
 * Stronger verification (for example identity checks) must be decided with
 * legal review before a public launch. See docs/PRIVACY.md.
 */
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { approvalEmail, effectiveStatus, newToken, nextStatus, REQUEST_TTL_MS, sha256, underRateLimit, validateRequest, type ConsentStatus } from './logic.js'

initializeApp()
const db = getFirestore()
const REGION = 'asia-southeast2'
const opts = { region: REGION, enforceAppCheck: true }
const APP_URL = process.env.CONSENT_APP_URL ?? 'https://pencilloop-f476c.web.app'
const OPERATOR = process.env.OPERATOR_NAME ?? '[OPERATOR NAME - configure before release]'

/** Child's device asks a guardian. No account exists yet. */
export const requestGuardianConsent = onCall(opts, async (req) => {
  const v = validateRequest(req.data ?? {})
  if ('error' in v) throw new HttpsError('invalid-argument', v.error)
  const now = Date.now()
  const since = Timestamp.fromMillis(now - 24 * 60 * 60 * 1000)
  const [byDevice, byEmail] = await Promise.all([
    db.collection('consentRequests').where('clientKeyHash', '==', v.clientKeyHash).where('createdAt', '>', since).get(),
    db.collection('consentRequests').where('emailHash', '==', sha256(v.email)).where('createdAt', '>', since).get(),
  ])
  const times = (q: FirebaseFirestore.QuerySnapshot) => q.docs.map((d) => (d.get('createdAt') as Timestamp).toMillis())
  if (!underRateLimit(times(byDevice), now) || !underRateLimit(times(byEmail), now)) throw new HttpsError('resource-exhausted', 'rate')

  const token = newToken()
  const ref = db.collection('consentRequests').doc()
  const link = `${APP_URL}/guardian#${token}`
  const mail = approvalEmail(v.lang, { approve: link, privacy: `${APP_URL}/privacy`, terms: `${APP_URL}/terms` }, OPERATOR)
  await db.runTransaction(async (tx) => {
    tx.set(ref, {
      status: 'pending' satisfies ConsentStatus,
      tokenHash: sha256(token),
      clientKeyHash: v.clientKeyHash,
      emailHash: sha256(v.email),
      // Contact kept only while the request is open (see cleanup below). Never used for marketing.
      contact: { phone: v.phone, email: v.email },
      ageGroup: v.ageGroup,
      lang: v.lang,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + REQUEST_TTL_MS),
    })
    tx.set(db.collection('mail').doc(), { to: v.email, message: mail })
  })
  return { requestId: ref.id }
})

async function requestFor(requestId: unknown, clientKey: unknown) {
  if (typeof requestId !== 'string' || typeof clientKey !== 'string') throw new HttpsError('invalid-argument', 'args')
  const snap = await db.collection('consentRequests').doc(requestId).get()
  if (!snap.exists || snap.get('clientKeyHash') !== sha256(clientKey)) throw new HttpsError('not-found', 'request')
  return snap
}

/** Child's device polls the status (the only source that can say "verified"). */
export const getGuardianConsentStatus = onCall(opts, async (req) => {
  const snap = await requestFor(req.data?.requestId, req.data?.clientKey)
  return { status: effectiveStatus(snap.get('status'), (snap.get('expiresAt') as Timestamp).toMillis(), Date.now()) }
})

/** Guardian answers from the email link. Needs the explicit declaration of parental authority. */
export const respondGuardianConsent = onCall(opts, async (req) => {
  const { token, decision, attested } = req.data ?? {}
  if (typeof token !== 'string' || (decision !== 'approve' && decision !== 'reject' && decision !== 'revoke')) throw new HttpsError('invalid-argument', 'args')
  if (decision === 'approve' && attested !== true) throw new HttpsError('failed-precondition', 'attestation')
  const q = await db.collection('consentRequests').where('tokenHash', '==', sha256(token)).limit(1).get()
  if (q.empty) throw new HttpsError('not-found', 'token')
  const ref = q.docs[0].ref
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref)
    const current = effectiveStatus(s.get('status'), (s.get('expiresAt') as Timestamp).toMillis(), Date.now())
    const next = nextStatus(current, decision)
    if (!next) throw new HttpsError('failed-precondition', current)
    tx.update(ref, {
      status: next,
      answeredAt: FieldValue.serverTimestamp(),
      attested: decision === 'approve' ? true : (s.get('attested') ?? false),
      // The guardian's contact is no longer needed once they answered.
      contact: FieldValue.delete(),
    })
    const uid = s.get('uid') as string | undefined
    if (uid) tx.set(db.collection('guardianConsents').doc(uid), { status: next, requestId: ref.id, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  })
  return { ok: true }
})

/** After verification, bind the consent to the child's new anonymous account. */
export const claimGuardianConsent = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'auth')
  const snap = await requestFor(req.data?.requestId, req.data?.clientKey)
  if (snap.get('status') !== 'verified') throw new HttpsError('failed-precondition', 'not-verified')
  const bound = snap.get('uid') as string | undefined
  if (bound && bound !== req.auth.uid) throw new HttpsError('failed-precondition', 'already-claimed')
  await db.runTransaction(async (tx) => {
    tx.update(snap.ref, { uid: req.auth!.uid })
    tx.set(db.collection('guardianConsents').doc(req.auth!.uid), { status: 'verified', requestId: snap.id, verifiedAt: FieldValue.serverTimestamp() })
  })
  return { ok: true }
})

/** Daily cleanup: expire old requests and delete guardian contact details that are no longer needed. */
export const expireGuardianRequests = onSchedule({ region: REGION, schedule: 'every 24 hours' }, async () => {
  const old = await db.collection('consentRequests').where('status', '==', 'pending').where('expiresAt', '<', Timestamp.now()).limit(400).get()
  const batch = db.batch()
  old.docs.forEach((d) => batch.update(d.ref, { status: 'expired', contact: FieldValue.delete() }))
  await batch.commit()
})

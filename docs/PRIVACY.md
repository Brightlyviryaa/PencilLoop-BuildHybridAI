# Privacy and child safety

PencilLoop is used by children. This page records what is collected, where it lives, and which protections are still **release blockers** before a public launch to children.

## What is stored where

| Data | On the device (localStorage) | In Firestore (`users/{uid}`) | Sent to AI |
|---|---|---|---|
| Nickname | Yes | **Adults only** (`ageGroup == 'adult'`) | Never |
| Birthday | Yes (to keep the age group current) | **Never** (rules reject `dateOfBirth`) | Never |
| Gender (optional, skippable) | Yes | **Adults only** | Never |
| Age group (`under13` / `teen` / `adult`) | Yes | Yes (needed to gate features) | Never |
| Language, sound, motion, AI permissions | Yes | Yes (`preferences`) | Never |
| Level results, badges | Yes | Yes (`progress/*`, `achievements/*`) | Never |
| Photos of paper plans | Memory only, dropped after scanning | Never | Only with explicit consent, or on-device |
| Clue context | n/a | Never | A short text description of the maze and blocks |
| Email | Only for Google-linked accounts (Firebase Auth) | Never in Firestore | Never |

- Firestore Security Rules (`firestore.rules`) only let a signed-in user read or write their **own** documents, validate every field, reject unknown fields, and refuse a nickname or gender unless `ageGroup == 'adult'`. They are covered by `npm run test:rules` (13 tests on the emulator).
- No analytics, no ads, no tracking. Firebase AI Logic monitoring is disabled for this project.
- **Remote Config** is fetched only right before an AI request that the player allowed to use the cloud. It uses a Firebase Installations ID (a random app-instance ID, no personal data) and only returns the cloud model settings. Players in local-only mode, including every child without verified guardian consent, never contact it.
- **Delete my data** (Profile) deletes the Firestore documents, the Firebase Auth account and everything on the device.
- Children (under 13) cannot link a Google account; the app shows "Ask a grown-up" instead.

## Anonymous IDs

A Firebase anonymous account is created only when onboarding finishes. It is a random persistent identifier used solely to save game progress and settings (support for internal operations). It is not used for advertising or profiling.

## Guardian consent (v0.5)

| Player | Cloud account / Firestore | Cloud AI (photos, clues) | Google linking |
|---|---|---|---|
| Adult (18+) | Yes | With the player's own permission | Yes |
| Under 18, consent **not verified** (required, pending, rejected, revoked) | **No.** Local-only; an existing cloud save is left untouched and can be deleted | **No.** On-device AI only | No |
| Under 18, consent **verified** by the backend | Yes | With permission | 13+ only (Google accounts need 13+) |

- Status values: `not_required`, `required`, `pending`, `verified`, `rejected`, `revoked` (`src/features/consent/consent.ts`).
- Only the backend can mark consent as verified: `guardianConsents/{uid}` is read-only for players and Firestore rules refuse a minor's writes without it (`npm run test:rules`).
- The guardian gives a phone number and an email. A phone number alone cannot receive the email, so the email is required for the link; SMS verification is not configured. Contacts are used only for the request (never marketing), are not stored on the child's device, and are deleted once the request is answered or expires (7 days).
- The email link token is 256-bit random; only its SHA-256 hash is stored. Requests are limited to 3 per day per device and per email.
- Guardian verification in this prototype = control of the guardian's inbox + an explicit declaration of parental authority. Whether this is sufficient must be decided with legal review.

## Release blockers (not solved yet)

These must be resolved, with legal review, before PencilLoop is offered publicly to children:

1. **Verifiable parental consent.** The flow is implemented (client, rules, Cloud Functions) but the backend is **not deployed** (needs Blaze + an email provider), and the verification method needs legal review. Original note: there was no verified guardian consent flow (COPPA for under-13s in the US; Indonesia's UU PDP No. 27/2022 Art. 25 and PP 17/2025 treat everyone under 18 as a child whose data needs parent/guardian consent; GDPR Art. 8 for the EU). A checkbox is not treated as consent. Until a real flow exists, the app is designed so that **no personal data of minors leaves the device** (only an anonymous ID, age group, progress and settings).
2. **Google linking for teens (13-17).** Allowed, with an in-app note to ask a parent first. Under Indonesian law this may still require verified guardian consent because Firebase Auth stores the Google email. Decide with legal review whether to restrict linking to adults.
3. **Parent-facing privacy policy and contact.** The in-app "Privacy for families" summary is not a full privacy policy. A published policy with a contact for data requests is required.
4. **Google sign-in support email.** The Firebase Google provider shows the project support email on the consent screen. Use a dedicated support address before launch.
5. **Firestore App Check enforcement** is not turned on yet (AI Logic enforcement is). Turn it on in Firebase console > App Check once production traffic is confirmed.

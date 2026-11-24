<p align="center"><img src="public/assets/pencilloop-wordmark.png" alt="PencilLoop" width="420"></p>

<p align="center"><b>Draw it. Run it. Fix it.</b> · Prototype <b>v0.5.1</b> (<a href="CHANGELOG.md">changelog</a>)<br>A playful coding adventure for kids 8–14, in <b>Bahasa Indonesia</b> and <b>English</b>, built for the Google <b>#BuildHybridAI</b> 2026 hackathon.</p>

Kids guide **Pip** the robot through mazes with visual Move / Turn / Repeat blocks (drag them around, even into and out of loops), or **draw the plan on paper and photograph it** with the in-app camera. Firebase AI Logic **hybrid inference** turns the photo into editable blocks (Gemini Nano on-device when Chrome provides it, Gemini in the cloud only with permission). A deterministic simulator runs the program, shows exactly which step went wrong, and an AI clue nudges the child without revealing the answer.

- **Live demo:** https://pencilloop-f476c.web.app (Firebase Hosting)
- **Docs:** [Architecture](docs/ARCHITECTURE.md) · [Privacy & release blockers](docs/PRIVACY.md) · [Testing](docs/TESTING.md) · [Scan accuracy](docs/scan-accuracy.md) · [Demo script](docs/DEMO_SCRIPT.md) · [Devpost text](docs/DEVPOST.md)

| Desktop 1440×900 | Phone 360×800 |
|---|---|
| ![Home on desktop](docs/screenshots/home-1440x900.png) | ![Home on a phone](docs/screenshots/home-360x800.png) |
| ![Game workspace on desktop](docs/screenshots/play-1440x900.png) | ![Full-screen plan editor on a phone](docs/screenshots/plan-360x800.png) |
| ![Level map on desktop](docs/screenshots/levels-1440x900.png) | ![Map view on a phone](docs/screenshots/play-360x800.png) |

## Why PencilLoop

**The problem.** Indonesia has made *Coding and AI* an elective subject from Grade 5 of primary school, but many classrooms have one shared laptop, patchy internet and costly mobile data, and children's data needs real protection. Most coding games assume one screen per child and an always-on cloud connection.

**Our answer.** Children plan on **paper first** (an "unplugged" activity a whole class can do at once), then one device photographs the plan and turns it into editable code blocks. A deterministic simulator runs the program and shows the exact step that went wrong; an AI clue nudges without revealing the answer. Everything works in **Bahasa Indonesia and English**.

**Why hybrid inference is the core, not a bonus.**

| Need | How Firebase AI Logic hybrid inference answers it |
|---|---|
| Children's privacy | Without cloud permission the SDK runs in `ONLY_ON_DEVICE` mode: the photo and the clue context never leave the laptop. Children under 18 stay in this mode until a guardian's consent is verified. |
| No cost, no data plan | On a school Chrome laptop, Gemini Nano reads the paper plan and writes clues for free and offline once the model is downloaded. |
| Works on every device | Phones and laptops without a local model fall back to Gemini in the cloud (`PREFER_ON_DEVICE`), only with permission. Same code, same prompts, same JSON schema. |
| Honesty | Every AI answer shows where it ran, read from the SDK's `inferenceSource`, never guessed. |
| Control without redeploys | Firebase **Remote Config** picks the cloud model and its temperature and can pause the cloud fallback (every request then stays on-device). |

## For judges: try it in 3 minutes

1. Open **https://pencilloop-f476c.web.app** in **Chrome on a desktop**. Onboarding takes 30 seconds.
   - **Birthday decides the privacy mode.** Enter an **adult birthday (18+)** to see the cloud fallback. A child's birthday turns on the strict mode: on-device AI only, nothing about the child is sent anywhere.
2. **On-device (Gemini Nano):** enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, relaunch Chrome. Your first tap in PencilLoop starts the model download in the background (status in *Profile > AI information*). With cloud permission off, a clue or scan shows the badge **AI on this device** (*Answered on this device* in *AI information*).
3. **Cloud fallback:** on a phone, or in Chrome without the flag, open Level 1, press *Run*, then **Give me a clue** (or **Scan**) and allow it just this once. The badge shows **AI over the internet** (*Answered in the cloud*).
4. **Scan a paper plan:** draw "move 3, turn left, move 3" on paper, or use a sample image such as [`fixtures/scan/01-words-basic.jpg`](fixtures/scan/01-words-basic.jpg). Review the blocks, then run them.
5. **Offline:** DevTools > Network > Offline. The game, editor and built-in tips keep working.
6. **Where the code is:** [`src/features/ai/hybrid.ts`](src/features/ai/hybrid.ts) (Firebase AI Logic hybrid model, `InferenceMode`, `initializeDeviceModel`, `inferenceSource`), [`routing.ts`](src/features/ai/routing.ts) (privacy routing), [`remoteConfig.ts`](src/features/ai/remoteConfig.ts), [`firebase.ts`](src/features/ai/firebase.ts) (App Check).

### Firebase products used

| Product | Used for |
|---|---|
| **Firebase AI Logic** (hybrid inference, Gemini Developer API) | Reading photographed paper plans (multimodal) and writing clues, on-device with Gemini Nano or in the cloud |
| **App Check** (reCAPTCHA Enterprise) | Protects every AI Logic request |
| **Remote Config** | Cloud model name, temperatures and a cloud kill switch (`remoteconfig.template.json`) |
| **Authentication** (Anonymous + Google) | One account per player with no email or password; optional Google linking for adults |
| **Cloud Firestore** + Security Rules | Progress, badges and settings per user; rules block minors' data until consent is verified |
| **Hosting** | The live app |

## What's new in v0.5

- **Mobile game workspace:** a big Map view plus a full-screen **Plan editor** (no more cramped tray). Run sends you straight back to the maze.
- **Restructure your program:** drag blocks you already placed **into and out of Repeat loops**, between loops and up or down (mouse, or hold-and-drag on touch). The same moves work with taps (*Into Repeat*, *Take out*, *Up*, *Down*) and keyboard (Alt+Arrows). **Undo / Redo** everywhere.
- **Pip, redrawn:** an original hover robot with expressions (thinking, bump, cheering) on themed worlds (*Training Island*, *Loop Garden*).
- **First-time tutorial** with optional voice in Indonesian or English, a journey-style level map, a new victory moment and a game-like Progress page.
- **In-app camera** for scanning paper plans, with framing guide, retake and fallbacks.
- **Child privacy by design:** players under 18 stay **local-only** until a parent's consent is verified by the backend; Firestore rules enforce it.

## Features

- **Onboarding that feels like a game:** language, nickname, birthday (no future dates), optional gender (skippable, never changes access), a note for grown-ups, then a **short interactive tutorial with Pip** (optional voice, skippable, replayable from Settings) and level 1. No email or password.
- **Two languages, instantly:** every screen, tip, error, badge and AI clue in Bahasa Indonesia or English. Browser language is the default; switching never reloads. Copy lives in one file per area under `src/i18n/`.
- **Mobile-first navigation:** 4 thumb-reachable tabs (Home, Play, Progress, Profile) with an animated active pill; a full sidebar on desktop (compact icon rail at 1024-1279px).
- **6 levels in 2 worlds** (*Training Island*, *Loop Garden*) on a journey-style level map with unlock animations. Every level's 3-star target is proven reachable by a brute-force test. Stars, points (stars + tidy bonus + first-try bonus), best score, fewest blocks.
- **9 badges** that reward learning (fix after a bump, use a clue then win, use a loop, scan a paper plan), shown as toasts and in a badge gallery.
- **Victory moments:** confetti, stars popping in with sound, score count-up, "Level 2 unlocked!".
- **Motion & sound:** shared motion tokens (Motion for React), page/tab/sheet transitions, button press depth, tooltips; original Web Audio sounds (no files) with on/off and volume. Reduced motion is respected everywhere.
- **Visual editor:** add, edit (steppers), delete, and **restructure**: drag existing blocks into, out of and between Repeat loops (dnd-kit, hold-to-drag on touch, auto-scroll, drop indicator), or use the tap menu (Up, Down, Into Repeat, Take out) and Alt+Arrow keys. **Undo / Redo.** On phones the editor is a full-screen workspace; the maze gets the whole Map view.
- **Deterministic interpreter:** validated AST (≤30 blocks, ≤60 moves, repeat depth ≤2) → atomic trace → outcome. Run / Pause / Step / Reset / 2× speed; the failing step is highlighted.
- **Scan your plan** and **Give me a clue** with privacy routing and honest source badges from `result.response.inferenceSource`.
- **AI prepares itself:** on supported Chrome desktops the on-device model starts downloading in the background from the first tap (`initializeDeviceModel()`); play never waits, and the cloud answers meanwhile (with permission). Technical status lives in *Profile > AI information*.
- **Anonymous-first accounts:** a Firebase anonymous account is created after onboarding; progress, badges and settings sync to Firestore per UID. **Save progress with Google** links the same UID (`linkWithPopup`), with a clear choice when that Google account already has a save. Sign-out and *Delete my data* are in Profile.
- **Child privacy:** players under 18 are local-only until verified guardian consent (no account, no sync, no cloud AI); nickname, birthday and gender never leave the device. See [PRIVACY.md](docs/PRIVACY.md), the in-app Privacy policy and Terms, and the open release blockers.

## Tech stack

React 19 · TypeScript 7 · Vite 8 · Tailwind CSS 4 · Motion 14 · React Router 8 · Zod 4 · Firebase JS SDK 13 (`firebase/ai`, App Check, Remote Config, Auth, Firestore) · Vitest 5 · Playwright 1.65 · oxlint · Firebase Hosting.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173 — the game works without any Firebase config
```

| Script | What it does |
|---|---|
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run typecheck` / `npm run lint` | TypeScript / oxlint (warnings fail) |
| `npm test` | Unit tests (Vitest): interpreter, editor tree, par reachability, consent, consent backend logic, i18n, AI routing, Remote Config |
| `npm run test:rules` | Firestore rules tests on the emulator (17, including guardian consent) |
| `npm run test:e2e` | Playwright E2E (55): desktop, phone (incl. real touch drag and fake camera), viewport sweep, emulator account journeys |
| `npm run firebase:emulators` / `npm run dev:emu` | Auth + Firestore emulators and a dev server wired to them |
| `npm run deploy` | Build + `firebase deploy --only hosting,firestore,remoteconfig` (rules, indexes, Remote Config template, hosting; never the functions) |

## Firebase setup (to enable AI)

1. Create or choose a Firebase project and add a **Web app**. Copy `.env.example` → `.env.local` and fill in the `VITE_FIREBASE_*` values.
2. **AI Logic:** Firebase console → AI Logic → *Get started* → **Gemini Developer API** (works on the free Spark plan). This also turns on App Check enforcement for AI Logic.
3. **App Check:** in Google Cloud → Security → Fraud Defense (reCAPTCHA), create a **Web** key for your hosting domains, then register it in Firebase → App Check → Apps. Put the site key in `VITE_APPCHECK_SITE_KEY`.
   For local dev, add a debug token under *Manage debug tokens* and put it in `.env.local` as `VITE_APPCHECK_DEBUG_TOKEN` (never commit it).
4. **Accounts & progress:** Authentication → enable **Anonymous** and **Google**; create a Firestore database; deploy `firestore.rules`.
5. `npx firebase login` → `npm run deploy`.

Model: the cloud fallback defaults to `gemini-3.5-flash-lite` (the documented hybrid default for SDK v13). Change it live with the Remote Config parameter `ai_cloud_model` (see [`remoteconfig.template.json`](remoteconfig.template.json)), or set the build default with `VITE_AI_CLOUD_MODEL`. `ai_cloud_enabled = false` pauses the cloud fallback for everyone.

### On-device (Gemini Nano) requirements

Chrome **Desktop 139+** with `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` enabled. The download starts automatically in the background after the first tap (it needs a user gesture, so it never starts on page load). Phone browsers are cloud-only, and only with consent. Full steps: [docs/TESTING.md](docs/TESTING.md).

### Guardian consent backend (optional, needed before children can save online)

The consent workflow lives in [`functions/`](functions/src/index.ts) (Cloud Functions v2, region `asia-southeast2`). It is **not deployed** in the hackathon build because it needs the **Blaze** plan and a transactional email integration. To enable it:

1. Upgrade to Blaze, install the **Trigger Email from Firestore** extension (collection `mail`) with your SMTP provider.
2. Set `CONSENT_APP_URL` and `OPERATOR_NAME` for the functions, then `cd functions && npm install && npm run deploy`.
3. Deploy the indexes (`firebase deploy --only firestore`), build the web app with `VITE_CONSENT_FUNCTIONS=1`, and redeploy hosting.

Until then, children play fully on their device and nothing about them is sent to the cloud.

## Release checklist (before a public launch)

- [ ] Replace the GitHub handle in `NOTICE` with the legal name of the rights holder if needed. The Privacy policy and Terms list virya.brightly@gmail.com as the contact; add a legal name / address with `VITE_OPERATOR_NAME` / `VITE_OPERATOR_ADDRESS` if needed.
- [ ] Legal review of the Privacy policy, Terms and the guardian verification method (UU PDP, PP 17/2025, COPPA/GDPR where relevant).
- [ ] Deploy the consent backend and test it end to end with a real inbox.
- [ ] Turn on App Check enforcement for Firestore; never ship a debug token.
- [ ] Dedicated support email for the Google sign-in consent screen.

## Capability matrix

| Device / condition | Cloud consent | Behaviour |
|---|---|---|
| Desktop Chrome, local ready | No | `ONLY_ON_DEVICE` — data stays on the device |
| Desktop Chrome, local ready | Yes | `PREFER_ON_DEVICE` — badge from the response |
| Local model unavailable | No | Explanation + manual editor; **nothing is sent** |
| Local model unavailable | Yes + online | Cloud fallback, `IN_CLOUD` reported |
| Phone browser | No | Full game + editor; AI waits for permission |
| Phone browser | Yes + online | Cloud AI through Firebase AI Logic |
| Offline, no local model | Any | Simulator fully playable; AI unavailable |

## What is verified vs. not

| Item | Status |
|---|---|
| 6 levels solvable, failure fixtures, step limit, invalid programs | ✅ Vitest |
| Indonesian/English dictionaries complete, no em dashes or curly quotes | ✅ Vitest |
| Onboarding, validation, language switch, gameplay, badges, delete-all, offline play | ✅ Playwright |
| No sideways scroll at 320 → 1920 px; bottom tabs on phones, rail on desktop | ✅ Playwright (9 viewports) |
| Anonymous auth, one account per player, refresh keeps UID, Firestore per-UID sync (adults, or minors with verified consent) | ✅ Playwright on Emulator Suite; ✅ live site ("Saved automatically") |
| Drag existing blocks into / out of loops, reorder, undo / redo, cancelled drag changes nothing (mouse **and** real touch long-press) | ✅ Playwright (desktop + phone) and 200 random restructurings in Vitest |
| Full-screen phone plan editor; scan sheet opens on top of it | ✅ Playwright |
| First-time tutorial end to end (Indonesian), including a friendly wrong-turn retry | ✅ Playwright |
| In-app camera: live stream, capture, retake, use photo, stream stopped on close | ✅ Playwright with Chromium's fake camera. ⚠️ Not yet tried on a physical phone |
| Child under 18 without verified consent: no account, nothing in Firestore, guardian contact never stored locally | ✅ Playwright on Emulator Suite |
| Firestore rules incl. guardian consent (minors blocked until verified; status not writable by players) | ✅ `npm run test:rules` (17) |
| Guardian consent backend (Cloud Functions) | ⚠️ implemented and unit tested, **not deployed** (needs Blaze + an email provider) |
| Voice guidance (Web Speech API) | ⚠️ implemented; depends on the device having an Indonesian / English voice; not verified on a physical phone |
| Google linking keeps the UID; conflict asks first and combines; sign-out / sign-in restore | ✅ Playwright on Emulator Suite (popup). ⚠️ Not clicked on the live site with a real Google account |
| Background on-device prep starts from the first tap, game not blocked | ✅ live site, Chrome 157 desktop: preparation started, model downloading |
| Real `IN_CLOUD` clue while the local model downloads (EN and ID) | ✅ live site, 2026-11-23 |
| Real `IN_CLOUD` image scan via Firebase AI Logic + App Check | ✅ 2026-11-23 ([results](docs/scan-accuracy.md)) |
| Remote Config: values validated, kill switch forces `ONLY_ON_DEVICE`, never fetched without cloud consent | ✅ Vitest (template ↔ code parity) |
| Real `ON_DEVICE` (Gemini Nano) response | ⚠️ implemented; the test Chrome was still downloading the model, so **not yet observed** |
| `linkWithRedirect` fallback (popup blocked) | ⚠️ implemented; did not complete in an embedded test browser (third-party storage partitioning). Popup is the primary path |

## Known limitations

- Handwriting can be misread; the review step is mandatory. Measured accuracy is on synthetic fixtures only.
- On-device web inference depends on Chrome's Prompt API availability, flags and a model download.
- "If path is clear" / branching is out of scope for the MVP.
- Voice guidance uses the browser's speech voices; if a device has no Indonesian or English voice, the tutorial shows text only (it says so).
- The guardian consent backend is implemented but not deployed (Blaze plan + email integration needed), so children's online saving and cloud AI stay off in this build.
- AI clue quality varies; replies that look like full solutions are rejected in favour of built-in tips.

## Privacy

No email or password to start, no ads, no analytics. Children's nickname, birthday and gender stay on the device; Firestore holds only an anonymous ID's age group, settings, level results and badges (adults may also keep a nickname and gender). Photos are resized in memory, sent to the cloud **only after explicit consent** (or processed on-device) and discarded after scanning. AI monitoring in Firebase is disabled. Details and open release blockers: [docs/PRIVACY.md](docs/PRIVACY.md).

## Project structure

```
src/
  i18n/           en/ and id/ dictionaries (one file per area), language detection
  app/            shell, bottom tabs + side rail, hooks, device-only prefs, haptics
  components/     Button, Sheet, Toaster, Controls, Robot (Pip), badges, error boundary…
  features/
    maze/         missions, interpreter, validation, scoring, MazeBoard (SVG worlds), themes
    editor/       program tree ops (move / nest / unwrap), PlanEditor (drag + tap), palette
    game/         game runner (animation clock, undo/redo), phone PlanScreen, ribbon, nudges, victory
    scan/         image preparation, in-app camera, ScanSheet (review + consent)
    tutorial/     practice boards and playback for the first-time tutorial
    voice/        Web Speech narrator (voice per language, ducks sound effects)
    consent/      guardian consent state, gate, client API, Profile card
    ai/           Firebase init + App Check, hybrid client, prompts, sanitizer, routing, aiStore
    hints/        trace → hint context, built-in tips, HintPanel
    audio/        Web Audio SFX engine
    account/      anonymous auth, Firestore sync, Google linking, conflict sheet
    profile/      local profile, age groups, settings panel
    progress/     local stores, scoring, achievements
  legal/          privacy policy + terms (ID/EN), operator config
  pages/          Welcome, Tutorial, Home, Levels, Play, Progress, Profile, AI information, Learn, Privacy, Terms, Guardian
functions/        Cloud Functions: guardian consent workflow (not deployed in the prototype)
e2e/              Playwright specs        tests/rules/     Firestore rules tests
fixtures/scan/    20 synthetic plans + manifest
docs/             architecture, testing, demo, accuracy, screenshots
```

## License

Code: [Apache-2.0](LICENSE). See [NOTICE](NOTICE): the Apache license does **not** grant rights to the PencilLoop name, logo or the Pip character as trademarks. All art and sounds are original to this project; third-party packages are under permissive licenses (MIT, Apache-2.0, ISC, BSD-3-Clause, 0BSD; fonts under OFL-1.1).

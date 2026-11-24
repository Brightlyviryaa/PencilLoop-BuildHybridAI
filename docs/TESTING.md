# Testing guide

## Automated

```bash
npm run typecheck   # TypeScript (tsc -b)
npm run lint        # oxlint, warnings fail the run
npm test            # Vitest (123): interpreter + 6 missions, par reachability, editor tree restructuring, sanitizer, privacy router (incl. minors), consent + consent backend logic, i18n completeness, profile validation, achievements
npm run test:rules  # Firestore Security Rules on the emulator (17): owner-only access, schema, child data limits, guardian consent
npm run test:e2e    # Playwright (55): desktop + mobile (touch drag, fake camera, tutorial) + 9-viewport sweep + Auth/Firestore emulator journeys
```

The emulators need Java 21 (`brew install openjdk@21`; the scripts default `JAVA_HOME` to `/opt/homebrew/opt/openjdk@21`).

Playwright runs three projects:

- **desktop / mobile**: Firebase deliberately unconfigured. Covers onboarding (Indonesian, validation), instant language switch, solving levels, badges, failure + built-in tip, scan without uploading, locked levels, AI information page, sound/volume persistence, delete-all, offline play.
- **viewport sweep** (320, 360, 390, 430, 768, 1024, 1280, 1440, 1920): game, home, levels, progress, profile and welcome with no sideways scroll; bottom tabs on phones/tablets, side rail on desktop. Screenshots go to `docs/screenshots/`.
- **emulator** (`e2e/account.spec.ts`, `--mode emulator` build against `demo-pencilloop`): one anonymous account per player, child-safe profile document, refresh restores the same UID, progress/badges saved per UID, Google linking keeps the UID, account conflict asks first and combines, sign-out, sign-in restores the save.

Local development against the emulators: `npm run firebase:emulators` and `npm run dev:emu` (port 5174).

## Real AI checks (manual / scripted)

Requires `.env.local` with the Firebase web config and a registered App Check debug token (see README).

```bash
npm run dev
node scripts/scan-check.mjs "$PWD" fixtures/scan/*.jpg   # real scans through the app UI
```

Results from 2026-11-23 are in [scan-accuracy.md](scan-accuracy.md).

**Profile > AI information** (`/profile/ai`, old link `/about/hybrid` redirects) has a *Send test request* button under *Technical details* that makes one real text request and shows the SDK-reported source.

## Verifying on-device (Gemini Nano) on Chrome Desktop

1. Chrome **139+ on desktop** (Windows, macOS, Linux, ChromeOS Plus). Check `chrome://settings/help`.
2. Open `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, set **Enabled**, relaunch.
3. In DevTools on any page: `await LanguageModel.availability()` →
   - `available`: ready;
   - `downloadable` / `downloading`: just play. The first click in PencilLoop (or **Start the adventure!**) starts the download in the background; watch it in *Profile > AI information*. A manual button is also under *Technical details*.
4. With *Allow cloud* **off**, scan a plan or ask for a clue. The badge must read **Answered on this device** (`inferenceSource = on_device`). Nothing is sent to the cloud (`ONLY_ON_DEVICE`).
5. With *Allow cloud* **on**, requests use `PREFER_ON_DEVICE`; the badge still reflects whatever the SDK reported.

> Status at submission prep time: the `IN_CLOUD` path is verified (see scan-accuracy.md). The `ON_DEVICE` path is implemented with the official SDK but was **not** verified on hardware during development — record it on a supported Chrome Desktop before claiming it in the demo.

## Offline simulation

1. Load the app once, then DevTools → Network → **Offline**.
2. The game keeps working (levels, editor, playback). The AI pill shows *Offline · AI paused*.
3. Scan → explains that nothing was sent; Clue → labelled *Built-in tip · no AI*.

## Cloud fallback & consent

1. In a browser without Gemini Nano (e.g. a phone, or Chrome with the flag disabled), open a level and tap **Scan**.
2. After review, the app shows *Cloud analysis sends this image for processing. Continue?* with **Cancel** / **Allow once**.
3. Cancel → no request (watch the Network tab). Allow once → one `firebasevertexai.googleapis.com` request; badge **Answered in the cloud**.
4. Settings → *Allow cloud photo reading* turns the prompt off for later scans; turning it off again makes the next scan ask again.

## App Check

- **Production:** reCAPTCHA Enterprise site key in `VITE_APPCHECK_SITE_KEY`, registered for `pencilloop-f476c.web.app` and `pencilloop-f476c.firebaseapp.com`. AI Logic enforcement is on (set by the console during AI Logic setup).
- **Development:** put a debug token in `.env.local` as `VITE_APPCHECK_DEBUG_TOKEN` and register it under Firebase console → App Check → Apps → ⋮ → *Manage debug tokens*. It is ignored by production builds.
- To confirm enforcement: remove the debug token locally, restart `npm run dev`, send a test request → it should fail with an App Check error shown in the UI.

## Manual QA checklist

- Viewports: 320×700, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1440×900, 1920×1080: board fully visible, Run reachable, no sideways scroll (automated in `e2e/responsive.spec.ts`).
- Keyboard: Tab through blocks; Enter selects; Alt+↑/↓ reorders; Delete removes; Space runs/pauses (when focus is not on a control); Esc closes dialogs; focus returns to the trigger.
- Reduced motion: Settings → Motion → *Calm* (or OS setting) → robot steps without tweening, no confetti.
- Mute: Settings or speaker icon → no sounds anywhere, including victory.

## Notes for v0.5

- Playwright starts the Firestore emulator for the account project; if a run is interrupted, a leftover Java process can keep port 8080 busy. Stop it with `pkill -f cloud-firestore-emulator` before the next run.
- The camera test uses Chromium's fake camera (`--use-fake-device-for-media-stream`). Try the real camera on a phone over HTTPS before a demo.

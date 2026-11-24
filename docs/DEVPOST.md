# Devpost submission text (draft)

Copy the sections below into the Devpost form. Before submitting:

- [ ] Platform: **Web (Chrome)**.
- [ ] Video: public YouTube link, under 3 minutes, English (see [DEMO_SCRIPT.md](DEMO_SCRIPT.md)). Show one answer with the **AI on this device** badge and one with **AI over the internet**.
- [ ] Only keep the sentence marked *(on-device verified)* if you recorded a real `ON_DEVICE` answer. Otherwise use the alternative sentence next to it.
- [ ] Links: repo https://github.com/Brightlyviryaa/PencilLoop-BuildHybridAI · live app https://pencilloop-f476c.web.app
- [ ] New project, built during the submission period (first commit 2026-11-23), so the "existing app" questions do not apply.

---

## Tagline

Draw it. Run it. Fix it. A bilingual coding adventure where kids plan on paper and hybrid AI turns the photo into code, on-device first.

## Inspiration

Indonesia has made *Coding and AI* an elective subject from Grade 5 of primary school. The classrooms that will teach it often have one shared laptop, patchy internet and expensive mobile data, and they serve children whose data deserves the strictest protection. Most coding games assume one screen per child and a cloud connection that is always on. We wanted a coding game that starts on paper, works on any device, and keeps a child's data on the device by default.

## What it does

Children guide **Pip** the robot through mazes in **Bahasa Indonesia or English**.

- **Plan on paper, then scan.** A whole class can write "move 3, turn left, repeat 2" on paper at the same time. One device photographs the plan, and Firebase AI Logic reads it into editable code blocks. The child always reviews the blocks before running them.
- **Visual block editor.** Move, Turn and Repeat blocks with drag, tap and keyboard controls, nested loops and undo/redo, built mobile-first.
- **Deterministic simulator.** The AI never decides who wins. The simulator runs the program step by step and highlights the exact step where Pip bumped.
- **AI clues that don't spoil.** "Give me a clue" sends only a short text description of the maze, the child's program and the simulator result. The clue asks a guiding question; replies that list a full solution are rejected and replaced by a built-in tip.
- **Honest AI badges.** Every AI answer says whether it ran on the device or in the cloud, read from the SDK's `inferenceSource`.
- **A complete game.** Interactive tutorial with optional voice, 6 levels in 2 worlds, stars and points, 9 badges that reward fixing mistakes, a progress page, anonymous accounts with optional Google linking, offline play.

## How we used Firebase AI Logic

Hybrid inference is the core of the design, not a fallback added at the end:

- Both AI features (multimodal plan scanning and text clues) use `getGenerativeModel()` from `firebase/ai` with `GoogleAIBackend`, one shared prompt and one JSON schema (`responseJsonSchema` in the cloud, `responseConstraint` for Gemini Nano).
- **The inference mode is a privacy decision.** A small, unit-tested routing function picks the mode for each request. Without cloud permission it uses `InferenceMode.ONLY_ON_DEVICE`, so the photo never leaves the laptop. With permission it uses `PREFER_ON_DEVICE`, so Gemini Nano answers when it is ready and Gemini in the cloud answers otherwise. Children under 18 stay on-device only until a guardian's consent is verified.
- **The on-device model prepares itself.** On supported Chrome desktops the first tap calls `initializeDeviceModel()` in the background, inside the user gesture that Chrome requires. Play never waits for it, and the cloud answers meanwhile (with permission).
- **App Check** (reCAPTCHA Enterprise) protects every request.
- **Remote Config** sets the cloud model and temperatures and has a kill switch that turns every request into on-device only, with no redeploy. It is fetched only before a request that may use the cloud.
- **Authentication** (anonymous first, optional Google linking) and **Cloud Firestore** with tested Security Rules save progress per player; the rules block minors' personal data.
- *(on-device verified)* We recorded the same clue answered by Gemini Nano on a Chrome laptop and by Gemini in the cloud on a phone. / *(alternative)* The cloud path is measured end to end; the on-device path uses the same SDK calls and is shown in the demo where hardware allowed.

## How we built it

React 19, TypeScript, Vite and Tailwind on Firebase Hosting, with the Firebase JS SDK v13 (`firebase/ai`, App Check, Remote Config, Auth, Firestore). We built it with Claude Code. The project has unit tests for the interpreter, the editor tree, level solvability, AI routing, output sanitizing, Remote Config and i18n; Firestore rules tests on the emulator; and Playwright end-to-end tests on desktop and phone, including real touch drag and a fake camera. We measured scan accuracy on 20 fixtures through the real app (19 of 19 plans read exactly, the non-plan image safely rejected, median 4.2 s in the cloud).

## Challenges we ran into

- Chrome only starts a Gemini Nano download from a user gesture, so we warm the SDK objects while the browser is idle and start the download inside the first tap.
- Making the source badge honest: "the on-device model is available" is not the same as "the on-device model answered", so the badge only uses `inferenceSource`.
- Child privacy law (Indonesia's UU PDP and PP 17/2025 treat everyone under 18 as a child) shaped the architecture. Minors stay local-only until guardian consent is verified by a backend, and the Firestore rules enforce it.
- Keeping small models useful: strict JSON schemas, clamped numbers, and a sanitizer that drops unknown commands and rejects clues that give away the answer.

## Accomplishments that we're proud of

- The same prompts and schema run on Gemini Nano and in the cloud; only the routing changes.
- Nothing is sent to the cloud without permission, and the network tab proves it.
- A finished product in two languages, not a demo screen: tutorial, levels, badges, accounts, offline play, and the same experience from a 320 px phone to a 1920 px desktop.

## What we learned

On-device inference changes the product, not just the cost. When the default is "your data stays here", consent screens become rare and honest, and the cloud becomes an explicit choice that a child or a parent can understand.

## What's next

- Pilot with Grade 5 to 6 classes and test the scanner on real children's handwriting (our accuracy numbers come from synthetic fixtures).
- Deploy the guardian consent backend so children can save progress online and use the cloud AI with verified consent.
- Android with Gemini Nano through Firebase AI Logic, and teacher tools: class codes and printable maze worksheets.
- More concepts: conditionals ("if the path is clear") and functions.

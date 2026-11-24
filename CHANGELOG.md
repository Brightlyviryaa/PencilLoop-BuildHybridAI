# Changelog

All notable changes to PencilLoop. Versions follow [Semantic Versioning](https://semver.org/).

## [0.5.1] - 2026-11-24

### Added
- **Firebase Remote Config for the cloud AI:** model name, clue and scan temperatures, and a kill switch (`ai_cloud_enabled`) that forces every request on-device. Values are validated and fetched only when a request may use the cloud. Template in `remoteconfig.template.json`, deployed with `npm run deploy`.
- *Profile > AI information* shows whether the cloud settings came from Remote Config.
- README: the problem we solve, why hybrid inference is the core of the design, a 3-minute guide for judges and the list of Firebase products used. Devpost text in `docs/DEVPOST.md`.

## [0.5.0] - 2026-11-24 - Prototype v0.5

### Gameplay and editor
- **Restructure existing blocks.** Blocks you already placed can be dragged into a Repeat, out of a Repeat, between Repeats and reordered (dnd-kit; mouse, touch with hold-to-drag, auto-scroll, drop indicator, loop highlight, invalid-drop feedback, cancel with Escape).
- **Tap-to-move alternative** for younger players and keyboard users: Up, Down, Into Repeat (choose which one), Take out, Delete. Deleting a Repeat asks whether to keep the blocks inside. Alt+Arrow keys also move blocks.
- **Undo and redo** (buttons and Ctrl/Cmd+Z, Shift for redo), 60 steps.
- Program tree operations are immutable, keep stable ids, refuse cycles and depth over the limit, and are covered by unit tests (including 200 random restructurings that never lose or duplicate a block).
- Unfinished drafts (for example an empty Repeat) are no longer discarded on reload.

### Mobile workspace (redesign)
- Two modes: **Map view** (large maze, goal, program ribbon, Run) and a **full-screen Plan editor** with big touch blocks, a goal reminder with a mini map, palette and Run in a thumb-reach dock.
- Running returns to the map automatically; the program ribbon shows the executing block. Sheets (scan, clue, settings) open on top of the editor.

### Visuals and feel
- **Pip redesigned**: an original hover robot with a visor face, antenna and arms; moods for idle, moving, thinking, bump (dizzy), happy and cheering. Simulation state stays separate from animation.
- **World art**: Training Island (sand, crates) and Loop Garden (grass, bushes) with depth, waving goal flag, start pad, active-tile glow, visited trail and soft animated backdrops.
- **Level map** is now a journey path with connected nodes, Pip on the next level and unlock animations.
- **Victory**: Pip pops out and cheers, stars one by one, the star rule in plain words, score count-up, one primary action (Next level) and Try again.
- **Progress page**: one hero summary, world progress, expandable level results, compact badge shelf.
- Safe top spacing on every screen; status messages no longer squeeze text next to buttons.

### Learning
- **First-time interactive tutorial** with Pip: meet Pip, the goal, first Move, Run, turning (with a friendly retry), Repeat comparison and a short loop challenge. Optional **voice guidance** (Web Speech API, Indonesian and English voices only when the device has them), repeat, mute, skip, always-visible transcript, replay from Settings.
- **Smart nudges** only when needed: empty plan for a while, repeated steps without a Repeat, several bumps in a row.

### Camera
- **In-app camera** for scanning paper plans (getUserMedia, rear camera preferred, framing guide, big shutter, retake / use photo). The stream stops on close, route change and when the tab is hidden. Fallbacks: choose a photo, or build with blocks.

### Sound
- New editor sounds (pick up, reorder, drop into loop, invalid drop, undo, redo), world unlock and tutorial cues, sound categories, and ducking while the voice speaks. Voice volume and vibration settings.

### Privacy, consent and release
- **Children under 18 are local-only until a parent or guardian's consent is verified** (Indonesia UU PDP No. 27/2022, PP 17/2025): no anonymous account, no Firestore sync, no Google linking and no cloud AI. The full game, editor and on-device AI still work.
- Parent permission card (guardian phone + email, validation, purpose note, no marketing) and a guardian approval page.
- **Firestore rules** refuse cloud writes for minors without a verified `guardianConsents/{uid}` document that only the backend can write.
- **Cloud Functions** source for the consent workflow (hashed tokens, 7-day expiry, rate limits, transactional email via the Trigger Email extension, claim to the new UID, revoke, cleanup). Not deployed: requires the Blaze plan and an email integration.
- In-app **Privacy policy** and **Terms of service** (Indonesian and English) with operator details left as configuration.
- Apache-2.0 `LICENSE` kept, `NOTICE` added (copyright holder placeholder, trademark note, asset ownership).

### Quality
- New unit tests: restructuring, par reachability (every level's 3 stars proven reachable by brute force), consent state and validation, consent backend logic, routing for minors. New Firestore rules tests for consent. New Playwright specs for drag-and-drop (mouse and real touch), tap-to-move, undo/redo, scan-over-editor and the tutorial.

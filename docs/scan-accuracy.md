# Scan accuracy check (measured, not claimed)

**Date:** 2026-11-23 · **Path:** Firebase AI Logic, Gemini Developer API backend · **Model:** `gemini-3.5-flash-lite` (cloud fallback) · **Mode:** `PREFER_ON_DEVICE` after "Allow once" consent · **Browser:** headless Chromium 156 (no on-device model available) · **App Check:** debug token (dev)

Script: [`scripts/scan-check.mjs`](../scripts/scan-check.mjs) drives the real app UI (upload → review → consent → scan) for each image in [`fixtures/scan/`](../fixtures/scan/) and records what the SDK reported.

## Results

| # | Fixture | Expected | Got | Source (SDK) | Latency | Notes |
|---|---|---|---|---|---|---|
| 01 | words-basic | move 3, left, move 3 | ✅ exact | IN_CLOUD | 3.9 s | |
| 02 | arrows-basic | move 3, left, move 3 | ✅ exact | IN_CLOUD | 3.3 s | drawn arrows |
| 03 | forward-word | move 2, right, move 1 | ✅ exact | IN_CLOUD | 4.6 s | synonym "forward" |
| 04 | short-LR | 7-step level-2 solution | ✅ exact | IN_CLOUD | 4.1 s | "go 2 / R / L" |
| 05 | repeat-bracket | repeat 5 [move 1, left, move 1, right] | ✅ exact | IN_CLOUD | 5.3 s | nested AST |
| 06 | repeat-x | repeat 3 [move 1, right] | ✅ exact | IN_CLOUD | 4.4 s | inline ×3 |
| 07 | numbered-list | move 2, left, move 4 | ✅ exact | IN_CLOUD | 5.9 s | |
| 08 | arrows-noisy | move 2, right, move 1 | ✅ exact | IN_CLOUD | 4.0 s | heavy noise |
| 09 | rotated | move 1, right, move 2 | ✅ exact | IN_CLOUD | 4.2 s | 12° rotation |
| 10 | dim-light | move 3, left, move 2 | ✅ exact | IN_CLOUD | 4.7 s | low light |
| 11 | upper-case | move 2, right, move 2 | ✅ exact | IN_CLOUD | 3.7 s | |
| 12 | missing-number | move 1, left, move 1 | ✅ exact | IN_CLOUD | 6.0 s | default 1 |
| 13 | big-number | move 5 (clamped), left | ✅ exact | IN_CLOUD | 4.2 s | warning shown |
| 14 | smudged | move 2, left | ✅ commands | IN_CLOUD | 3.8 s | ⚠️ smudge **not** flagged for review |
| 15 | crossed-out | move 2, left, move 1 | ✅ exact | IN_CLOUD | 4.6 s | warning: crossed-out step skipped |
| 16 | with-doodle | move 1, right, move 3 | ✅ exact | IN_CLOUD | 4.2 s | doodle ignored |
| 17 | two-columns | move 1, left, move 2, right | ✅ exact | IN_CLOUD | 4.2 s | two steps per line |
| 18 | tiny-writing | 5 steps | ✅ exact | IN_CLOUD | 4.1 s | |
| 19 | blue-paper | move 1, left, move 2, right | ✅ exact | IN_CLOUD | 4.3 s | tinted paper |
| 20 | not-a-plan | no steps | ✅ rejected | — | — | "No robot steps could be read" |

**Exact parse rate:** 19 / 19 plan images. **Safe rejection:** 1 / 1 non-plan image. **Review flag on ambiguity:** 0 / 1 (the smudged line was silently skipped). **Median latency:** ≈ 4.2 s.

## Honest caveats

- These are **synthetic** images rendered with handwriting-style fonts by [`scripts/generate_scan_fixtures.py`](../scripts/generate_scan_fixtures.py), not photos of real children's handwriting. Real-world accuracy will be lower; that is why every scanned program is shown for review and editing before Pip runs.
- The on-device (Gemini Nano) path has **not** been measured here — the test browser had no Prompt API. See [TESTING.md](TESTING.md) for how to verify `ON_DEVICE` on Chrome Desktop.
- Add real paper photos (without names or faces) to `fixtures/scan/` and re-run the script to extend this table.

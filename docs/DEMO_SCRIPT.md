# Demo script (target 2:40, max 3:00)

Record the **real app** at https://pencilloop-f476c.web.app. If the on-device segment can't be verified on your hardware, cut it. Never fake a badge.

| Time | Screen | Say |
|---|---|---|
| 0:00-0:15 | Phone, first visit: **Siap main?**, switch ID ↔ EN | "PencilLoop is a coding game for kids, in Indonesian and English. The language switches instantly." |
| 0:15-0:35 | Nickname → birthday → skip gender → note for grown-ups → **Mulai Petualangan!** | "No email, no password. A child's name and birthday stay on the device. That tap also starts preparing on-device AI in the background." |
| 0:35-1:05 | Level 1: Run → *Dikit lagi!* → **Kasih aku petunjuk** → fix → win, confetti, 3 stars, "Level 2 terbuka!", badge toasts | "A deterministic simulator runs the plan. The AI never decides who wins. Badges reward fixing mistakes, not just winning." |
| 1:05-1:30 | Paper plan → **Pindai** → consent → steps appear with the source badge | "The photo stays in the tab until the child agrees. Firebase AI Logic turns it into editable blocks, and the badge comes straight from the SDK's inferenceSource." |
| 1:30-1:55 | Desktop: level map, Progress tab, Profile → **AI information** (preparation status) | "On Chrome desktop, Gemini Nano downloads in the background. Until it's ready the cloud answers, with permission. The technical status lives here, not on the game screen." |
| 1:55-2:20 | Profile → **Simpan progres dengan Google** (adult profile) | "Players start anonymous. Linking Google keeps the same account, and if that Google account already has a save, we ask before combining anything." |
| 2:20-2:40 | Architecture / privacy matrix | "React + Vite on Firebase Hosting, Firebase AI Logic hybrid inference, App Check, Anonymous + Google Auth, Firestore with tested security rules. No ads, no stored photos." |

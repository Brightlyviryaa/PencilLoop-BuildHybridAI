import { defineConfig, devices } from '@playwright/test'

/**
 * Two builds are tested:
 *  - desktop / mobile projects: Firebase deliberately NOT configured (empty env
 *    vars override .env.local). Proves the game works without AI or cloud and
 *    that nothing is sent anywhere.
 *  - emulator project: built with `--mode emulator` (.env.emulator) against the
 *    Firebase Emulator Suite (Auth + Firestore, demo project, no real data).
 */
const emptyFirebase = {
  VITE_FIREBASE_API_KEY: '',
  VITE_FIREBASE_AUTH_DOMAIN: '',
  VITE_FIREBASE_PROJECT_ID: '',
  VITE_FIREBASE_STORAGE_BUCKET: '',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '',
  VITE_FIREBASE_APP_ID: '',
  VITE_APPCHECK_SITE_KEY: '',
  VITE_APPCHECK_DEBUG_TOKEN: '',
  VITE_USE_EMULATORS: '',
}

const JAVA_HOME = process.env.JAVA_HOME ?? '/opt/homebrew/opt/openjdk@21'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      testIgnore: /account\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:4174' },
    },
    {
      name: 'mobile',
      testIgnore: /account\.spec/,
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 800 }, baseURL: 'http://localhost:4174' },
    },
    {
      name: 'emulator',
      testMatch: /account\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, baseURL: 'http://localhost:4175' },
    },
  ],
  webServer: [
    {
      command: 'npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port 4174 --strictPort',
      url: 'http://localhost:4174',
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: emptyFirebase,
    },
    {
      command: `firebase emulators:start --only auth,firestore --project demo-pencilloop`,
      url: 'http://127.0.0.1:4400/emulators',
      timeout: 180_000,
      reuseExistingServer: true,
      env: { JAVA_HOME, PATH: `${JAVA_HOME}/bin:${process.env.PATH}` },
    },
    {
      command: 'npx vite build --mode emulator --outDir dist-e2e-emu --emptyOutDir && npx vite preview --outDir dist-e2e-emu --port 4175 --strictPort',
      url: 'http://localhost:4175',
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
})

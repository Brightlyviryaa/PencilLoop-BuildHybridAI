import { defineConfig } from 'vitest/config'

/** Firestore security rules tests (need the Firestore emulator on 127.0.0.1:8080). */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20_000,
    fileParallelism: false,
  },
})

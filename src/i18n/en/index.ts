import { coreEn } from './core'
import { onboardingEn } from './onboarding'
import { homeEn } from './home'
import { gameEn } from './game'
import { helpersEn } from './helpers'
import { progressEn } from './progress'
import { profileEn } from './profile'
import { aiEn } from './ai'
import { learnEn } from './learn'
import { editorEn } from './editor'
import { tutorialEn } from './tutorial'
import { consentEn } from './consent'

/** All English strings, one file per area. */
export const en = {
  ...coreEn,
  ...onboardingEn,
  ...homeEn,
  ...gameEn,
  ...helpersEn,
  ...progressEn,
  ...profileEn,
  ...aiEn,
  ...learnEn,
  ...editorEn,
  ...tutorialEn,
  ...consentEn,
}

export type Dict = typeof en

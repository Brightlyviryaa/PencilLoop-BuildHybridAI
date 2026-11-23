import { coreEn } from './core'
import { onboardingEn } from './onboarding'
import { homeEn } from './home'
import { gameEn } from './game'
import { helpersEn } from './helpers'
import { progressEn } from './progress'
import { profileEn } from './profile'
import { aiEn } from './ai'
import { learnEn } from './learn'

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
}

export type Dict = typeof en

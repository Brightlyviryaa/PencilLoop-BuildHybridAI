import type { Dict } from '../en'
import { coreId } from './core'
import { onboardingId } from './onboarding'
import { homeId } from './home'
import { gameId } from './game'
import { helpersId } from './helpers'
import { progressId } from './progress'
import { profileId } from './profile'
import { aiId } from './ai'
import { learnId } from './learn'

/** Semua teks Bahasa Indonesia, satu file per area. Tipe Dict memastikan tidak ada key yang terlewat. */
export const id: Dict = {
  ...coreId,
  ...onboardingId,
  ...homeId,
  ...gameId,
  ...helpersId,
  ...progressId,
  ...profileId,
  ...aiId,
  ...learnId,
}

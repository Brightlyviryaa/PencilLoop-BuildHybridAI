import { describe, expect, it } from 'vitest'
import { profileStore } from '../profile/profile'
import { achievementsStore } from '../progress/achievements'
import { progressStore, settingsStore } from '../progress/store'
import { wipeLocal } from './account'

describe('wipeLocal (sign-out and delete-my-data)', () => {
  it('forgets the player and their cloud consents, keeps device preferences', () => {
    profileStore.set({ name: 'Rara', birthDate: '2016-01-01', gender: null, ageGroup: 'under13', completedAt: 1 })
    progressStore.set({ levels: { 'first-steps': { completed: true, bestStars: 3, attempts: 1, bestScore: 330, bestBlocks: 3, completedAt: 1 } }, updatedAt: 1 })
    achievementsStore.set({ 'first-win': 1 })
    settingsStore.set((s) => ({ ...s, language: 'id', muted: true, cloudPhotos: true, cloudHints: true }))
    localStorage.setItem('pencilloop:guest-backup:v1', '{}')
    localStorage.setItem('pencilloop:draft:first-steps', '[]')

    wipeLocal()

    expect(profileStore.get()).toBeNull()
    expect(progressStore.get().levels).toEqual({})
    expect(achievementsStore.get()).toEqual({})
    expect(settingsStore.get()).toMatchObject({ cloudPhotos: false, cloudHints: false, language: 'id', muted: true })
    expect(localStorage.getItem('pencilloop:guest-backup:v1')).toBeNull()
    expect(localStorage.getItem('pencilloop:draft:first-steps')).toBeNull()
  })
})

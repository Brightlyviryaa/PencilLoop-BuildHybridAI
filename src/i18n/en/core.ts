import { pl } from '../helpers'

/* English: meta, common, nav, brand, sound, errors. Plain punctuation only, no em dashes. */
export const coreEn = {
  meta: {
    title: 'PencilLoop: Draw it. Run it. Fix it.',
    skip: 'Skip to content',
    loading: 'Loading...',
  },
  common: {
    next: 'Next',
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    done: 'Done',
    retry: 'Try again',
    edit: 'Edit',
    level: (n: number) => `Level ${n}`,
    starsOf: (n: number) => `${n} of 3 stars`,
    points: (n: number) => `${n} ${pl(n, 'point', 'points')}`,
    newBadge: 'New',
    locked: 'Locked',
  },
  nav: {
    main: 'Main navigation',
    home: 'Home',
    play: 'Play',
    progress: 'Progress',
    profile: 'Profile',
    learn: 'How to play',
  },
  brand: { tagline: 'Draw it. Run it. Fix it.', home: 'PencilLoop home' },
  sound: { turnOn: 'Turn sound on', turnOff: 'Turn sound off' },
  errors: {
    notFoundTitle: 'Pip got lost!',
    notFoundBody: "This page doesn't exist.",
    home: 'Back home',
    crashTitle: 'Oops, something broke',
    crashBody: 'Pip tripped over a bug. Your progress is safe.',
    reload: 'Reload',
  },
}

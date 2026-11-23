/* English: welcome. Plain punctuation only, no em dashes. */
export const onboardingEn = {
  welcome: {
    stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
    hello: {
      badge: "Hi, I'm Pip!",
      title: 'Ready to play?',
      body: 'Guide me through mazes with simple steps. Plan it, run it, and fix it together.',
      language: 'Choose your language',
      start: "Let's go!",
      haveSave: 'Already have a save?',
      signIn: 'Sign in with Google',
      signingIn: 'Signing in...',
    },
    name: {
      title: 'What should I call you?',
      label: 'Nickname',
      placeholder: 'Your nickname',
      helper: 'A nickname is enough. No full names needed.',
      errors: {
        empty: 'Type a nickname first.',
        'too-long': 'Keep it short, 20 letters or less.',
        invalid: 'Letters only, please.',
      },
    },
    birthday: {
      title: (name: string) => `When is your birthday, ${name}?`,
      label: 'Birthday',
      helper: "Use your real birthday. Kids can play too, with a parent or guardian's help.",
      errors: {
        empty: 'Pick your birthday first.',
        invalid: "That date doesn't look right.",
        future: "That day hasn't happened yet!",
        'too-old': 'Please check the year.',
      },
    },
    gender: {
      title: 'Which one are you?',
      helper: "You can skip this. It never changes what you can play.",
      male: 'Male',
      female: 'Female',
      skip: 'Skip this',
    },
    ready: {
      title: (name: string) => `All set, ${name}!`,
      body: 'Your adventure starts now. Pip is so excited!',
      grownUpTitle: 'A note for grown-ups',
      child: [
        'Nickname, birthday and gender stay on this device only.',
        'Game progress is saved with a random anonymous ID, so it survives a refresh.',
        'No ads, no tracking, no email or password.',
        'You can delete everything anytime in Profile.',
      ],
      adult: [
        'Your nickname and gender are saved with your anonymous account. Your birthday stays on this device.',
        'Game progress is saved automatically.',
        'No ads, no tracking, no email or password.',
        'You can delete everything anytime in Profile.',
      ],
      cta: 'Start the adventure!',
    },
    restoredName: 'Welcome back! What should I call you on this device?',
  },
}

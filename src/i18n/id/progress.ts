import type { progressEn } from '../en/progress'

/* Bahasa Indonesia: progress, achievements. Hangat, singkat, tanpa em dash. */
export const progressId: typeof progressEn = {
  progress: {
    title: 'Progresmu',
    subtitle: 'Setiap percobaan mengajarkan hal baru.',
    stars: 'Bintang',
    levelsDone: 'Level selesai',
    points: 'Poin',
    badges: 'Lencana',
    levelList: 'Level',
    badgeList: 'Lencana',
    notPlayed: 'Belum dimainkan',
    bestScore: 'Skor terbaik',
    fewestBlocks: 'Blok paling sedikit',
    runs: 'Percobaan',
    howToEarn: 'Cara mendapatkannya',
    earned: 'Didapat',
    of: (a: number, b: number) => `${a} dari ${b}`,
  },
  achievements: {
    'first-run': { title: 'Jalan Pertama', desc: 'Jalankan rencana pertamamu.' },
    'first-win': { title: 'Bendera Pertama', desc: 'Selesaikan satu level.' },
    'three-stars': { title: 'Super Rapi', desc: 'Dapatkan 3 bintang di satu level.' },
    'bounce-back': { title: 'Pantang Menyerah', desc: 'Menang setelah sempat menabrak.' },
    'loop-master': { title: 'Jago Ulangi', desc: 'Menang dengan memakai blok Ulangi.' },
    'paper-planner': { title: 'Perancang Kertas', desc: 'Menang dengan rencana hasil pindaian kertas.' },
    'clue-detective': { title: 'Detektif Petunjuk', desc: 'Pakai petunjuk, perbaiki rencanamu, lalu menang.' },
    explorer: { title: 'Penjelajah', desc: 'Selesaikan semua level.' },
    'star-collector': { title: 'Kolektor Bintang', desc: 'Dapatkan 3 bintang di semua level.' },
    toastMany: (n: number) => `${n} lencana baru!`,
    toast: 'Lencana baru!',
  },
}

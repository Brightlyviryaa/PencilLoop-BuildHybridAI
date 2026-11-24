import type { homeEn } from '../en/home'

/* Bahasa Indonesia: home, levels, missions. Hangat, singkat, tanpa em dash. */
export const homeId: typeof homeEn = {
  home: {
    greeting: (name: string) => `Hai, ${name}!`,
    sub: 'Siap untuk misi berikutnya?',
    subNew: 'Misi pertamamu sudah menunggu.',
    nextMission: 'Misi berikutnya',
    allDoneTitle: 'Semua level sudah kamu selesaikan!',
    allDoneBody: 'Yuk, kumpulkan 3 bintang di setiap level.',
    start: 'Mulai main',
    continue: 'Lanjut main',
    replay: 'Main lagi',
    stars: 'Bintang',
    levels: 'Level',
    badges: 'Lencana',
    howTitle: 'Cara mainnya',
    steps: [
      { title: 'Rancang', body: 'Pakai blok, atau gambar panah di kertas lalu pindai.' },
      { title: 'Jalankan', body: 'Pip mengikuti setiap langkahmu dengan tepat.' },
      { title: 'Perbaiki', body: 'Temukan langkah yang keliru. Minta petunjuk kalau perlu.' },
    ],
    learnMore: 'Cara main',
    nextBadge: 'Lencana berikutnya',
    allBadges: 'Semua lencana sudah kamu dapat!',
    allLevels: 'Lihat semua level',
  },
  levels: {
    title: 'Pilih level',
    subtitle: 'Selesaikan satu level untuk membuka level berikutnya.',
    worlds: {
      w1: { title: 'Dunia 1: Pulau Latihan', body: 'Belajar maju dan belok.' },
      w2: { title: 'Dunia 2: Taman Ulangi', body: 'Blok Ulangi bikin jalan panjang jadi pendek.' },
    },
    lockedHint: 'Selesaikan level sebelumnya untuk membuka level ini.',
    unlocked: 'Terbuka!',
    upNext: 'Berikutnya',
    completed: 'Selesai',
    play: 'Main!',
    replay: 'Main lagi',
    grid: (c: number, r: number) => `Petak ${c}x${r}`,
    usesRepeat: 'Blok Ulangi',
    bestScore: 'Skor terbaik',
    fewestBlocks: 'Blok paling sedikit',
    runs: 'Percobaan',
    nodeAria: (n: number, title: string, state: string) => `Level ${n}, ${title}, ${state}`,
  },
  missions: {
    'first-steps': {
      title: 'Langkah Pertama',
      goal: 'Antar Pip ke bendera di pojok atas.',
      tip: 'Pip berjalan ke arah hidungnya. Belok dulu, baru maju!',
    },
    'around-the-blocks': {
      title: 'Keliling Balok',
      goal: 'Liuk-liuk di antara balok sampai ke bendera.',
      tip: 'Hitung kotaknya sebelum belok. Perhatikan arah Pip setelah berbelok.',
    },
    'smart-loop': {
      title: 'Ulangi yang Pintar',
      goal: 'Naiki tangga sampai ke bendera. Bisakah blok Ulangi membantu?',
      tip: 'Cari langkah yang terus berulang, lalu masukkan ke dalam blok Ulangi.',
    },
    'pond-patrol': {
      title: 'Patroli Kolam',
      goal: 'Kelilingi kolam sampai ke bendera.',
      tip: 'Maju yang sama, belok yang sama, terus berulang. Kedengarannya seperti blok Ulangi!',
    },
    'mirror-stairs': {
      title: 'Tangga Cermin',
      goal: 'Naiki tangga dari arah sebaliknya sampai ke bendera.',
      tip: 'Kali ini Pip belok ke mana dulu? Lihat dulu sebelum menyalin!',
    },
    'winding-road': {
      title: 'Jalan Berliku',
      goal: 'Ikuti jalan berliku sampai ke bendera.',
      tip: 'Cari empat langkah yang terjadi dua kali. Langkah majunya lebih besar di sini!',
    },
  },
}

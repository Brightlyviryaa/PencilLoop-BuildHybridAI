import type { coreEn } from '../en/core'

/* Bahasa Indonesia: meta, common, nav, brand, sound, errors. Hangat, singkat, tanpa em dash. */
export const coreId: typeof coreEn = {
  meta: {
    title: 'PencilLoop: Rancang. Jalankan. Perbaiki.',
    skip: 'Langsung ke konten',
    loading: 'Sebentar ya...',
  },
  common: {
    next: 'Lanjut',
    back: 'Kembali',
    close: 'Tutup',
    cancel: 'Batal',
    save: 'Simpan',
    done: 'Selesai',
    retry: 'Coba lagi',
    edit: 'Ubah',
    level: (n: number) => `Level ${n}`,
    starsOf: (n: number) => `${n} dari 3 bintang`,
    points: (n: number) => `${n} poin`,
    newBadge: 'Baru',
    locked: 'Terkunci',
  },
  nav: {
    main: 'Navigasi utama',
    home: 'Beranda',
    play: 'Main',
    progress: 'Progres',
    profile: 'Profil',
    learn: 'Cara main',
  },
  brand: { tagline: 'Rancang. Jalankan. Perbaiki.', home: 'Beranda PencilLoop' },
  sound: { turnOn: 'Nyalakan suara', turnOff: 'Matikan suara' },
  errors: {
    notFoundTitle: 'Pip tersesat!',
    notFoundBody: 'Halaman ini tidak ada.',
    home: 'Kembali ke beranda',
    crashTitle: 'Ups, ada yang rusak',
    crashBody: 'Pip tersandung bug. Progresmu tetap aman.',
    reload: 'Muat ulang',
  },
}

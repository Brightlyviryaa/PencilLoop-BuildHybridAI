import type { learnEn } from '../en/learn'

/* Bahasa Indonesia: learn. Hangat, singkat, tanpa em dash. */
export const learnId: typeof learnEn = {
  learn: {
    eyebrow: 'Belajar',
    title: 'Cara main PencilLoop',
    intro: 'Pip melakukan persis apa yang ada di rencanamu. Coba berpikir seperti Pip: aku di mana, dan hidungku menghadap ke mana?',
    blocksTitle: 'Blok-bloknya',
    onPaper: 'Di kertas',
    symbols: [
      { name: 'Maju', paper: 'panah ke atas 2, atau "maju 2"', desc: 'Maju 1 sampai 5 kotak ke arah hadap Pip.' },
      { name: 'Belok kiri', paper: 'panah melengkung ke kiri, atau "Ki"', desc: 'Berputar seperempat ke kiri tanpa berpindah.' },
      { name: 'Belok kanan', paper: 'panah melengkung ke kanan, atau "Ka"', desc: 'Berputar seperempat ke kanan tanpa berpindah.' },
      { name: 'Ulangi', paper: '"ulangi 3 [ ... ]" atau "x3"', desc: 'Jalankan langkah di dalamnya berulang-ulang, 2 sampai 5 kali. Terbuka di level 3.' },
    ],
    photoTitle: 'Tips memotret',
    photoTips: [
      'Pegang ponsel datar di atas kertas supaya seluruh rencana masuk.',
      'Pakai cahaya terang dan pensil atau spidol gelap. Hindari bayangan.',
      'Jangan ada nama dan wajah di foto.',
    ],
    photoNote: 'Kamu selalu bisa melihat langkah yang dibaca AI, dan memperbaikinya sebelum Pip berjalan.',
    print: 'Cetak lembar kerja',
    start: 'Mulai level 1',
    sheetTitle: 'Rencana robotku',
    sheetHelp: 'Tulis satu langkah per baris. Pakai panah atau kata-kata. Jangan tulis nama, ya!',
    sheetAria: 'Lembar kerja untuk dicetak',
    example: 'Contoh',
  },
}

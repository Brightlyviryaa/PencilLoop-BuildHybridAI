import type { onboardingEn } from '../en/onboarding'

/* Bahasa Indonesia: welcome. Hangat, singkat, tanpa em dash. */
export const onboardingId: typeof onboardingEn = {
  welcome: {
    stepOf: (i: number, n: number) => `Langkah ${i} dari ${n}`,
    hello: {
      badge: 'Hai, aku Pip!',
      title: 'Siap main?',
      body: 'Bantu aku melewati labirin dengan langkah-langkah sederhana. Kita rancang, jalankan, lalu perbaiki bareng.',
      language: 'Pilih bahasamu',
      start: 'Yuk, mulai!',
      haveSave: 'Sudah punya simpanan?',
      signIn: 'Masuk dengan Google',
      signingIn: 'Sedang masuk...',
    },
    name: {
      title: 'Kamu biasa dipanggil siapa?',
      label: 'Nama panggilan',
      placeholder: 'Nama panggilanmu',
      helper: 'Nama panggilan saja sudah cukup, ya.',
      errors: {
        empty: 'Tulis nama panggilanmu dulu, ya.',
        'too-long': 'Yang pendek saja, maksimal 20 huruf.',
        invalid: 'Pakai huruf saja, ya.',
      },
    },
    birthday: {
      title: (name: string) => `Kapan ulang tahunmu, ${name}?`,
      label: 'Tanggal lahir',
      helper: 'Pakai tanggal lahir aslimu, ya. Anak-anak juga bisa bermain dengan pendampingan orang tua.',
      errors: {
        empty: 'Pilih tanggal lahirmu dulu, ya.',
        invalid: 'Tanggalnya sepertinya kurang tepat.',
        future: 'Tanggal itu belum terjadi, lho!',
        'too-old': 'Coba cek lagi tahunnya, ya.',
      },
    },
    gender: {
      title: 'Kamu yang mana?',
      helper: 'Boleh dilewati, kok. Pilihan ini tidak mengubah level yang bisa kamu mainkan.',
      male: 'Laki-laki',
      female: 'Perempuan',
      skip: 'Lewati',
    },
    ready: {
      title: (name: string) => `Sudah siap, ${name}!`,
      body: 'Petualanganmu dimulai sekarang. Pip sudah tidak sabar!',
      grownUpTitle: 'Catatan untuk orang tua',
      child: [
        'Nama panggilan, tanggal lahir, dan gender hanya disimpan di perangkat ini.',
        'Progres permainan disimpan dengan ID anonim acak, jadi tetap aman saat halaman dimuat ulang.',
        'Tanpa iklan, tanpa pelacakan, tanpa email atau kata sandi.',
        'Semua data bisa dihapus kapan saja di Profil.',
      ],
      adult: [
        'Nama panggilan dan gender disimpan bersama akun anonimmu. Tanggal lahir tetap di perangkat ini.',
        'Progres permainan tersimpan otomatis.',
        'Tanpa iklan, tanpa pelacakan, tanpa email atau kata sandi.',
        'Semua data bisa dihapus kapan saja di Profil.',
      ],
      cta: 'Mulai Petualangan!',
    },
    restoredName: 'Selamat datang kembali! Di perangkat ini kamu mau dipanggil siapa?',
  },
}

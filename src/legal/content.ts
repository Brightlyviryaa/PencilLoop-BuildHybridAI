import type { Lang } from '../features/progress/store'

export interface LegalSection {
  title: string
  body: string[]
}

/**
 * Prototype privacy policy and terms (bilingual). They describe what the
 * code actually does. A lawyer must review them before a public launch.
 */
export const PRIVACY: Record<Lang, LegalSection[]> = {
  id: [
    { title: 'Ringkasan', body: ['PencilLoop adalah permainan edukasi coding untuk anak. Kami mengumpulkan data sesedikit mungkin, tanpa iklan, tanpa analitik, dan tanpa pelacakan.'] },
    {
      title: 'Data yang dikumpulkan',
      body: [
        'Di perangkat: nama panggilan, tanggal lahir (untuk menentukan kelompok usia), jenis kelamin opsional, pengaturan, progres, lencana, dan rencana yang sedang dibuat.',
        'Di cloud (hanya untuk orang dewasa, atau anak dengan izin orang tua yang terverifikasi): ID pemain anonim, kelompok usia, bahasa, pengaturan, hasil level, dan lencana. Nama panggilan dan jenis kelamin anak tidak pernah diunggah. Tanggal lahir tidak pernah diunggah.',
        'Jika akun dihubungkan dengan Google: alamat email Google disimpan oleh Firebase Authentication.',
        'Kontak orang tua atau wali (nomor HP dan email) hanya untuk permintaan izin, dan dihapus setelah dijawab atau kedaluwarsa.',
      ],
    },
    {
      title: 'Tujuan',
      body: ['Menjalankan permainan, menyimpan progres agar tidak hilang, membaca rencana yang difoto, dan memberi petunjuk. Data tidak dipakai untuk iklan, profil pemasaran, atau dijual.'],
    },
    {
      title: 'Layanan Firebase dan Google',
      body: [
        'Firebase Hosting (menyajikan aplikasi), Firebase Authentication (ID anonim dan Google), Cloud Firestore (progres), Firebase App Check (melindungi dari penyalahgunaan), Firebase Remote Config (pengaturan model AI cloud, hanya diambil saat AI cloud diizinkan), Firebase AI Logic dengan model Gemini (membaca foto dan memberi petunjuk), dan Cloud Functions (alur izin orang tua, jika diaktifkan).',
      ],
    },
    {
      title: 'AI di perangkat dan AI cloud',
      body: [
        'Di Chrome desktop yang mendukung, AI berjalan di perangkat (Gemini Nano) dan data tidak meninggalkan perangkat.',
        'AI cloud hanya dipakai jika kamu mengizinkannya, dan untuk anak hanya setelah izin orang tua terverifikasi. Mode hanya-perangkat tidak pernah diam-diam beralih ke cloud.',
        'Petunjuk hanya mengirim teks singkat tentang labirin dan blok, tanpa data pribadi.',
      ],
    },
    {
      title: 'Foto',
      body: ['Foto rencana di kertas diperkecil di perangkat, diproses sekali, lalu dibuang. Foto tidak disimpan di Cloud Storage atau Firestore. Hindari memotret wajah atau nama.'],
    },
    { title: 'Masa simpan', body: ['Data di cloud disimpan selama akun ada. Permintaan izin orang tua kedaluwarsa setelah 7 hari dan kontaknya dihapus.'] },
    {
      title: 'Hapus data dan hak orang tua',
      body: [
        'Hapus semua data kapan saja di Profil > Hapus semua dataku. Ini menghapus data di perangkat, dokumen Firestore, dan akun Firebase.',
        'Orang tua atau wali dapat menolak, mencabut izin, atau meminta akses dan penghapusan data anak melalui link di email izin atau kontak di bawah.',
      ],
    },
  ],
  en: [
    { title: 'Summary', body: ['PencilLoop is an educational coding game for children. We collect as little data as possible, with no ads, no analytics and no tracking.'] },
    {
      title: 'Data we collect',
      body: [
        'On the device: nickname, birthday (to work out the age group), optional gender, settings, progress, badges and the plan in progress.',
        "In the cloud (only for adults, or children with verified parent permission): an anonymous player ID, age group, language, settings, level results and badges. A child's nickname and gender are never uploaded. Birthdays are never uploaded.",
        'If the account is linked to Google: the Google email address is kept by Firebase Authentication.',
        'Parent or guardian contact (phone and email) is used only for the permission request and deleted once answered or expired.',
      ],
    },
    { title: 'Purposes', body: ['Running the game, saving progress so it is not lost, reading photographed plans and giving clues. Data is never used for ads or marketing profiles, and never sold.'] },
    {
      title: 'Firebase and Google services',
      body: [
        'Firebase Hosting (serves the app), Firebase Authentication (anonymous and Google IDs), Cloud Firestore (progress), Firebase App Check (abuse protection), Firebase Remote Config (cloud AI model settings, fetched only when cloud AI is allowed), Firebase AI Logic with Gemini models (reading photos and giving clues), and Cloud Functions (parent permission flow, when enabled).',
      ],
    },
    {
      title: 'On-device AI and cloud AI',
      body: [
        'On supported Chrome desktops the AI runs on the device (Gemini Nano) and data does not leave it.',
        "Cloud AI is used only when you allow it, and for children only after a parent's permission is verified. Device-only mode never silently switches to the cloud.",
        'Clues send only a short text about the maze and the blocks, with no personal data.',
      ],
    },
    { title: 'Photos', body: ['Photos of paper plans are shrunk on the device, processed once, then discarded. They are not stored in Cloud Storage or Firestore. Please avoid photographing faces or names.'] },
    { title: 'Retention', body: ['Cloud data is kept while the account exists. Parent permission requests expire after 7 days and their contact details are deleted.'] },
    {
      title: 'Deleting data and parental rights',
      body: [
        'Delete everything at any time in Profile > Delete all my data. This removes device data, Firestore documents and the Firebase account.',
        "A parent or guardian can refuse, withdraw permission, or ask to access or delete a child's data through the link in the permission email or the contact below.",
      ],
    },
  ],
}

export const TERMS: Record<Lang, LegalSection[]> = {
  id: [
    { title: 'Tentang layanan', body: ['PencilLoop adalah prototipe permainan edukasi (v0.5) untuk Firebase Hybrid AI Hackathon 2026. Layanan disediakan apa adanya dan dapat berubah.'] },
    { title: 'Pemain anak', body: ['Pemain di bawah 18 tahun dapat bermain penuh di perangkat. Penyimpanan online dan AI cloud untuk anak memerlukan izin orang tua atau wali yang terverifikasi. Menyetujui ketentuan ini tidak menggantikan izin tersebut.'] },
    { title: 'Penggunaan yang baik', body: ['Jangan mengunggah foto berisi wajah, data pribadi, atau konten yang tidak pantas. Jangan mencoba merusak atau menyalahgunakan layanan.'] },
    { title: 'Kode sumber dan merek', body: ['Kode sumber PencilLoop dirilis dengan Apache License 2.0. Lisensi tersebut tidak memberi hak atas nama, logo, atau karakter PencilLoop dan Pip sebagai merek dagang.'] },
    { title: 'Persetujuan terpisah', body: ['Persetujuan yang diperlukan untuk layanan terpisah dari persetujuan pemasaran. PencilLoop saat ini tidak mengirim pesan pemasaran apa pun.'] },
  ],
  en: [
    { title: 'About the service', body: ['PencilLoop is a prototype educational game (v0.5) made for the Firebase Hybrid AI Hackathon 2026. It is provided as is and may change.'] },
    { title: 'Child players', body: ["Players under 18 can play everything on the device. Online saving and cloud AI for children need a verified parent or guardian's permission. Accepting these terms does not replace that permission."] },
    { title: 'Fair use', body: ['Do not upload photos with faces, personal data or inappropriate content. Do not try to break or misuse the service.'] },
    { title: 'Source code and brand', body: ['The PencilLoop source code is released under the Apache License 2.0. That license does not grant rights to the PencilLoop or Pip names, logo or characters as trademarks.'] },
    { title: 'Separate consents', body: ['Consent needed for the service is separate from any marketing consent. PencilLoop currently sends no marketing messages at all.'] },
  ],
}

export interface Program {
  title: string;
  category: 'Kafarat' | 'Fidyah' | 'Kemanusiaan';
  tag: string;
  slug: string;
  image: string;
  alt: string;
  description: string;
  featured?: boolean;
}

export const DONASI_BASE = 'https://donasi.yayasanalhidayah.com/campaign';
export const donasiUrl = (slug: string) => `${DONASI_BASE}/${slug}`;

export const programs: Program[] = [
  {
    title: 'Sempurnakan Taubatmu, Tunaikan Kafarat',
    category: 'Kafarat',
    tag: 'Tebusan',
    slug: 'sempurnakan-taubatmu-tunaikan-kafarat',
    image: '/program/program-kafarat.webp',
    alt: 'Sempurnakan Taubatmu, Tunaikan Kafarat',
    description: 'Pernahkah mengucap sumpah atas nama Allah SWT dan melanggarnya? Atau melakukan jima\' siang hari di bulan Ramadhan? Tunaikan Kafaratmu Segera...!! Jangan biarkan kesalahan masa lalu tetap menghantui — sekarang adalah waktu memperbaiki diri.',
    featured: true,
  },
  {
    title: 'Fidyah',
    category: 'Fidyah',
    tag: 'Tebusan',
    slug: 'tunaikan-fidyah-bersama-alhidayah',
    image: '/program/program-fidyah.webp',
    alt: 'Tunaikan Fidyah',
    description: 'Tidak mampu berpuasa karena sakit berkepanjangan atau usia lanjut? Tunaikan fidyah Anda — kami salurkan langsung kepada fakir miskin yang berhak menerimanya.',
    featured: true,
  },
  {
    title: 'Kewajiban Itu Tidak Hilang Meski Sudah Lama Berlalu',
    category: 'Kafarat',
    tag: 'Tebusan',
    slug: 'kewajiban-itu-tidak-hilang-meski-sudah-lama-berlalu',
    image: '/program/program-kafarat-kewajiban.webp',
    alt: 'Kewajiban Kafarat yang Tidak Hilang',
    description: 'Sumpah yang terlanjur terucap dan terlanggar tetap menjadi tanggungan, meski waktu telah lama berlalu. Tunaikan kafaratnya sekarang dan lepaskan beban yang selama ini menggelayuti hati.',
  },
  {
    title: 'Dana Siaga Bencana: Siapkan Bantuan Sebelum Musibah Terjadi',
    category: 'Kemanusiaan',
    tag: 'Kemanusiaan',
    slug: 'dana-siaga-bencana',
    image: '/program/program-dana-siaga-bencana.webp',
    alt: 'Dana Siaga Bencana',
    description: 'Musibah datang tanpa aba-aba. Bersama Anda, kami siapkan dana siaga agar bantuan logistik, obat, dan kebutuhan pokok bisa bergerak cepat saat bencana terjadi.',
  },
  {
    title: 'Allah Tidak Menutup Pintu Ampunan',
    category: 'Kafarat',
    tag: 'Tebusan',
    slug: 'allah-tidak-menutup-ampunan',
    image: '/program/program-kafarat-ampunan.webp',
    alt: 'Allah Tidak Menutup Pintu Ampunan',
    description: 'Sebesar apa pun kesalahan, pintu ampunan Allah selalu terbuka. Mulai langkah taubat dengan menunaikan kafarat, agar kembali suci di hadapan-Nya.',
  },
  {
    title: 'Raih Ampunan & Rahmat dengan Bayar Kafarat',
    category: 'Kafarat',
    tag: 'Tebusan',
    slug: 'raih-ampunan-dan-rahmat-dengan-bayar-kafarat',
    image: '/program/program-kafarat-rahmat.webp',
    alt: 'Raih Ampunan dan Rahmat dengan Bayar Kafarat',
    description: 'Setiap kafarat yang ditunaikan adalah jalan meraih ampunan sekaligus rahmat — menebus diri, sekaligus menolong saudara sesama yang berhak menerima.',
  },
  {
    title: 'Jangan Biarkan Kafarat Sumpahmu Menggantung Hingga Hari Kiamat',
    category: 'Kafarat',
    tag: 'Tebusan',
    slug: 'jangan-biarkan-kafarat-sumpahmu-menggantung-hingga-hari-kiamat',
    image: '/program/program-kafarat-sumpah.webp',
    alt: 'Jangan Biarkan Kafarat Sumpahmu Menggantung',
    description: 'Sumpah yang belum ditebus terus menggantung sebagai tanggungan. Selesaikan sekarang juga, sebelum terlambat dan menanggung bebannya lebih lama.',
  },
  {
    title: 'Tebus Sumpah yang Pernah Kamu Ucap',
    category: 'Kafarat',
    tag: 'Tebusan',
    slug: 'tebus-sumpah-yang-pernah-kamu-ucap',
    image: '/program/program-kafarat-tebus.webp',
    alt: 'Tebus Sumpah yang Pernah Kamu Ucap',
    description: 'Pernah bersumpah atas nama Allah lalu melanggarnya? Tebus dengan kafarat yang kami salurkan langsung kepada mereka yang berhak menerimanya.',
  },
];

export const featuredPrograms = programs.filter((p) => p.featured);

export const categories = ['Kafarat', 'Fidyah', 'Kemanusiaan'] as const;
// Pure SEO analysis logic — no React, no side effects. Runs 24 checks grouped
// into 5 categories and produces a weighted score. Modelled after RankMath.

export type CheckStatus = 'pass' | 'warning' | 'fail';

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  weight: number; // 1 = nice-to-have, 2 = important, 3 = critical
}

export interface SeoGroup {
  label: string;
  icon: string;
  checks: SeoCheck[];
}

export interface SeoResult {
  score: number;
  maxScore: number;
  percentage: number;
  groups: SeoGroup[];
}

export interface SeoInput {
  focusKeyword: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDesc: string;
  excerpt: string;
  text: string; // plain text from editor
  html: string; // HTML from editor
  hasCover: boolean;
  /** Focus keywords used by other articles; lowercase comparison. */
  usedFocusKeywords?: string[];
}

function lower(s: string): string {
  return s.toLowerCase().trim();
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function containsKeyword(haystack: string, keyword: string): boolean {
  if (!keyword) return false;
  return lower(haystack).includes(lower(keyword));
}

function keywordDensity(text: string, keyword: string): number {
  if (!keyword || !text) return 0;
  const words = wordCount(text);
  if (words === 0) return 0;
  const kwWords = keyword.trim().split(/\s+/).length;
  const regex = new RegExp(lower(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = lower(text).match(regex);
  const count = matches ? matches.length : 0;
  return (count * kwWords / words) * 100;
}

function extractFirst150Chars(text: string): string {
  return text.slice(0, 150);
}

function countHeadings(html: string): number {
  return (html.match(/<h[2-3][^>]*>/gi) || []).length;
}

function headingsContainKeyword(html: string, keyword: string): boolean {
  if (!keyword) return false;
  const headings = html.match(/<h[2-3][^>]*>([^<]*)<\/h[2-3]>/gi) || [];
  return headings.some((h) => containsKeyword(h.replace(/<[^>]+>/g, ''), keyword));
}

function countImages(html: string): number {
  return (html.match(/<img\s/gi) || []).length;
}

function imagesMissingAlt(html: string): number {
  const images = html.match(/<img\b[^>]*>/gi) || [];
  return images.filter((img) => !/\balt=["'][^"']+["']/i.test(img)).length;
}

function headingLevels(html: string): number[] {
  return [...html.matchAll(/<h([2-6])\b/gi)].map((m) => Number(m[1]));
}

function keywordDistribution(text: string, keyword: string): number {
  if (!keyword || !text) return 0;
  const sections = [text.slice(0, text.length / 3), text.slice(text.length / 3, 2 * text.length / 3), text.slice(2 * text.length / 3)];
  return sections.filter((section) => containsKeyword(section, keyword)).length;
}

const POWER_WORDS = /\b(panduan|lengkap|terbaik|mudah|praktis|penting|rahasia|ampuh|gratis|wajib|cara|solusi|manfaat)\b/i;
const TRANSITIONS = /\b(karena itu|oleh karena itu|selain itu|namun|meskipun|kemudian|selanjutnya|sementara itu|dengan demikian|sebaliknya)\b/gi;

function linkHrefs(html: string): string[] {
  return [...html.matchAll(/<a\s[^>]*href=["']([^"']*)["'][^>]*>/gi)].map((match) => match[1]);
}

function hasInternalLinks(html: string): boolean {
  return linkHrefs(html).some((href) => href.startsWith('/') || href.includes('yayasanalhidayah.com'));
}

function hasExternalLinks(html: string): boolean {
  return linkHrefs(html).some((href) => href.startsWith('http') && !href.includes('yayasanalhidayah.com'));
}

function avgSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const total = sentences.reduce((sum, s) => sum + wordCount(s), 0);
  return total / sentences.length;
}

function avgParagraphLength(text: string): number {
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return 0;
  const total = paragraphs.reduce((sum, p) => sum + wordCount(p), 0);
  return total / paragraphs.length;
}

function paragraphCount(text: string): number {
  return text.split(/\n+/).filter((p) => p.trim().length > 0).length;
}

// ── Checks ──────────────────────────────────────────────────────────────────

function basicChecks(input: SeoInput): SeoCheck[] {
  const kw = input.focusKeyword.trim();
  const effectiveMetaDesc = input.metaDesc || input.excerpt;
  const first150 = extractFirst150Chars(input.text);

  return [
    {
      id: 'kw-set',
      label: 'Focus keyword',
      weight: 3,
      status: kw ? 'pass' : 'fail',
      message: kw ? `Focus keyword: "${kw}"` : 'Tentukan focus keyword untuk artikel ini',
    },
    {
      id: 'kw-title-start',
      label: 'Keyword di awal judul',
      weight: 2,
      status: !kw ? 'fail' : lower(input.title).startsWith(lower(kw)) ? 'pass' : containsKeyword(input.title, kw) ? 'warning' : 'fail',
      message: !kw ? 'Isi focus keyword terlebih dahulu' : lower(input.title).startsWith(lower(kw)) ? 'Judul diawali focus keyword' : `Letakkan "${kw}" sedekat mungkin ke awal judul`,
    },
    {
      id: 'kw-unique',
      label: 'Keyword unik',
      weight: 2,
      status: !kw ? 'fail' : (input.usedFocusKeywords ?? []).map(lower).includes(lower(kw)) ? 'warning' : 'pass',
      message: !kw ? 'Isi focus keyword terlebih dahulu' : (input.usedFocusKeywords ?? []).map(lower).includes(lower(kw)) ? 'Focus keyword sudah dipakai artikel lain' : 'Focus keyword belum dipakai artikel lain',
    },
    {
      id: 'kw-in-title',
      label: 'Keyword di judul',
      weight: 3,
      status: !kw ? 'fail' : containsKeyword(input.title, kw) ? 'pass' : 'fail',
      message: !kw
        ? 'Isi focus keyword terlebih dahulu'
        : containsKeyword(input.title, kw)
          ? 'Focus keyword ditemukan di judul'
          : `Tambahkan "${kw}" ke judul artikel`,
    },
    {
      id: 'kw-in-slug',
      label: 'Keyword di URL',
      weight: 2,
      status: !kw ? 'fail' : containsKeyword(input.slug.replace(/-/g, ' '), kw) ? 'pass' : 'warning',
      message: !kw
        ? 'Isi focus keyword terlebih dahulu'
        : containsKeyword(input.slug.replace(/-/g, ' '), kw)
          ? 'Focus keyword ditemukan di URL/slug'
          : `Masukkan "${kw}" ke dalam slug`,
    },
    {
      id: 'kw-in-meta',
      label: 'Keyword di meta description',
      weight: 2,
      status: !kw ? 'fail' : containsKeyword(effectiveMetaDesc, kw) ? 'pass' : 'warning',
      message: !kw
        ? 'Isi focus keyword terlebih dahulu'
        : containsKeyword(effectiveMetaDesc, kw)
          ? 'Focus keyword ditemukan di meta description'
          : `Tambahkan "${kw}" ke meta description`,
    },
    {
      id: 'kw-in-intro',
      label: 'Keyword di paragraf pertama',
      weight: 2,
      status: !kw ? 'fail' : containsKeyword(first150, kw) ? 'pass' : 'warning',
      message: !kw
        ? 'Isi focus keyword terlebih dahulu'
        : containsKeyword(first150, kw)
          ? 'Focus keyword muncul di 150 karakter pertama'
          : `Sebutkan "${kw}" di awal artikel`,
    },
    {
      id: 'kw-in-headings',
      label: 'Keyword di subheading',
      weight: 2,
      status: !kw ? 'fail' : headingsContainKeyword(input.html, kw) ? 'pass' : 'warning',
      message: !kw
        ? 'Isi focus keyword terlebih dahulu'
        : headingsContainKeyword(input.html, kw)
          ? 'Focus keyword ditemukan di subheading (H2/H3)'
          : `Gunakan "${kw}" di salah satu subheading`,
    },
  ];
}

function contentChecks(input: SeoInput): SeoCheck[] {
  const words = wordCount(input.text);
  const kw = input.focusKeyword.trim();
  const density = keywordDensity(input.text, kw);
  const headings = countHeadings(input.html);
  const avgPara = avgParagraphLength(input.text);
  const internal = hasInternalLinks(input.html);
  const external = hasExternalLinks(input.html);

  return [
    {
      id: 'content-length',
      label: 'Panjang konten',
      weight: 3,
      status: words >= 600 ? 'pass' : words >= 300 ? 'warning' : 'fail',
      message:
        words >= 600
          ? `${words} kata — panjang konten baik`
          : words >= 300
            ? `${words} kata — cukup, idealnya ≥600 kata`
            : `${words} kata — terlalu pendek, minimal 300 kata`,
    },
    {
      id: 'keyword-density',
      label: 'Keyword density',
      weight: 2,
      status: !kw
        ? 'fail'
        : density >= 1 && density <= 2.5
          ? 'pass'
          : density > 0
            ? 'warning'
            : 'fail',
      message: !kw
        ? 'Isi focus keyword terlebih dahulu'
        : density >= 1 && density <= 2.5
          ? `Density ${density.toFixed(1)}% — ideal`
          : density > 2.5
            ? `Density ${density.toFixed(1)}% — terlalu tinggi, risiko keyword stuffing`
            : density > 0
              ? `Density ${density.toFixed(1)}% — rendah, idealnya 1-2.5%`
              : `Keyword "${kw}" tidak ditemukan dalam konten`,
    },
    {
      id: 'has-headings',
      label: 'Subheading (H2/H3)',
      weight: 2,
      status: headings >= 2 ? 'pass' : headings >= 1 ? 'warning' : 'fail',
      message:
        headings >= 2
          ? `${headings} subheading ditemukan`
          : headings === 1
            ? '1 subheading — tambahkan lebih untuk struktur konten'
            : 'Tidak ada subheading — gunakan H2/H3 untuk membagi konten',
    },
    {
      id: 'paragraph-length',
      label: 'Panjang paragraf',
      weight: 1,
      status: words === 0 ? 'fail' : avgPara <= 150 ? 'pass' : 'warning',
      message:
        words === 0
          ? 'Belum ada konten'
          : avgPara <= 150
            ? `Rata-rata ${Math.round(avgPara)} kata/paragraf — baik`
            : `Rata-rata ${Math.round(avgPara)} kata/paragraf — terlalu panjang, pecah paragraf`,
    },
    {
      id: 'internal-links',
      label: 'Internal link',
      weight: 1,
      status: internal ? 'pass' : 'warning',
      message: internal
        ? 'Ada link ke halaman internal'
        : 'Tambahkan link ke artikel/halaman lain di situs',
    },
    {
      id: 'external-links',
      label: 'External link',
      weight: 1,
      status: external ? 'pass' : 'warning',
      message: external
        ? 'Ada link ke sumber eksternal'
        : 'Pertimbangkan menambahkan referensi ke sumber terpercaya',
    },
    {
      id: 'content-depth',
      label: 'Kedalaman konten',
      weight: 2,
      status: words >= 1200 ? 'pass' : words >= 600 ? 'warning' : 'fail',
      message: words >= 1200 ? `${words} kata — pembahasan mendalam` : `Tambahkan pembahasan hingga sekitar 1.200 kata bila topik membutuhkan`,
    },
    {
      id: 'keyword-distribution',
      label: 'Distribusi keyword',
      weight: 2,
      status: !kw ? 'fail' : keywordDistribution(input.text, kw) >= 2 ? 'pass' : 'warning',
      message: !kw ? 'Isi focus keyword terlebih dahulu' : keywordDistribution(input.text, kw) >= 2 ? 'Keyword tersebar di beberapa bagian konten' : 'Sebarkan keyword secara alami dari awal hingga akhir',
    },
    {
      id: 'has-toc',
      label: 'Daftar isi',
      weight: 1,
      status: words < 800 || /href=["']#[^"']+["']/i.test(input.html) ? 'pass' : 'warning',
      message: words < 800 ? 'Konten belum membutuhkan daftar isi' : /href=["']#[^"']+["']/i.test(input.html) ? 'Daftar isi terdeteksi' : 'Pertimbangkan daftar isi untuk konten panjang',
    },
  ];
}

function titleMetaChecks(input: SeoInput): SeoCheck[] {
  const effectiveTitle = input.metaTitle || input.title;
  const effectiveDesc = input.metaDesc || input.excerpt;
  const titleLen = effectiveTitle.length;
  const metaTitleLen = input.metaTitle.length;
  const descLen = effectiveDesc.length;

  return [
    {
      id: 'title-length',
      label: 'Panjang judul',
      weight: 2,
      status: input.title.length >= 30 && input.title.length <= 60 ? 'pass'
        : input.title.length > 0 ? 'warning' : 'fail',
      message:
        input.title.length === 0
          ? 'Judul belum diisi'
          : input.title.length >= 30 && input.title.length <= 60
            ? `${input.title.length} karakter — ideal`
            : input.title.length < 30
              ? `${input.title.length} karakter — terlalu pendek, idealnya 30-60`
              : `${input.title.length} karakter — terlalu panjang, idealnya 30-60`,
    },
    {
      id: 'meta-title-length',
      label: 'Panjang meta title',
      weight: 2,
      status: !input.metaTitle
        ? 'warning'
        : metaTitleLen >= 30 && metaTitleLen <= 60
          ? 'pass'
          : 'warning',
      message: !input.metaTitle
        ? 'Meta title kosong — akan menggunakan judul artikel'
        : metaTitleLen >= 30 && metaTitleLen <= 60
          ? `${metaTitleLen} karakter — ideal`
          : `${metaTitleLen} karakter — idealnya 30-60`,
    },
    {
      id: 'meta-desc-length',
      label: 'Panjang meta description',
      weight: 2,
      status: descLen >= 120 && descLen <= 160 ? 'pass' : descLen > 0 ? 'warning' : 'fail',
      message:
        descLen === 0
          ? 'Meta description kosong — isi untuk muncul di hasil pencarian'
          : descLen >= 120 && descLen <= 160
            ? `${descLen} karakter — ideal`
            : descLen < 120
              ? `${descLen} karakter — pendek, idealnya 120-160`
              : `${descLen} karakter — panjang, idealnya 120-160`,
    },
    {
      id: 'meta-desc-set',
      label: 'Meta description diisi',
      weight: 3,
      status: input.metaDesc ? 'pass' : input.excerpt ? 'warning' : 'fail',
      message: input.metaDesc
        ? 'Meta description sudah diisi'
        : input.excerpt
          ? 'Menggunakan ringkasan sebagai fallback — isi meta description khusus'
          : 'Meta description dan ringkasan kosong',
    },
    {
      id: 'slug-length',
      label: 'Panjang slug',
      weight: 1,
      status: !input.slug
        ? 'fail'
        : input.slug.length <= 75
          ? 'pass'
          : 'warning',
      message: !input.slug
        ? 'Slug belum diisi'
        : input.slug.length <= 75
          ? `${input.slug.length} karakter — baik`
          : `${input.slug.length} karakter — terlalu panjang, usahakan ≤75`,
    },
  ];
}

function mediaChecks(input: SeoInput): SeoCheck[] {
  const images = countImages(input.html);
  const missingAlt = imagesMissingAlt(input.html);
  const levels = headingLevels(input.html);
  const headingOrderValid = levels.every((level, i) => i === 0 || level <= levels[i - 1] + 1);

  return [
    {
      id: 'has-cover',
      label: 'Gambar sampul',
      weight: 2,
      status: input.hasCover ? 'pass' : 'fail',
      message: input.hasCover ? 'Gambar sampul sudah diatur' : 'Tambahkan gambar sampul untuk social sharing',
    },
    {
      id: 'content-images',
      label: 'Gambar dalam konten',
      weight: 1,
      status: images > 0 ? 'pass' : 'warning',
      message: images > 0 ? `${images} gambar ditemukan dalam konten` : 'Tambahkan gambar untuk memperkaya konten',
    },
    {
      id: 'title-capitalized',
      label: 'Judul diawali huruf besar',
      weight: 1,
      status: !input.title ? 'fail' : /^[A-ZÀ-ɏ]/.test(input.title) ? 'pass' : 'warning',
      message: !input.title
        ? 'Judul belum diisi'
        : /^[A-ZÀ-ɏ]/.test(input.title)
          ? 'Judul diawali huruf besar'
          : 'Awali judul dengan huruf besar',
    },
    {
      id: 'slug-valid',
      label: 'Format slug valid',
      weight: 1,
      status: !input.slug ? 'fail' : /^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug) ? 'pass' : 'warning',
      message: !input.slug
        ? 'Slug belum diisi'
        : /^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)
          ? 'Slug valid (huruf kecil, angka, strip)'
          : 'Slug mengandung karakter tidak standar',
    },
    {
      id: 'image-alt',
      label: 'Alt text gambar',
      weight: 2,
      status: images === 0 ? 'warning' : missingAlt === 0 ? 'pass' : 'warning',
      message: images === 0 ? 'Belum ada gambar konten' : missingAlt === 0 ? 'Semua gambar memiliki alt text' : `${missingAlt} gambar belum memiliki alt text`,
    },
    {
      id: 'heading-order',
      label: 'Urutan heading',
      weight: 1,
      status: levels.length === 0 ? 'warning' : headingOrderValid ? 'pass' : 'warning',
      message: levels.length === 0 ? 'Belum ada heading' : headingOrderValid ? 'Hierarki heading berurutan' : 'Jangan melompati tingkat heading (mis. H2 langsung H4)',
    },
  ];
}

function readabilityChecks(input: SeoInput): SeoCheck[] {
  const avgSent = avgSentenceLength(input.text);
  const paraCount = paragraphCount(input.text);
  const words = wordCount(input.text);
  const longWords = input.text.split(/\s+/).filter((w) => w.replace(/[^\p{L}]/gu, '').length > 12).length;
  const transitionCount = (input.text.match(TRANSITIONS) || []).length;

  return [
    {
      id: 'sentence-length',
      label: 'Panjang kalimat',
      weight: 1,
      status: wordCount(input.text) === 0 ? 'fail' : avgSent <= 20 ? 'pass' : 'warning',
      message:
        wordCount(input.text) === 0
          ? 'Belum ada konten'
          : avgSent <= 20
            ? `Rata-rata ${Math.round(avgSent)} kata/kalimat — mudah dibaca`
            : `Rata-rata ${Math.round(avgSent)} kata/kalimat — pertimbangkan kalimat lebih pendek`,
    },
    {
      id: 'paragraph-count',
      label: 'Struktur paragraf',
      weight: 1,
      status: paraCount >= 3 ? 'pass' : paraCount > 0 ? 'warning' : 'fail',
      message:
        paraCount === 0
          ? 'Belum ada konten'
          : paraCount >= 3
            ? `${paraCount} paragraf — struktur baik`
            : `${paraCount} paragraf — pecah konten menjadi lebih banyak paragraf`,
    },
    {
      id: 'excerpt-set',
      label: 'Ringkasan diisi',
      weight: 1,
      status: input.excerpt ? 'pass' : 'warning',
      message: input.excerpt ? 'Ringkasan/excerpt sudah diisi' : 'Isi ringkasan untuk preview di daftar artikel',
    },
    {
      id: 'transition-words',
      label: 'Kata transisi',
      weight: 1,
      status: words === 0 ? 'fail' : transitionCount >= Math.max(1, Math.floor(words / 300)) ? 'pass' : 'warning',
      message: transitionCount > 0 ? `${transitionCount} frasa transisi ditemukan` : 'Gunakan kata transisi agar alur mudah diikuti',
    },
    {
      id: 'word-complexity',
      label: 'Kompleksitas kata',
      weight: 1,
      status: words === 0 ? 'fail' : (longWords / words) * 100 <= 10 ? 'pass' : 'warning',
      message: words === 0 ? 'Belum ada konten' : `${((longWords / words) * 100).toFixed(1)}% kata sangat panjang`,
    },
    {
      id: 'title-number',
      label: 'Angka dalam judul',
      weight: 1,
      status: /\d/.test(input.title) ? 'pass' : 'warning',
      message: /\d/.test(input.title) ? 'Judul memakai angka' : 'Angka bisa memperjelas judul listicle/panduan bila relevan',
    },
    {
      id: 'title-power-word',
      label: 'Power word judul',
      weight: 1,
      status: POWER_WORDS.test(input.title) ? 'pass' : 'warning',
      message: POWER_WORDS.test(input.title) ? 'Judul memiliki kata yang menarik' : 'Pertimbangkan kata spesifik seperti panduan, lengkap, atau praktis',
    },
  ];
}

// ── Main ────────────────────────────────────────────────────────────────────

export function runSeoChecks(input: SeoInput): SeoResult {
  const groups: SeoGroup[] = [
    { label: 'Dasar', icon: 'search', checks: basicChecks(input) },
    { label: 'Konten', icon: 'file-text', checks: contentChecks(input) },
    { label: 'Judul & Meta', icon: 'type', checks: titleMetaChecks(input) },
    { label: 'Media & Teknis', icon: 'image', checks: mediaChecks(input) },
    { label: 'Keterbacaan', icon: 'book-open', checks: readabilityChecks(input) },
  ];

  let score = 0;
  let maxScore = 0;
  for (const group of groups) {
    for (const check of group.checks) {
      maxScore += check.weight;
      if (check.status === 'pass') score += check.weight;
      else if (check.status === 'warning') score += Math.floor(check.weight / 2);
    }
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return { score, maxScore, percentage, groups };
}

export function scoreLabel(percentage: number): { text: string; color: string } {
  if (percentage >= 91) return { text: 'Sangat Baik', color: 'text-emerald-400' };
  if (percentage >= 71) return { text: 'Baik', color: 'text-green-400' };
  if (percentage >= 41) return { text: 'Cukup', color: 'text-amber-400' };
  return { text: 'Perlu Perbaikan', color: 'text-red-400' };
}

export function scoreBgColor(percentage: number): string {
  if (percentage >= 91) return 'bg-emerald-500';
  if (percentage >= 71) return 'bg-green-500';
  if (percentage >= 41) return 'bg-amber-500';
  return 'bg-red-500';
}

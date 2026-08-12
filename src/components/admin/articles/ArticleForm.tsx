import * as React from 'react';
import type { JSONContent } from '@tiptap/react';
import TipTapEditor, { type EditorHandle } from '../editor/TipTapEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Icon } from '../icon';
import { toSlug } from '@/lib/slug';
import { uploadMedia } from '@/lib/upload';
import type { ArticleStatus, Category, Tag } from '@/lib/supabase/types';
import SeoAnalyzer from './SeoAnalyzer';
import ArticleSeoPanel, { type ArticleSeoValue } from './ArticleSeoPanel';
import { runSeoChecks } from './seo-checks';
import type { SeoSettings, RobotsToken } from '@/lib/seo';

export interface ArticleInitial {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: JSONContent | null;
  cover_image: string;
  cover_ratio: string;
  cover_focal: string;
  cover_size: string;
  status: ArticleStatus;
  published_at: string | null;
  category_id: string | null;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  secondary_keywords: string[];
  canonical_url: string;
  robots: RobotsToken[] | null;
  og_title: string;
  og_description: string;
  og_image: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image: string;
  schema_type: string;
  schema_data: Record<string, unknown>;
  is_pillar: boolean;
  sitemap_include: boolean;
  seo_score: number | null;
  tag_ids: string[];
}

interface Props {
  initial: ArticleInitial;
  categories: Category[];
  tags: Tag[];
  seoSettings: SeoSettings;
  usedFocusKeywords?: string[];
}

const NO_CATEGORY = '__none__';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Cover sizing helpers: ratio string → CSS aspect-ratio, focal 'x,y' → object-position.
function aspectRatioCss(ratio: string): string {
  switch (ratio) {
    case '4:3': return '4 / 3';
    case '1:1': return '1 / 1';
    case 'original': return 'auto';
    default: return '16 / 9';
  }
}
function focalToObjectPosition(focal: string): string {
  const [x, y] = focal.split(',').map((n) => Number(n));
  if (Number.isNaN(x) || Number.isNaN(y)) return '50% 50%';
  return `${x}% ${y}%`;
}

export default function ArticleForm({ initial, categories, tags, seoSettings, usedFocusKeywords = [] }: Props) {
  const [title, setTitle] = React.useState(initial.title);
  const [slug, setSlug] = React.useState(initial.slug);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial.slug));
  const [excerpt, setExcerpt] = React.useState(initial.excerpt);
  const [cover, setCover] = React.useState(initial.cover_image);
  const [coverRatio, setCoverRatio] = React.useState(initial.cover_ratio || '16:9');
  const [coverFocal, setCoverFocal] = React.useState(initial.cover_focal || '50,50');
  const [coverSize, setCoverSize] = React.useState(initial.cover_size || 'full');
  const [status, setStatus] = React.useState<ArticleStatus>(initial.status);
  const [publishedAt, setPublishedAt] = React.useState(initial.published_at ?? '');
  const [categoryId, setCategoryId] = React.useState(initial.category_id ?? NO_CATEGORY);
  const [tagIds, setTagIds] = React.useState<string[]>(initial.tag_ids);
  const [metaTitle, setMetaTitle] = React.useState(initial.meta_title);
  const [metaDesc, setMetaDesc] = React.useState(initial.meta_description);
  const [saving, setSaving] = React.useState(false);
  const [focusKeyword, setFocusKeyword] = React.useState(initial.focus_keyword ?? '');
  const [secondaryKeywords, setSecondaryKeywords] = React.useState(initial.secondary_keywords ?? []);
  const [canonicalUrl, setCanonicalUrl] = React.useState(initial.canonical_url ?? '');
  const [robots, setRobots] = React.useState<RobotsToken[] | null>(initial.robots ?? null);
  const [ogTitle, setOgTitle] = React.useState(initial.og_title ?? '');
  const [ogDescription, setOgDescription] = React.useState(initial.og_description ?? '');
  const [ogImage, setOgImage] = React.useState(initial.og_image ?? '');
  const [twitterTitle, setTwitterTitle] = React.useState(initial.twitter_title ?? '');
  const [twitterDescription, setTwitterDescription] = React.useState(initial.twitter_description ?? '');
  const [twitterImage, setTwitterImage] = React.useState(initial.twitter_image ?? '');
  const [schemaType, setSchemaType] = React.useState(initial.schema_type ?? 'BlogPosting');
  const [schemaData, setSchemaData] = React.useState<Record<string, unknown>>(initial.schema_data ?? {});
  const [isPillar, setIsPillar] = React.useState(initial.is_pillar ?? false);
  const [sitemapInclude, setSitemapInclude] = React.useState(initial.sitemap_include ?? true);
  const [seoScore, setSeoScore] = React.useState(initial.seo_score ?? 0);
  const [contentText, setContentText] = React.useState('');
  const [contentHtml, setContentHtml] = React.useState('');
  // Autosave indicator: 'idle' | 'saving' | 'saved' | 'error'
  const [autosave, setAutosave] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastAutosaveAt = React.useRef(0);

  const editorState = React.useRef<{ json: JSONContent | null; html: string; text: string }>({
    json: initial.content,
    html: '',
    text: '',
  });
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const editorRef = React.useRef<EditorHandle>(null);

  // base-ui Select resolves the trigger label from `items` BEFORE the dropdown
  // is opened. Without it the trigger shows the raw value (e.g. a category UUID
  // or "published") until first open. Build value→label maps once.
  const statusItems = React.useMemo(
    () => ({ draft: 'Draf', published: 'Terbit', scheduled: 'Terjadwal', archived: 'Arsip' }),
    [],
  );
  const categoryItems = React.useMemo(() => {
    const m: Record<string, string> = { [NO_CATEGORY]: 'Tanpa kategori' };
    for (const c of categories) m[c.id] = c.name;
    return m;
  }, [categories]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(toSlug(value));
  }

  // Smart paste (WordPress/Elementor-style): pasting a whole draft into the
  // title field splits the first line into the title and pours the rest into the
  // editor body. A single-line paste is left untouched (normal behaviour).
  function handleTitlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    let firstLine = '';
    let restHtml = '';

    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // Editors like Google Docs wrap everything in a single <b>/<div>; unwrap
      // such single-child wrappers until we reach the real list of blocks.
      let container: Element = doc.body;
      while (true) {
        const kids = Array.from(container.children).filter(
          (el) => (el.textContent ?? '').trim().length > 0,
        );
        if (kids.length === 1 && kids[0].children.length > 0) container = kids[0];
        else break;
      }
      const blocks = Array.from(container.children).filter(
        (el) => (el.textContent ?? '').trim().length > 0,
      );
      if (blocks.length > 1) {
        firstLine = (blocks[0].textContent ?? '').trim();
        restHtml = blocks.slice(1).map((el) => el.outerHTML).join('');
      }
    }

    // Fall back to plain text (also covers HTML that wouldn't split — the plain
    // clipboard flavour from Docs/Word keeps real newlines between paragraphs).
    if ((!firstLine || !restHtml) && plain) {
      const lines = plain.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        firstLine = lines[0];
        restHtml = lines.slice(1).map((l) => `<p>${escapeHtml(l)}</p>`).join('');
      }
    }

    // Nothing to split → let the browser paste normally into the input.
    if (!firstLine || !restHtml) return;

    e.preventDefault();
    onTitleChange(firstLine);
    editorRef.current?.appendContent(restHtml);
    toast.success('Judul & isi terpisah otomatis');
  }

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    const id = toast.loading('Mengunggah sampul…');
    try {
      const { publicUrl } = await uploadMedia(file, 'covers');
      setCover(publicUrl);
      toast.success('Sampul diunggah', { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal', { id });
    }
  }

  // `silent`: autosave path — no toast spam, light status indicator instead.
  // Returns true on success so callers (autosave, manual save) can react.
  async function save(nextStatus?: ArticleStatus, opts: { silent?: boolean } = {}): Promise<boolean> {
    const silent = opts.silent ?? false;
    const effectiveStatus = nextStatus ?? status;
    if (!title.trim()) {
      if (!silent) toast.error('Judul wajib diisi');
      return false;
    }
    if (!silent) setSaving(true); else setAutosave('saving');
    try {
      const res = await fetch('/api/articles/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: initial.id,
          title,
          slug: slug || toSlug(title),
          excerpt: excerpt || null,
          content: editorState.current.json,
          content_html: editorState.current.html,
          plain_text: editorState.current.text,
          cover_image: cover || null,
          cover_ratio: coverRatio,
          cover_focal: coverFocal,
          cover_size: coverSize,
          status: effectiveStatus,
          published_at: publishedAt || null,
          category_id: categoryId === NO_CATEGORY ? null : categoryId,
          meta_title: metaTitle || null,
          meta_description: metaDesc || null,
          focus_keyword: focusKeyword || null,
          secondary_keywords: secondaryKeywords,
          canonical_url: canonicalUrl || null,
          robots,
          og_title: ogTitle || null,
          og_description: ogDescription || null,
          og_image: ogImage || cover || null,
          twitter_title: twitterTitle || null,
          twitter_description: twitterDescription || null,
          twitter_image: twitterImage || null,
          schema_type: schemaType,
          schema_data: schemaData,
          is_pillar: isPillar,
          sitemap_include: sitemapInclude,
          seo_score: runSeoChecks({ focusKeyword, title, slug, metaTitle, metaDesc, excerpt, text: editorState.current.text, html: editorState.current.html, hasCover: Boolean(cover), usedFocusKeywords }).percentage,
          tag_ids: tagIds,
        }),
      });
      const body = (await res.json()) as { ok: boolean; id?: string; slug?: string; seo_score?: number; sitemap_include?: boolean; error?: string };
      if (!body.ok) {
        if (!silent) toast.error(body.error ?? 'Gagal menyimpan');
        else setAutosave('error');
        return false;
      }
      setStatus(effectiveStatus);
      if (typeof body.seo_score === 'number') setSeoScore(body.seo_score);
      if (typeof body.sitemap_include === 'boolean') setSitemapInclude(body.sitemap_include);
      if (silent) {
        setAutosave('saved');
        lastAutosaveAt.current = Date.now();
      } else {
        toast.success(effectiveStatus === 'published' ? 'Artikel diterbitkan' : 'Tersimpan');
      }
      // On first create, move to the edit URL so subsequent saves update.
      if (!initial.id && body.id) {
        window.history.replaceState(null, '', `/admin/articles/${body.id}`);
        initial.id = body.id;
      }
      return true;
    } catch {
      if (!silent) toast.error('Gagal menyimpan');
      else setAutosave('error');
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  }

  // Autosave: after the editor pauses, save the current state as a draft so the
  // user never loses work if they forget to click "Simpan Draf". It never
  // downgrades a published/scheduled article — only persists draft copies in the
  // background. Triggered by any tracked field change; debounced 4s.
  const AUTOSAVE_MS = 4000;
  React.useEffect(() => {
    // Nothing to autosave yet (no title = nothing meaningful), and never
    // auto-downgrade an article that's already published/scheduled.
    if (!initial.id && !title.trim()) return;
    if (status === 'published' || status === 'scheduled') return;
    const t = setTimeout(() => { void save('draft', { silent: true }); }, AUTOSAVE_MS);
    return () => clearTimeout(t);
    // editorState is a ref; contentText/contentHtml mirror it for dependency tracking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, excerpt, cover, coverRatio, coverFocal, coverSize, status, categoryId, tagIds, metaTitle, metaDesc, focusKeyword, secondaryKeywords, canonicalUrl, robots, ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription, twitterImage, schemaType, schemaData, isPillar, sitemapInclude, contentText, contentHtml, initial.id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <a href="/admin/articles" className="text-muted-foreground hover:text-foreground">
            <Icon name="arrow-left" className="size-5" />
          </a>
          <h1 className="text-xl font-semibold">{initial.id ? 'Edit Artikel' : 'Artikel Baru'}</h1>
          <Badge variant="outline" className="capitalize">{status}</Badge>
          <Badge variant="outline" className={seoScore >= 71 ? 'border-emerald-500/30 text-emerald-400' : seoScore >= 41 ? 'border-amber-500/30 text-amber-400' : 'border-red-500/30 text-red-400'}>SEO {seoScore}/100</Badge>
          <AutosaveBadge state={autosave} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => save('draft')} disabled={saving}>
            <Icon name="save" /> Simpan Draf
          </Button>
          <Button onClick={() => save('published')} disabled={saving}>
            {saving ? <Icon name="loader-circle" className="animate-spin" /> : <Icon name="send" />}
            Terbitkan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onPaste={handleTitlePaste}
            placeholder="Judul artikel… (tempel seluruh draf untuk pisah otomatis)"
            className="h-12 border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0 md:text-3xl"
          />
          <TipTapEditor
            ref={editorRef}
            initialContent={initial.content}
            onChange={(json, html, text) => {
              editorState.current = { json, html, text };
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                setContentText(text);
                setContentHtml(html);
              }, 500);
            }}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Publikasi</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select items={statusItems} value={status} onValueChange={(v: string | null) => { if (v) setStatus(v as ArticleStatus); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draf</SelectItem>
                    <SelectItem value="published">Terbit</SelectItem>
                    <SelectItem value="scheduled">Terjadwal</SelectItem>
                    <SelectItem value="archived">Arsip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(status === 'scheduled' || status === 'published') && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Tanggal terbit</Label>
                  <Input
                    type="datetime-local"
                    value={publishedAt ? publishedAt.slice(0, 16) : ''}
                    onChange={(e) => setPublishedAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Sampul</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cover ? (
                <>
                  <div className="group relative overflow-hidden rounded-md border">
                    <img
                      src={cover}
                      alt="Sampul"
                      className="w-full object-cover"
                      style={{ aspectRatio: aspectRatioCss(coverRatio), objectPosition: focalToObjectPosition(coverFocal) }}
                    />
                    <button
                      onClick={() => setCover('')}
                      className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Hapus sampul"
                    >
                      <Icon name="x" className="size-4" />
                    </button>
                  </div>
                  {/* Aspect ratio picker */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rasio potong</Label>
                    <div className="flex gap-1.5">
                      {(['16:9', '4:3', '1:1', 'original'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setCoverRatio(r)}
                          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${coverRatio === r ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >{r === 'original' ? 'Asli' : r}</button>
                      ))}
                    </div>
                  </div>
                  {/* Display size preset (controls max-width/height on the public page) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ukuran tampilan</Label>
                    <div className="flex gap-1.5">
                      {([
                        { value: 'full', label: 'Penuh' },
                        { value: 'medium', label: 'Sedang' },
                        { value: 'small', label: 'Kecil' },
                      ] as const).map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setCoverSize(s.value)}
                          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${coverSize === s.value ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >{s.label}</button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {coverSize === 'full' && 'Gambar selebar konten — tinggi maks 520px.'}
                      {coverSize === 'medium' && 'Gambar dibatasi ~720px — lebih ringkas.'}
                      {coverSize === 'small' && 'Gambar kecil ~480px — fokus ke teks.'}
                    </p>
                  </div>
                  {/* Focal point (drag on the image or sliders) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Titik fokus (geser untuk atur potongan)</Label>
                    <FocalPicker
                      src={cover}
                      ratio={coverRatio}
                      value={coverFocal}
                      onChange={setCoverFocal}
                    />
                  </div>
                </>
              ) : (
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-primary/50 hover:text-foreground"
                >
                  <Icon name="image-plus" className="size-6" />
                  <span className="text-xs">Unggah sampul</span>
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadCover(e.target.files?.[0])}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Kategori & Tag</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori</Label>
                <Select items={categoryItems} value={categoryId} onValueChange={(v: string | null) => setCategoryId(v ?? NO_CATEGORY)}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Tanpa kategori</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tag</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.length === 0 && <span className="text-xs text-muted-foreground">Belum ada tag.</span>}
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        tagIds.includes(t.id)
                          ? 'border-primary bg-primary/15 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Ringkasan & URL</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Slug</Label>
                <Input value={slug} onChange={(e) => { setSlug(toSlug(e.target.value)); setSlugTouched(true); }} placeholder="judul-artikel" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ringkasan</Label>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} placeholder="Ringkasan singkat…" />
              </div>
            </CardContent>
          </Card>

          <ArticleSeoPanel
            value={{ focusKeyword, secondaryKeywords, metaTitle, metaDescription: metaDesc, canonicalUrl, robots, ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription, twitterImage, schemaType, schemaData, isPillar, sitemapInclude }}
            onChange={(key, value) => {
              const setters: Record<keyof ArticleSeoValue, (v: any) => void> = {
                focusKeyword: setFocusKeyword, secondaryKeywords: setSecondaryKeywords, metaTitle: setMetaTitle,
                metaDescription: setMetaDesc, canonicalUrl: setCanonicalUrl, robots: setRobots,
                ogTitle: setOgTitle, ogDescription: setOgDescription, ogImage: setOgImage,
                twitterTitle: setTwitterTitle, twitterDescription: setTwitterDescription, twitterImage: setTwitterImage,
                schemaType: setSchemaType, schemaData: setSchemaData, isPillar: setIsPillar, sitemapInclude: setSitemapInclude,
              };
              setters[key](value);
            }}
            title={title} slug={slug} excerpt={excerpt} coverImage={cover} settings={seoSettings}
          />

          <SeoAnalyzer
            title={title}
            slug={slug}
            metaTitle={metaTitle}
            metaDesc={metaDesc}
            excerpt={excerpt}
            contentText={contentText}
            contentHtml={contentHtml}
            hasCover={Boolean(cover)}
            focusKeyword={focusKeyword}
            usedFocusKeywords={usedFocusKeywords}
            onFocusKeywordChange={setFocusKeyword}
            onScoreChange={setSeoScore}
          />
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

// Compact autosave status shown next to the article status badge. Stays subtle
// (no toasts) so background draft saves don't interrupt writing.
function AutosaveBadge({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null;
  const map = {
    saving: { text: 'Menyimpan draf…', className: 'text-muted-foreground', icon: 'loader-circle', spin: true },
    saved: { text: 'Draf tersimpan', className: 'text-emerald-500', icon: 'circle-check', spin: false },
    error: { text: 'Gagal menyimpan draf', className: 'text-destructive', icon: 'circle-x', spin: false },
  } as const;
  const s = map[state];
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${s.className}`}>
      <Icon name={s.icon} className={`size-3.5 ${s.spin ? 'animate-spin' : ''}`} />
      {s.text}
    </span>
  );
}

// Click/drag on a small preview to set the cover focal point (crop position).
// Stores 'x,y' as 0-100 percentages.
function FocalPicker({ src, ratio, value, onChange }: {
  src: string;
  ratio: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [x, y] = value.split(',').map((n) => Number(n));
  const fx = Number.isNaN(x) ? 50 : x;
  const fy = Number.isNaN(y) ? 50 : y;

  function update(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const ny = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
    onChange(`${nx},${ny}`);
  }
  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    update(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (e.buttons !== 1) return;
    update(e);
  }

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      className="relative w-full cursor-crosshair overflow-hidden rounded-md border"
      style={{ aspectRatio: aspectRatioCss(ratio) }}
      title="Klik atau geser untuk atur titik fokus"
    >
      <img src={src} alt="Pratinjau fokus" className="h-full w-full object-cover" style={{ objectPosition: `${fx}% ${fy}%` }} draggable={false} />
      {/* crosshair */}
      <span
        className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        style={{ left: `${fx}%`, top: `${fy}%`, backgroundColor: 'rgba(94,228,240,0.7)' }}
      />
      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{fx},{fy}</span>
    </div>
  );
}


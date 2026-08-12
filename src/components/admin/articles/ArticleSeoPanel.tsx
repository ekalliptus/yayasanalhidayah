import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icon } from '../icon';
import { ROBOTS_TOKENS, resolveSeo, type RobotsToken, type SeoSettings } from '@/lib/seo';

export interface ArticleSeoValue {
  focusKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  robots: RobotsToken[] | null;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemaType: string;
  schemaData: Record<string, unknown>;
  isPillar: boolean;
  sitemapInclude: boolean;
}

interface Props {
  value: ArticleSeoValue;
  onChange: <K extends keyof ArticleSeoValue>(key: K, value: ArticleSeoValue[K]) => void;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  settings: SeoSettings;
}

export default function ArticleSeoPanel({ value, onChange, title, slug, excerpt, coverImage, settings }: Props) {
  // Keep the raw textarea draft local so an incomplete `Question|` line does
  // not disappear while the editor is still typing it.
  const [faqDraft, setFaqDraft] = React.useState(() => faqText(value.schemaData));
  const preview = resolveSeo({
    kind: 'article', pathname: `/artikel/${slug || 'judul-artikel'}`, title: value.metaTitle || title || 'Judul artikel',
    description: value.metaDescription || excerpt || 'Meta description artikel akan tampil di sini.',
    canonical: value.canonicalUrl || undefined, ogImage: value.ogImage || coverImage,
    robots: value.robots, ogTitle: value.ogTitle, ogDescription: value.ogDescription,
    twitterTitle: value.twitterTitle, twitterDescription: value.twitterDescription, twitterImage: value.twitterImage,
    focusKeyword: value.focusKeyword,
  }, settings);

  return <Card>
    <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Icon name="search-check" className="size-4" /> Rank Math SEO</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <SerpPreview title={preview.title} url={preview.canonical} description={preview.description} />
      <Tabs defaultValue="general">
        <TabsList className="grid h-auto w-full grid-cols-4"><TabsTrigger className="px-1 text-[10px]" value="general">Umum</TabsTrigger><TabsTrigger className="px-1 text-[10px]" value="social">Sosial</TabsTrigger><TabsTrigger className="px-1 text-[10px]" value="schema">Schema</TabsTrigger><TabsTrigger className="px-1 text-[10px]" value="advanced">Lanjutan</TabsTrigger></TabsList>
        <TabsContent value="general" className="space-y-3 pt-3">
          <Field label="Focus keyword" value={value.focusKeyword} onChange={(v) => onChange('focusKeyword', v)} placeholder="yayasan al hidayah" />
          <Field label="Keyword sekunder" value={value.secondaryKeywords.join(', ')} onChange={(v) => onChange('secondaryKeywords', v.split(',').map((k) => k.trim()).filter(Boolean))} hint="Pisahkan dengan koma." />
          <Field label="Meta title" value={value.metaTitle} onChange={(v) => onChange('metaTitle', v)} placeholder={title} max={60} />
          <Area label="Meta description" value={value.metaDescription} onChange={(v) => onChange('metaDescription', v)} placeholder={excerpt} max={160} />
        </TabsContent>
        <TabsContent value="social" className="space-y-3 pt-3">
          <Field label="Open Graph title" value={value.ogTitle} onChange={(v) => onChange('ogTitle', v)} placeholder={preview.title} />
          <Area label="Open Graph description" value={value.ogDescription} onChange={(v) => onChange('ogDescription', v)} placeholder={preview.description} />
          <Field label="Open Graph image" value={value.ogImage} onChange={(v) => onChange('ogImage', v)} placeholder={coverImage || 'https://…'} />
          <Field label="Twitter title" value={value.twitterTitle} onChange={(v) => onChange('twitterTitle', v)} placeholder={value.ogTitle || preview.title} />
          <Area label="Twitter description" value={value.twitterDescription} onChange={(v) => onChange('twitterDescription', v)} placeholder={value.ogDescription || preview.description} />
          <Field label="Twitter image" value={value.twitterImage} onChange={(v) => onChange('twitterImage', v)} placeholder={value.ogImage || coverImage || 'https://…'} />
        </TabsContent>
        <TabsContent value="schema" className="space-y-3 pt-3">
          <SelectField label="Tipe schema" value={value.schemaType} onChange={(v) => onChange('schemaType', v)} options={[['BlogPosting','Blog Posting'],['Article','Article'],['NewsArticle','News Article'],['FAQPage','FAQ Page'],['HowTo','How To'],['none','Tanpa schema']]} />
          {value.schemaType === 'FAQPage' && <Area label="FAQ (satu Q|A per baris)" value={faqDraft} onChange={(raw) => { setFaqDraft(raw); onChange('schemaData', { faqs: raw.split(/\r?\n/).map((line) => { const [question, ...answer] = line.split('|'); return { question: question?.trim(), answer: answer.join('|').trim() }; }).filter((item) => item.question && item.answer) }); }} placeholder="Apa itu kafarat?|Kafarat adalah…" />}
          {value.schemaType === 'HowTo' && <><Field label="Nama panduan" value={String(value.schemaData.name ?? '')} onChange={(v) => onChange('schemaData', { ...value.schemaData, name: v })} /><Area label="Langkah (satu per baris)" value={Array.isArray(value.schemaData.steps) ? value.schemaData.steps.join('\n') : ''} onChange={(raw) => onChange('schemaData', { ...value.schemaData, steps: raw.split(/\r?\n/).map((v) => v.trim()).filter(Boolean) })} /></>}
          <Toggle label="Pillar content" hint="Tandai sebagai konten utama untuk topik ini." checked={value.isPillar} onChange={(v) => onChange('isPillar', v)} />
        </TabsContent>
        <TabsContent value="advanced" className="space-y-3 pt-3">
          <Field label="Canonical URL" value={value.canonicalUrl} onChange={(v) => onChange('canonicalUrl', v)} placeholder={preview.canonical} />
          <div className="space-y-2"><Label className="text-xs">Robots override</Label><div className="flex flex-wrap gap-1.5">{ROBOTS_TOKENS.map((token) => { const active = (value.robots ?? []).includes(token.value); return <button type="button" key={token.value} title={token.hint} onClick={() => { const current = value.robots ?? []; let next = active ? current.filter((v) => v !== token.value) : [...current, token.value]; if (token.value === 'index' && !active) next = next.filter((v) => v !== 'noindex'); if (token.value === 'noindex' && !active) next = next.filter((v) => v !== 'index'); onChange('robots', next.length ? next as RobotsToken[] : null); }} className={`rounded-md border px-2 py-1 text-[10px] ${active ? 'border-primary bg-primary/10' : 'text-muted-foreground'}`}>{token.label}</button>; })}</div><p className="text-[10px] text-muted-foreground">Kosong = ikuti robots global.</p></div>
          <Toggle label="Masukkan ke sitemap" checked={value.sitemapInclude} onChange={(v) => onChange('sitemapInclude', v)} />
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>;
}

function faqText(data: Record<string, unknown>): string {
  if (!Array.isArray(data.faqs)) return '';
  return data.faqs.map((item: any) => `${item.question ?? ''}|${item.answer ?? ''}`).join('\n');
}
function SerpPreview({ title, url, description }: { title: string; url: string; description: string }) { return <div className="rounded-lg border bg-white p-3 text-left dark:bg-white"><p className="truncate text-[11px] text-[#202124]">{url}</p><p className="mt-0.5 line-clamp-1 text-base leading-tight text-[#1a0dab]">{title}</p><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#4d5156]">{description}</p></div>; }
function Field({ label, value, onChange, placeholder, hint, max }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; max?: number }) { return <div className="space-y-1.5"><div className="flex justify-between"><Label className="text-xs">{label}</Label>{max && <span className={`text-[10px] ${value.length > max ? 'text-destructive' : 'text-muted-foreground'}`}>{value.length}/{max}</span>}</div><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />{hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}</div>; }
function Area({ label, value, onChange, placeholder, max }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; max?: number }) { return <div className="space-y-1.5"><div className="flex justify-between"><Label className="text-xs">{label}</Label>{max && <span className={`text-[10px] ${value.length > max ? 'text-destructive' : 'text-muted-foreground'}`}>{value.length}/{max}</span>}</div><Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>; }
function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) { return <div className="flex items-center justify-between gap-3 rounded-md border p-3"><div><p className="text-xs font-medium">{label}</p>{hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}</div><Switch checked={checked} onCheckedChange={onChange} /></div>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string,string][] }) { const items = Object.fromEntries(options); return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Select items={items} value={value} onValueChange={(v: string | null) => v && onChange(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>; }

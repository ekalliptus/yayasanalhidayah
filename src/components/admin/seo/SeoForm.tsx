import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Icon } from '../icon';
import {
  ROBOTS_TOKENS, SEO_VARIABLES, type RobotsToken, type SeoSettings,
} from '@/lib/seo';

interface Props { initial: SeoSettings }

export default function SeoForm({ initial }: Props) {
  const [s, setS] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch('/api/seo/settings', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s),
      });
      const body = await response.json() as { ok: boolean; error?: string; settings?: SeoSettings };
      if (!body.ok) throw new Error(body.error || 'Gagal menyimpan');
      if (body.settings) setS(body.settings);
      toast.success('Setelan SEO disimpan');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan');
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-5xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Rank Math SEO</h1>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Aktif</span>
          </div>
          <p className="text-sm text-muted-foreground">Satu sumber untuk metadata, schema, sitemap, indexing, dan sosial.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<a href="/sitemap_index.xml" target="_blank" />}><Icon name="external-link" /> Sitemap</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Icon name="loader-circle" className="animate-spin" /> : <Icon name="save" />}
            Simpan perubahan
          </Button>
        </div>
      </header>

      <Tabs defaultValue="site">
        <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto p-1">
          <TabsTrigger value="site">Situs</TabsTrigger>
          <TabsTrigger value="titles">Judul & meta</TabsTrigger>
          <TabsTrigger value="robots">Robots</TabsTrigger>
          <TabsTrigger value="social">Sosial</TabsTrigger>
          <TabsTrigger value="verify">Verifikasi</TabsTrigger>
          <TabsTrigger value="local">Local SEO</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="tools">Peralatan</TabsTrigger>
        </TabsList>

        <Tab value="site">
          <Section title="Identitas situs" icon="globe-2">
            <Field label="Nama situs" value={s.site_name} onChange={(v) => set('site_name', v)} />
            <Field label="URL situs" type="url" value={s.site_url} onChange={(v) => set('site_url', v)} hint="Tanpa garis miring di akhir." />
            <Field label="Deskripsi situs" multiline value={s.site_description} onChange={(v) => set('site_description', v)} />
            <Field label="Locale" value={s.site_locale} onChange={(v) => set('site_locale', v)} placeholder="id_ID" />
          </Section>
          <Section title="Beranda" icon="house">
            <Field label="Judul beranda" value={s.homepage_title} onChange={(v) => set('homepage_title', v)} count max={60} />
            <Field label="Deskripsi beranda" multiline value={s.homepage_description} onChange={(v) => set('homepage_description', v)} count max={160} />
          </Section>
        </Tab>

        <Tab value="titles">
          <Section title="Template judul" icon="type">
            <Field label="Pemisah judul" value={s.title_separator} onChange={(v) => set('title_separator', v)} className="max-w-28" placeholder="—" />
            <Toggle label="Kapitalisasi otomatis" hint="Kapitalisasi awal setiap kata pada title tag." checked={s.capitalize_titles} onChange={(v) => set('capitalize_titles', v)} />
            <Field label="Template artikel" value={s.article_title_template} onChange={(v) => set('article_title_template', v)} />
            <Field label="Template deskripsi artikel" value={s.article_description_template} onChange={(v) => set('article_description_template', v)} />
            <Field label="Template halaman" value={s.page_title_template} onChange={(v) => set('page_title_template', v)} />
            <Field label="Template arsip" value={s.archive_title_template} onChange={(v) => set('archive_title_template', v)} />
          </Section>
          <Section title="Variabel tersedia" icon="braces">
            <p className="text-xs text-muted-foreground">Klik token untuk menyalin. Tempel ke kolom template.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SEO_VARIABLES.map((variable) => (
                <button key={variable.token} type="button" onClick={() => {
                  void navigator.clipboard.writeText(variable.token);
                  toast.success(`${variable.token} disalin`);
                }} className="rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <code className="text-xs text-primary">{variable.token}</code>
                  <span className="ml-2 text-xs text-muted-foreground">{variable.label}</span>
                </button>
              ))}
            </div>
          </Section>
        </Tab>

        <Tab value="robots">
          <Section title="Robots global" icon="bot">
            <Toggle label="Izinkan pengindeksan situs" hint="Matikan untuk staging. Semua halaman menjadi noindex, nofollow." checked={s.robots_index} onChange={(v) => set('robots_index', v)} />
            <div className="space-y-2">
              <Label className="text-xs">Directive default</Label>
              <div className="flex flex-wrap gap-2">
                {ROBOTS_TOKENS.map((token) => {
                  const active = s.robots_global.includes(token.value);
                  return <button key={token.value} type="button" title={token.hint} onClick={() => {
                    let next = active ? s.robots_global.filter((v) => v !== token.value) : [...s.robots_global, token.value];
                    if (token.value === 'index' && !active) next = next.filter((v) => v !== 'noindex');
                    if (token.value === 'noindex' && !active) next = next.filter((v) => v !== 'index');
                    set('robots_global', next as RobotsToken[]);
                  }} className={`rounded-md border px-2.5 py-1 text-xs ${active ? 'border-primary bg-primary/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{token.label}</button>;
                })}
              </div>
            </div>
            <Toggle label="Noindex halaman paginasi" hint="Halaman 2 dan seterusnya tidak masuk indeks." checked={s.noindex_paginated} onChange={(v) => set('noindex_paginated', v)} />
          </Section>
          <Section title="Robots lanjutan" icon="sliders-horizontal">
            <NumberField label="Max snippet" value={s.robots_max_snippet} onChange={(v) => set('robots_max_snippet', v)} hint="-1 = tanpa batas, 0 = tidak ada snippet." />
            <NumberField label="Max video preview" value={s.robots_max_video_preview} onChange={(v) => set('robots_max_video_preview', v)} hint="-1 = tanpa batas." />
            <SelectField label="Max image preview" value={s.robots_max_image_preview} onChange={(v) => set('robots_max_image_preview', v as SeoSettings['robots_max_image_preview'])} options={[['none','Tidak ada'],['standard','Standar'],['large','Besar']]} />
          </Section>
        </Tab>

        <Tab value="social">
          <Section title="Open Graph" icon="share-2">
            <Field label="Gambar OG default" type="url" value={s.default_og_image} onChange={(v) => set('default_og_image', v)} placeholder="https://…/og-default.webp" hint="Ukuran rekomendasi 1200 × 630 px." />
            <Field label="Alt gambar OG" value={s.og_image_alt} onChange={(v) => set('og_image_alt', v)} />
            <Field label="Facebook App ID" value={s.facebook_app_id} onChange={(v) => set('facebook_app_id', v)} />
          </Section>
          <Section title="Twitter / X" icon="twitter">
            <Field label="Handle" value={s.twitter_handle} onChange={(v) => set('twitter_handle', v)} placeholder="@akun" />
            <SelectField label="Tipe kartu" value={s.twitter_card_type} onChange={(v) => set('twitter_card_type', v as SeoSettings['twitter_card_type'])} options={[['summary_large_image','Gambar besar'],['summary','Ringkasan']]} />
          </Section>
          <Section title="Profil organisasi" icon="link">
            <LinesField label="URL profil sosial" value={s.social_profiles} onChange={(v) => set('social_profiles', v)} hint="Satu URL per baris. Dipakai pada Organization.sameAs." />
          </Section>
        </Tab>

        <Tab value="verify">
          <Section title="Verifikasi webmaster" icon="badge-check">
            <Field label="Google Search Console" value={s.gsc_verification} onChange={(v) => set('gsc_verification', v)} />
            <Field label="Bing Webmaster" value={s.bing_verification} onChange={(v) => set('bing_verification', v)} />
            <Field label="Yandex" value={s.yandex_verification} onChange={(v) => set('yandex_verification', v)} />
            <Field label="Baidu" value={s.baidu_verification} onChange={(v) => set('baidu_verification', v)} />
            <Field label="Pinterest" value={s.pinterest_verification} onChange={(v) => set('pinterest_verification', v)} />
            <Field label="Norton Safe Web" value={s.norton_verification} onChange={(v) => set('norton_verification', v)} />
          </Section>
          <Section title="Analitik" icon="chart-no-axes-combined">
            <Field label="Google Analytics 4" value={s.ga4_id} onChange={(v) => set('ga4_id', v)} placeholder="G-XXXXXXXXXX" hint="Kosongkan untuk menonaktifkan." />
            <Field label="Google Tag Manager" value={s.gtm_id} onChange={(v) => set('gtm_id', v)} placeholder="GTM-XXXXXXX" hint="Kosongkan untuk menonaktifkan." />
          </Section>
        </Tab>

        <Tab value="local">
          <Section title="Organisasi" icon="building-2">
            <SelectField label="Tipe schema" value={s.org_type} onChange={(v) => set('org_type', v as SeoSettings['org_type'])} options={[['Organization','Organization'],['NGO','NGO'],['LocalBusiness','Local Business'],['Person','Person']]} />
            <Field label="Nama" value={s.org_name} onChange={(v) => set('org_name', v)} />
            <Field label="Nama alternatif" value={s.org_alternate_name} onChange={(v) => set('org_alternate_name', v)} />
            <Field label="Nama legal" value={s.org_legal_name} onChange={(v) => set('org_legal_name', v)} />
            <Field label="Deskripsi" multiline value={s.org_description} onChange={(v) => set('org_description', v)} />
            <Field label="Logo" type="url" value={s.org_logo} onChange={(v) => set('org_logo', v)} />
            <Field label="URL" type="url" value={s.org_url} onChange={(v) => set('org_url', v)} />
            <Field label="Email" type="email" value={s.org_email} onChange={(v) => set('org_email', v)} />
            <Field label="Telepon" value={s.org_phone} onChange={(v) => set('org_phone', v)} />
            <Field label="Tanggal berdiri" value={s.org_founding_date} onChange={(v) => set('org_founding_date', v)} placeholder="2025" />
            <Field label="NPWP / Tax ID" value={s.org_tax_id} onChange={(v) => set('org_tax_id', v)} />
          </Section>
          <Section title="Alamat & wilayah" icon="map-pin">
            <Field label="Alamat jalan" value={s.address_street} onChange={(v) => set('address_street', v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kota / kecamatan" value={s.address_locality} onChange={(v) => set('address_locality', v)} />
              <Field label="Provinsi / wilayah" value={s.address_region} onChange={(v) => set('address_region', v)} />
              <Field label="Kode pos" value={s.address_postal} onChange={(v) => set('address_postal', v)} />
              <Field label="Kode negara" value={s.address_country} onChange={(v) => set('address_country', v)} placeholder="ID" />
              <Field label="Latitude" value={s.geo_lat} onChange={(v) => set('geo_lat', v)} />
              <Field label="Longitude" value={s.geo_lng} onChange={(v) => set('geo_lng', v)} />
            </div>
            <Field label="Wilayah layanan" value={s.area_served} onChange={(v) => set('area_served', v)} />
            <Field label="Rentang harga" value={s.price_range} onChange={(v) => set('price_range', v)} />
            <LinesField label="Jam buka" value={s.opening_hours} onChange={(v) => set('opening_hours', v)} hint="Satu baris per jadwal, contoh: Mo-Fr 08:00-17:00" />
          </Section>
        </Tab>

        <Tab value="sitemap">
          <Section title="Sitemap XML" icon="network">
            <Toggle label="Aktifkan sitemap" hint="Index tersedia di /sitemap_index.xml." checked={s.sitemap_enabled} onChange={(v) => set('sitemap_enabled', v)} />
            <NumberField label="URL per sitemap" value={s.sitemap_links_per_page} min={1} max={1000} onChange={(v) => set('sitemap_links_per_page', Math.max(1, Math.min(1000, v)))} />
            <Toggle label="Sertakan gambar" checked={s.sitemap_include_images} onChange={(v) => set('sitemap_include_images', v)} />
            <Toggle label="Sertakan artikel" checked={s.sitemap_include_articles} onChange={(v) => set('sitemap_include_articles', v)} />
            <Toggle label="Sertakan halaman" checked={s.sitemap_include_pages} onChange={(v) => set('sitemap_include_pages', v)} />
            <Toggle label="Sertakan kategori" checked={s.sitemap_include_categories} onChange={(v) => set('sitemap_include_categories', v)} />
            <Toggle label="Sertakan tag" checked={s.sitemap_include_tags} onChange={(v) => set('sitemap_include_tags', v)} />
            <LinesField label="Path dikecualikan" value={s.sitemap_exclude_paths} onChange={(v) => set('sitemap_exclude_paths', v)} hint="Satu path per baris. Akhiri * untuk prefix, contoh /rahasia*." />
          </Section>
        </Tab>

        <Tab value="tools">
          <Section title="robots.txt" icon="file-code-2">
            <SelectField label="Mode" value={s.robots_txt_mode} onChange={(v) => set('robots_txt_mode', v as SeoSettings['robots_txt_mode'])} options={[['auto','Otomatis'],['custom','Kustom']]} />
            {s.robots_txt_mode === 'custom' && <Field label="Isi robots.txt" multiline mono rows={10} value={s.robots_txt_custom} onChange={(v) => set('robots_txt_custom', v)} />}
          </Section>
          <Section title="IndexNow" icon="send">
            <Toggle label="Aktifkan IndexNow" hint="Kirim URL artikel ke Bing/Yandex ketika diterbitkan." checked={s.indexnow_enabled} onChange={(v) => set('indexnow_enabled', v)} />
            <Field label="API key" value={s.indexnow_key} onChange={(v) => set('indexnow_key', v.replace(/[^a-f0-9]/gi, ''))} hint="8–128 karakter heksadesimal. Disajikan otomatis di /{key}.txt." />
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => set('indexnow_key', Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join(''))}><Icon name="refresh-cw" /> Buat key</Button>
            <Button type="button" variant="outline" disabled={!s.indexnow_enabled || s.indexnow_key.length < 8} onClick={async () => {
              try {
                const response = await fetch('/api/seo/indexnow', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ urls: [s.site_url] }) });
                const body = await response.json() as { ok: boolean; error?: string };
                if (!body.ok) throw new Error(body.error);
                toast.success('URL uji dikirim ke IndexNow');
              } catch { toast.error('Pengiriman IndexNow gagal'); }
            }}><Icon name="send" /> Kirim URL uji</Button></div>
          </Section>
          <Section title="LLMs.txt" icon="file-text">
            <Toggle label="Aktifkan llms.txt" hint="Indeks konten ringkas untuk crawler LLM." checked={s.llms_txt_enabled} onChange={(v) => set('llms_txt_enabled', v)} />
            <Field label="Deskripsi" multiline value={s.llms_txt_description} onChange={(v) => set('llms_txt_description', v)} />
          </Section>
          <Section title="Breadcrumbs" icon="chevrons-right">
            <Toggle label="Aktifkan breadcrumbs" checked={s.breadcrumbs_enabled} onChange={(v) => set('breadcrumbs_enabled', v)} />
            <Field label="Label beranda" value={s.breadcrumbs_home_label} onChange={(v) => set('breadcrumbs_home_label', v)} />
            <Field label="Pemisah" value={s.breadcrumbs_separator} onChange={(v) => set('breadcrumbs_separator', v)} className="max-w-28" />
          </Section>
          <Section title="Image SEO" icon="image">
            <Toggle label="Isi alt yang kosong" hint="Alt yang ditulis editor tidak pernah ditimpa." checked={s.image_add_missing_alt} onChange={(v) => set('image_add_missing_alt', v)} />
            <Toggle label="Isi title yang kosong" hint="Title yang ditulis editor tidak pernah ditimpa." checked={s.image_add_missing_title} onChange={(v) => set('image_add_missing_title', v)} />
            <Field label="Template alt" value={s.image_alt_template} onChange={(v) => set('image_alt_template', v)} />
            <Field label="Template title" value={s.image_title_template} onChange={(v) => set('image_title_template', v)} />
          </Section>
        </Tab>
      </Tabs>

      <div className="sticky bottom-3 z-10 flex justify-end rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <Button onClick={save} disabled={saving}>{saving ? <Icon name="loader-circle" className="animate-spin" /> : <Icon name="save" />} Simpan perubahan</Button>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  return <TabsContent value={value} className="space-y-4 pt-3">{children}</TabsContent>;
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Icon name={icon} className="size-4 text-muted-foreground" />{title}</CardTitle></CardHeader><CardContent className="space-y-4">{children}</CardContent></Card>;
}

function Field({ label, value, onChange, multiline, mono, rows = 3, type = 'text', placeholder, hint, count, max, className }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean; mono?: boolean; rows?: number; type?: React.HTMLInputTypeAttribute; placeholder?: string; hint?: string; count?: boolean; max?: number; className?: string;
}) {
  const control = multiline
    ? <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={mono ? 'font-mono text-xs' : ''} />
    : <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={className} />;
  return <div className="space-y-1.5"><div className="flex justify-between gap-2"><Label className="text-xs">{label}</Label>{count && <span className={`text-[10px] tabular-nums ${(max && value.length > max) ? 'text-destructive' : 'text-muted-foreground'}`}>{value.length}{max ? `/${max}` : ''}</span>}</div>{control}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

function NumberField({ label, value, onChange, hint, min, max }: { label: string; value: number; onChange: (value: number) => void; hint?: string; min?: number; max?: number }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} className="max-w-40" />{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-md border p-3"><div><p className="text-sm font-medium">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  const items = Object.fromEntries(options);
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Select items={items} value={value} onValueChange={(v: string | null) => v && onChange(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>;
}

function LinesField({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (value: string[]) => void; hint?: string }) {
  return <Field label={label} multiline rows={5} value={value.join('\n')} onChange={(raw) => onChange(raw.split(/\r?\n/).map((v) => v.trim()).filter(Boolean))} hint={hint} />;
}

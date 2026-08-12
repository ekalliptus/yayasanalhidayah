import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Icon } from '../icon';
import { ROBOTS_TOKENS, type PageSeo, type RobotsToken } from '@/lib/seo';

const CORE_PATHS = new Set(['/', '/program', '/artikel', '/youtube-aksi-baik-alhidayah', '/404']);
const EMPTY: PageSeo = {
  path: '/', label: '', title: null, description: null, canonical: null, robots: null,
  og_title: null, og_description: null, og_image: null,
  twitter_title: null, twitter_description: null, twitter_image: null,
  schema_type: 'WebPage', sitemap_include: true, sitemap_priority: 0.5, sitemap_changefreq: 'weekly',
};

export default function PageSeoManager({ initial }: { initial: PageSeo[] }) {
  const [rows, setRows] = React.useState(initial);
  const [selectedPath, setSelectedPath] = React.useState(initial[0]?.path ?? '');
  const [draft, setDraft] = React.useState<PageSeo>(initial[0] ?? EMPTY);
  const [saving, setSaving] = React.useState(false);

  function select(path: string) {
    const row = rows.find((r) => r.path === path);
    if (row) { setSelectedPath(path); setDraft({ ...row }); }
  }
  function set<K extends keyof PageSeo>(key: K, value: PageSeo[K]) { setDraft((p) => ({ ...p, [key]: value })); }

  async function remove() {
    if (!selectedPath || !confirm(`Hapus SEO untuk ${selectedPath}?`)) return;
    const response = await fetch('/api/seo/page', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: selectedPath }) });
    const body = await response.json() as { ok: boolean; error?: string };
    if (!body.ok) return toast.error(body.error || 'Gagal menghapus');
    const next = rows.filter((row) => row.path !== selectedPath);
    setRows(next); setSelectedPath(next[0]?.path ?? ''); setDraft(next[0] ?? { ...EMPTY });
    toast.success('SEO halaman dihapus');
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch('/api/seo/page', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...draft, original_path: selectedPath || null }) });
      const body = await response.json() as { ok: boolean; error?: string; page?: PageSeo };
      if (!body.ok || !body.page) throw new Error(body.error || 'Gagal menyimpan');
      setRows((prev) => [...prev.filter((r) => r.path !== body.page!.path && r.path !== selectedPath), body.page!].sort((a, b) => a.path.localeCompare(b.path)));
      setDraft(body.page);
      setSelectedPath(body.page.path);
      toast.success('SEO halaman disimpan');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">SEO Halaman</h1><p className="text-sm text-muted-foreground">Override metadata untuk setiap halaman publik.</p></div>
      <Button variant="outline" onClick={() => { setSelectedPath(''); setDraft({ ...EMPTY, path: '/halaman-baru', label: 'Halaman Baru' }); }}><Icon name="plus" /> Tambah path</Button>
    </header>
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit"><CardHeader className="pb-2"><CardTitle className="text-sm">Halaman</CardTitle></CardHeader><CardContent className="space-y-1 p-2 pt-0">
        {rows.map((row) => <button type="button" key={row.path} onClick={() => select(row.path)} className={`w-full rounded-md px-3 py-2 text-left ${selectedPath === row.path ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}><span className="block text-sm font-medium">{row.label || row.path}</span><code className="block truncate text-[10px]">{row.path}</code></button>)}
      </CardContent></Card>
      <div className="space-y-4">
        <Card><CardHeader><CardTitle className="text-sm">Metadata</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Label admin" value={draft.label} onChange={(v) => set('label', v)} /><Field label="Path" value={draft.path} onChange={(v) => set('path', v)} /></div>
          <Field label="Title" value={draft.title ?? ''} onChange={(v) => set('title', v || null)} count={60} hint="Kosong = gunakan title dari halaman + template global." />
          <Area label="Meta description" value={draft.description ?? ''} onChange={(v) => set('description', v || null)} count={160} />
          <Field label="Canonical URL" value={draft.canonical ?? ''} onChange={(v) => set('canonical', v || null)} placeholder="https://…" />
          <div className="space-y-2"><Label className="text-xs">Robots override</Label><div className="flex flex-wrap gap-2">{ROBOTS_TOKENS.map((token) => { const active = (draft.robots ?? []).includes(token.value); return <button key={token.value} type="button" onClick={() => { const current = draft.robots ?? []; let next = active ? current.filter((v) => v !== token.value) : [...current, token.value]; if (token.value === 'index' && !active) next = next.filter((v) => v !== 'noindex'); if (token.value === 'noindex' && !active) next = next.filter((v) => v !== 'index'); set('robots', next.length ? next as RobotsToken[] : null); }} className={`rounded-md border px-2.5 py-1 text-xs ${active ? 'border-primary bg-primary/10' : 'text-muted-foreground'}`}>{token.label}</button>; })}</div></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Sosial</CardTitle></CardHeader><CardContent className="space-y-3">
          <Field label="OG title" value={draft.og_title ?? ''} onChange={(v) => set('og_title', v || null)} />
          <Area label="OG description" value={draft.og_description ?? ''} onChange={(v) => set('og_description', v || null)} />
          <Field label="OG image" value={draft.og_image ?? ''} onChange={(v) => set('og_image', v || null)} />
          <Field label="Twitter title" value={draft.twitter_title ?? ''} onChange={(v) => set('twitter_title', v || null)} />
          <Area label="Twitter description" value={draft.twitter_description ?? ''} onChange={(v) => set('twitter_description', v || null)} />
          <Field label="Twitter image" value={draft.twitter_image ?? ''} onChange={(v) => set('twitter_image', v || null)} />
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Schema & sitemap</CardTitle></CardHeader><CardContent className="space-y-3">
          <SelectField label="Schema" value={draft.schema_type} onChange={(v) => set('schema_type', v)} options={['WebPage','AboutPage','ContactPage','CollectionPage','none']} />
          <div className="flex items-center justify-between rounded-md border p-3"><div><p className="text-sm font-medium">Masukkan ke sitemap</p><p className="text-xs text-muted-foreground">Noindex tetap dikeluarkan otomatis.</p></div><Switch checked={draft.sitemap_include} onCheckedChange={(v) => set('sitemap_include', v)} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Priority 0.0–1.0" value={String(draft.sitemap_priority)} onChange={(v) => set('sitemap_priority', Math.max(0, Math.min(1, Number(v))))} /><SelectField label="Frekuensi perubahan" value={draft.sitemap_changefreq} onChange={(v) => set('sitemap_changefreq', v)} options={['always','hourly','daily','weekly','monthly','yearly','never']} /></div>
        </CardContent></Card>
        <div className="flex justify-between gap-2"><Button variant="destructive" onClick={() => void remove()} disabled={!selectedPath || CORE_PATHS.has(selectedPath)}><Icon name="trash-2" /> Hapus</Button><Button onClick={save} disabled={saving}>{saving ? <Icon name="loader-circle" className="animate-spin" /> : <Icon name="save" />} Simpan halaman</Button></div>
      </div>
    </div><Toaster position="top-right" richColors /></div>;
}

function Field({ label, value, onChange, placeholder, hint, count }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; count?: number }) { return <div className="space-y-1.5"><div className="flex justify-between"><Label className="text-xs">{label}</Label>{count && <span className={`text-[10px] ${value.length > count ? 'text-destructive' : 'text-muted-foreground'}`}>{value.length}/{count}</span>}</div><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>; }
function Area({ label, value, onChange, count }: { label: string; value: string; onChange: (v: string) => void; count?: number }) { return <div className="space-y-1.5"><div className="flex justify-between"><Label className="text-xs">{label}</Label>{count && <span className={`text-[10px] ${value.length > count ? 'text-destructive' : 'text-muted-foreground'}`}>{value.length}/{count}</span>}</div><Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} /></div>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) { const items = Object.fromEntries(options.map((v) => [v, v])); return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Select items={items} value={value} onValueChange={(v: string | null) => v && onChange(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>; }

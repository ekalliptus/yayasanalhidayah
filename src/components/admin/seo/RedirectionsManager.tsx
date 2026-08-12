import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Icon } from '../icon';

export interface RedirectRow {
  id: string; sources: string[]; comparison: string; ignore_case: boolean; destination: string;
  http_code: number; is_active: boolean; hits: number; last_hit_at: string | null; note: string;
}

const EMPTY = { id: '', sources: ['/'], comparison: 'exact', ignore_case: true, destination: '', http_code: 301, is_active: true, note: '' };

export default function RedirectionsManager({ initial }: { initial: RedirectRow[] }) {
  const [rows, setRows] = React.useState(initial);
  const [query, setQuery] = React.useState('');
  const [draft, setDraft] = React.useState({ ...EMPTY });
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const filtered = rows.filter((r) => `${r.sources.join(' ')} ${r.destination}`.toLowerCase().includes(query.toLowerCase()));

  async function save() {
    setSaving(true);
    try {
      const payload = { ...draft, id: draft.id || null };
      const response = await fetch('/api/seo/redirection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json() as { ok: boolean; error?: string; redirection?: RedirectRow };
      if (!body.ok || !body.redirection) throw new Error(body.error || 'Gagal menyimpan');
      setRows((prev) => [body.redirection!, ...prev.filter((row) => row.id !== body.redirection!.id)]);
      toast.success('Redirect disimpan'); setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Hapus redirect ini?')) return;
    const response = await fetch('/api/seo/redirection', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    const body = await response.json() as { ok: boolean; error?: string };
    if (!body.ok) return toast.error(body.error || 'Gagal menghapus');
    setRows((r) => r.filter((x) => x.id !== id)); toast.success('Redirect dihapus');
  }

  return <div className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Redirections</h1><p className="text-sm text-muted-foreground">Alihkan URL lama tanpa menyentuh kode.</p></div><Button onClick={() => { setDraft({ ...EMPTY }); setOpen(true); }}><Icon name="plus" /> Tambah redirect</Button></header>
    <div className="relative max-w-sm"><Icon name="search" className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" placeholder="Cari sumber atau tujuan…" /></div>
    <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Sumber</TableHead><TableHead>Tujuan</TableHead><TableHead>Kode</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Hit</TableHead><TableHead className="w-24" /></TableRow></TableHeader><TableBody>
      {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Belum ada redirect.</TableCell></TableRow>}
      {filtered.map((row) => <TableRow key={row.id}><TableCell><code className="text-xs">{row.sources.join(', ')}</code><span className="ml-2 text-[10px] text-muted-foreground">{row.comparison}</span></TableCell><TableCell><code className="text-xs">{row.http_code >= 400 ? '—' : row.destination}</code></TableCell><TableCell><Badge variant="outline">{row.http_code}</Badge></TableCell><TableCell><Badge variant={row.is_active ? 'default' : 'secondary'}>{row.is_active ? 'Aktif' : 'Nonaktif'}</Badge></TableCell><TableCell className="text-right tabular-nums">{row.hits}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setDraft({ ...row }); setOpen(true); }}><Icon name="pencil" /></Button><Button size="icon" variant="ghost" aria-label="Hapus" onClick={() => void remove(row.id)}><Icon name="trash-2" /></Button></div></TableCell></TableRow>)}
    </TableBody></Table></div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{draft.id ? 'Edit redirect' : 'Redirect baru'}</DialogTitle><DialogDescription>Aturan pertama yang cocok akan dijalankan.</DialogDescription></DialogHeader><div className="space-y-3">
      <div className="space-y-1.5"><Label className="text-xs">Sumber URL</Label><Input value={draft.sources.join(', ')} onChange={(e) => setDraft((d) => ({ ...d, sources: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) }))} placeholder="/url-lama, /url-lama-2" /><p className="text-xs text-muted-foreground">Pisahkan beberapa sumber dengan koma.</p></div>
      <SelectField label="Pencocokan" value={draft.comparison} onChange={(v) => setDraft((d) => ({ ...d, comparison: v }))} options={[['exact','Persis'],['contains','Mengandung'],['start','Diawali'],['end','Diakhiri'],['regex','Regex']]} />
      <SelectField label="HTTP status" value={String(draft.http_code)} onChange={(v) => setDraft((d) => ({ ...d, http_code: Number(v) }))} options={[['301','301 Permanen'],['302','302 Sementara'],['307','307 Sementara'],['410','410 Gone'],['451','451 Legal']]} />
      {![410,451].includes(draft.http_code) && <div className="space-y-1.5"><Label className="text-xs">Tujuan</Label><Input value={draft.destination} onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))} placeholder="/url-baru atau https://…" /></div>}
      <div className="space-y-1.5"><Label className="text-xs">Catatan</Label><Input value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} /></div>
      <div className="grid gap-2 sm:grid-cols-2"><Toggle label="Aktif" checked={draft.is_active} onChange={(v) => setDraft((d) => ({ ...d, is_active: v }))} /><Toggle label="Abaikan kapital" checked={draft.ignore_case} onChange={(v) => setDraft((d) => ({ ...d, ignore_case: v }))} /></div>
      <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save} disabled={saving}>{saving && <Icon name="loader-circle" className="animate-spin" />} Simpan redirect</Button></div>
    </div></DialogContent></Dialog><Toaster position="top-right" richColors /></div>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string,string][] }) { const items = Object.fromEntries(options); return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Select items={items} value={value} onValueChange={(v: string | null) => v && onChange(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) { return <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">{label}</span><Switch checked={checked} onCheckedChange={onChange} /></div>; }

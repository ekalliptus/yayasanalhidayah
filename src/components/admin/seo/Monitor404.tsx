import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Icon } from '../icon';
import { absoluteTime } from '../format';

export interface Log404 { id: string; uri: string; hits: number; referer: string; user_agent: string; created_at: string; last_hit_at: string }

export default function Monitor404({ initial }: { initial: Log404[] }) {
  const [rows, setRows] = React.useState(initial);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState('');
  const [redirectUri, setRedirectUri] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const filtered = rows.filter((r) => r.uri.toLowerCase().includes(query.toLowerCase()));
  const totalHits = rows.reduce((sum, row) => sum + row.hits, 0);

  async function remove(ids: string[]) {
    const response = await fetch('/api/seo/404', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) });
    const body = await response.json() as { ok: boolean; error?: string };
    if (!body.ok) return toast.error(body.error || 'Gagal menghapus');
    setRows((r) => r.filter((x) => !ids.includes(x.id))); setSelected([]); toast.success('Log dihapus');
  }
  async function createRedirect() {
    const response = await fetch('/api/seo/redirection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sources: [redirectUri], comparison: 'exact', ignore_case: true, destination, http_code: 301, is_active: true, note: 'Dibuat dari 404 Monitor' }) });
    const body = await response.json() as { ok: boolean; error?: string; redirection?: { id: string } };
    if (!body.ok || !body.redirection) return toast.error(body.error || 'Gagal membuat redirect');
    toast.success('Redirect dibuat'); setRedirectUri(''); setDestination('');
  }

  return <div className="space-y-4"><header><h1 className="text-2xl font-semibold tracking-tight">404 Monitor</h1><p className="text-sm text-muted-foreground">URL gagal ditemukan, dikelompokkan berdasarkan path.</p></header>
    <div className="grid gap-3 sm:grid-cols-3"><Stat label="URL unik" value={rows.length} /><Stat label="Total hit" value={totalHits} /><Stat label="Tertinggi" value={rows[0]?.hits ?? 0} /></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="relative max-w-sm flex-1"><Icon name="search" className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" placeholder="Cari URL 404…" /></div>{selected.length > 0 && <Button variant="destructive" onClick={() => void remove(selected)}><Icon name="trash-2" /> Hapus {selected.length}</Button>}</div>
    <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead className="w-10" /><TableHead>URI</TableHead><TableHead>Referer</TableHead><TableHead className="text-right">Hit</TableHead><TableHead>Terakhir</TableHead><TableHead className="w-24" /></TableRow></TableHeader><TableBody>
      {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Belum ada URL 404.</TableCell></TableRow>}
      {filtered.map((row) => <TableRow key={row.id}><TableCell><Checkbox checked={selected.includes(row.id)} onCheckedChange={(checked) => setSelected((s) => checked ? [...s, row.id] : s.filter((id) => id !== row.id))} /></TableCell><TableCell><code className="text-xs">{row.uri}</code></TableCell><TableCell className="max-w-64 truncate text-xs text-muted-foreground">{row.referer || '—'}</TableCell><TableCell className="text-right font-medium tabular-nums">{row.hits}</TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{absoluteTime(row.last_hit_at)}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Buat redirect" onClick={() => { setRedirectUri(row.uri); setDestination(''); }}><Icon name="corner-down-right" /></Button><Button size="icon" variant="ghost" aria-label="Hapus" onClick={() => void remove([row.id])}><Icon name="trash-2" /></Button></div></TableCell></TableRow>)}
    </TableBody></Table></div>
    <Dialog open={Boolean(redirectUri)} onOpenChange={(v) => !v && setRedirectUri('')}><DialogContent><DialogHeader><DialogTitle>Buat redirect</DialogTitle><DialogDescription>Alihkan URL 404 ini secara permanen.</DialogDescription></DialogHeader><div className="space-y-3"><div className="space-y-1.5"><Label className="text-xs">Sumber</Label><Input value={redirectUri} readOnly /></div><div className="space-y-1.5"><Label className="text-xs">Tujuan</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="/halaman-tujuan" autoFocus /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRedirectUri('')}>Batal</Button><Button onClick={createRedirect} disabled={!destination.trim()}>Buat redirect 301</Button></div></div></DialogContent></Dialog><Toaster position="top-right" richColors /></div>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString('id-ID')}</p></div>; }

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Icon } from '../icon';
import { RESOURCES } from '../resources.config';
import { createSupabaseBrowser } from '@/lib/supabase/browser';
import { recordActivity } from '@/lib/activity';

interface Props {
  resourceSlug: string;
  initial: Record<string, unknown>[];
}

export default function ResourceList({ resourceSlug, initial }: Props) {
  const def = RESOURCES[resourceSlug];
  if (!def) return <p>Resource tidak ditemukan.</p>;

  const [rows, setRows] = React.useState(initial);
  const [query, setQuery] = React.useState('');
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  // Program Donasi only: pull live stats from the WordPress donation site into
  // the programs table. Server-side sync — the public read path reads Supabase.
  async function syncFromWP() {
    setSyncing(true);
    try {
      const res = await fetch('/api/programs/sync', { method: 'POST' });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        summary?: { source?: string; matched?: number; updated?: number; created?: number; removed?: number };
      } | null;
      if (!res.ok || !body?.ok) {
        toast.error(body?.error || 'Sync gagal');
        return;
      }
      const s = body.summary ?? {};
      const fresh = s.created
        ? `\n${s.created} campaign baru dipublikasikan.`
        : '';
      const gone = s.removed ? `\n${s.removed} campaign lama dihapus.` : '';
      toast.success(`Sync ${s.source}: ${s.updated}/${s.matched} diperbarui.${fresh}${gone}`);
      window.location.reload();
    } catch {
      toast.error('Sync gagal');
    } finally {
      setSyncing(false);
    }
  }

  const listFields = def.fields.filter((f) => f.listVisible);
  const searchable = def.searchColumns ?? listFields.filter((f) => f.type === 'text').map((f) => f.name);

  const filtered = rows.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return searchable.some((col) => String(r[col] ?? '').toLowerCase().includes(q));
  });

  async function confirmDelete() {
    if (!deleteId) return;
    const supabase = createSupabaseBrowser();
    const { error } = await (supabase as any).from(def.table).delete().eq('id', deleteId);
    if (error) { toast.error('Gagal menghapus'); setDeleteId(null); return; }
    await recordActivity(supabase, { action: 'delete', entityType: def.table, entityId: deleteId, summary: `menghapus ${def.label}` });
    setRows((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
    toast.success('Dihapus');
  }

  function cellValue(row: Record<string, unknown>, name: string, type: string): React.ReactNode {
    const v = row[name];
    if (type === 'boolean') return <Badge variant="outline">{v ? 'Ya' : 'Tidak'}</Badge>;
    if (type === 'image' && typeof v === 'string' && v) return <img src={v} alt="" className="h-8 w-auto rounded" />;
    return String(v ?? '—');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{def.labelPlural}</h1>
          <p className="text-sm text-muted-foreground">{rows.length} item</p>
        </div>
        <div className="flex items-center gap-2">
          {resourceSlug === 'programs' && (
            <Button variant="outline" onClick={syncFromWP} disabled={syncing}>
              <Icon name={syncing ? 'loader-circle' : 'refresh-cw'} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Menyinkron…' : 'Sync dari WP'}
            </Button>
          )}
          <Button render={<a href={`/admin/content/${resourceSlug}/new`} />}>
            <Icon name="plus" /> Tambah {def.label}
          </Button>
        </div>
      </div>

      {searchable.length > 0 && (
        <div className="relative max-w-sm">
          <Icon name="search" className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari…" className="pl-8" />
        </div>
      )}

      {/* Desktop: table. Hidden on small screens where columns overflow. */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {listFields.map((f) => <TableHead key={f.name}>{f.label}</TableHead>)}
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={listFields.length + 1} className="py-10 text-center text-muted-foreground">
                {rows.length === 0 ? `Belum ada ${def.label.toLowerCase()}.` : 'Tidak ada hasil.'}
              </TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={String(r.id)}>
                {listFields.map((f) => <TableCell key={f.name}>{cellValue(r, f.name, f.type)}</TableCell>)}
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" render={<a href={`/admin/content/${resourceSlug}/${r.id}`} />} aria-label="Edit">
                      <Icon name="pencil" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(String(r.id))} aria-label="Hapus">
                      <Icon name="trash-2" className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards. The first list field is the title; the rest
          render as labelled key/value rows so nothing overflows. */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 && (
          <p className="rounded-md border py-10 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? `Belum ada ${def.label.toLowerCase()}.` : 'Tidak ada hasil.'}
          </p>
        )}
        {filtered.map((r) => {
          const [titleField, ...restFields] = listFields;
          return (
            <div key={String(r.id)} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 font-medium break-words">
                  {titleField ? cellValue(r, titleField.name, titleField.type) : String(r.id)}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" render={<a href={`/admin/content/${resourceSlug}/${r.id}`} />} aria-label="Edit">
                    <Icon name="pencil" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(String(r.id))} aria-label="Hapus">
                    <Icon name="trash-2" className="text-destructive" />
                  </Button>
                </div>
              </div>
              {restFields.length > 0 && (
                <dl className="mt-3 space-y-1.5 text-sm">
                  {restFields.map((f) => (
                    <div key={f.name} className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
                      <dd className="min-w-0 break-words text-right">{cellValue(r, f.name, f.type)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {def.label.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>Item akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster position="top-right" richColors />
    </div>
  );
}

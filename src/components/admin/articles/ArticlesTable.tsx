import * as React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Icon } from '../icon';
import { absoluteTime } from '../format';
import { createSupabaseBrowser } from '@/lib/supabase/browser';
import type { ArticleStatus } from '@/lib/supabase/types';

export interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  view_count: number;
  updated_at: string;
  seo_score: number | null;
}

const statusTone: Record<ArticleStatus, string> = {
  published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  archived: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

const statusLabel: Record<ArticleStatus, string> = {
  published: 'Terbit', draft: 'Draf', scheduled: 'Terjadwal', archived: 'Arsip',
};

export default function ArticlesTable({ initial }: { initial: ArticleRow[] }) {
  const [rows, setRows] = React.useState(initial);
  const [query, setQuery] = React.useState('');
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const filtered = rows.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));

  async function confirmDelete() {
    if (!deleteId) return;
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.from('articles').delete().eq('id', deleteId);
    if (error) {
      toast.error('Gagal menghapus');
    } else {
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success('Artikel dihapus');
    }
    setDeleteId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Artikel</h1>
          <p className="text-sm text-muted-foreground">Kelola tulisan blog.</p>
        </div>
        <Button render={<a href="/admin/articles/new" />}>
          <Icon name="plus" /> Artikel Baru
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Icon name="search" className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari artikel…" className="pl-8" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-20 text-right">SEO</TableHead>
              <TableHead className="w-20 text-right">Dilihat</TableHead>
              <TableHead className="w-44">Diperbarui</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {rows.length === 0 ? 'Belum ada artikel. Buat yang pertama!' : 'Tidak ada hasil.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <a href={`/admin/articles/${r.id}`} className="font-medium hover:text-primary">{r.title}</a>
                  <div className="text-xs text-muted-foreground">/{r.slug}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusTone[r.status as ArticleStatus] ?? ''}>{statusLabel[r.status as ArticleStatus] ?? r.status}</Badge>
                </TableCell>
                <TableCell className={`text-right font-medium tabular-nums ${(r.seo_score ?? 0) >= 71 ? 'text-emerald-400' : (r.seo_score ?? 0) >= 41 ? 'text-amber-400' : 'text-red-400'}`}>{r.seo_score ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{r.view_count}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{absoluteTime(r.updated_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {r.status === 'published' && (
                      <Button variant="ghost" size="icon-sm" render={<a href={`/artikel/${r.slug}`} target="_blank" rel="noreferrer" />} aria-label="Lihat">
                        <Icon name="external-link" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" render={<a href={`/admin/articles/${r.id}`} />} aria-label="Edit">
                      <Icon name="pencil" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)} aria-label="Hapus">
                      <Icon name="trash-2" className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus artikel?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
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

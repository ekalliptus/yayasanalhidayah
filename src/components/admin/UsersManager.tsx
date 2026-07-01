import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Icon } from './icon';
import { absoluteTime } from './format';
import type { Role } from '@/lib/supabase/types';

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
  confirmed: boolean;
}

const roleBadge: Record<Role, string> = {
  owner: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  admin: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  editor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const roleLabel: Record<Role, string> = {
  owner: 'Owner', admin: 'Admin', editor: 'Editor',
};

interface Props {
  initial: UserRow[];
  currentUserId: string;
  currentRole: Role;
}

export default function UsersManager({ initial, currentUserId, currentRole }: Props) {
  const [users, setUsers] = React.useState(initial);
  const [showAdd, setShowAdd] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [newRole, setNewRole] = React.useState<Role>('editor');
  const [adding, setAdding] = React.useState(false);

  // Reset password dialog.
  const [resetTarget, setResetTarget] = React.useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = React.useState('');
  const [resetting, setResetting] = React.useState(false);

  // Edit (full name) dialog.
  const [editTarget, setEditTarget] = React.useState<UserRow | null>(null);
  const [editName, setEditName] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Delete confirmation.
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const isOwner = currentRole === 'owner';

  async function addUser() {
    if (!email || !password || password.length < 8) {
      toast.error('Email dan password (min 8 karakter) wajib diisi');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, role: newRole }),
      });
      const body = (await res.json()) as { ok: boolean; user?: UserRow; error?: string };
      if (!body.ok) { toast.error(body.error ?? 'Gagal'); setAdding(false); return; }
      if (body.user) setUsers((prev) => [...prev, { ...body.user!, confirmed: true }]);
      toast.success('User ditambahkan & aktif. Sampaikan email + password ke user.');
      setShowAdd(false);
      setEmail(''); setPassword(''); setFullName(''); setNewRole('editor');
    } catch { toast.error('Gagal menambah user'); }
    setAdding(false);
  }

  async function changeRole(userId: string, role: Role) {
    const res = await fetch('/api/users/update-role', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role }),
    });
    const body = (await res.json()) as { ok: boolean; error?: string };
    if (!body.ok) { toast.error(body.error ?? 'Gagal'); return; }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    toast.success('Role diperbarui');
  }

  async function activateUser(u: UserRow) {
    const res = await fetch('/api/users/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: u.id, activate: true }),
    });
    const body = (await res.json()) as { ok: boolean; error?: string };
    if (!body.ok) { toast.error(body.error ?? 'Gagal'); return; }
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, confirmed: true } : x));
    toast.success(`${u.email} diaktifkan`);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: editTarget.id, full_name: editName }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) { toast.error(body.error ?? 'Gagal'); return; }
      setUsers((prev) => prev.map((u) => u.id === editTarget.id ? { ...u, full_name: editName } : u));
      toast.success('Data user diperbarui');
      setEditTarget(null);
    } catch { toast.error('Gagal menyimpan'); }
    finally { setSavingEdit(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: deleteTarget.id }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) { toast.error(body.error ?? 'Gagal'); return; }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success('User dihapus');
      setDeleteTarget(null);
    } catch { toast.error('Gagal menghapus'); }
    finally { setDeleting(false); }
  }

  async function resetPassword() {
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter');
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: resetTarget.id, new_password: newPassword }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) { toast.error(body.error ?? 'Gagal'); return; }
      toast.success(`Kata sandi ${resetTarget.email} direset. Sampaikan ke user secara aman.`);
      setResetTarget(null);
      setNewPassword('');
    } catch { toast.error('Gagal mereset kata sandi'); }
    finally { setResetting(false); }
  }

  // Can the current user act on this target row?
  function canManage(u: UserRow): boolean {
    if (u.role === 'owner') return false;          // owner untouchable
    if (u.role === 'admin' && !isOwner) return false; // only owner manages admins
    return true;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola akses admin dashboard.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Icon name="user-plus" /> Tambah User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-28">Role</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-40">Terdaftar</TableHead>
              <TableHead className="w-px text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const manageable = canManage(u);
              const isSelf = u.id === currentUserId;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {u.role === 'owner' || isSelf || !manageable ? (
                      <Badge variant="outline" className={roleBadge[u.role]}>{roleLabel[u.role]}</Badge>
                    ) : (
                      <Select value={u.role} onValueChange={(v: string | null) => { if (v) changeRole(u.id, v as Role); }}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.confirmed ? (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30">Belum aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{absoluteTime(u.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {!u.confirmed && manageable && (
                        <Button size="xs" variant="outline" onClick={() => activateUser(u)} title="Aktifkan akun">
                          <Icon name="badge-check" /> Aktifkan
                        </Button>
                      )}
                      {(manageable || isSelf) && (
                        <Button size="icon-xs" variant="ghost" onClick={() => { setEditTarget(u); setEditName(u.full_name); }} title="Edit nama">
                          <Icon name="pencil" />
                        </Button>
                      )}
                      {(manageable || isSelf) && (
                        <Button size="icon-xs" variant="ghost" onClick={() => { setResetTarget(u); setNewPassword(''); }} title="Reset sandi">
                          <Icon name="key-round" />
                        </Button>
                      )}
                      {manageable && !isSelf && (
                        <Button size="icon-xs" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(u)} title="Hapus user">
                          <Icon name="trash-2" />
                        </Button>
                      )}
                      {!manageable && !isSelf && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add user */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah User Baru</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Lengkap</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama penulis" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 karakter, 1 huruf besar, 1 angka" autoComplete="off" />
              <p className="text-xs text-muted-foreground">Akun langsung aktif. Sampaikan email &amp; password ke user.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={newRole} onValueChange={(v: string | null) => { if (v) setNewRole(v as Role); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor (penulis blog/artikel)</SelectItem>
                  {isOwner && <SelectItem value="admin">Admin (kelola semua)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
              <Button onClick={addUser} disabled={adding}>
                {adding && <Icon name="loader-circle" className="animate-spin" />}
                Tambah
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit name */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {editTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{editTarget.email}</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Lengkap</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama lengkap" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
                <Button onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit && <Icon name="loader-circle" className="animate-spin" />}
                  Simpan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={Boolean(resetTarget)} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reset kata sandi</DialogTitle></DialogHeader>
          {resetTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {resetTarget.id === currentUserId
                  ? 'Atur ulang kata sandi Anda sendiri. Login berikutnya pakai sandi baru.'
                  : <>Atur ulang kata sandi untuk <span className="font-medium text-foreground">{resetTarget.email}</span>. Sampaikan sandi baru ke user secara aman — ini tidak mengirim email.</>}
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Kata sandi baru</Label>
                <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 karakter, 1 huruf besar, 1 angka" autoComplete="off" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setResetTarget(null)}>Batal</Button>
                <Button onClick={resetPassword} disabled={resetting}>
                  {resetting && <Icon name="loader-circle" className="animate-spin" />}
                  Simpan sandi baru
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>Akun <span className="font-medium">{deleteTarget.email}</span> akan dihapus permanen beserta profilnya. Artikel yang ditulis tetap ada (author dikosongkan).</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting && <Icon name="loader-circle" className="animate-spin" />}
              Hapus permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster position="top-right" richColors />
    </div>
  );
}

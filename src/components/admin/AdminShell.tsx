import * as React from 'react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarRail,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Icon } from './icon';
import { NAV_SECTIONS, ROUTE_LABELS, type NavItem } from './nav.config';
import { createSupabaseBrowser } from '@/lib/supabase/browser';
import type { Role } from '@/lib/supabase/types';

interface Props {
  currentPath: string;
  user: { email: string | null; fullName: string };
  role: Role;
  children?: React.ReactNode;
}

function isActive(item: NavItem, path: string): boolean {
  if (item.match === 'exact') return path === item.href;
  return path === item.href || path.startsWith(item.href + '/');
}

function breadcrumbTrail(path: string): { label: string; href: string }[] {
  if (path === '/admin') return [{ label: 'Dashboard', href: '/admin' }];
  const trail: { label: string; href: string }[] = [{ label: 'Dashboard', href: '/admin' }];
  // Best-effort: map known section route to its label.
  const known = Object.keys(ROUTE_LABELS)
    .filter((href) => href !== '/admin' && path.startsWith(href))
    .sort((a, b) => b.length - a.length)[0];
  if (known) {
    trail.push({ label: ROUTE_LABELS[known], href: known });
    if (path !== known) {
      const tail = path.slice(known.length + 1).split('/')[0];
      if (tail === 'new') trail.push({ label: 'Baru', href: path });
      else if (tail) trail.push({ label: 'Edit', href: path });
    }
  }
  return trail;
}

export default function AdminShell({ currentPath, user, role, children }: Props) {
  const visibleSections = React.useMemo(
    () =>
      NAV_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((i) => !i.adminOnly || role === 'super_admin' || role === 'owner' || role === 'admin'),
      })).filter((s) => s.items.length > 0),
    [role],
  );

  const trail = breadcrumbTrail(currentPath);
  const [showLogout, setShowLogout] = React.useState(false);

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    toast.success('Berhasil keluar');
    window.location.assign('/admin/login');
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="droplet" className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">Yayasan Al Hidayah</span>
              <span className="truncate text-xs text-muted-foreground">Panel Admin</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {visibleSections.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      {item.disabled ? (
                        <SidebarMenuButton
                          aria-disabled="true"
                          tabIndex={-1}
                          tooltip="Belum tampil di situs"
                          className="cursor-not-allowed opacity-50"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Icon name={item.icon} />
                          <span>{item.label}</span>
                          <Icon name="lock" className="ml-auto opacity-60" />
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          isActive={isActive(item, currentPath)}
                          tooltip={item.label}
                          render={<a href={item.href} />}
                        >
                          <Icon name={item.icon} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Lihat situs" render={<a href="/" target="_blank" rel="noreferrer" />}>
                <Icon name="external-link" />
                <span>Lihat situs</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {trail.map((crumb, i) => (
                <React.Fragment key={crumb.href}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {i === trail.length - 1 ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <div className="ml-auto flex items-center gap-2">
            <RebuildButton role={role} />
            <ThemeToggle />
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.fullName || user.email}
              <span className="ml-1 capitalize text-primary">({role})</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setShowLogout(true)}>
              <Icon name="log-out" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan keluar dari akun {user.email}. Pastikan semua perubahan sudah tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Ya, keluar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}

function RebuildButton({ role }: { role: Role }) {
  const [loading, setLoading] = React.useState(false);
  if (role !== 'super_admin' && role !== 'owner' && role !== 'admin') return null;

  async function rebuild() {
    setLoading(true);
    try {
      const res = await fetch('/api/revalidate', { method: 'POST' });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (body.ok) toast.success('Build situs dipicu — perubahan tampil dalam ~1–2 menit');
      else toast.error(body.error || 'Gagal memicu build');
    } catch {
      toast.error('Gagal memicu build');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={rebuild} disabled={loading}>
      <Icon name={loading ? 'loader-circle' : 'rocket'} className={loading ? 'animate-spin' : ''} />
      Publish ke situs
    </Button>
  );
}

// Light/dark toggle. Theme lives as a `.dark` class on <html> (applied pre-paint
// by the inline script in AdminLayout); we flip it and persist the choice.
function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('sam-admin-theme', next ? 'dark' : 'light');
    } catch {
      /* ignore storage failures */
    }
    setIsDark(next);
    // Notify same-tab listeners (e.g. the toaster) that the theme changed.
    window.dispatchEvent(new CustomEvent('sam-theme-change', { detail: next ? 'dark' : 'light' }));
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      title={isDark ? 'Mode terang (ivory)' : 'Mode gelap'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} />
    </Button>
  );
}

// Admin navigation model — drives the sidebar and breadcrumb labels. Keep route
// → label here so both stay in sync. `adminOnly` items are hidden from editors
// (middleware also enforces this server-side).

export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name (resolved in Sidebar.tsx)
  adminOnly?: boolean;
  match?: 'exact' | 'prefix';
  // Greyed-out + non-clickable: the resource has no public page consuming it
  // yet (or the feature is half-wired), so editing it would have no visible
  // effect on the site. Re-enable once a public surface reads the table.
  disabled?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Ringkasan',
    items: [
      { label: 'Dashboard', href: '/admin', icon: 'layout-dashboard', match: 'exact' },
      { label: 'Aktivitas', href: '/admin/activity', icon: 'activity', adminOnly: true },
    ],
  },
  {
    label: 'Blog',
    items: [
      { label: 'Artikel', href: '/admin/articles', icon: 'newspaper' },
      { label: 'Kategori', href: '/admin/categories', icon: 'folder-tree' },
      { label: 'Tag', href: '/admin/tags', icon: 'tags' },
      { label: 'Media', href: '/admin/media', icon: 'image' },
    ],
  },
  {
    label: 'Konten Situs',
    items: [
      { label: 'Program Donasi', href: '/admin/content/programs', icon: 'hand-heart', adminOnly: true },
      { label: 'Hero', href: '/admin/content/hero', icon: 'panels-top-left', adminOnly: true },
      { label: 'Mengapa Kami', href: '/admin/content/why_us', icon: 'badge-check', adminOnly: true },
      { label: 'Trust Logo', href: '/admin/content/trust_logos', icon: 'shield-check', adminOnly: true },
      { label: 'Testimoni', href: '/admin/content/testimonials', icon: 'quote', adminOnly: true },
      // Below: no public page reads these tables yet → greyed out.
      { label: 'Statistik', href: '/admin/content/stats', icon: 'chart-bar', adminOnly: true, disabled: true },
      { label: 'Galeri', href: '/admin/content/gallery', icon: 'camera', adminOnly: true, disabled: true },
      { label: 'FAQ', href: '/admin/content/faqs', icon: 'circle-help', adminOnly: true, disabled: true },
      { label: 'Nilai', href: '/admin/content/values', icon: 'gem', adminOnly: true, disabled: true },
      { label: 'Tim', href: '/admin/content/team', icon: 'users', adminOnly: true, disabled: true },
      { label: 'Misi', href: '/admin/content/misi', icon: 'target', adminOnly: true, disabled: true },
      { label: 'Rekening', href: '/admin/content/rekening', icon: 'landmark', adminOnly: true, disabled: true },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { label: 'Pesan Masuk', href: '/admin/submissions', icon: 'inbox', adminOnly: true, disabled: true },
      { label: 'Rank Math SEO', href: '/admin/seo', icon: 'search-check', adminOnly: true, match: 'exact' },
      { label: 'SEO Halaman', href: '/admin/seo/pages', icon: 'file-search', adminOnly: true },
      { label: 'Redirections', href: '/admin/seo/redirections', icon: 'route', adminOnly: true },
      { label: '404 Monitor', href: '/admin/seo/404-monitor', icon: 'circle-alert', adminOnly: true },
      { label: 'Pengaturan', href: '/admin/settings', icon: 'settings', adminOnly: true },
      { label: 'Pengguna', href: '/admin/users', icon: 'user-cog', adminOnly: true },
    ],
  },
];

/** Flattened label lookup for breadcrumbs. */
export const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  NAV_SECTIONS.flatMap((s) => s.items.map((i) => [i.href, i.label])),
);

/** hrefs marked disabled — used by pages to server-side block direct URL access. */
export const DISABLED_ROUTES: string[] = NAV_SECTIONS.flatMap((s) =>
  s.items.filter((i) => i.disabled).map((i) => i.href),
);

/** Is this exact path (or a child of it) a disabled feature? */
export function isDisabledRoute(path: string): boolean {
  return DISABLED_ROUTES.some((href) => path === href || path.startsWith(href + '/'));
}

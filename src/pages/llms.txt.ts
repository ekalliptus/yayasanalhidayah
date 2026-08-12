export const prerender = false;
import type { APIRoute } from 'astro';
import { getSeoSettings } from '@/lib/seo';

interface Article { slug: string; title: string; excerpt: string | null; published_at: string | null }
interface Program { slug: string; title: string; description: string | null }
const oneLine = (value: string) => value.replace(/[\r\n[\]]+/g, ' ').trim();

// llms.txt — a plain-text index for LLM crawlers (Rank Math's LLMs.txt module).
// Markdown-ish: an H1 for the site, then link lists per content type.
export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;
  const settings = await getSeoSettings(supabase);
  if (!settings.llms_txt_enabled) return new Response('Not Found', { status: 404 });

  const site = settings.site_url;
  const [{ data: articles }, { data: programs }] = await Promise.all([
    supabase
      .from('articles')
      .select('slug,title,excerpt,published_at')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(100),
    supabase
      .from('programs')
      .select('slug,title,description')
      .eq('is_published', true)
      .order('sort_order')
      .limit(50),
  ]);

  const lines: string[] = [
    `# ${settings.site_name}`,
    '',
    `> ${settings.llms_txt_description || settings.site_description || settings.homepage_description}`,
    '',
    '## Halaman Utama',
    '',
    `- [Beranda](${site}/)`,
    `- [Program Donasi](${site}/program)`,
    `- [Artikel](${site}/artikel)`,
    '',
  ];

  const programRows = (programs ?? []) as unknown as Program[];
  if (programRows.length) {
    lines.push('## Program Donasi', '');
    for (const p of programRows) {
      const desc = (p.description ?? '').replace(/\s+/g, ' ').slice(0, 160);
      lines.push(`- [${oneLine(p.title)}](${site}/program#${encodeURIComponent(p.slug)})${desc ? `: ${desc}` : ''}`);
    }
    lines.push('');
  }

  const articleRows = (articles ?? []) as unknown as Article[];
  if (articleRows.length) {
    lines.push('## Artikel', '');
    for (const a of articleRows) {
      const desc = (a.excerpt ?? '').replace(/\s+/g, ' ').slice(0, 160);
      lines.push(`- [${oneLine(a.title)}](${site}/artikel/${encodeURIComponent(a.slug)})${desc ? `: ${desc}` : ''}`);
    }
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
};

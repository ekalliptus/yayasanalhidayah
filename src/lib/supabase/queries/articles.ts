// Shared article queries for the public blog (SSR) and RSS/sitemap endpoints.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';

type DB = SupabaseClient<Database>;

export const ARTICLE_CARD_COLS =
  'slug,title,excerpt,cover_image,published_at,reading_time,category:categories(name,slug)';

const nowIso = () => new Date().toISOString();

export interface ArticleListResult {
  articles: ArticleCard[];
  total: number;
  totalPages: number;
  page: number;
}

export interface ArticleCard {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  reading_time: number | null;
  category: { name: string; slug: string } | null;
}

export async function listPublishedArticles(
  client: DB,
  { page = 1, perPage = 9, categorySlug, tagSlug, search }: { page?: number; perPage?: number; categorySlug?: string; tagSlug?: string; search?: string } = {},
): Promise<ArticleListResult> {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = client
    .from('articles')
    .select(ARTICLE_CARD_COLS, { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', nowIso())
    .order('published_at', { ascending: false })
    .range(from, to);
  if (search?.trim()) {
    // Literal title search; escape PostgREST wildcard characters so user input
    // cannot silently broaden itself into an unbounded pattern.
    const term = search.trim().slice(0, 100).replace(/[\\%_]/g, (m) => `\\${m}`);
    query = query.ilike('title', `%${term}%`);
  }
  if (categorySlug) {
    const { data: category } = await client.from('categories').select('id').eq('slug', categorySlug).maybeSingle<{ id: string }>();
    if (!category) return { articles: [], total: 0, totalPages: 1, page };
    query = query.eq('category_id', category.id);
  }
  if (tagSlug) {
    // Supabase cannot reliably filter the card's nested M2M relation while
    // retaining a flat count. Resolve matching article IDs first; archives are
    // small and indexed by article_tags(tag_id).
    const { data: tag } = await client.from('tags').select('id').eq('slug', tagSlug).maybeSingle<{ id: string }>();
    if (!tag) return { articles: [], total: 0, totalPages: 1, page };
    const { data: links } = await client.from('article_tags').select('article_id').eq('tag_id', tag.id);
    const ids = (links ?? []).map((row) => row.article_id);
    if (!ids.length) return { articles: [], total: 0, totalPages: 1, page };
    query = query.in('id', ids);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    articles: (data ?? []) as unknown as ArticleCard[],
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    page,
  };
}

export type FullArticle = Database['public']['Tables']['articles']['Row'] & {
  category: { name: string; slug: string } | null;
  article_tags: { tag: { name: string; slug: string } | null }[];
  author_name: string;
};

export async function getArticleBySlug(client: DB, slug: string): Promise<FullArticle | null> {
  // No direct FK from articles.author_id → profiles, so fetch article + author separately.
  const { data } = await client
    .from('articles')
    .select('*, category:categories(name,slug), article_tags(tag:tags(name,slug))')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', nowIso())
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as FullArticle;
  // Resolve author name from profiles if author_id is set.
  if (row.author_id) {
    const { data: profile } = await client
      .from('profiles')
      .select('full_name')
      .eq('id', row.author_id)
      .maybeSingle();
    row.author_name = (profile as any)?.full_name || 'Yayasan Al Hidayah';
  } else {
    row.author_name = 'Yayasan Al Hidayah';
  }
  return row;
}

export async function getRelatedArticles(
  client: DB,
  { categoryId, excludeId, limit = 3 }: { categoryId: string | null; excludeId: string; limit?: number },
): Promise<ArticleCard[]> {
  if (!categoryId) return [];
  const { data } = await client
    .from('articles')
    .select(ARTICLE_CARD_COLS)
    .eq('status', 'published')
    .lte('published_at', nowIso())
    .eq('category_id', categoryId)
    .neq('id', excludeId)
    .order('published_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ArticleCard[];
}

export interface FeedArticle {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  updated_at: string;
}

export async function getAllPublishedForFeed(client: DB, limit = 50): Promise<FeedArticle[]> {
  const { data } = await client
    .from('articles')
    .select('slug,title,excerpt,published_at,updated_at')
    .eq('status', 'published')
    .lte('published_at', nowIso())
    .order('published_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as FeedArticle[];
}

// Robots meta assembly, ported from Rank Math's robots + advanced-robots pair.
//
// Precedence (most specific wins):
//   1. the global kill switch (`robots_index: false` → noindex,nofollow)
//   2. the page/article's own robots tokens
//   3. the site-wide default tokens
// The advanced directives (max-snippet / max-image-preview / max-video-preview)
// are only meaningful on an indexable page, so they're appended last and only
// when the result indexes.

import type { RobotsToken, SeoSettings } from './settings';

export function buildRobots(
  settings: SeoSettings,
  override: RobotsToken[] | null | undefined,
  forceNoindex = false,
): string {
  if (forceNoindex || !settings.robots_index) return 'noindex, nofollow';

  const tokens = new Set<RobotsToken>(
    override && override.length > 0 ? override : settings.robots_global,
  );
  if (tokens.size === 0) tokens.add('index');
  // "index" and "noindex" are contradictory; noindex is the safer read.
  if (tokens.has('noindex')) tokens.delete('index');

  const parts: string[] = [];
  for (const t of ['index', 'noindex', 'nofollow', 'noarchive', 'nosnippet', 'noimageindex'] as RobotsToken[]) {
    if (tokens.has(t)) parts.push(t);
  }
  // Rank Math emits "follow" alongside index so the directive is explicit.
  if (tokens.has('index') && !tokens.has('nofollow')) parts.splice(1, 0, 'follow');

  if (!tokens.has('noindex')) {
    parts.push(`max-snippet:${settings.robots_max_snippet}`);
    if (!tokens.has('noimageindex')) parts.push(`max-image-preview:${settings.robots_max_image_preview}`);
    parts.push(`max-video-preview:${settings.robots_max_video_preview}`);
  }

  return parts.join(', ');
}

/** True when the assembled directive keeps the page out of the index. */
export function isNoindex(robots: string): boolean {
  return /\bnoindex\b/.test(robots);
}

// Rank Math Image SEO: fill only missing alt/title attributes from templates.
// Existing author-written values always win. The server applies this after
// sanitization so it cannot reintroduce stripped markup.

import type { SeoSettings } from './settings';
import { replaceVariables, type VariableContext } from './variables';

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function applyImageSeo(html: string, settings: SeoSettings, ctx: Omit<VariableContext, 'settings'>): string {
  if (!html || (!settings.image_add_missing_alt && !settings.image_add_missing_title)) return html;
  const alt = escapeAttr(replaceVariables(settings.image_alt_template, { ...ctx, settings }));
  const title = escapeAttr(replaceVariables(settings.image_title_template, { ...ctx, settings }));

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    let out = tag;
    if (settings.image_add_missing_alt && !/\salt\s*=/i.test(out) && alt) out = out.replace(/^<img\b/i, `<img alt="${alt}"`);
    if (settings.image_add_missing_title && !/\stitle\s*=/i.test(out) && title) out = out.replace(/^<img\b/i, `<img title="${title}"`);
    return out;
  });
}

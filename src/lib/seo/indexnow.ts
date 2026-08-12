// IndexNow instant indexing. Rank Math sends this body to api.indexnow.org:
// { host, key, keyLocation, urlList }. A successful endpoint returns 200/202.

import type { SeoSettings } from './settings';

export interface IndexNowResult {
  ok: boolean;
  submitted: number;
  status?: number;
}

export async function submitIndexNow(
  urls: string[],
  settings: SeoSettings,
  fetcher: typeof fetch = fetch,
): Promise<IndexNowResult> {
  if (!settings.indexnow_enabled || !settings.indexnow_key) return { ok: true, submitted: 0 };

  const origin = new URL(settings.site_url);
  const clean = [...new Set(urls)]
    .filter((url) => {
      try { return new URL(url).origin === origin.origin; }
      catch { return false; }
    })
    .slice(0, 100);
  if (!clean.length) return { ok: true, submitted: 0 };

  try {
    const response = await fetcher('https://api.indexnow.org/indexnow/', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: origin.host,
        key: settings.indexnow_key,
        keyLocation: `${settings.site_url}/${settings.indexnow_key}.txt`,
        urlList: clean,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return { ok: response.status === 200 || response.status === 202, submitted: clean.length, status: response.status };
  } catch {
    return { ok: false, submitted: 0 };
  }
}

/** IndexNow key shape: 8–128 hexadecimal characters. */
export function isValidIndexNowKey(key: string): boolean {
  return /^[a-f0-9]{8,128}$/i.test(key);
}

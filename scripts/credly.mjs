import { SourceUnavailableError } from './snapshots.mjs';

/** Read and validate the entire feed before replacing any existing badges. */
export async function fetchCredlyFeed(user, { request = fetch, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), previousCount = 0 } = {}) {
  const base = new URL(`https://www.credly.com/users/${encodeURIComponent(user)}/badges.json`);
  let next = base.href;
  const visited = new Set();
  const badges = [];
  let total;
  while (next) {
    let url;
    try {
      url = new URL(next, base);
    } catch {
      throw new SourceUnavailableError('Invalid Credly pagination URL');
    }
    if (url.origin !== base.origin || url.pathname !== base.pathname || visited.has(url.href)) {
      throw new SourceUnavailableError('Invalid Credly pagination URL');
    }
    visited.add(url.href);
    let json;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await request(url.href, {
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; jetzlstorfer.org portfolio build)', accept: 'application/json' },
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
          const error = new SourceUnavailableError(`Credly HTTP ${response.status}`);
          if (response.status !== 429 && response.status < 500) throw error;
          if (attempt === 3) throw error;
          await sleep(attempt * 2000);
          continue;
        }
        json = await response.json();
        break;
      } catch (error) {
        if (error instanceof SourceUnavailableError) throw error;
        if (attempt === 3) throw new SourceUnavailableError(`Credly request failed: ${error.message}`);
        await sleep(attempt * 2000);
      }
    }
    if (!Array.isArray(json?.data) || !Number.isInteger(json.metadata?.total_count) || json.metadata.total_count < 0 ||
        !(json.metadata.next_page_url === null || typeof json.metadata.next_page_url === 'string')) {
      throw new SourceUnavailableError('Unexpected Credly response shape');
    }
    total ??= json.metadata.total_count;
    if (json.metadata.total_count !== total) throw new SourceUnavailableError('Credly feed changed during pagination');
    for (const badge of json.data) {
      if (!badge || typeof badge.id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(badge.id) ||
          typeof badge.badge_template?.name !== 'string' || !badge.badge_template.name.trim()) {
        throw new SourceUnavailableError('Invalid Credly badge');
      }
      badges.push(badge);
    }
    if (badges.length > total || visited.size > Math.max(1, total)) {
      throw new SourceUnavailableError('Credly pagination exceeds the reported total');
    }
    next = json.metadata.next_page_url;
  }
  if (badges.length !== total || new Set(badges.map((badge) => badge.id)).size !== badges.length) {
    throw new SourceUnavailableError('Incomplete or duplicate Credly badge feed');
  }
  const publicBadges = badges.filter((badge) => badge.public !== false && badge.state !== 'pending');
  if (!publicBadges.length && previousCount) throw new SourceUnavailableError('Credly unexpectedly returned no public badges');
  return publicBadges;
}

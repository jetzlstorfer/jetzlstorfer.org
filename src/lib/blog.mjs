/**
 * Shared, framework-free helpers for the blog so they can be unit tested with `node --test`.
 */

/**
 * Drafts are visible while developing locally and never in a production build.
 * @param {{ data: { draft?: boolean } }} post
 * @param {{ dev?: boolean }} [options]
 */
export function isVisible(post, { dev = false } = {}) {
  return dev || !post.data.draft;
}

/**
 * Newest first; equal dates keep a stable order by id.
 * @template {{ id: string, data: { pubDate: Date } }} T
 * @param {T[]} posts
 * @returns {T[]}
 */
export function sortPosts(posts) {
  return [...posts].sort((a, b) =>
    b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || a.id.localeCompare(b.id));
}

/** Rough reading time at 220 words per minute, ignoring fenced code blocks. */
export function readingMinutes(markdown = '') {
  const prose = markdown.replace(/```[\s\S]*?```/g, ' ');
  const words = prose.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.round(words / 220));
}

/** Small deterministic riso artwork for a post, seeded by its id. */
export function postArt(id) {
  const seed = [...id].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);
  const shapes = [0, 1, 2].map((index) => {
    const value = (seed >>> (index * 7)) & 0x7f;
    const x = 30 + (value % 150);
    const y = 30 + ((value * 3 + index * 41) % 110);
    const size = 34 + (value % 36);
    const markup = [
      `<circle cx="${x}" cy="${y}" r="${size / 2}"/>`,
      `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}"/>`,
      `<path d="M${x} ${y - size / 2} L${x + size / 2} ${y + size / 2} H${x - size / 2} Z"/>`,
      `<path d="M${x} ${y} V${y - size} A${size} ${size} 0 0 1 ${x + size} ${y} Z"/>`,
    ][(value + index) % 4];
    return `<g class="print-ink ink-${index}">${markup}</g>`;
  }).join('');
  return `<svg viewBox="0 0 230 180" aria-hidden="true" focusable="false"><path class="registration" d="M8 16h12M14 10v12M210 164h12M216 158v12"/>${shapes}</svg>`;
}

export function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character]);
}

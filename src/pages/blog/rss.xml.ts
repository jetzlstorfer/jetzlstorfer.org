import { getCollection } from 'astro:content';
import { escapeXml, isVisible, sortPosts } from '../../lib/blog.mjs';

export async function GET({ site }: { site: URL }) {
  const posts = sortPosts(await getCollection('blog', (post) => isVisible(post)));
  const blogUrl = new URL('/blog/', site).href;
  const items = posts.map((post) => {
    const url = new URL(`/blog/${post.id}/`, site).href;
    return `<item><title>${escapeXml(post.data.title)}</title><link>${url}</link><guid>${url}</guid>`
      + `<description>${escapeXml(post.data.description)}</description><pubDate>${post.data.pubDate.toUTCString()}</pubDate>`
      + post.data.tags.map((tag: string) => `<category>${escapeXml(tag)}</category>`).join('')
      + '</item>';
  }).join('');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>'
    + `<rss version="2.0"><channel><title>Jürgen Etzlstorfer — blog</title><link>${blogUrl}</link>`
    + `<description>Notes on cloud, AI and side projects.</description><language>en</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

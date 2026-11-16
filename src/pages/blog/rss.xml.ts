import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { escapeXml, isVisible, sortPosts } from '../../lib/blog.mjs';
import { rssContent } from '../../lib/rss.mjs';

export async function GET({ site }: { site: URL }) {
  const posts = sortPosts(await getCollection('blog', (post) => isVisible(post)));
  const blogUrl = new URL('/blog/', site).href;
  const container = await AstroContainer.create();
  const items = (await Promise.all(posts.map(async (post) => {
    const url = new URL(`/blog/${post.id}/`, site).href;
    const { Content } = await render(post);
    const html = await container.renderToString(Content, { request: new Request(url) });
    return `<item><title>${escapeXml(post.data.title)}</title><link>${escapeXml(url)}</link><guid>${escapeXml(url)}</guid>`
      + `<description>${escapeXml(post.data.description)}</description><pubDate>${post.data.pubDate.toUTCString()}</pubDate>`
      + rssContent(html, url)
      + post.data.tags.map((tag: string) => `<category>${escapeXml(tag)}</category>`).join('')
      + '</item>';
  }))).join('');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>'
    + `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Jürgen Etzlstorfer — blog</title><link>${escapeXml(blogUrl)}</link>`
    + `<description>Notes on cloud, AI and side projects.</description><language>en</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

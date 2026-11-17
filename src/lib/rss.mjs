import sanitizeHtml from 'sanitize-html';
import { escapeXml } from './blog.mjs';

/** Rendered article HTML, safe for feed readers and independent of their base URL. */
export function rssContent(html, postUrl) {
  const content = sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['id'],
      a: ['href', 'name', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      ol: ['start'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan', 'scope'],
    },
    transformTags: {
      '*': (tagName, attribs) => {
        for (const attribute of ['href', 'src']) {
          if (attribs[attribute]) {
            attribs[attribute] = new URL(attribs[attribute], postUrl).href;
          }
        }
        return { tagName, attribs };
      },
    },
  });
  return `<content:encoded>${escapeXml(content)}</content:encoded>`;
}

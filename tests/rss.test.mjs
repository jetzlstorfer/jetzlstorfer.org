import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeXml } from '../src/lib/blog.mjs';
import { rssContent } from '../src/lib/rss.mjs';

const postUrl = 'https://jetzlstorfer.org/blog/example/';
const encoded = (html) => `<content:encoded>${escapeXml(html)}</content:encoded>`;

test('RSS includes the complete formatted article with XML-safe HTML', () => {
  const article = '<h2 id="details">Details &amp; examples</h2>'
    + '<p>Opening paragraph with <strong>emphasis</strong>.</p>'
    + '<pre><code>&lt;example&gt; &amp; ]]&gt;</code></pre>'
    + '<ol start="3"><li>A later step</li></ol>'
    + '<p>The final paragraph.</p>';
  assert.equal(rssContent(article, postUrl), encoded(article));
});

test('RSS resolves image and link URLs against the individual article', () => {
  const article = '<a href="../another/">Another post</a>'
    + '<a href="#details">Details</a>'
    + '<img src="/_astro/diagram.hash.png" alt="Flow &amp; steps" width="800" height="450" loading="lazy" srcset="/small.png 400w" />'
    + '<img src="diagram.png" alt="Relative" />'
    + '<img src="//images.example.org/photo.jpg" alt="Remote" />'
    + '<a href="https://example.org/?a=1&amp;b=2">External</a>';
  assert.equal(rssContent(article, postUrl), encoded(
    '<a href="https://jetzlstorfer.org/blog/another/">Another post</a>'
    + `<a href="${postUrl}#details">Details</a>`
    + '<img src="https://jetzlstorfer.org/_astro/diagram.hash.png" alt="Flow &amp; steps" width="800" height="450" />'
    + '<img src="https://jetzlstorfer.org/blog/example/diagram.png" alt="Relative" />'
    + '<img src="https://images.example.org/photo.jpg" alt="Remote" />'
    + '<a href="https://example.org/?a=1&amp;b=2">External</a>',
  ));
});

test('RSS omits active content and unsafe URLs while keeping article text', () => {
  const article = '<script>alert(1)</script><style>p{display:none}</style>'
    + '<p onclick="alert(1)">Still readable</p>'
    + '<img src="javascript:alert(1)" onerror="alert(1)" alt="Safe text" />'
    + '<a href="javascript:alert(1)">Link text</a>'
    + '<iframe src="https://example.org/embed"></iframe>';
  assert.equal(rssContent(article, postUrl), encoded(
    '<p>Still readable</p><img alt="Safe text" /><a>Link text</a>',
  ));
});

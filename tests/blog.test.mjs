import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeXml, isVisible, readingMinutes, sortPosts } from '../src/lib/blog.mjs';

const post = (id, pubDate, draft = false) => ({ id, data: { pubDate: new Date(pubDate), draft } });

test('drafts only show while developing', () => {
  assert.equal(isVisible(post('a', '2026-01-01', true)), false);
  assert.equal(isVisible(post('a', '2026-01-01', true), { dev: true }), true);
  assert.equal(isVisible(post('b', '2026-01-01')), true);
});

test('posts sort newest first with a stable tie-break', () => {
  const ids = sortPosts([post('b', '2026-01-01'), post('c', '2026-03-01'), post('a', '2026-01-01')]).map((p) => p.id);
  assert.deepEqual(ids, ['c', 'a', 'b']);
});

test('reading time ignores code blocks and never drops below a minute', () => {
  assert.equal(readingMinutes(''), 1);
  const prose = Array(660).fill('word').join(' ');
  assert.equal(readingMinutes(`${prose}\n\`\`\`js\n${Array(2000).fill('code').join(' ')}\n\`\`\``), 3);
});

test('feed text is XML-escaped', () => {
  assert.equal(escapeXml(`Tom & "Jerry" <3 'x'`), 'Tom &amp; &quot;Jerry&quot; &lt;3 &apos;x&apos;');
});

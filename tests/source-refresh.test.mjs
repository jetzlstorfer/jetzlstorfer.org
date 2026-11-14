import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fetchCredlyFeed } from '../scripts/credly.mjs';
import { pruneImages, refreshSource, SourceUnavailableError } from '../scripts/snapshots.mjs';

const badge = (id) => ({ id, badge_template: { name: `Badge ${id}` }, public: true });
const response = (data, total = data.length, next = null) => ({
  ok: true,
  json: async () => ({ data, metadata: { total_count: total, next_page_url: next } }),
});

test('Credly collects all pages and only returns public, non-pending badges', async () => {
  const requests = [];
  const pages = [
    response([badge('first'), { ...badge('private'), public: false }], 3, '?page=2'),
    response([{ ...badge('pending'), state: 'pending' }], 3),
  ];
  const data = await fetchCredlyFeed('example', { request: async (url) => {
    requests.push(url);
    return pages.shift();
  } });
  assert.deepEqual(data, [badge('first')]);
  assert.equal(requests[1], 'https://www.credly.com/users/example/badges.json?page=2');
});

test('Credly retries transient errors but not permanent HTTP errors', async () => {
  let calls = 0;
  const sleeps = [];
  const data = await fetchCredlyFeed('example', {
    request: async () => {
      calls++;
      if (calls === 1) throw new Error('network unavailable');
      if (calls === 2) return { ok: false, status: 503 };
      return response([badge('ok')]);
    },
    sleep: async (ms) => sleeps.push(ms),
  });
  assert.equal(data.length, 1);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [2000, 4000]);
  calls = 0;
  await assert.rejects(fetchCredlyFeed('example', {
    request: async () => { calls++; return { ok: false, status: 403 }; },
  }), SourceUnavailableError);
  assert.equal(calls, 1);
});

test('an unexpectedly empty public feed preserves existing badges while a first empty feed is valid', async () => {
  const request = async () => response([]);
  assert.deepEqual(await fetchCredlyFeed('example', { request }), []);
  await assert.rejects(fetchCredlyFeed('example', { request, previousCount: 18 }), /unexpectedly returned no public badges/);
  await assert.rejects(fetchCredlyFeed('example', {
    request: async () => response([{ ...badge('private'), public: false }]), previousCount: 18,
  }), SourceUnavailableError);
});

test('Credly rejects malformed, incomplete, duplicate and unsafe paginated feeds', async () => {
  for (const page of [
    { ok: true, json: async () => ({}) },
    response([badge('one')], 2),
    response([badge('one'), badge('one')]),
    response([{ id: '../escape', badge_template: { name: 'Unsafe' } }]),
    response([badge('one')], 2, 'https://other.example/badges.json'),
    response([badge('one')], 2, 'http://['),
    response([badge('one')], 2, 'https://www.credly.com/users/example/badges.json'),
  ]) {
    await assert.rejects(fetchCredlyFeed('example', { request: async () => page }), SourceUnavailableError);
  }
});

async function setup(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cache = path.join(root, '.portfolio-cache');
  const warnings = [];
  const options = { root, cache, source: 'credly', identity: 'example', warn: (message) => warnings.push(message) };
  const image = 'src/assets/fetched/badges/first.png';
  await mkdir(path.dirname(path.join(root, image)), { recursive: true });
  await writeFile(path.join(root, image), 'original badge image');
  const data = [{ id: 'first', image: { file: image } }];
  return { root, cache, options, data, image, warnings };
}

test('outages restore badge data AND images, retain refresh date, and do not overwrite the snapshot', async (t) => {
  const { root, cache, options, data, image, warnings } = await setup(t);
  const date = new Date('2026-11-01T00:00:00Z');
  await refreshSource({ ...options, fetchData: async () => data, now: date });
  const before = await readFile(path.join(cache, 'credly', 'snapshot.json'), 'utf8');
  await rm(path.join(root, image));
  const result = await refreshSource({ ...options, fetchData: async (previous) => {
    assert.deepEqual(previous, data);
    await writeFile(path.join(root, image), 'partially fetched image');
    throw new SourceUnavailableError('HTTP 503');
  } });
  assert.deepEqual(result.data, data);
  assert.deepEqual(result.freshness, { lastSuccessAt: date.toISOString(), stale: true, error: 'HTTP 503' });
  assert.equal(await readFile(path.join(root, image), 'utf8'), 'original badge image');
  assert.equal(await readFile(path.join(cache, 'credly', 'snapshot.json'), 'utf8'), before);
  assert.match(warnings[0], /keeping data from/);
});

test('unavailable sources without a matching complete snapshot fail rather than returning empty data', async (t) => {
  const { cache, options, data } = await setup(t);
  const offline = async () => { throw new SourceUnavailableError('offline'); };
  await assert.rejects(refreshSource({ ...options, fetchData: offline }), /offline/);
  await refreshSource({ ...options, fetchData: async () => data });
  await assert.rejects(refreshSource({ ...options, identity: 'different-account', fetchData: offline }), /offline/);
  await rm(path.join(cache, 'credly', data[0].image.file));
  await assert.rejects(refreshSource({ ...options, fetchData: offline }), /offline/);
});

test('curation and privacy errors never fall back to previously public content', async (t) => {
  const { options, data } = await setup(t);
  await refreshSource({ ...options, fetchData: async () => data });
  await assert.rejects(refreshSource({ ...options, fetchData: async () => {
    throw new Error('configured repository is private');
  } }), /configured repository is private/);
});

test('unsafe snapshot image paths are rejected with a warning', async (t) => {
  const { cache, options, warnings } = await setup(t);
  await mkdir(path.join(cache, 'credly'), { recursive: true });
  await writeFile(path.join(cache, 'credly', 'snapshot.json'), JSON.stringify({
    identity: options.identity, lastSuccessAt: '2026-11-01T00:00:00Z',
    data: [{ image: { file: 'src/assets/fetched/../../secret.png' } }],
  }));
  await assert.rejects(refreshSource({ ...options, fetchData: async () => {
    throw new SourceUnavailableError('offline');
  } }), /offline/);
  assert.match(warnings[0], /Unsafe snapshot image path/);
});

test('one source can update while another reuses its snapshot', async (t) => {
  const { options, data } = await setup(t);
  await refreshSource({ ...options, fetchData: async () => data });
  const github = await refreshSource({ ...options, source: 'github', fetchData: async () => ({ projects: ['new-project'] }) });
  const credly = await refreshSource({ ...options, fetchData: async () => { throw new SourceUnavailableError('offline'); } });
  assert.deepEqual(github.data.projects, ['new-project']);
  assert.equal(github.freshness.stale, false);
  assert.deepEqual(credly.data, data);
  assert.equal(credly.freshness.stale, true);
});

test('successful removals prune old images from snapshots and build assets', async (t) => {
  const { root, cache, options, data, image } = await setup(t);
  await refreshSource({ ...options, fetchData: async () => data });
  await refreshSource({ ...options, fetchData: async () => [] });
  await pruneImages(root, []);
  await assert.rejects(access(path.join(cache, 'credly', image)), { code: 'ENOENT' });
  await assert.rejects(access(path.join(root, image)), { code: 'ENOENT' });
});

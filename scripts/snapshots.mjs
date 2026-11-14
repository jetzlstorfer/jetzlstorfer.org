import { access, copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class SourceUnavailableError extends Error {}

function imageFiles(data) {
  const files = new Set();
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.file === 'string') {
      if (!/^src\/assets\/fetched\/[a-zA-Z0-9_./-]+$/.test(value.file) || value.file.split('/').includes('..')) {
        throw new Error(`Unsafe snapshot image path: ${value.file}`);
      }
      files.add(value.file);
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(data);
  return [...files];
}

async function copyImages(files, from, to) {
  for (const file of files) {
    const target = path.join(to, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(from, file), target);
  }
}

export async function pruneImages(root, data) {
  const keep = new Set(imageFiles(data));
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (!keep.has(path.relative(root, file).replaceAll('\\', '/'))) await rm(file);
    }
  }
  await visit(path.join(root, 'src', 'assets', 'fetched'));
}

/** Snapshots include their images and are valid only for the same curation/account. */
export async function refreshSource({ root, cache, source, identity, fetchData, warn, now = new Date() }) {
  const directory = path.join(cache, source);
  let previous = null;
  let found = false;
  try {
    const content = await readFile(path.join(directory, 'snapshot.json'), 'utf8');
    found = true;
    const snapshot = JSON.parse(content);
    if (snapshot.identity === identity) {
      if (!Number.isFinite(Date.parse(snapshot.lastSuccessAt))) throw new Error('Invalid snapshot refresh date');
      if (!snapshot.data || typeof snapshot.data !== 'object') throw new Error('Invalid snapshot data');
      const files = imageFiles(snapshot.data);
      await Promise.all(files.map((file) => access(path.join(directory, file))));
      await copyImages(files, directory, root);
      previous = snapshot;
    }
  } catch (error) {
    if (found || error.code !== 'ENOENT') warn(`${source}: cannot restore snapshot: ${error.message}`);
  }

  let data;
  try {
    data = await fetchData(previous?.data);
  } catch (error) {
    if (!(error instanceof SourceUnavailableError) || !previous) throw error;
    warn(`${source}: ${error.message}; keeping data from ${previous.lastSuccessAt}`);
    await copyImages(imageFiles(previous.data), directory, root);
    return {
      data: previous.data,
      freshness: { lastSuccessAt: previous.lastSuccessAt, stale: true, error: error.message },
    };
  }

  const files = imageFiles(data);
  await copyImages(files, root, directory);
  await pruneImages(directory, data);
  const lastSuccessAt = now.toISOString();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'snapshot.json'), `${JSON.stringify({ identity, lastSuccessAt, data }, null, 2)}\n`);
  return { data, freshness: { lastSuccessAt, stale: false, error: null } };
}

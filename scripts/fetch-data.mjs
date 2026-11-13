#!/usr/bin/env node
/**
 * Prints the data for the portfolio.
 *
 * Reads public GitHub data (profile, repositories, READMEs, languages, recent
 * commits, contribution calendar) and the public Credly badge feed, then writes
 * src/data/portfolio.json and downloads images to src/assets/fetched/.
 *
 * Token: GITHUB_TOKEN or GH_TOKEN, falling back to `gh auth token` locally.
 * Only public repositories are requested, and every item is re-checked before
 * it is written: a private repository must never reach the build.
 */
import { execSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../portfolio.config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = path.join(ROOT, 'src', 'data', 'portfolio.json');
const ASSET_DIR = path.join(ROOT, 'src', 'assets', 'fetched');
const UA = 'jetzlstorfer.org-portfolio-printer';
const LOGIN = config.login;
const NOW = new Date();
const DAY = 86_400_000;

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('! sharp not available: images are stored as downloaded, without size checks');
}

const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.warn(`! ${msg}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ token */

function resolveToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}
const TOKEN = resolveToken();
if (!TOKEN) {
  console.error('No GitHub token. Set GITHUB_TOKEN or log in with `gh auth login`.');
  process.exit(1);
}

/* ---------------------------------------------------------------- graphql */

async function gql(query, variables = {}, label = 'query') {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          authorization: `bearer ${TOKEN}`,
          'content-type': 'application/json',
          'user-agent': UA,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`${label}: HTTP ${res.status}`);
        await sleep(attempt * 3000);
        continue;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${JSON.stringify(json).slice(0, 400)}`);
      for (const e of json.errors ?? []) warn(`${label}: ${e.type ?? 'error'} ${e.message}`);
      if (!json.data) throw new Error(`${label}: no data returned`);
      return json.data;
    } catch (err) {
      lastError = err;
      if (attempt < 4) await sleep(attempt * 2000);
    }
  }
  throw lastError;
}

const REPO_FIELDS = `
  name nameWithOwner url homepageUrl description
  isFork isArchived isPrivate isTemplate
  stargazerCount forkCount createdAt pushedAt
  owner { login avatarUrl }
  primaryLanguage { name color }
  repositoryTopics(first: 12) { nodes { topic { name } } }
  licenseInfo { spdxId }
  defaultBranchRef { name }
  usesCustomOpenGraphImage openGraphImageUrl
`;

async function fetchProfile() {
  const query = `
    query($login: String!, $after: String) {
      user(login: $login) {
        id name login bio company location websiteUrl avatarUrl createdAt
        socialAccounts(first: 10) { nodes { provider displayName url } }
        followers { totalCount }
        pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { nameWithOwner isPrivate } } }
        repositories(first: 100, after: $after, privacy: PUBLIC, ownerAffiliations: OWNER,
                     orderBy: { field: PUSHED_AT, direction: DESC }) {
          totalCount
          pageInfo { hasNextPage endCursor }
          nodes { ${REPO_FIELDS} }
        }
        repositoriesContributedTo(first: 50, privacy: PUBLIC, includeUserRepositories: false,
                                  contributionTypes: [COMMIT, PULL_REQUEST, REPOSITORY]) {
          nodes { ${REPO_FIELDS} }
        }
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount } }
          }
        }
      }
    }`;
  let after = null;
  let user = null;
  const own = [];
  do {
    const data = await gql(query, { login: LOGIN, after }, 'profile');
    if (!data.user) throw new Error(`GitHub user "${LOGIN}" not found`);
    user ??= data.user;
    own.push(...data.user.repositories.nodes);
    after = data.user.repositories.pageInfo.hasNextPage ? data.user.repositories.pageInfo.endCursor : null;
  } while (after);
  user.repositories.nodes = own;
  return user;
}

const HISTORY_FIELDS = `
  totalCount
  nodes {
    oid abbreviatedOid messageHeadline messageBody committedDate url
    parents { totalCount }
    author { name user { login } }
  }
`;

async function fetchDetails(repos, userId) {
  const results = new Map();
  const batchSize = 8;
  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    const parts = batch.map((r, j) => {
      const [owner, name] = r.nameWithOwner.split('/');
      const authorFilter = r.owner.login.toLowerCase() === LOGIN.toLowerCase() ? '' : `, author: { id: ${JSON.stringify(userId)} }`;
      return `
        r${j}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
          ${REPO_FIELDS}
          languages(first: 12, orderBy: { field: SIZE, direction: DESC }) { totalSize edges { size node { name color } } }
          tree: object(expression: "HEAD:") { ... on Tree { entries { name type } } }
          readme: object(expression: "HEAD:README.md") { ... on Blob { text byteSize } }
          readmeLower: object(expression: "HEAD:readme.md") { ... on Blob { text byteSize } }
          defaultBranchRef { name target { ... on Commit { history(first: 8${authorFilter}) { ${HISTORY_FIELDS} } } } }
        }`;
    });
    const data = await gql(`query { ${parts.join('\n')} }`, {}, `details ${i / batchSize + 1}`);
    batch.forEach((r, j) => {
      if (data[`r${j}`]) results.set(r.nameWithOwner.toLowerCase(), data[`r${j}`]);
      else warn(`no details for ${r.nameWithOwner}`);
    });
  }

  // Third pass for READMEs with unusual names (README.MD, Readme.md, README, README.markdown).
  const missing = [];
  for (const [key, d] of results) {
    if (d.readme?.text || d.readmeLower?.text) continue;
    const entry = d.tree?.entries?.find((e) => e.type === 'blob' && /^readme(\.(md|markdown|mdown|txt))?$/i.test(e.name));
    if (entry) missing.push({ key, d, file: entry.name });
  }
  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    const parts = batch.map(({ d, file }, j) => {
      const [owner, name] = d.nameWithOwner.split('/');
      return `m${j}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
        readme: object(expression: ${JSON.stringify(`HEAD:${file}`)}) { ... on Blob { text byteSize } } }`;
    });
    const data = await gql(`query { ${parts.join('\n')} }`, {}, 'readme fallback');
    batch.forEach(({ d }, j) => {
      if (data[`m${j}`]?.readme) d.readme = data[`m${j}`].readme;
    });
  }
  return results;
}

/* --------------------------------------------------------------- text utils */

const SHORTCODE = /:[a-z0-9_+-]+:/gi;
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…' };

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function squash(s) {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function cleanLine(s) {
  return squash((s ?? '').replace(SHORTCODE, ''));
}

const hasWords = (s) => /\p{L}{3,}/u.test(s ?? '');

function inlineToText(s) {
  return cleanLine(
    decodeEntities(
      s
        .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/!\[[^\]]*\]\[[^\]]*\]/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/(\*\*|__)(\S(?:.*?\S)?)\1/g, '$2')
        .replace(/(^|[^\w*])\*(\S(?:.*?\S)?)\*(?!\w)/g, '$1$2')
        .replace(/(^|[^\w])_(\S(?:.*?\S)?)_(?!\w)/g, '$1$2')
        .replace(/~~(.+?)~~/g, '$1'),
    ),
  );
}

function truncate(s, max) {
  if (!s || s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.–—-]+$/, '')}…`;
}

function parseReadme(md) {
  if (!md) return { title: null, summary: null, images: [] };
  const text = md.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
  const prose = text.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');

  let title = null;
  const h1 =
    prose.match(/^#\s+(.+?)\s*#*\s*$/m) ??
    prose.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ??
    prose.match(/^([^\n#>![<][^\n]*)\n=+\s*$/m);
  if (h1) title = inlineToText(h1[1]) || null;

  let summary = null;
  const body = prose.replace(/^[^\n]+\n(?:=+|-+)[ \t]*$/gm, '');
  for (const raw of body.split(/\n\s*\n/)) {
    const block = raw.trim();
    if (!block) continue;
    if (/^(#|=+$|-{3,}|\*{3,}|_{3,}|\||```|~~~)/.test(block)) continue;
    if (/^\s*([-*+]|\d+[.)])\s/.test(block)) continue;
    if (/^>\s*\[!/.test(block)) continue;
    if (/^<(h\d|table|picture|img|br|hr|video|details|summary)\b/i.test(block)) continue;
    const lines = block
      .split('\n')
      .filter((l) => !/^\s*(\||[-*+]\s|\d+[.)]\s|#)/.test(l))
      .map((l) => l.replace(/^\s*>\s?/, ''));
    const candidate = inlineToText(lines.join(' '));
    if (candidate.length < 40 || !hasWords(candidate)) continue;
    if (/^(table of contents|contents|toc)\b/i.test(candidate)) continue;
    summary = truncate(candidate, 260);
    break;
  }

  const images = [];
  const re = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)|<img\b([^>]*)>/gi;
  for (const m of text.matchAll(re)) {
    if (m[2]) images.push({ src: m[2], alt: inlineToText(m[1] ?? '') });
    else {
      const src = m[3].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
      const alt = m[3].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
      if (src) images.push({ src, alt: decodeEntities(alt) });
    }
  }
  return { title, summary, images };
}

const BADGE_SRC =
  /shields\.io|badgen\.net|badge\.fury|travis-ci|circleci\.com|codecov|coveralls|goreportcard|pkg\.go\.dev\/badge|\/badges?\b|badge\.svg|\/workflows\/[^?]*\.svg|deploytoazurebutton|deploy-to-azure|forthebadge|api\.netlify|vercel\.com\/button|github-readme-stats|komarev|visitor-badge|hits\.seeyoufarm|img\.youtube\.com|\.svg(\?|#|$)/i;
const BADGE_ALT = /\b(badge|build status|license|deploy to azure|open in|codespaces|ci status|coverage)\b/i;

function resolveImageUrl(src, repo) {
  if (!src || /^data:/i.test(src)) return null;
  if (src.startsWith('//')) return `https:${src}`;
  if (/^https?:\/\//i.test(src)) {
    const blob = src.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^?#]+)/i);
    if (blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`;
    return src;
  }
  const branch = repo.defaultBranchRef?.name ?? 'HEAD';
  const clean = src.replace(/^\.\//, '').replace(/^\//, '').split(/[?#]/)[0];
  let safe;
  try {
    safe = encodeURI(decodeURI(clean));
  } catch {
    safe = encodeURI(clean);
  }
  return `https://raw.githubusercontent.com/${repo.nameWithOwner}/${branch}/${safe}`;
}

/* -------------------------------------------------------------- downloads */

function sniffExt(buf, type = '') {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.slice(0, 3).toString() === 'GIF') return 'gif';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (/avif/.test(type)) return 'avif';
  return null;
}

/** Downloads an image, normalises it to webp, and returns its repo-relative path and size. */
async function downloadImage(url, destNoExt, { minWidth = 0, minHeight = 0, maxWidth = 1600 } = {}) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'image/avif,image/webp,image/png,image/jpeg,image/*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 12_000_000) throw new Error('image larger than 12 MB');
  const ext = sniffExt(buf, res.headers.get('content-type') ?? '');
  if (!ext) throw new Error(`not a raster image (${res.headers.get('content-type')})`);
  await mkdir(path.dirname(destNoExt), { recursive: true });

  if (!sharp) {
    const file = `${destNoExt}.${ext}`;
    await writeFile(file, buf);
    return { file: path.relative(ROOT, file).replaceAll('\\', '/'), width: null, height: null };
  }
  const img = sharp(buf, { animated: false });
  const meta = await img.metadata();
  if ((meta.width ?? 0) < minWidth || (meta.height ?? 0) < minHeight) {
    throw new Error(`too small (${meta.width}x${meta.height})`);
  }
  const file = `${destNoExt}.webp`;
  const out = await img
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(file);
  return { file: path.relative(ROOT, file).replaceAll('\\', '/'), width: out.width, height: out.height };
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------------------------------------------------------------- curation */

const isOwn = (r) => (typeof r.owner === 'string' ? r.owner : r.owner?.login)?.toLowerCase() === LOGIN.toLowerCase();
const keyOf = (r) => (isOwn(r) ? r.name : r.nameWithOwner);

function listHas(list, repo) {
  return listIndex(list, repo) >= 0;
}

function listIndex(list, repo) {
  const names = [repo.nameWithOwner.toLowerCase()];
  if (isOwn(repo)) names.push(repo.name.toLowerCase());
  return (list ?? []).findIndex((x) => names.includes(String(x).toLowerCase()));
}

function overrideFor(repo) {
  const o = config.overrides ?? {};
  for (const [k, v] of Object.entries(o)) {
    const key = k.toLowerCase();
    if (key === repo.nameWithOwner.toLowerCase() || (isOwn(repo) && key === repo.name.toLowerCase())) return v;
  }
  return {};
}

const TAG_RULES = [
  ['live', 'Live sites', null],
  ['ai', 'AI & agents', /\b(ai|llms?|gpt[-\w]*|openai|aoai|agents?|agentic|rag|copilot|semantic kernel|foundry|mcp|langchain|autogen|chatbot|genai|machine learning)\b/i],
  ['azure', 'Azure', /\b(azure|container apps|bicep|aks|azd|cosmos ?db|app service)\b/i],
  ['cloud-native', 'Cloud native', /\b(kubernetes|k8s|keptn|helm|cncf|cloud native|prometheus|grafana|opentelemetry|gitops|argo ?cd|flux)\b/i],
  ['music', 'Music', /\b(music|spotify|albums?|plattentests|songs?|playlists?|vinyl|podcasts?|podcaster|setlists?|concerts?)\b/i],
  ['home', 'Home & energy', /\b(wattpilot|home ?assistant|ev charg\w*|charging|energy|smart ?home|photovoltaic|fronius)\b/i],
  ['teaching', 'Teaching', /\b(lectures?|hagenberg|fhhgb|workshops?|courses?|students?|tutorials?|hands-on)\b/i],
];

function tagsFor(p, tree) {
  const hay = [p.name.replace(/[-_.]+/g, ' '), p.description, p.subtitle, p.summary, ...p.topics].filter(Boolean).join(' \n ');
  const tags = new Set();
  if (p.homepage) tags.add('live');
  for (const [id, , re] of TAG_RULES) if (re && re.test(hay)) tags.add(id);
  const names = new Set((tree?.entries ?? []).map((e) => e.name.toLowerCase()));
  if (names.has('azure.yaml') || names.has('azure.yml')) tags.add('azure');
  return [...tags];
}

function normaliseHomepage(url) {
  if (!url || !/^https?:\/\//i.test(url.trim())) return null;
  const u = url.trim();
  if (/github\.com\/[^/]+\/[^/]+\/?$/i.test(u)) return null;
  return u.replace(/\/$/, '');
}

/** A homepage that answers 404/410 or no longer resolves is gone; anything else (timeouts, 403, 5xx) gets the benefit of the doubt. */
async function homepageIsDead(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
    await res.body?.cancel().catch(() => {});
    return res.status === 404 || res.status === 410;
  } catch (err) {
    return err.cause?.code === 'ENOTFOUND';
  }
}

function buildProject(repo, d, ctx) {
  const o = overrideFor(repo);
  const readmeText = d?.readme?.text ?? d?.readmeLower?.text ?? null;
  const readme = parseReadme(readmeText);
  const description = cleanLine(repo.description);
  const languagesTotal = d?.languages?.totalSize ?? 0;
  const languages = (d?.languages?.edges ?? [])
    .map((e) => ({ name: e.node.name, color: e.node.color ?? '#888888', bytes: e.size, share: languagesTotal ? e.size / languagesTotal : 0 }))
    .filter((l) => l.share >= 0.005);
  const history = d?.defaultBranchRef?.target?.history;
  const topics = (repo.repositoryTopics?.nodes ?? []).map((n) => n.topic.name);

  const normTitle = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let subtitle = readme.title;
  if (subtitle && (normTitle(subtitle) === normTitle(repo.name) || subtitle.length > 70 || !hasWords(subtitle))) subtitle = null;

  const descriptionText = o.description ?? (hasWords(description) ? description : null);
  const summary = readme.summary && readme.summary !== descriptionText ? readme.summary : null;

  const project = {
    key: keyOf(repo),
    id: slug(repo.nameWithOwner),
    name: repo.name,
    owner: repo.owner.login,
    nameWithOwner: repo.nameWithOwner,
    own: isOwn(repo),
    url: repo.url,
    title: o.title ?? repo.name,
    subtitle,
    description: descriptionText ?? summary ?? null,
    summary: descriptionText ? summary : null,
    homepage: normaliseHomepage(o.homepage ?? repo.homepageUrl),
    pinned: ctx.pinned.has(repo.nameWithOwner.toLowerCase()),
    featured: listHas(config.featured, repo),
    archived: repo.isArchived,
    fork: repo.isFork,
    template: repo.isTemplate,
    stars: repo.stargazerCount,
    forks: repo.forkCount,
    license: repo.licenseInfo?.spdxId && repo.licenseInfo.spdxId !== 'NOASSERTION' ? repo.licenseInfo.spdxId : null,
    topics,
    primaryLanguage: repo.primaryLanguage?.name ?? languages[0]?.name ?? null,
    languages,
    createdAt: repo.createdAt,
    pushedAt: repo.pushedAt,
    commitCount: history?.totalCount ?? null,
    lastCommitAt: history?.nodes?.[0]?.committedDate ?? null,
    // Pushes to bot branches bump pushedAt; the last default-branch commit is the honest activity date.
    activeAt: history?.nodes?.[0]?.committedDate ?? repo.pushedAt,
    image: null,
    imageCandidates: [
      ...(o.image ? [{ src: o.image, alt: '' }] : []),
      ...readme.images
        .filter((im) => !BADGE_SRC.test(im.src) && !BADGE_ALT.test(im.alt))
        .map((im) => ({ src: resolveImageUrl(im.src, d ?? repo), alt: im.alt }))
        .filter((im) => im.src),
      ...(repo.usesCustomOpenGraphImage ? [{ src: repo.openGraphImageUrl, alt: '' }] : []),
    ].slice(0, 4),
    _private: repo.isPrivate,
  };
  project.tags = o.tags ?? tagsFor(project, d?.tree);
  return project;
}

/* ------------------------------------------------------------------ ledger */

const BOT = /\[bot\]|dependabot|renovate|github-actions|imgbot|allcontributors|snyk-bot|semantic-release/i;

function buildLedger(details, projectsByKey) {
  const rows = [];
  for (const [key, d] of details) {
    const p = projectsByKey.get(key);
    if (!p || p._private) continue;
    for (const c of d.defaultBranchRef?.target?.history?.nodes ?? []) {
      const author = `${c.author?.name ?? ''} ${c.author?.user?.login ?? ''}`;
      if (BOT.test(author)) continue;
      let headline = c.messageHeadline ?? '';
      let pr = null;
      const merge = headline.match(/^Merge pull request #(\d+) from /);
      if (merge) {
        // A long headline is cut by GitHub and continues in the body behind a leading "…"; the PR title follows it.
        const body = (c.messageBody ?? '')
          .split('\n')
          .map((l) => l.trim())
          .filter((l, i) => !(i === 0 && l.startsWith('…')))
          .find(Boolean);
        if (!body) continue;
        headline = body;
        pr = Number(merge[1]);
      } else if (c.parents?.totalCount > 1 || /^Merge (branch|remote-tracking branch) /.test(headline)) {
        continue;
      }
      headline = cleanLine(headline);
      if (!headline) continue;
      rows.push({
        oid: c.oid,
        sha: c.abbreviatedOid.slice(0, 7),
        headline: truncate(headline, 96),
        date: c.committedDate,
        url: c.url,
        repo: p.key,
        repoId: p.id,
        pr,
      });
    }
  }
  const seen = new Set();
  return rows
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((r) => (seen.has(r.oid) ? false : seen.add(r.oid)))
    .slice(0, 14);
}

/* ---------------------------------------------------------------- calendar */

async function fetchPublicCalendar() {
  const res = await fetch(`https://github.com/users/${LOGIN}/contributions`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; jetzlstorfer.org portfolio build)' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const dateById = new Map();
  for (const m of html.matchAll(/<td\b[^>]*\bdata-date="[^"]*"[^>]*>/g)) {
    const a = attrs(m[0]);
    if (a.id && a['data-date']) dateById.set(a.id, a['data-date']);
  }
  const counts = new Map();
  for (const m of html.matchAll(/<tool-tip\b([^>]*)>([^<]*)<\/tool-tip>/g)) {
    const a = attrs(m[1]);
    const date = dateById.get(a.for);
    if (!date) continue;
    const t = m[2].trim();
    const n = /^No contributions/i.test(t) ? 0 : Number(t.match(/^([\d,]+)\s+contributions?/i)?.[1]?.replace(/,/g, ''));
    if (Number.isFinite(n)) counts.set(date, n);
  }
  const total = Number(html.match(/([\d,]+)\s+contributions?\s+in the last year/i)?.[1]?.replace(/,/g, ''));
  const days = [...counts].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  const sum = days.reduce((s, d) => s + d.count, 0);
  if (days.length < 350 || !Number.isFinite(total) || Math.abs(sum - total) > Math.max(5, total * 0.02)) {
    throw new Error(`unexpected calendar markup (${days.length} days, sum ${sum}, total ${total})`);
  }
  return { total, days, source: 'github.com public profile' };
}

function graphqlCalendar(user) {
  const cal = user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })));
  return { total: cal.totalContributions, days, source: 'GitHub GraphQL API' };
}

/* ------------------------------------------------------------------ credly */

async function fetchCredly(user) {
  const res = await fetch(`https://www.credly.com/users/${user}/badges.json`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; jetzlstorfer.org portfolio build)', accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const badges = (json.data ?? []).filter((b) => b.public !== false && b.state !== 'pending');
  return pool(badges, 4, async (b) => {
    const issuer =
      b.issuer?.entities?.find((e) => e.primary)?.entity?.name ??
      b.badge_template?.issuer?.entities?.find((e) => e.primary)?.entity?.name ??
      null;
    let image = null;
    try {
      image = await downloadImage(b.image_url ?? b.badge_template?.image_url, path.join(ASSET_DIR, 'badges', b.id), { maxWidth: 360 });
    } catch (err) {
      warn(`badge image ${b.id}: ${err.message}`);
    }
    return {
      id: b.id,
      name: cleanLine(b.badge_template?.name),
      issuer,
      issuedAt: b.issued_at_date ?? null,
      expiresAt: b.expires_at_date ?? null,
      expired: b.expires_at_date ? new Date(b.expires_at_date) < NOW : false,
      url: `https://www.credly.com/badges/${b.id}/public_url`,
      image,
    };
  });
}

/* -------------------------------------------------------------------- main */

async function main() {
  const t0 = Date.now();
  await rm(ASSET_DIR, { recursive: true, force: true });
  await mkdir(ASSET_DIR, { recursive: true });
  await mkdir(path.dirname(DATA_FILE), { recursive: true });

  console.log(`> profile ${LOGIN}`);
  const user = await fetchProfile();
  const pinnedNames = user.pinnedItems.nodes
    .filter((n) => n?.nameWithOwner && !n.isPrivate)
    .map((n) => n.nameWithOwner.toLowerCase());
  const pinned = new Set(pinnedNames);

  const byKey = new Map();
  const consider = (repo, source) => {
    if (!repo || repo.isPrivate) return;
    const k = repo.nameWithOwner.toLowerCase();
    if (byKey.has(k)) return;
    if (listHas(config.exclude, repo) || overrideFor(repo).hidden) return;
    if (repo.isFork && !config.includeForks && !listHas(config.include, repo)) return;
    byKey.set(k, { repo, source });
  };
  for (const r of user.repositories.nodes) consider(r, 'own');
  for (const r of user.repositoriesContributedTo.nodes) consider(r, 'community');

  const extras = [...new Set([
    ...pinnedNames,
    ...(config.include ?? []).map((x) => String(x).toLowerCase()),
    ...(config.featured ?? []).map((x) => String(x).toLowerCase()),
  ])].filter(
    (k) => k.includes('/') && !byKey.has(k),
  );
  const stubs = extras.map((k) => {
    const [owner] = k.split('/');
    return { nameWithOwner: k, owner: { login: owner } };
  });

  const targets = [...[...byKey.values()].map((v) => v.repo), ...stubs];
  console.log(`> details for ${targets.length} repositories`);
  const details = await fetchDetails(targets, user.id);

  for (const stub of stubs) {
    const d = details.get(stub.nameWithOwner);
    if (d && !d.isPrivate) consider(d, isOwn(d) ? 'own' : 'community');
  }

  const projects = [];
  for (const [k, { repo, source }] of byKey) {
    const d = details.get(k);
    const p = buildProject(d ?? repo, d, { pinned });
    p.source = source;
    projects.push(p);
  }
  const projectsByKey = new Map(projects.map((p) => [p.nameWithOwner.toLowerCase(), p]));
  const missingFeatured = (config.featured ?? []).filter((name) => !projects.some((p) => listHas([name], p)));
  if (missingFeatured.length) {
    throw new Error(`configured featured repositories are unavailable or excluded: ${missingFeatured.join(', ')}`);
  }
  const archivedFeatured = projects.filter((p) => p.featured && p.archived);
  if (archivedFeatured.length) {
    throw new Error(`configured featured repositories are archived: ${archivedFeatured.map((p) => p.nameWithOwner).join(', ')}`);
  }

  const recentCutoff = new Date(NOW.getTime() - (config.recentMonths ?? 24) * 30.44 * DAY);
  for (const p of projects) {
    p.recent = !p.archived && new Date(p.activeAt) >= recentCutoff;
  }

  console.log('> homepages');
  await pool(
    projects.filter((p) => p.homepage),
    4,
    async (p) => {
      if (!(await homepageIsDead(p.homepage))) return;
      warn(`homepage ${p.homepage} of ${p.nameWithOwner} is gone; not linking it`);
      p.homepage = null;
      p.tags = p.tags.filter((t) => t !== 'live');
    },
  );

  // Configured projects lead in config order; GitHub pins then recent own work fill the run.
  const runSize = config.runSize ?? 8;
  const byActive = (a, b) => b.activeAt.localeCompare(a.activeAt);
  const own = projects.filter((p) => p.own).sort(byActive);
  const curated = projects.filter((p) => p.featured).sort((a, b) => listIndex(config.featured, a) - listIndex(config.featured, b));
  const pinnedRank = new Map(pinnedNames.map((name, index) => [name, index]));
  const pinnedProjects = projects
    .filter((p) => p.pinned && !p.archived && !p.featured)
    .sort((a, b) => pinnedRank.get(a.nameWithOwner.toLowerCase()) - pinnedRank.get(b.nameWithOwner.toLowerCase()));
  const forced = [...curated, ...pinnedProjects];
  const run = [...forced];
  for (const p of own) {
    if (run.length >= Math.max(runSize, forced.length)) break;
    if (!p.archived && !run.includes(p)) run.push(p);
  }
  run.forEach((p, i) => {
    p.run = i + 1;
  });

  // Images: featured projects, community work, and recent own work.
  const wantsImage = projects.filter((p) => p.run || p.source === 'community' || p.recent);
  console.log(`> images for ${wantsImage.length} projects`);
  await pool(wantsImage, 4, async (p) => {
    for (const c of p.imageCandidates) {
      try {
        const img = await downloadImage(c.src, path.join(ASSET_DIR, 'projects', p.id), { minWidth: 360, minHeight: 200 });
        p.image = { ...img, alt: c.alt && hasWords(c.alt) ? c.alt : null, source: c.src };
        return;
      } catch (err) {
        warn(`image ${p.nameWithOwner} <${c.src}>: ${err.message}`);
      }
    }
  });

  const owners = [...new Set(projects.filter((p) => p.source === 'community').map((p) => p.owner))];
  const ownerAvatars = {};
  await pool(owners, 4, async (login) => {
    const repo = [...byKey.values()].find((v) => v.repo.owner.login === login)?.repo;
    if (!repo?.owner?.avatarUrl) return;
    try {
      const sep = repo.owner.avatarUrl.includes('?') ? '&' : '?';
      ownerAvatars[login] = await downloadImage(`${repo.owner.avatarUrl}${sep}s=240`, path.join(ASSET_DIR, 'owners', slug(login)), { maxWidth: 240 });
    } catch (err) {
      warn(`avatar ${login}: ${err.message}`);
    }
  });

  let avatar = null;
  try {
    const sep = user.avatarUrl.includes('?') ? '&' : '?';
    avatar = await downloadImage(`${user.avatarUrl}${sep}s=600`, path.join(ASSET_DIR, 'avatar'), { maxWidth: 600 });
  } catch (err) {
    warn(`avatar: ${err.message}`);
  }

  console.log('> contribution calendar');
  let calendar;
  try {
    calendar = await fetchPublicCalendar();
  } catch (err) {
    warn(`public calendar: ${err.message}; using GraphQL calendar`);
    calendar = graphqlCalendar(user);
  }

  const ledger = buildLedger(details, projectsByKey);

  let badges = [];
  if (config.credly) {
    console.log('> credly badges');
    try {
      badges = await fetchCredly(config.credly);
    } catch (err) {
      warn(`credly: ${err.message}`);
    }
  }

  // Merge GitHub social accounts into the configured links.
  const links = [...(config.links ?? [])];
  const known = new Set(links.map((l) => l.url.replace(/\/$/, '').toLowerCase()));
  for (const s of user.socialAccounts?.nodes ?? []) {
    if (known.has(s.url.replace(/\/$/, '').toLowerCase())) continue;
    links.push({ label: s.provider === 'GENERIC' ? s.displayName : s.provider.charAt(0) + s.provider.slice(1).toLowerCase(), url: s.url });
  }

  // Last line of defence: nothing private may be written.
  const leaks = projects.filter((p) => p._private);
  if (leaks.length) throw new Error(`refusing to write private repositories: ${leaks.map((p) => p.nameWithOwner).join(', ')}`);
  for (const p of projects) {
    delete p._private;
    delete p.imageCandidates;
  }

  const data = {
    generatedAt: NOW.toISOString(),
    build: {
      run: process.env.GITHUB_RUN_NUMBER ? Number(process.env.GITHUB_RUN_NUMBER) : null,
      sha: process.env.GITHUB_SHA?.slice(0, 7) ?? null,
      repository: process.env.GITHUB_REPOSITORY ?? null,
      trigger: process.env.GITHUB_EVENT_NAME ?? 'local',
    },
    profile: {
      login: user.login,
      name: user.name ?? user.login,
      bio: cleanLine(user.bio),
      tagline: config.tagline ?? cleanLine(user.bio),
      company: user.company,
      location: user.location,
      url: `https://github.com/${user.login}`,
      createdAt: user.createdAt,
      followers: user.followers.totalCount,
      publicRepos: user.repositories.totalCount,
      avatar,
    },
    links,
    tags: Object.fromEntries(
      TAG_RULES.map(([id, label]) => [id, { label, count: projects.filter((p) => p.own && p.tags.includes(id)).length }]),
    ),
    projects: projects.sort(byActive),
    ownerAvatars,
    ledger,
    calendar,
    badges: badges.sort((a, b) => (b.issuedAt ?? '').localeCompare(a.issuedAt ?? '')),
    warnings: warnings.length,
  };

  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);
  const imgs = projects.filter((p) => p.image).length;
  console.log(
    `✓ ${projects.length} projects (${run.length} in the run, ${imgs} with images), ${ledger.length} ledger lines, ` +
      `${calendar.total} contributions, ${badges.length} badges, ${warnings.length} warnings in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
}

main().catch((err) => {
  console.error(`✗ ${err.stack ?? err}`);
  process.exit(1);
});

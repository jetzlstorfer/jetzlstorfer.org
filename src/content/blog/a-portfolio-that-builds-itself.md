---
title: A portfolio that builds itself
description: Why jetzlstorfer.org is generated from public GitHub data on a schedule, and what it takes to keep a personal site honest with zero upkeep.
pubDate: 2026-11-20
tags: [astro, github-actions, github-api]
repo: jetzlstorfer/jetzlstorfer.org
draft: true
---

<!-- TODO(Jürgen): open with the moment that triggered this. The old links page at jetzlstorfer.github.io? A conversation after a meetup where you wanted to show "what you actually build"? -->

Every personal website I have built went stale within a few months. The projects moved on, the site did not. So this time I set one rule: **the site may only show what the code itself can prove.**

## The rule: the code is the source of truth

Nothing on the front page is typed in by hand. Featured projects, screenshots, languages, the activity calendar, the community repositories and the badge shelf are all pulled from two public sources:

- the **GitHub GraphQL and REST APIs** for profile, pinned and public repositories, READMEs, languages and the contribution calendar, and
- the public **Credly badge feed** for certifications and community recognition.

If a project is not public on GitHub, it does not exist as far as the site is concerned. That sounds limiting, but it is the whole point: every item links back to something a visitor can check.

## How the build works

The pipeline is deliberately boring:

1. `npm run fetch` runs a Node script that queries GitHub and Credly and writes `src/data/portfolio.json` plus downloaded screenshots and avatars.
2. Astro renders a fully static page from that JSON.
3. A GitHub Actions workflow runs lint, `astro check` and the build, then deploys to GitHub Pages: on every push, every day on a schedule, and on demand.

```sh
npm ci
npm run fetch   # GitHub + Credly → src/data/portfolio.json
npm run build   # static HTML in dist/
```

Generated data is gitignored. The repository only contains the code that *knows how* to describe me, never a snapshot of the description.

## Curation without a CMS

Fully automatic ordering turned out to be wrong in small ways. My most active repository is not always the one I want people to see first. So there is exactly one escape hatch, `portfolio.config.mjs`:

```js
export default {
  featured: ['splitty', 'wichteln', 'plattentests-go', /* … */],
  exclude: ['jetzlstorfer', 'jetzlstorfer.github.io'],
  overrides: { 'plattentests-go': { title: 'plattentests' } },
};
```

An explicit `featured` list wins, GitHub pins fill the gaps, and recently pushed repositories fill whatever is left. Older work does not get deleted, it just recedes.

## Keeping private things private

<!-- TODO(Jürgen): explain the guardrails in fetch-data.mjs that keep private repos and private contribution details out of the build, and why that mattered to you as someone who also works on confidential customer projects. -->

## The design: two inks on warm paper

<!-- TODO(Jürgen): a short paragraph on the "Two-Ink Riso" look (federal blue, fluoro pink, sunflower on warm paper) and the "nice developer touch" you asked for. Maybe a before/after screenshot of the old links page. -->

## What I would do differently

<!-- TODO(Jürgen): one or two honest lessons. Candidates: GitHub token permissions for the public profile query, image handling, how much curation you ended up needing after all. -->

---

The source for all of this is public: [jetzlstorfer/jetzlstorfer.org](https://github.com/jetzlstorfer/jetzlstorfer.org).

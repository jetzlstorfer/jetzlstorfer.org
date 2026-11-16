# jetzlstorfer.org

A self-updating portfolio of public GitHub projects, community work and Credly credentials. The site is built as a static Astro page; project details, screenshots, activity and badges are refreshed by GitHub Actions.

Browse featured projects with the arrow buttons or Left/Right arrow keys without clicking first. On mobile, swipe left or right across the featured card; vertical page scrolling and horizontal thumbnail scrolling remain available.

The color theme follows your device by default, including live changes. The header toggle, labeled **Dark mode** or **Light mode** for the theme it switches to, overrides that default and saves your choice in this browser. Clear the site's local storage to follow the device again. If storage is unavailable, the toggle still works for the current page; without JavaScript, the theme follows the device.

## Run locally

```sh
npm ci
npm run fetch
npm run dev
```

The fetch script uses `GITHUB_TOKEN`, `GH_TOKEN`, or `gh auth token` and writes generated data and downloaded images under `src/`. Those generated files are gitignored; always run `npm run fetch` before building a fresh checkout.

## Code checks

```sh
npm test
npm run lint
npm run check
npm run build
```

ESLint checks authored JavaScript and Astro components; generated data, downloaded assets and build output are excluded. `astro check` checks Astro and TypeScript diagnostics using the strict TypeScript configuration. Run `npm run fetch` first on a fresh checkout so the checks and build can read the generated portfolio data.

Pull requests to `main` run tests, lint, type checks and a build without deploying or using `PORTFOLIO_TOKEN`. Public data is fetched using the read-only built-in `GITHUB_TOKEN`; it must have access to the public GitHub GraphQL queries. Pushes to `main`, daily builds and manual deployments run the same checks before publishing.

## Blog

Posts are Markdown files in `src/content/blog/`; the file name becomes the URL (`/blog/<file-name>/`). Front matter is validated by `src/content.config.ts`:

```md
---
title: A portfolio that builds itself
description: One or two sentences used on the index, in the feed and as the meta description.
pubDate: 2026-11-20
tags: [astro, github-actions]
repo: jetzlstorfer/jetzlstorfer.org   # optional, links the post to its source
draft: true                           # optional, defaults to false
---
```

Drafts show up in `npm run dev` with a DRAFT stamp but are left out of production builds and `/blog/rss.xml`. Set `draft: false` (or remove it) to publish; the homepage navigation shows a Blog link as soon as one post is published.

## Curation

`portfolio.config.mjs` controls featured-project selection and order, exclusions, extra repositories, recency and factual overrides such as a live URL. Put repository names in `featured` in the order you want them shown (`name` for your own repos, `owner/name` for other public repos). Use `standaloneProjects` to list a project using only its explicitly provided public display details, without fetching or publishing repository metadata or a source link. For a standalone image, commit a PNG, JPEG or WebP under `src/assets/curated/` and set `image` to its repository-relative path; it will be published with the site. GitHub pins and recently active repositories fill any remaining slots. Only public repository data is requested and written.

## Dependency updates

Dependabot opens grouped pull requests once a month: one for npm minor and patch updates, one for npm major updates (Astro and its integrations move together) and one for GitHub Actions. `.npmrc` keeps registry URLs out of `package-lock.json`, so installing through a package mirror stays portable.

## Publish

The workflow builds and deploys to GitHub Pages on every push to `main`, on manual dispatch against `main`, and daily at 05:17 UTC (scheduled runs may be delayed by GitHub). Other branches can be checked manually without publishing. Deployments use `PORTFOLIO_TOKEN` when configured, otherwise the built-in `GITHUB_TOKEN`; if GitHub rejects a public profile query, add a token as the repository secret `PORTFOLIO_TOKEN`.

### Safe external-data refresh

GitHub and Credly each have a last-known-good snapshot, including downloaded images. After a successful deployment, Actions saves these snapshots to the dedicated `portfolio-data` branch using a separate job with `contents: write`; build and PR jobs remain read-only. No generated data is committed to `main`. This branch is durable storage, not an expiring Actions cache. Allow the workflow token to write that branch in repository settings/rulesets.

Before refreshing, builds restore the snapshots. Transient GitHub failures and unavailable, malformed or incomplete Credly feeds reuse the affected source's snapshot and log a warning; other sources and locally authored content can still update. A newly empty Credly feed cannot erase an existing badge collection. A validated, complete nonempty feed may remove individual badges that are no longer public. To intentionally remove all badges, set `credly: null` in the configuration.

On a first build, or after changing the account/curation so the old snapshot no longer applies, an unavailable source fails the build rather than publishing missing content. Curation and privacy checks still fail closed, and partial GraphQL responses are never saved. Snapshots contain only previously fetched public data; during an outage, they cannot detect a repository or badge that has since become private. Remove affected content through configuration when immediate removal is required.

The page shows source refresh dates separately from the build date and labels delayed refreshes. Actions also reports source status in its run summary. After more than three days of continuous source staleness, the final monitoring step fails the workflow to surface the outage **after** deployment and snapshot persistence, so it does not block content updates. A failed build/deployment leaves the live site and durable snapshots unchanged. A snapshot-storage failure is visible in Actions and should be resolved before relying on future fallbacks.

Locally, `.portfolio-cache/` preserves snapshots between `npm run fetch` invocations; a fresh checkout needs one successful fetch to seed them.

Blog articles remain authored in Git and publish through the normal `main` deployment; a daily refresh does not edit articles or change draft flags. The blog work in #5 excludes drafts from production and RSS. Its current `pubDate` is descriptive, not a publishing schedule: future-dated non-drafts must not be merged expecting them to remain hidden.

Set the custom domain to `jetzlstorfer.org` in the repository's Pages settings; the `CNAME` file alone does not configure a custom domain for an Actions deployment. Configure Cloudflare with GitHub Pages' apex A records (or CNAME flattening) and a `www` CNAME to `jetzlstorfer.github.io`. Keep DNS-only until GitHub issues the certificate.

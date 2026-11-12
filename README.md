# jetzlstorfer.org

A self-updating portfolio of public GitHub projects, community work and Credly credentials. The site is built as a static Astro page; project details, screenshots, activity and badges are refreshed by GitHub Actions.

## Run locally

```sh
npm ci
npm run fetch
npm run dev
```

The fetch script uses `GITHUB_TOKEN`, `GH_TOKEN`, or `gh auth token` and writes generated data and downloaded images under `src/`. Those generated files are gitignored; always run `npm run fetch` before building a fresh checkout.

## Curation

GitHub pins choose the featured run. `portfolio.config.mjs` controls exclusions, extra repositories, optional featured repositories, recency and factual overrides such as a live URL. Only public repositories are requested and written.

## Dependency updates

Dependabot opens grouped pull requests once a month: one for npm minor and patch updates, one for npm major updates (Astro and its integrations move together) and one for GitHub Actions. `.npmrc` keeps registry URLs out of `package-lock.json`, so installing through a package mirror stays portable.

## Publish

The workflow builds and deploys to GitHub Pages. While the site is a draft it runs on manual dispatch only; after enabling Pages, restore the `push` and `schedule` triggers described in `.github/workflows/deploy.yml` to rebuild on every push to `main` and once a day. The built-in `GITHUB_TOKEN` is tried first; if GitHub rejects a public profile query, add a token as the repository secret `PORTFOLIO_TOKEN`.

The public `CNAME` file targets `jetzlstorfer.org`. After the repository exists and Pages is enabled for GitHub Actions, configure Cloudflare with GitHub Pages' apex A records (or CNAME flattening) and a `www` CNAME to `jetzlstorfer.github.io`. Keep DNS-only until GitHub issues the certificate.

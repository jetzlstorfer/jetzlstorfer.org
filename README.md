# jetzlstorfer.org

A self-updating portfolio of public GitHub projects, community work and Credly credentials. The site is built as a static Astro page; project details, screenshots, activity and badges are refreshed by GitHub Actions.

## Run locally

```sh
npm ci
npm run fetch
npm run dev
```

The fetch script uses `GITHUB_TOKEN`, `GH_TOKEN`, or `gh auth token` and writes generated data and downloaded images under `src/`. Those generated files are gitignored; always run `npm run fetch` before building a fresh checkout.

## Code checks

```sh
npm run lint
npm run check
npm run build
```

ESLint checks authored JavaScript and Astro components; generated data, downloaded assets and build output are excluded. `astro check` checks Astro and TypeScript diagnostics using the strict TypeScript configuration. Run `npm run fetch` first on a fresh checkout so the checks and build can read the generated portfolio data.

Pull requests to `main` run all three checks without deploying or using `PORTFOLIO_TOKEN`. Public data is fetched using the read-only built-in `GITHUB_TOKEN`; it must have access to the public GitHub GraphQL queries. Pushes to `main` and manual deployments run the same checks before publishing.

## Curation

`portfolio.config.mjs` controls featured-project selection and order, exclusions, extra repositories, recency and factual overrides such as a live URL. Put repository names in `featured` in the order you want them shown (`name` for your own repos, `owner/name` for other public repos). GitHub pins and recently active repositories fill any remaining slots. Only public repositories are requested and written.

## Dependency updates

Dependabot opens grouped pull requests once a month: one for npm minor and patch updates, one for npm major updates (Astro and its integrations move together) and one for GitHub Actions. `.npmrc` keeps registry URLs out of `package-lock.json`, so installing through a package mirror stays portable.

## Publish

The workflow builds and deploys to GitHub Pages on every push to `main` and on manual dispatch. The built-in `GITHUB_TOKEN` is tried first; if GitHub rejects a public profile query, add a token as the repository secret `PORTFOLIO_TOKEN`.

Set the custom domain to `jetzlstorfer.org` in the repository's Pages settings; the `CNAME` file alone does not configure a custom domain for an Actions deployment. Configure Cloudflare with GitHub Pages' apex A records (or CNAME flattening) and a `www` CNAME to `jetzlstorfer.github.io`. Keep DNS-only until GitHub issues the certificate.

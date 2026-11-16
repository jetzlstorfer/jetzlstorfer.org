# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Peers and customers of Jürgen Etzlstorfer: cloud and AI practitioners, architects, and developers he meets through his work as a Solution Engineer at Microsoft Austria, at meetups, and at conferences. They arrive after a conversation, talk, or link and want to see what he actually builds with cloud and AI: judge depth and range, find a project relevant to their own problem, check that it is real and maintained, and jump to source or a live demo.

## Product Purpose

A personal portfolio at `jetzlstorfer.org` that showcases Jürgen's public GitHub projects, his community work, and his Credly badges, and keeps itself current without manual edits. It is rebuilt from the GitHub API on a schedule, so newly pushed projects appear automatically.

Success means a visitor grasps his range (cloud-native, AI agents, Go and Python apps on Azure, music and home-energy side projects) within seconds, can find and open a relevant project, and the site stays accurate as he keeps pushing, with zero upkeep beyond pinning repos on GitHub and an optional small config file.

## Positioning

The portfolio is generated from the work itself: pinned repos, README content and screenshots, languages, commit activity, contribution history, contributed-to community repos, and Credly badges. Every item is verifiable and links back to its public source. A hand-written portfolio cannot stay this current or this honest.

## Operating Context

- Jürgen is a Solution Engineer at Microsoft Austria working on cloud and AI applications, organizer of Cloud Native Linz, contributor to Technologieplauscherl, former Keptn (CNCF) maintainer and LFX mentor, and a past KubeCon speaker, track chair, and program committee member.
- He pushes side projects frequently: Go and Python services deployed to Azure Container Apps, multi-agent AI demos, Spotify and music tools, a home EV-charging exporter, a browser game, and a family Secret Santa app.
- Live apps run on subdomains of `jetzlstorfer.org` (for example `plattentests.jetzlstorfer.org`, `wichteln.jetzlstorfer.org`). DNS for the domain is managed in Cloudflare by Jürgen.
- The site is hosted from the new repository `jetzlstorfer/jetzlstorfer.org` on GitHub Pages with the custom domain `jetzlstorfer.org`.
- The older links page at `jetzlstorfer.github.io` ("tech & music aficionado") and the markscribe-generated GitHub profile README already exist.

## Capabilities and Constraints

- Data sources: GitHub GraphQL/REST (profile, public repos, pinned items, READMEs, languages, commit history, contribution calendar, contributed-to repos) and the public Credly badge feed (`https://www.credly.com/users/jetzlstorfer/badges.json`).
- Only public repositories are ever shown. Private repositories and private contribution details must never leak into the build.
- Static output, rebuilt by GitHub Actions on push, on a daily schedule, and on manual dispatch.
- Curation controls: `portfolio.config.mjs` can explicitly order featured repositories; GitHub pins and recently active repositories fill remaining slots. The config can also exclude, include, or override repositories.
- Self-host fonts and images where practical; avoid third-party runtime requests and trackers.
- Blog: hand-written Markdown posts in `src/content/blog/` under `/blog/`, with an RSS feed. Posts marked `draft: true` render only in local development; the homepage nav links to the blog once at least one post is published. Posts should link back to public source and must follow the same no-fabrication rules.
- Undecided: a talks/sessions list (no structured data source yet).

## Brand Commitments

- Name: Jürgen Etzlstorfer. Handle: `jetzlstorfer`.
- Existing self-description: "tech & music aficionado"; GitHub bio mentions he "likes penguins 🐧".
- Binding request from Jürgen: the site must have a "nice developer touch" look and feel.

## Evidence on Hand

- GitHub profile: account since 2014, 61 public repos, about 2,000 contributions in the last year, pinned repos `plattentests-go`, `CloudNativeLinz/cloudnativelinz.github.io`, `music-timetraveler`, `spotify-yearly-discoveries`.
- README screenshots exist in several repos (for example `tower-defense`, `wichteln`, `plattentests-go`).
- 18 public Credly badges, including CKAD, Azure AI Engineer Associate, KubeCon speaker/track chair/program committee, and Cloud Native Community Group organizer.
- Public community repos: `CloudNativeLinz/*`, `technologieplauscherl/technologieplauscherl.github.io`.
- Absent and must not be fabricated: testimonials, customer names or logos (customer work is confidential), usage numbers, talk lists.

## Product Principles

1. The code is the source of truth: everything shown is generated from and links back to real public data.
2. Fresh by default: recency and activity are first-class; older work recedes instead of being deleted.
3. Show, don't claim: real projects, screenshots, live demos, and activity instead of adjectives or invented metrics.
4. Zero-maintenance curation: GitHub pins plus an optional small config are the only controls.
5. Public-only and privacy-respecting: no private data, no trackers, self-hosted assets.

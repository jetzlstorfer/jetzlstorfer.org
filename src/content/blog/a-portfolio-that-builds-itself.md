---
title: A portfolio that builds itself
description: How I use GitHub data, Astro and GitHub Actions to build a portfolio that stays close to the work.
pubDate: 2026-11-20
tags: [astro, github-actions, github-api]
repo: jetzlstorfer/jetzlstorfer.org
draft: true
---

A personal website is a useful place to show what I work on, but a list of projects is easy to forget once it's written. My projects already have descriptions, source code and activity on GitHub, so I wanted to use that information instead of maintaining a second list by hand.

That's the idea behind [jetzlstorfer.org](https://jetzlstorfer.org/). A script collects public project data, [Astro](https://astro.build/) turns it into a static site, and GitHub Actions builds and deploys it. I still choose which projects to feature, but I don't have to update every project card myself.

## Starting with public data

The fetch script uses the GitHub GraphQL API to read my profile and public repositories, including pinned projects, descriptions, README content and languages. It also collects public repositories I've contributed to. The contribution calendar comes from my public GitHub profile, with the GraphQL calendar as a fallback.

For the badge section, the script reads my public [Credly profile](https://www.credly.com/users/jetzlstorfer). It also downloads images, such as project screenshots found in READMEs and badge images, so the site can use them as local assets.

The result is a portfolio where visitors can follow a project back to its repository or live site. It's not a complete list of everything I've worked on; it focuses on work I can share publicly.

## How the build works

The build has two main steps. First, a Node.js script fetches the data and writes it to `src/data/portfolio.json`. Then Astro reads that file and generates the pages as static HTML.

To run it locally, I use:

```sh
npm ci
npm run fetch
npm run dev
```

The fetch step needs a GitHub token. Locally it can use `GITHUB_TOKEN`, `GH_TOKEN`, or the GitHub CLI login. The generated JSON and downloaded images are ignored by Git, so a fresh checkout needs a fetch before it can build.

For deployment, a GitHub Actions workflow installs dependencies, runs lint and Astro's checks, fetches the data and builds the site. Pushes to `main` and manual runs deploy the result to GitHub Pages. Pull requests run the build checks without deploying.

## Choosing what to feature

GitHub has plenty of useful information, but my most recently active repository isn't necessarily the one I want to show first. That's where `portfolio.config.mjs` comes in. Here's a shortened example:

```js
export default {
  featured: ['splitty', 'wichteln', 'plattentests-go'],
  overrides: {
    'plattentests-go': { title: 'plattentests' },
  },
};
```

The configured projects come first, followed by GitHub pins and then other non-archived repositories ordered by activity. I can also exclude repositories or add an override for things like a title or a live URL. This gives me some control over the page without copying all the project details into it.

## Keeping the data public

The repository lists request public projects. The script also checks `isPrivate` when collecting repositories and checks again before writing the generated data. That matters for a site that builds using a GitHub token: the portfolio should not accidentally turn access to a private repository into a public page.

The contribution calendar is an aggregate rather than a list of projects. Its counts depend on what GitHub exposes through the profile or API and the relevant privacy settings, so a square on the calendar shouldn't be read as a link to a particular public repository.

## The design: two inks on warm paper

I wanted the site to feel like a personal portfolio rather than a dashboard of GitHub statistics. The design takes cues from risograph printing: a warm paper background, blue and pink ink, yellow accents, registration marks and bold type.

There are still developer details throughout the page, such as the contribution calendar, language labels and links to source code. They support the projects rather than turning the whole page into a terminal.

## What still needs attention

The current workflow runs on a push to this repository or a manual dispatch. A change in one of my other repositories doesn't trigger a new portfolio build by itself. A scheduled build would close that gap; until then, the data updates on the next deployment.

The fetch step also depends on the source data and images being available. It's worth checking the build output and the page occasionally, especially when a project changes its README or homepage.

Have a look at the [site](https://jetzlstorfer.org/) or the [source on GitHub](https://github.com/jetzlstorfer/jetzlstorfer.org) for the full setup.

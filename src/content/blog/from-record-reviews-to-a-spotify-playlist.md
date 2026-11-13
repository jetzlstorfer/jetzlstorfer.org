---
title: From weekly record reviews to a Spotify playlist
description: plattentests-go crawls the weekly highlights from plattentests.de and turns them into a Spotify playlist, a Go side project that grew a crawler, a playlist creator and a web UI.
pubDate: 2026-11-13
tags: [go, spotify, music]
repo: jetzlstorfer/plattentests-go
draft: true
---

<!-- TODO(Jürgen): why plattentests.de? How long have you been reading it, and what was the manual routine before (open the weekly highlights, search every album on Spotify by hand)? -->

Every week [plattentests.de](https://www.plattentests.de) publishes its record reviews and a list of highlights. I wanted those highlights in my Spotify library without searching for every album by hand. That small itch became [plattentests-go](https://github.com/jetzlstorfer/plattentests-go), now live at [plattentests.jetzlstorfer.org](https://plattentests.jetzlstorfer.org/).

## One repository, several small programs

The project follows the usual Go layout, with one binary per job:

```text
cmd/
  crawler/   fetches the weekly reviews and highlights
  creator/   matches albums on Spotify and builds the playlist
  token/     handles the Spotify authentication token
internal/
  auth/      shared authentication logic
webui/       web server, templates and styles
```

Keeping them separate means the crawler can run on a schedule while the web UI stays a small, always-available service.

## Matching albums is the hard part

<!-- TODO(Jürgen): real examples of titles that did not match on Spotify (special characters, "(Deluxe Edition)", umlauts, split releases) and what the sanitising in creator/sanitize_test.go does about them. Code snippets welcome. -->

## Running it on Azure Container Apps

<!-- TODO(Jürgen): the deploy-aca.yml workflow, how secrets/tokens are stored, how the scheduled crawl runs, and what it costs roughly per month (only if you are comfortable sharing). -->

## Keeping a hobby project healthy

The repository runs CodeQL and dependency review on every change, which keeps a side project from quietly rotting between visits.

<!-- TODO(Jürgen): anything you learned from those checks, or from the dark-mode web UI redesign. -->

## Listen along

<!-- TODO(Jürgen): link the public playlist if there is one, and pick two or three favourite discoveries it has surfaced. -->

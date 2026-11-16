---
title: From Plattentests reviews to a Spotify playlist
description: How a Go app collects album reviews from Plattentests.de and turns their highlighted tracks into a Spotify playlist.
pubDate: 2026-11-16
tags: [go, spotify, music]
repo: jetzlstorfer/plattentests-go
draft: false
---

[Plattentests.de](https://www.plattentests.de/) is one of my favourite places to discover music. Its album reviews include a selection of highlighted tracks. I wanted to listen to those tracks on Spotify without searching for each one myself, so I built [plattentests-go](https://github.com/jetzlstorfer/plattentests-go).

The app collects recent reviews, displays the records and their highlights, and creates a Spotify playlist from the tracks it can find. In this post, I'll share how it works.

## Fetching the reviews

When I open the app, the Go server fetches the list of recent reviews from Plattentests.de and then loads the individual review pages concurrently. The crawler extracts the artist, album, score, release date and tracklist, including the tracks marked as highlights.

I'm using [goquery](https://github.com/PuerkitoBio/goquery) to parse the HTML. For example, the highlights are collected from the `#rezihighlights` section of each review:

```go
highlightNames := make(map[string]bool)
doc.Find("#rezihighlights li").Each(func(_ int, s *goquery.Selection) {
    trackname := strings.TrimSpace(s.Text())
    if trackname == "" || trackname == "-" {
        return
    }
    highlightNames[normalizeTrackName(trackname)] = true
})
```

The crawler uses these names to mark highlights in the full tracklist. If a review doesn't have a tracklist, it falls back to the highlights. The response is decoded before parsing, so names with umlauts and accented characters can be read correctly.

There is a downside to reading the HTML: the crawler depends on the structure of the page. If Plattentests.de changes its markup, the selectors might need updating.

## Finding the tracks on Spotify

The playlist is made from the highlights, not the full albums. For each track, the creator searches the [Spotify Web API](https://developer.spotify.com/documentation/web-api) using the artist and track name. An initial query for a record released in 2026 can look like this:

```text
track:"Song Title" artist:"Artist Name" year:2025-2026
```

The range includes the previous year because a single can be released before the album. The app also tries free-text searches and searches without the year filter.

Names on Plattentests.de and Spotify aren't always identical. Featured artists, punctuation and accents can differ. The app cleans up the search terms and tries both `&` and `and` where applicable. It then checks the artist and title of Spotify's results, preferring the reviewed album when there is more than one candidate. If the track searches don't produce a match, it searches for the album and checks its tracklist.

Matching isn't guaranteed: Spotify might have several versions of a song, or a track might not be available in the selected market. The search uses Germany as the market, and the result page lists tracks it couldn't find. The creator removes duplicate track IDs and replaces the contents of the configured playlist rather than keeping an ever-growing list.

## The web UI and deployment

The web app is written in Go as well. Gin handles the routes and Go templates render the pages. The crawler and playlist creator are packages used by the web app, rather than separately deployed services. Besides the current reviews, there is a search page and a page with the Spotify playlist embedded.

The site is public, but creating a playlist is protected by Azure Container Apps authentication. That's separate from Spotify authorization: the app uses a Spotify OAuth token stored in Azure Blob Storage and refreshes it when needed.

I run the app in Azure Container Apps. A GitHub Actions workflow runs the Go tests, builds the container image and deploys changes from the main branch.

You can browse the [reviews](https://plattentests.jetzlstorfer.org/) and listen to the [playlist](https://plattentests.jetzlstorfer.org/playlist). The [code is on GitHub](https://github.com/jetzlstorfer/plattentests-go) if you'd like to see the implementation.

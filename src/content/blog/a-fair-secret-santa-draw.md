---
title: A fair Secret Santa draw is harder than it looks
description: Building "Wichteln mit dem Christkind" for the family, and why naive shuffling quietly favours some pairings once you add rules like "couples never draw each other".
pubDate: 2026-12-01
tags: [algorithms, privacy, side-project]
repo: jetzlstorfer/wichteln
draft: true
---

<!-- TODO(Jürgen): the family story. Who used to draw names from a hat, what went wrong (someone drew themselves, someone peeked, someone was not there in person)? -->

Every December my family does *Wichteln*, the Austrian Secret Santa. This year the Christkind gets an app: [wichteln.jetzlstorfer.org](https://wichteln.jetzlstorfer.org). It is made for phones, has no passwords, no ads and no tracking, and everybody only ever sees their own match.

The interesting part was not the UI. It was the draw.

## The rules make it a puzzle

A plain Secret Santa is a *derangement*: a shuffle where nobody ends up with themselves. Real families add constraints:

- **Couples** never draw each other.
- **Custom rules**, such as "Grandpa should not draw Grandma".
- **"Not like last year, please"**: avoid repeating last year's pairings.

With enough rules the draw can become impossible, and the app has to say *why* instead of spinning forever.

## Why the obvious algorithm is unfair

The tempting approach is greedy: walk through the list and give each person a random valid recipient from whoever is left. It almost always finds an answer. But it does not pick every valid answer with the same probability; people early in the list have more options than people at the end, which skews who tends to get whom.

<!-- TODO(Jürgen): add a tiny worked example with 4 people and one couple rule, showing that greedy produces some valid assignments more often than others. A small table works well here. -->

## Equal odds for every valid draw

The goal I set was: **every valid assignment is equally likely.** The simplest way to get that is rejection sampling: shuffle everyone uniformly, check all rules, and start over if any rule is broken. Each accepted shuffle is a uniform pick among the valid ones.

```ts
// Sketch, not the production code.
function draw(people, isAllowed) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const order = shuffle([...people]); // Fisher–Yates
    const pairs = people.map((giver, i) => [giver, order[i]]);
    if (pairs.every(([giver, receiver]) => isAllowed(giver, receiver))) return pairs;
  }
  return null; // then explain which rule makes it impossible
}
```

<!-- TODO(Jürgen): check this against the real implementation in the wichteln repo and replace the sketch, including how you detect "impossible" and explain it to the organiser. -->

## Privacy is the other half of fairness

A fair draw is pointless if the organiser can peek. A few deliberate choices:

- Each person gets a **random personal link** instead of an account. The organiser can reissue a lost link, which immediately invalidates the old one, but can never view anyone's link or match.
- The organiser sees who has joined and who has looked, **never the pairings**.
- No cookies, no third-party requests, self-hosted fonts. Wish lists and anonymous messages are deleted 60 days after the gift exchange.

## What is next

<!-- TODO(Jürgen): which of the parked ideas (gift progress, reveal after Christmas, "same again next year") are you most tempted to bring back, and what privacy problem has to be solved first? -->

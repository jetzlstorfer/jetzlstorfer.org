---
title: Billing my EV charging with a small Go app on Azure
description: How wattpilot-exporter turns Fronius Wattpilot sessions into a monthly invoice at the official Austrian rate, and the Azure Container Apps setup behind it.
pubDate: 2026-11-27
tags: [go, azure-container-apps, home-energy]
repo: jetzlstorfer/wattpilot-exporter
draft: true
---

<!-- TODO(Jürgen): the problem in one paragraph. Company car charged at home; every month someone has to work out kWh × official rate and send it to the employer. What did that look like before (spreadsheet, screenshots from the Wattpilot app)? -->

## What the app does

[wattpilot-exporter](https://github.com/jetzlstorfer/wattpilot-exporter) is a small Go web application. It reads charging sessions from the Fronius Wattpilot data export and turns them into a monthly view:

- total energy in kWh, cost and margin for any month,
- the **amount to charge the company**, using the official BMF *Sachbezug* electricity rate,
- historical charts and a per-month **Excel export** for the invoice.

Lately it also shows a 24-hour weather and PV forecast with a suggested charging window, so the car prefers sunny hours.

## Architecture

<!-- TODO(Jürgen): add a simple diagram (Wattpilot export → Go app on Container Apps → Blob Storage; Easy Auth in front). -->

- **Go** with server-rendered templates, built in a multi-stage Docker image.
- **Azure Container Apps**, provisioned with Bicep and deployed with `azd` from GitHub Actions.
- **Azure Blob Storage** for cached sessions, monthly backups and the settings page.
- **Easy Auth with Entra ID** so only my tenant can open it.
- **OpenTelemetry** traces and structured logs.

## Things that were more interesting than expected

### Rates change, history must not

<!-- TODO(Jürgen): purchase prices and network fees are configured per month. Explain why recalculating old months with today's price would be wrong for invoices. -->

### Cached pages first

<!-- TODO(Jürgen): the "cached-page-first" approach: serve the last snapshot immediately and run one background refresh. Why that matters for a tiny app that scales to zero. -->

### Observability for a hobby app

<!-- TODO(Jürgen): was OpenTelemetry worth it for a one-user app? A concrete bug it helped you find would make this section. -->

## Try it

You need a Wattpilot data export key (the `e=` parameter of the export URL) and Go or Docker. The README covers local runs and the Azure deployment.

<!-- TODO(Jürgen): close with what you would tell a colleague who wants to do the same for their own charger. -->

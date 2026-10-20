# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single static HTML page (no build tools, no package manager, no JS framework) for Parakkat Nature Resort. It shows the resort's menus (PDFs) as cards with an in-page reader, plus a strip of resort photos. There is no test suite and no lint config.

## Deployment

The site is deployed via GitHub Pages using `.github/workflows/static.yml`: on every push to `master`, the entire repository root is uploaded as the Pages artifact and deployed as-is (`path: '.'`). There is no build step — whatever is committed at the repo root is what goes live. Because of this:
- File and folder names must stay exactly in sync between the filesystem and the references in `index.html` / `menus/menus.js`.
- Large binaries (menu PDFs, resort photos) are committed directly to the repo since there is no asset pipeline or CDN.

Hosting is moving to Vercel (static, no build step): `vercel.json` sets cache headers and `.vercelignore` skips unused large photos. The Vercel project is linked to this repo, so pushes to `master` deploy production there too.

`.github/workflows/test` is a leftover default Actions template (job named `CI`, just echoes text) — it is not part of the actual deployment and can be ignored/removed if it becomes an obstacle.

## Structure

- `index.html` — the live page: hero, menu cards, photo strip, footer, and a full-screen PDF reader overlay. No Bootstrap/jQuery; styles in `style.css`, behaviour in `app.js`.
- `menus/menus.js` — the list of menus (id, title, label, description, PDF path, cover). This is the only file to edit to add/replace/reorder menus; `file: null` shows a "Coming soon" card. See `menus/README.md`.
- `menus/pdf/` — where new menu PDFs go. `menus/covers/` — card cover images (page 1 rendered with `pdftoppm`).
- `app.js` — renders the cards from `menus.js` and the reader. The reader uses PDF.js (vendored in `vendor/pdfjs/`, v3.11.174) and renders pages lazily, freeing far-off pages so phones don't run out of memory. `index.html#<menu-id>` opens a menu directly (for QR codes); the back button closes it.
- `index copy.html` — an older/backup variant of the page. Not linked from anywhere; treat as reference/backup, not live code.
- `resort/` — photos used for the hero and the photo strip. Some are very large originals (`IMG_*.JPG`, `875764565.JPG`) and are not used.
- PDFs at repo root (`NEW MENU PARAKKAT NATURE RESORT COMPRESSED.pdf`, `ROOM SERVICE MENU PARAKKAT.pdf`, `PARAKKAT AYURVEDIC SPA BROCHURE RE.pdf`) — the current menus, still referenced from `menus/menus.js`. Printed QR codes may link straight to these file names, so don't delete or rename them without checking with the user.

## Working in this repo

- There's no local dev server or tooling required — open `index.html` directly in a browser, or serve the directory with any static file server, to preview changes.
- When adding/renaming any file referenced by `index.html` or `menus/menus.js` (PDFs, covers, images, logo), update the reference in the same change — nothing else will catch a broken link.
- The reader needs the page served over HTTP (PDF.js can't fetch over `file://`); use `python3 -m http.server` to preview.
- `.DS_Store` files are tracked in git in this repo; don't assume they're ignored.

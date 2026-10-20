# Menus

Everything the menu page shows comes from this folder. There is no database or
upload service: the PDFs live in the repository and GitHub Pages serves them.

```
menus/
  menus.js     the list of menus (titles, order, which PDF, which cover)
  pdf/         the menu PDFs
  covers/      one cover image per menu, shown on the cards
```

## Replace a menu with a new PDF

1. Put the PDF in `menus/pdf/`, with a short name and no spaces, e.g. `menus/pdf/restaurant.pdf`.
2. In `menus.js`, set that menu's `file` to the new path.
3. Make a new cover from page 1 (or use any portrait image around 900px tall):
   ```
   pdftoppm -f 1 -l 1 -jpeg -jpegopt quality=80 -scale-to 900 -singlefile menus/pdf/restaurant.pdf menus/covers/restaurant
   ```
4. Commit and push to `master`; the site redeploys on its own.

## Add a new menu (bar, breakfast, kids…)

Copy one of the entries in `menus.js`, give it a new `id`, and fill in the
fields. Set `file: null` to show it as "Coming soon" until the PDF is ready.
The order in `menus.js` is the order on the page.

## Keep PDFs light

Guests open these on their phones over resort Wi-Fi. Aim for under 10 MB per PDF
(export at "screen"/150 dpi, or run it through a PDF compressor).

## Old PDFs at the repository root

The three PDFs at the root (`NEW MENU PARAKKAT NATURE RESORT COMPRESSED.pdf`,
`ROOM SERVICE MENU PARAKKAT.pdf`, `PARAKKAT AYURVEDIC SPA BROCHURE RE.pdf`) are
the current menus and `menus.js` still points at them. Printed QR codes may link
to those exact file names, so only delete them once no printed code uses them.

# ChocoCounter
Cocoa Dolce Chocolathon Prompt B1 - Team Sugar Cult

Phase 1: responsive Cocoa Dolce cashier Counter visual foundation.

Run `node serve.cjs` (Node 22 or later), then open http://127.0.0.1:8080.
No installation or build step is needed. Both `index.html` and
`cocoa-dolce-box-log.html` use the shared Counter files.

The Counter displays the 25 supplied product photos with individual colored
backgrounds, the official SVG logo, and the supplied fixed-view PNG box render.
`counter-products.js` contains display names, actual image paths, and card
background colors. Names are derived from supplied filenames; colors are
presentation choices, not an authoritative brand palette. Existing transaction
product IDs and historical records are not migrated or replaced.

Assets used:
- `assets/logo/cocoa-dolce_flamingo_k.svg`
- All 25 WebP files in `assets/chocolates/`
- `assets/box/empty-box-preview.png`

`assets/box/empty-six-piece-box.glb` is preserved but not loaded: the supplied
PNG provides the required fixed view without a 3D dependency. It shows six
compartments and is kept unchanged for both size previews. Choosing 10 Piece
updates the count only; a matching ten-piece render can be supplied later.
Original asset files have not been altered.

Only the 6/10-piece size preview is interactive. Product cards show hover/press
feedback but do not capture pieces. Undo, Edit, Empty Box, and Save Box remain
disabled. There is no search field or separate recent-selection section.

Boxes, exports, comparison stopwatch, Insights, local-storage keys, and
underlying transaction code are retained. Legacy Counter markup remains in
an inert, hidden section to preserve its hooks for later phases. The new
Counter has separate presentation state and never writes transactions.
Store configuration retains the existing `cd-loc` setting and original Bradley
Fair fallback; no cashier selector or Case Layout navigation is shown.

With the server running, `node verify-phase1.cjs` tests six viewport widths,
all supplied image paths and image loading, card contents, size previews,
retained records/timing/Insights, and runtime errors in isolated headless Chrome.
It uses a temporary browser profile, leaving your browser data untouched.
Set `CHROME_PATH` if Chrome is outside the default Windows location.
Screenshot paths are printed after the run.

Later phases: remaining real products, quantity entry, box building, recent-use
sorting, rearrangement/Edit, Undo, empty confirmation, and saving. Records,
timing features, and analytics have not been redesigned.

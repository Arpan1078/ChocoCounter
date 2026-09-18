# ChocoCounter
Cocoa Dolce Chocolathon Prompt B1 - Team Sugar Cult

Phase 2: catalog selection on the approved responsive Counter foundation.

Run `node serve.cjs` (Node 22 or later), then open http://127.0.0.1:8080.
No installation or build step is needed. Both `index.html` and
`cocoa-dolce-box-log.html` use the shared Counter files.

The Counter displays the 25 supplied product photos with individual colored
backgrounds, the official SVG logo, and the supplied fixed-view PNG box render.
`counter-products.js` contains one entry per product: stable unique `id`, `name`,
`image`, `backgroundColor`, and boolean `active`. Add a real image and one entry
to extend the catalog; set `active: false` to omit unavailable products.
Names are derived from supplied filenames; colors are
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

Each card tap adds one piece, updating its badge, count, and compact summary.
Selections cannot exceed 6 or 10 pieces. Size changes preserve all pieces;
switching to six with more than six pieces is rejected with an inline message.
Undo, Edit, Empty Box, and Save Box remain disabled, including when full.
There is no search field or separate recent-selection section.

`counter-selection.js` owns capacity, piece IDs, and most-recently-used IDs.
Its snapshots are copies; there is no persistence, timing, or action-history
implementation. `counter-foundation.js` updates stable card nodes, so rapid
input does not move targets or lose focus. It returns `getSelection()` for a
future transaction boundary to consume recent IDs. No reordering occurs now.
Selections reset on refresh; during this phase reload to start an empty box.

Boxes, exports, comparison stopwatch, Insights, local-storage keys, and
underlying transaction code are retained. Legacy Counter markup remains in
an inert, hidden section to preserve its hooks for later phases. The new
Counter has separate presentation state and never writes transactions.
Store configuration retains the existing `cd-loc` setting and original Bradley
Fair fallback; no cashier selector or Case Layout navigation is shown.

With the server running, `node verify-phase1.cjs` tests eight viewport sizes,
all supplied image paths and image loading, card contents, size changes,
retained records/timing/Insights, and runtime errors in isolated headless Chrome.
It also runs `verify-selection.cjs` for mouse/touch/keyboard, rapid duplicates,
capacity limits, preserved selections, stable ordering, and filled-box layouts
at 1376×1032, 1180×820, 1024×768, and 1920×1080.
It uses a temporary browser profile, leaving your browser data untouched.
Set `CHROME_PATH` if Chrome is outside the default Windows location.
Screenshot paths are printed after the run.

Later phases: remaining real products, quantity entry, box building, recent-use
sorting, rearrangement/Edit, Undo, empty confirmation, and saving. Records,
timing features, and analytics have not been redesigned.

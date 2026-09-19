# ChocoCounter
Cocoa Dolce Chocolathon Prompt B1 - Team Sugar Cult

Phase 3: visual box building on the approved responsive Counter foundation.

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
compartments. `counter-box.js` traces six independent cavity quadrilaterals in
the 1050-square source coordinate space and converts their bounds and polygons
to percentages. Each slot is a clipped container with its own chocolate scale,
depth and foreground rim. Chocolate widths are 61–63% of the rear container
bounds and 64–66% of the front bounds, with automatic proportional height.
The lower silhouette extends 8–11% beneath the container and is hidden by its
perspective clip and a slot-specific SVG overlay of the original front-lip
pixels. A subtle contact shadow sits behind the chocolate. The complete box
render remains untouched beneath the containers; no source file is edited.
Dropping into a different slot inherits that destination's scale and clipping.
This is fixed 2D cavity occlusion, not a 3D engine.
There is no ten-piece render: 10 Piece uses an explicitly labeled temporary
ten-slot layout. Add a separate render and coordinates to `COUNTER_BOX_LAYOUTS`
when available; the six-piece image is never stretched or relabeled as ten.
Original asset files have not been altered.

Each card tap adds one piece, updating its badge, count, and compact summary.
Selections cannot exceed 6 or 10 pieces. Size changes preserve all pieces;
switching to six with more than six pieces is rejected with an inline message.
The secondary Qty button opens a capacity-aware touch keypad. Confirming a
quantity creates one grouped action; zero, fractional and excessive quantities
cannot be added. Native dialogs support Cancel, Escape and focus restoration.
Edit disables the catalog and changes to Done. Tap a box chocolate to remove
it, or drag it to an empty slot to move / occupied slot to swap. An 8 CSS-pixel
movement threshold distinguishes drag from tap; canceled/outside drops do not
remove anything. A floating preview follows the pointer and valid targets are
highlighted. Nearest-slot hit handling helps small tablet targets. Keyboard:
Enter/Space removes a focused piece in Edit; Alt+arrow moves/swaps between slots.
Empty Box requires confirmation, and clearing is undoable. Save is enabled
only when full and outside Edit; clicking it explains that saving comes later.
It does not save, start timers, clear contents, or navigate away.
There is no search field or separate recent-selection section.

`counter-selection.js` owns one null-or-product-ID slot array, capacity, and
most-recently-used IDs. Count, quantities and summaries derive from the slots.
Each successful add (including a keypad group), remove, move/swap, clear and
size change stores a small pre-action snapshot. Undo restores that snapshot;
invalid or no-op requests do not add history. Shrinking a box preserves occupied
positions where possible and moves overflow pieces into available holes.
Its public snapshots are copies. There is no persistence or timer workflow.
`counter-foundation.js` updates stable card nodes, so rapid
input does not move targets or lose focus. It returns `getSelection()` for a
future transaction boundary to consume recent IDs. No reordering occurs now.
Selections and Undo history reset on refresh. Empty Box starts a new empty box
without reordering the catalog; Undo can restore it.

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
`verify-builder.cjs` covers grouped Qty/Undo, capacity rejection, clear/cancel,
Edit/Done, touch move/remove, mouse swap, drag-vs-tap, ten-slot editing and
narrow keypad layouts. `node verify-slot-state.cjs` additionally checks next-hole
filling, resize preservation/Undo, history exhaustion, and invalid quantities.
It uses a temporary browser profile, leaving your browser data untouched.
Set `CHROME_PATH` if Chrome is outside the default Windows location.
Screenshot paths are printed after the run.

Later phases: remaining real products, the ten-piece render, recent-use
sorting, and final saving/timing/persistence. Records,
timing features, and analytics have not been redesigned.

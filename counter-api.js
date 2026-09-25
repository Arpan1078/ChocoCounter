(function () {
  "use strict";

  const API_BASE = window.CHOCOCOUNTER_API_BASE || "/api";
  const STORE_CODE = window.CHOCOCOUNTER_STORE_CODE || "BRADLEY-FAIR";

  let storePromise = null;

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && payload.detail
          ? payload.detail
          : typeof payload === "string" && payload
            ? payload
            : `Request failed with status ${response.status}`;

      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  async function getStore() {
    if (!storePromise) {
      storePromise = request("/stores").then((stores) => {
        const store = stores.find(
          (item) => item.store_code === STORE_CODE
        );

        if (!store) {
          throw new Error(
            `Store ${STORE_CODE} was not found. Seed stores before checkout.`
          );
        }

        return store;
      });
    }

    return storePromise;
  }

function summarizePieces(selectionState) {
  const quantities = new Map();

  function addPiece(value) {
    if (!value) {
      return;
    }

    if (typeof value === "string") {
      quantities.set(value, (quantities.get(value) || 0) + 1);
      return;
    }

    if (typeof value === "object") {
      const id =
        value.id ||
        value.productId ||
        value.product_id ||
        value.chocolate_code ||
        value.code;

      const quantity = Number(
        value.quantity ??
        value.count ??
        1
      );

      if (id && Number.isFinite(quantity) && quantity > 0) {
        quantities.set(
          String(id),
          (quantities.get(String(id)) || 0) + quantity
        );
      }
    }
  }

  /*
   * The current Counter builder is slot-oriented. Depending on the exact
   * selection module version, slots may be exposed as `slots`, `selection`,
   * or `selectedSlots`. Check all supported forms.
   */
  const slotArrays = [
    selectionState.slots,
    selectionState.selection,
    selectionState.selectedSlots,
    selectionState.pieces
  ];

  for (const slots of slotArrays) {
    if (Array.isArray(slots)) {
      slots.forEach(addPiece);

      if (quantities.size > 0) {
        break;
      }
    }
  }

  /*
   * Fallback for grouped item snapshots:
   * [{ id: "turtle", quantity: 2 }]
   */
  if (quantities.size === 0 && Array.isArray(selectionState.items)) {
    selectionState.items.forEach(addPiece);
  }

  /*
   * Fallback for an object shape:
   * { turtle: 2, champagne: 1 }
   */
  if (
    quantities.size === 0 &&
    selectionState.quantities &&
    typeof selectionState.quantities === "object" &&
    !Array.isArray(selectionState.quantities)
  ) {
    for (const [id, quantity] of Object.entries(selectionState.quantities)) {
      addPiece({ id, quantity });
    }
  }

  return [...quantities.entries()].map(([chocolate_code, quantity]) => ({
    chocolate_code,
    quantity
  }));
}

  function durationSeconds(startedAt) {
    if (!startedAt) {
      return null;
    }

    const started = new Date(startedAt).getTime();

    if (!Number.isFinite(started)) {
      return null;
    }

    return Math.max(
      0,
      Math.round(((Date.now() - started) / 1000) * 100) / 100
    );
  }

  async function checkoutSelection(selectionState, imageFilename = null) {
    const store = await getStore();

    let pieces = summarizePieces(selectionState);

    /*
    * Final fallback: derive the selected IDs from the rendered occupied box
    * slots. The builder already uses these slots as the visible source of
    * truth, so this makes checkout work even if the selection module exposes
    * a different snapshot structure than expected.
    */
    if (!pieces.length) {
      const slotIds = [
        ...document.querySelectorAll("#v-counter [data-slot][data-piece-id]")
      ]
        .map((node) => node.dataset.pieceId)
        .filter(Boolean);

      const counts = new Map();

      for (const id of slotIds) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }

      pieces = [...counts.entries()].map(([chocolate_code, quantity]) => ({
        chocolate_code,
        quantity
      }));
    }

    console.log("Checkout selection state:", selectionState);
    console.log("Checkout pieces sent to API:", pieces);

    if (!pieces.length) {
      throw new Error(
        "Add chocolates before checkout. No selected chocolates could be read from the builder."
      );
    }

    const totalPieces = pieces.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

    const requestedCapacity = Number(
      selectionState.capacity ||
      selectionState.size ||
      selectionState.boxSize
    );

    if (!requestedCapacity) {
      throw new Error("Choose a box size before checkout.");
    }

    if (totalPieces !== requestedCapacity) {
      throw new Error(
        `Box shows ${totalPieces} selected pieces, but the selected box size is ${requestedCapacity}.`
      );
    }

    return request("/orders/checkout", {
      method: "POST",
      body: JSON.stringify({
        store_id: store.store_id,
        boxes: [
          {
            box_size: requestedCapacity,
            pieces,
            capture_seconds: durationSeconds(
              selectionState.startedAt ||
              selectionState.started_at ||
              selectionState.started
            ),
            image_filename: imageFilename
          }
        ]
      })
    });
  }
  async function uploadBoxImage(file) {
    if (!file) {
      return null;
    }

    const form = new FormData();
    form.append("file", file, file.name || "box-photo.jpg");

    const response = await fetch(`${API_BASE}/uploads/box-image`, {
      method: "POST",
      body: form,
      credentials: "same-origin"
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(
        payload?.detail || `Photo upload failed with status ${response.status}`
      );
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload.image_filename;
  }

  async function health() {
    return request("/health");
  }

  window.ChocoCounterAPI = {
    health,
    getStore,
    request,
    checkoutSelection,
    uploadBoxImage
  };
})();

/* Stable catalog targets; all quantities and visuals derive from slot state. */
function mountCounterFoundation({
  products,
  escapeHTML: esc,
  transactionLocation = "",
  onSaved = () => {}
}) {
  const root = document.querySelector("#v-counter");

  if (!root) {
    throw new Error("Could not find #v-counter.");
  }

  const selection = createCounterSelection(products);

  let currentProducts = products;
  let available = products.filter((product) => product.active);
  let byId = new Map(products.map((product) => [product.id, product]));

  const grid = root.querySelector(".chocolate-grid");

  if (!grid) {
    throw new Error("Could not find .chocolate-grid.");
  }

  let quantityProduct = null;
  let quantityText = "";
  let saving = false;
  let savedNoticeTimer = null;
  let catalogFilter = "all";

  let cards = new Map();
  let catalogItems = new Map();

  function buildCatalog() {
    grid.innerHTML = available.map((product) => `
      <div class="catalog-item">
        <button
          type="button"
          class="chocolate-card"
          data-product-id="${esc(product.id)}"
          aria-label="Add ${esc(product.name)}"
        >
          <span
            class="chocolate-visual${product.image ? "" : " image-missing"}"
            style="--product-background:${esc(product.backgroundColor || "#817151")}"
          >
            ${product.image
              ? `<img
                  src="${esc(product.image)}"
                  alt=""
                  draggable="false"
                  width="600"
                  height="540"
                >`
              : ""}
          </span>

          <span class="chocolate-name">
            <span>${esc(product.name)}</span>
            <span class="quantity-badge" aria-hidden="true" hidden></span>
          </span>
        </button>

        <button
          type="button"
          class="quantity-open"
          data-quantity-id="${esc(product.id)}"
          aria-label="Choose quantity for ${esc(product.name)}"
        >
          Qty
        </button>
      </div>
    `).join("");

    cards = new Map(
      [...grid.querySelectorAll(".chocolate-card")]
        .map((card) => [card.dataset.productId, card])
    );

    catalogItems = new Map(
      [...cards].map(([id, card]) => [
        id,
        card.closest(".catalog-item")
      ])
    );

    grid.querySelectorAll(".chocolate-card img").forEach((image) => {
      image.addEventListener("error", () => {
        image.closest(".chocolate-visual")?.classList.add("image-missing");
        image.remove();
      }, { once: true });
    });
  }

  buildCatalog();

  const catalogEmpty = root.querySelector("#catalog-empty");
  const filterToggle = root.querySelector("#catalog-filter-toggle");
  const filterMenu = root.querySelector("#catalog-filter-menu");

  const filterLabels = {
    all: "Filter",
    basic: "Filter: Basic",
    seasonal: "Filter: Seasonal",
    cocoshots: "Filter: CocoShots"
  };

  function applyFilter() {
    let visible = 0;

    available.forEach((product) => {
      const item = catalogItems.get(product.id);

      if (!item) {
        return;
      }

      const isVisible =
        catalogFilter === "all"
        || product.category === catalogFilter
        || (
          catalogFilter === "cocoshots"
          && product.category === "cocoshot"
        );

      item.hidden = !isVisible;

      if (isVisible) {
        visible += 1;
      }
    });

    const result = root.querySelector("#catalog-result");

    if (result) {
      result.textContent = `${visible} chocolate${visible === 1 ? "" : "s"}`;
    }

    if (filterToggle) {
      filterToggle.textContent = filterLabels[catalogFilter];
      filterToggle.classList.toggle("is-active", catalogFilter !== "all");
    }

    if (catalogEmpty) {
      catalogEmpty.hidden = visible !== 0;
    }
  }

  function closeFilterMenu() {
    if (!filterMenu || !filterToggle) {
      return;
    }

    filterMenu.hidden = true;
    filterToggle.setAttribute("aria-expanded", "false");
  }

  function openFilterMenu() {
    if (!filterMenu || !filterToggle) {
      return;
    }

    filterMenu.hidden = false;
    filterToggle.setAttribute("aria-expanded", "true");
  }

  if (filterToggle && filterMenu) {
    filterToggle.onclick = () => {
      if (filterMenu.hidden) {
        openFilterMenu();
      } else {
        closeFilterMenu();
      }
    };

    filterMenu.querySelectorAll("[data-filter]").forEach((button) => {
      button.onclick = () => {
        catalogFilter = button.dataset.filter;

        filterMenu.querySelectorAll("[data-filter]").forEach((option) => {
          option.setAttribute("aria-checked", String(option === button));
        });

        closeFilterMenu();
        applyFilter();
      };
    });

    document.addEventListener("click", (event) => {
      if (
        !filterMenu.hidden
        && !event.target.closest(".catalog-filter")
      ) {
        closeFilterMenu();
      }
    });

    filterMenu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeFilterMenu();
        filterToggle.focus();
      }
    });
  }

  applyFilter();

  const summary = root.querySelector(".box-summary");
  const builderHeading = root.querySelector(".builder-heading");
  const complete = root.querySelector("#box-complete");
  const status = root.querySelector(".builder-footnote");
  const undo = root.querySelector(".box-undo");
  const reset = root.querySelector(".box-reset");
  const save = root.querySelector(".save-box");
  const capture = root.querySelector(".capture-box");

  if (
    !summary
    || !builderHeading
    || !complete
    || !status
    || !undo
    || !reset
    || !save
  ) {
    throw new Error("The counter builder is missing required controls.");
  }

  summary.setAttribute("aria-label", "Selected chocolates");
  summary.tabIndex = 0;

  builderHeading.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="transaction-notice"
        role="status"
        aria-live="polite"
        hidden
      ></div>
    `
  );

  const notice = root.querySelector(".transaction-notice");

  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  undo.dataset.action = "undo";
  reset.dataset.action = "reset";
  save.dataset.action = "save";

  capture?.addEventListener("click", async () => {
    if (!window.ChocoCounterCapture) {
      status.textContent =
        "Photo capture interface is not available. Refresh the page and try again.";
      return;
    }

    const result = await window.ChocoCounterCapture.open();

    if (result === null) {
      status.textContent =
        "Photo capture closed. Your box selections were not changed.";
      return;
    }

    if (result.file) {
      window.ChocoCounterPendingPhoto = result.file;

      status.textContent =
        "Photo attached to this box. Select Save Box when you are ready.";

      render();
      return;
    }

    if (result.skipped) {
      window.ChocoCounterPendingPhoto = null;

      status.textContent =
        "No photo attached. Select Save Box to save the box contents.";

      render();
    }
  });

  root.insertAdjacentHTML(
    "beforeend",
    `
      <dialog
        class="counter-dialog"
        id="quantity-dialog"
        aria-labelledby="quantity-title"
      >
        <h2 id="quantity-title"></h2>

        <label for="quantity-value">Quantity</label>

        <input
          id="quantity-value"
          type="text"
          inputmode="none"
          pattern="[0-9]*"
          autocomplete="off"
          aria-describedby="quantity-remaining"
        >

        <p id="quantity-remaining" role="status"></p>

        <div class="quantity-keys">
          ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "Backspace", "0"]
            .map((key) => `
              <button
                type="button"
                data-key="${key}"
                ${key === "Backspace" ? 'aria-label="Backspace"' : ""}
              >
                ${key === "Backspace" ? "←" : key}
              </button>
            `)
            .join("")}
        </div>

        <div class="dialog-actions">
          <button type="button" data-cancel>Cancel</button>
          <button type="button" id="quantity-confirm">Add</button>
        </div>
      </dialog>

      <dialog
        class="counter-dialog"
        id="clear-dialog"
        aria-labelledby="clear-title"
        aria-describedby="clear-detail"
      >
        <h2 id="clear-title">Reset this box?</h2>

        <p id="clear-detail"></p>

        <div class="dialog-actions">
          <button type="button" data-cancel autofocus>Cancel</button>
          <button type="button" id="clear-confirm">Reset Box</button>
        </div>
      </dialog>
    `
  );

  const quantityDialog = root.querySelector("#quantity-dialog");
  const clearDialog = root.querySelector("#clear-dialog");
  const input = root.querySelector("#quantity-value");
  const confirm = root.querySelector("#quantity-confirm");

  const boxScene = root.querySelector(".box-scene");

  if (!boxScene) {
    throw new Error("Could not find .box-scene.");
  }

  const boxView = mountCounterBox(
    boxScene,
    products,
    (slotIndex) => {
      apply(selection.remove(slotIndex), [], slotIndex);
    },
    (from, to) => {
      apply(selection.move(from, to), [], to);
    }
  );

  function render(added = []) {
    const state = selection.snapshot();

    const quantities = new Map(
      state.items.map((item) => [item.id, item.quantity])
    );

    available.forEach((product) => {
      const card = cards.get(product.id);

      if (!card) {
        return;
      }

      const quantity = quantities.get(product.id) || 0;
      const badge = card.querySelector(".quantity-badge");

      if (badge) {
        badge.hidden = !quantity;
        badge.textContent = quantity || "";
      }

      card.setAttribute(
        "aria-label",
        `Add ${product.name}${quantity ? `, ${quantity} in box` : ""}`
      );
    });

    root.querySelectorAll("[data-capacity-option]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.capacityOption) === state.capacity)
      );
    });

    const count = root.querySelector("#foundation-count");

    if (count) {
      count.textContent = `${state.count} / ${state.capacity}`;
    }

    complete.hidden = state.count !== state.capacity;

    if (state.count > 0) {
      summary.innerHTML = `
        <ul>
          ${state.items.map((item) => {
            const product = byId.get(item.id);

            return `
              <li>
                ${
                  product?.image
                    ? `<img
                        class="summary-thumb"
                        src="${esc(product.image)}"
                        alt=""
                      >`
                    : ""
                }

                <span class="summary-name">${esc(item.name)}</span>
                <span>×${item.quantity}</span>
              </li>
            `;
          }).join("")}
        </ul>
      `;
    } else {
      summary.innerHTML = "<p>No chocolates selected.</p>";
    }

    undo.disabled = !state.canUndo;
    reset.disabled = !state.count;
    save.disabled = saving || state.count !== state.capacity;

    if (state.count === state.capacity) {
      status.textContent = "Box full. Save the box to continue.";
    } else if (state.count === 0) {
      status.textContent = "Select chocolates to fill your box.";
    } else {
      status.textContent =
        `${state.capacity - state.count} space${state.capacity - state.count === 1 ? "" : "s"} remaining.`;
    }

    boxView.render(state, added);

    const hasPendingPhoto = Boolean(window.ChocoCounterPendingPhoto);

    capture?.classList.toggle("has-photo", hasPendingPhoto);

    const captureText = capture?.querySelector("span");

    if (captureText) {
      captureText.textContent = hasPendingPhoto
        ? "Photo attached"
        : "Capture";
    }
  }

  function apply(result, added = [], focusSlot = null) {
    if (result.ok) {
      render(result.added || added);

      if (focusSlot !== null) {
        root
          .querySelector(`[data-slot="${focusSlot}"]`)
          ?.focus({ preventScroll: true });
      }

      return;
    }

    if (result.message) {
      status.textContent = result.message;
    }
  }

  grid.addEventListener("click", (event) => {
    const quantityButton = event.target.closest("[data-quantity-id]");

    if (quantityButton) {
      quantityProduct = quantityButton.dataset.quantityId;
      quantityText = "";

      const product = byId.get(quantityProduct);

      root.querySelector("#quantity-title").textContent =
        product?.name || "Chocolate quantity";

      updateQuantity();

      quantityDialog.showModal();
      input.focus();

      return;
    }

    const card = event.target.closest(".chocolate-card");

    if (!card) {
      return;
    }

    const result = selection.add(card.dataset.productId);

    apply(result);

    if (
      result.ok
      && !matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      card.getAnimations().forEach((animation) => animation.cancel());

      card.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(.975)" },
          { transform: "scale(1)" }
        ],
        { duration: 240 }
      );
    }
  });

  function updateQuantity() {
    input.value = quantityText;

    const state = selection.snapshot();
    const remaining = state.capacity - state.count;
    const quantity = Number(quantityText);

    root.querySelector("#quantity-remaining").textContent =
      `${remaining} space${remaining === 1 ? "" : "s"} remaining`
      + (quantity > remaining ? " — quantity exceeds capacity." : "");

    confirm.disabled =
      !/^\d+$/.test(quantityText)
      || !Number.isSafeInteger(quantity)
      || quantity < 1
      || quantity > remaining;

    input.setAttribute(
      "aria-invalid",
      String(quantityText !== "" && confirm.disabled)
    );
  }

  input.addEventListener("input", () => {
    quantityText = input.value;
    updateQuantity();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (!confirm.disabled) {
        confirm.click();
      }
    }
  });

  quantityDialog.querySelectorAll("[data-key]").forEach((button) => {
    button.onclick = () => {
      quantityText = button.dataset.key === "Backspace"
        ? quantityText.slice(0, -1)
        : quantityText + button.dataset.key;

      updateQuantity();
    };
  });

  confirm.onclick = () => {
    if (confirm.disabled) {
      return;
    }

    const result = selection.add(
      quantityProduct,
      Number(quantityText)
    );

    if (result.ok) {
      quantityDialog.close();
    }

    apply(result);
  };

  root.querySelectorAll("[data-cancel]").forEach((button) => {
    button.onclick = () => {
      button.closest("dialog")?.close();
    };
  });

  undo.onclick = () => {
    apply(selection.undo());
  };

  reset.onclick = () => {
    const selectedCount = selection.snapshot().count;

    if (!selectedCount) {
      return;
    }

    root.querySelector("#clear-detail").textContent =
      `This will remove all ${selectedCount} chocolate${selectedCount === 1 ? "" : "s"}.`;

    clearDialog.showModal();
  };

  root.querySelector("#clear-confirm").onclick = () => {
    clearDialog.close();
    apply(selection.clear());
  };

  /*
    Correct save behavior:
    - Capture the current builder state with selection.snapshot().
    - Save a local box record.
    - Preserve optional photo information for the following capture/cart step.
    - Do NOT call checkoutSelection or /api/orders/checkout from Save Box.
    - Final backend checkout must occur only after Add to order and Check out and pay.
  */
  save.onclick = () => {
    const state = selection.snapshot();

    if (saving || state.count !== state.capacity) {
      return;
    }

    saving = true;
    save.disabled = true;

    try {
      const saved = saveCounterTransaction(state, {
        location: transactionLocation
      });

      const pendingPhoto = window.ChocoCounterPendingPhoto || null;

      window.ChocoCounterPendingBox = {
        record: saved.record,
        photo: pendingPhoto,
        captureSkipped: !pendingPhoto
      };

      window.ChocoCounterPendingPhoto = null;

      selection.resetTransaction();

      saving = false;
      status.removeAttribute("title");

      render();

      notice.innerHTML = `
        <strong>✓ Box saved</strong>
        <span>
          ${state.count} pieces saved. Capture or skip the photo, then add this box to the order.
        </span>
      `;

      notice.hidden = false;

      clearTimeout(savedNoticeTimer);

      savedNoticeTimer = setTimeout(() => {
        notice.hidden = true;
      }, 7000);

      status.textContent =
        "Box saved. Capture or skip the photo, then add it to the order.";

      if (typeof onSaved === "function") {
        onSaved({
          record: saved.record,
          records: saved.records,
          pendingBox: window.ChocoCounterPendingBox
        });
      }
    } catch (error) {
      saving = false;
      save.disabled = false;

      status.textContent = "Could not save box. Try again.";
      status.title = error.message || "";

      console.error("ChocoCounter could not save the box:", error);
    }
  };

  root.querySelectorAll("[data-capacity-option]").forEach((button) => {
    button.onclick = () => {
      apply(
        selection.setCapacity(
          Number(button.dataset.capacityOption)
        )
      );
    };
  });

  render();

  return {
    getSelection: selection.snapshot,

    refreshProducts(nextProducts) {
      currentProducts = nextProducts;
      available = currentProducts.filter((product) => product.active);
      byId = new Map(
        currentProducts.map((product) => [product.id, product])
      );

      selection.setProducts(currentProducts);
      boxView.setProducts(currentProducts);

      buildCatalog();
      applyFilter();
      render();
    }
  };
}
/* Current-box state only. No storage, timing, saving, or action-history policy. */
function createCounterSelection(products) {
  const catalog = new Map();
  for (const product of products) {
    if (!product.id || catalog.has(product.id)) throw new Error('Chocolate IDs must be unique and nonempty.');
    catalog.set(product.id, product);
  }
  let capacity = 6;
  const pieces = [];
  const recentIds = [];
  function snapshot() {
    const quantities = new Map();
    pieces.forEach(id => quantities.set(id, (quantities.get(id) || 0) + 1));
    return { capacity, count: pieces.length, pieces: [...pieces],
      items: [...quantities].map(([id, quantity]) => ({ id, name: catalog.get(id).name, quantity })),
      recentIds: [...recentIds] };
  }
  return {
    snapshot,
    add(id) {
      if (!catalog.get(id)?.active) return { ok: false, message: 'This chocolate is unavailable.' };
      if (pieces.length >= capacity) return { ok: false, message: `Box full (${capacity} / ${capacity}).` };
      pieces.push(id);
      const prior = recentIds.indexOf(id);
      if (prior !== -1) recentIds.splice(prior, 1);
      recentIds.unshift(id);
      return { ok: true };
    },
    setCapacity(next) {
      if (![6, 10].includes(next)) return { ok: false, message: 'Choose 6 Piece or 10 Piece.' };
      if (pieces.length > next) return { ok: false, message: `${pieces.length} pieces selected. They won’t fit in a ${next}-piece box.` };
      capacity = next;
      return { ok: true };
    }
  };
}

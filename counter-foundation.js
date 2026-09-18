/* Stable card DOM keeps touch targets and focus in place throughout a box. */
function mountCounterFoundation({ products, escapeHTML }) {
  const root = document.querySelector('#v-counter');
  const selection = createCounterSelection(products);
  const available = products.filter(p => p.active);
  const grid = root.querySelector('.chocolate-grid');
  grid.innerHTML = available.map(p => `
    <button type="button" class="chocolate-card" data-product-id="${escapeHTML(p.id)}" aria-label="Add ${escapeHTML(p.name)}">
      <span class="chocolate-visual" style="--product-background:${escapeHTML(p.backgroundColor)}"><img src="${escapeHTML(p.image)}" alt="" draggable="false" width="600" height="540"></span>
      <span class="chocolate-name"><span>${escapeHTML(p.name)}</span><span class="quantity-badge" aria-hidden="true" hidden></span></span>
    </button>`).join('');
  root.querySelector('#catalog-result').textContent = `${available.length} chocolates`;
  const cards = new Map([...grid.querySelectorAll('.chocolate-card')].map(card => [card.dataset.productId, card]));
  const summary = root.querySelector('.box-summary');
  summary.setAttribute('aria-label', 'Selected chocolates');
  summary.setAttribute('tabindex', '0');
  const status = root.querySelector('.builder-footnote');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  function render() {
    const state = selection.snapshot();
    const quantities = new Map(state.items.map(item => [item.id, item.quantity]));
    for (const product of available) {
      const card = cards.get(product.id), quantity = quantities.get(product.id) || 0;
      const badge = card.querySelector('.quantity-badge');
      badge.hidden = quantity === 0;
      badge.textContent = quantity || '';
      card.setAttribute('aria-label', `Add ${product.name}${quantity ? `, ${quantity} in box` : ''}`);
    }
    root.querySelectorAll('[data-capacity-option]').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.capacityOption) === state.capacity));
    root.querySelector('#foundation-count').textContent = `${state.count} / ${state.capacity}`;
    summary.innerHTML = state.count ? `<ul>${state.items.map(item => `<li><span>${escapeHTML(item.name)}</span><span>×${item.quantity}</span></li>`).join('')}</ul>` : '<p>No chocolates selected.</p>';
    status.textContent = state.count === state.capacity ? 'Box full.' : 'Select chocolates to fill your box.';
  }
  function feedback(card) {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.getAnimations().forEach(animation => animation.cancel());
      card.animate([{ transform:'scale(1)' }, { transform:'scale(.975)', offset:.35 }, { transform:'scale(1)' }], { duration:240 });
    }
  }
  grid.addEventListener('click', event => {
    const card = event.target.closest('.chocolate-card');
    if (!card || !grid.contains(card)) return;
    const result = selection.add(card.dataset.productId);
    if (result.ok) { render(); feedback(card); }
    else status.textContent = result.message;
  });
  root.querySelectorAll('[data-capacity-option]').forEach(button => button.addEventListener('click', () => {
    const result = selection.setCapacity(Number(button.dataset.capacityOption));
    if (result.ok) render(); else status.textContent = result.message;
  }));
  render();
  // Later transaction boundaries can consume recentIds to order the NEXT catalog.
  // Nothing here reorders the active catalog or persists selections.
  return { getSelection: selection.snapshot };
}

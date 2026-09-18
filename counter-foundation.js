/* Presentation-only Counter: no transaction, persistence, or edit-mode effects. */
function mountCounterFoundation({ products, escapeHTML }) {
  const root = document.querySelector('#v-counter');
  let capacity = 6;
  root.querySelector('.chocolate-grid').innerHTML = products.map(p => `
    <button type="button" class="chocolate-card" aria-disabled="true" aria-label="${escapeHTML(p.name)} — preview only">
      <span class="chocolate-visual" style="--product-background:${escapeHTML(p.backgroundColor)}"><img src="${escapeHTML(p.image)}" alt="" draggable="false" width="600" height="540"></span>
      <span class="chocolate-name">${escapeHTML(p.name)}</span>
    </button>`).join('');
  root.querySelector('#catalog-result').textContent = `${products.length} chocolates`;
  function renderBox() {
    root.querySelectorAll('[data-capacity-option]').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.capacityOption) === capacity));
    // The supplied render is six-piece. Keep it intact until a ten-piece asset is supplied.
    root.querySelector('#foundation-count').textContent = `0 / ${capacity}`;
  }
  root.querySelectorAll('[data-capacity-option]').forEach(b => b.addEventListener('click', () => {
    capacity = Number(b.dataset.capacityOption);
    renderBox();
  }));
  renderBox();
}

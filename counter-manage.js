function mountCounterManage({escapeHTML:esc}){
  const root=document.querySelector('#v-manage'),host=root.querySelector('#manage-grid-host'),dialog=root.querySelector('#manage-add-dialog'),doneDialog=root.querySelector('#manage-done-dialog'),form=root.querySelector('#manage-add-form'),nameInput=root.querySelector('#manage-name'),categoryInput=root.querySelector('#manage-category'),imageInput=root.querySelector('#manage-image'),fileName=root.querySelector('#manage-file-name'),error=root.querySelector('#manage-form-error');
  let unsubscribe=null;
  function render(products){
    const old=host.querySelector('.chocolate-grid'),grid=document.createElement('div');
    grid.className='chocolate-grid manage-grid';grid.id='manage-grid';
    grid.innerHTML=products.map(product=>`<div class="catalog-item manage-item ${product.active?'':'manage-item-inactive'}" data-product-id="${esc(product.id)}"><div class="manage-card" tabindex="0" aria-label="Reorder ${esc(product.name)}"><span class="chocolate-visual${product.image?'':' image-missing'}" style="--product-background:${esc(product.backgroundColor||'#817151')}">${product.image?`<img src="${esc(product.image)}" alt="" draggable="false" width="600" height="540">`:''}</span><span class="chocolate-name"><span>${esc(product.name)}</span><span class="manage-status">${product.active?'Active':'Inactive'}</span></span><button type="button" class="manage-toggle" data-manage-toggle="${product.active?'off':'on'}" aria-label="${product.active?'Deactivate':'Activate'} ${esc(product.name)}">${product.active?'X':'Activate'}</button></div></div>`).join('')+`<div class="manage-add-card"><button type="button" data-manage-add aria-label="Add chocolate"><span aria-hidden="true">+</span><strong>Add Chocolate</strong></button></div>`;
    if(old)old.replaceWith(grid);else host.append(grid);
    grid.querySelectorAll('img').forEach(image=>image.addEventListener('error',()=>{image.hidden=true;image.parentElement.classList.add('image-missing');},{once:true}));
    mountCatalogOrder(grid,null,products,()=>CounterCatalogState.refresh());
    grid.addEventListener('click',event=>{
      const toggle=event.target.closest('[data-manage-toggle]');
      if(toggle){event.stopPropagation();CounterCatalogState.setActive(toggle.closest('[data-product-id]').dataset.productId,toggle.dataset.manageToggle==='on');return;}
      if(event.target.closest('[data-manage-add]')){error.hidden=true;form.reset();fileName.textContent='No file chosen';dialog.showModal();nameInput.focus();}
    });
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();const name=nameInput.value.trim();
    if(!name){error.textContent='Enter a chocolate name.';error.hidden=false;nameInput.focus();return;}
    const submit=form.querySelector('[type=submit]');submit.disabled=true;
    try{await CounterCatalogState.add({name,category:categoryInput.value,file:imageInput.files[0]||null});dialog.close();}
    catch{error.textContent='Could not add this chocolate. Try again.';error.hidden=false;}
    finally{submit.disabled=false;}
  });
  imageInput.addEventListener('change',()=>{fileName.textContent=imageInput.files[0]?.name||'No file chosen';});
  dialog.querySelector('[data-manage-cancel]').onclick=()=>dialog.close();
  root.querySelector('[data-manage-done]').onclick=()=>doneDialog.showModal();
  doneDialog.querySelector('[data-manage-done-cancel]').onclick=()=>doneDialog.close();
  doneDialog.querySelector('[data-manage-done-confirm]').onclick=()=>{doneDialog.close();document.querySelector('[data-view="counter"]').click();};
  unsubscribe=CounterCatalogState.subscribe(render);render(CounterCatalogState.products());
  return {destroy:()=>unsubscribe?.()};
}
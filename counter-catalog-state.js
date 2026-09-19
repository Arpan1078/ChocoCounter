const CounterCatalogState=(()=>{
  const productsKey='cd-catalog-products-v1',activeKey='cd-catalog-active-v1',orderKey='cd-catalog-order-v1';
  const imageDb='cd-catalog-images-v1',imageStore='images';
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch{return fallback;}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
  const additions=read(productsKey,[]).filter(p=>p&&p.id&&p.name);
  const activeOverrides=read(activeKey,{});
  const listeners=new Set();
  let products=[];
  const baseIds=new Set(COUNTER_PRODUCTS.map(p=>p.id));
  const openDb=()=>new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error('IndexedDB unavailable'));return;}
    const request=indexedDB.open(imageDb,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(imageStore);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Image storage unavailable'));
  });
  const storeImage=(id,file)=>openDb().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(imageStore,'readwrite');tx.objectStore(imageStore).put(file,id);
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
  }));
  const loadImage=id=>openDb().then(db=>new Promise((resolve,reject)=>{
    const request=db.transaction(imageStore,'readonly').objectStore(imageStore).get(id);
    request.onsuccess=()=>{db.close();resolve(request.result||null);};
    request.onerror=()=>{db.close();reject(request.error);};
  }));
  function ordered(all){
    const saved=read(orderKey,[]);const ids=new Set(all.map(p=>p.id));
    const order=[...new Set([...saved.filter(id=>ids.has(id)),...all.map(p=>p.id)])];
    return order.map(id=>all.find(p=>p.id===id)).filter(Boolean);
  }
  function sync(){
    additions.forEach(addition=>{
      if(!baseIds.has(addition.id)&&!COUNTER_PRODUCTS.some(p=>p.id===addition.id))COUNTER_PRODUCTS.push({...addition});
    });
    COUNTER_PRODUCTS.forEach(product=>{
      if(Object.prototype.hasOwnProperty.call(activeOverrides,product.id))product.active=!!activeOverrides[product.id];
    });
    products=ordered(COUNTER_PRODUCTS);
    return products;
  }
  function notify(){sync();listeners.forEach(listener=>listener(products));}
  function hydrateImages(){
    products.filter(p=>p.localImage).forEach(product=>loadImage(product.id).then(blob=>{
      if(!blob)return;
      if(product.image?.startsWith('blob:'))URL.revokeObjectURL(product.image);
      product.image=URL.createObjectURL(blob);notify();
    }).catch(()=>{}));
  }
  function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
  function setActive(id,active){
    activeOverrides[id]=!!active;write(activeKey,activeOverrides);
    const product=COUNTER_PRODUCTS.find(p=>p.id===id);if(product)product.active=!!active;
    notify();
  }
  async function add({name,category,file}){
    const cleanName=name.trim();let id=cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'chocolate';
    const used=new Set(COUNTER_PRODUCTS.map(p=>p.id));let suffix=2;const base=id;while(used.has(id))id=`${base}-${suffix++}`;
    const product={id,name:cleanName,category,image:'',backgroundColor:'#817151',active:true,localImage:!!file};
    if(file){try{await storeImage(id,file);}catch{product.localImage=false;}}
    additions.push(product);write(productsKey,additions);delete activeOverrides[id];
    notify();hydrateImages();return product;
  }
  sync();hydrateImages();
  function refresh(){notify();}
  return {products:()=>products.slice(),subscribe,setActive,add,refresh};
})();
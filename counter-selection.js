/* One slot array is authoritative. History stores small pre-action snapshots. */
function createCounterSelection(products) {
  const catalog = new Map();
  for (const product of products) {
    if (!product.id || catalog.has(product.id)) throw new Error('Chocolate IDs must be unique and nonempty.');
    catalog.set(product.id, product);
  }
  let capacity = 6, slots = Array(6).fill(null), recentIds = [];
  const history = [];
  const remember = () => history.push({ capacity, slots:[...slots], recentIds:[...recentIds] });
  const count = () => slots.filter(Boolean).length;
  const valid = i => Number.isInteger(i) && i >= 0 && i < capacity;
  function snapshot() {
    const quantities = new Map();
    slots.filter(Boolean).forEach(id => quantities.set(id, (quantities.get(id) || 0) + 1));
    return { capacity, count:count(), slots:[...slots], pieces:slots.filter(Boolean), canUndo:history.length>0,
      items:[...quantities].map(([id,quantity])=>({id,name:catalog.get(id).name,quantity})), recentIds:[...recentIds] };
  }
  return {
    snapshot,
    add(id, quantity=1) {
      if (!catalog.get(id)?.active) return {ok:false,message:'This chocolate is unavailable.'};
      if (!Number.isInteger(quantity) || quantity<1) return {ok:false,message:'Enter a whole quantity of at least 1.'};
      if (quantity>capacity-count()) return {ok:false,message:count()===capacity ? `Box full (${capacity} / ${capacity}).` : `${capacity-count()} spaces remaining.`};
      remember();
      const added=[];
      for(let n=0;n<quantity;n++){const i=slots.indexOf(null);slots[i]=id;added.push(i);}
      recentIds=[id,...recentIds.filter(x=>x!==id)];
      return {ok:true,added};
    },
    setCapacity(next) {
      if (![6,10,16,30,50].includes(next)) return {ok:false,message:'Choose a supported box size.'};
      if (count()>next) return {ok:false,message:`${count()} pieces selected. They won’t fit in a ${next}-piece box.`};
      if(next===capacity) return {ok:true};
      remember();
      // Keep occupied positions unless a smaller size requires moving overflow into holes.
      const overflow=slots.slice(next).filter(Boolean);
      slots=slots.slice(0,next);while(slots.length<next)slots.push(null);
      overflow.forEach(id=>{slots[slots.indexOf(null)]=id;});
      capacity=next;return {ok:true};
    },
    remove(i) {if(!valid(i)||!slots[i])return {ok:false};remember();slots[i]=null;return {ok:true};},
    move(from,to) {
      if(!valid(from)||!valid(to)||!slots[from]||from===to||slots[from]===slots[to])return {ok:false};
      remember();[slots[from],slots[to]]=[slots[to],slots[from]];return {ok:true};
    },
    clear() {if(!count())return {ok:false};remember();slots.fill(null);return {ok:true};},
    undo() {if(!history.length)return {ok:false};const previous=history.pop();({capacity,slots,recentIds}=previous);return {ok:true};}
  };
}

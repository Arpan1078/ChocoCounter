/* Reuse the existing local box ledger. Never replace unreadable saved data. */
const COUNTER_BOX_STORAGE_KEY='cd-boxes-v1';
function saveCounterTransaction(state, {storage=localStorage, now=Date.now, location=''}={}) {
  if(state.count!==state.capacity||state.slots.length!==state.capacity||state.slots.some(id=>!id)||state.startedAt===null)throw new Error('Box is incomplete.');
  const raw=storage.getItem(COUNTER_BOX_STORAGE_KEY);
  let records;
  try {records=raw===null?[]:JSON.parse(raw);}catch{throw new Error('Saved box data is unreadable; existing records were preserved.');}
  if(!Array.isArray(records))throw new Error('Saved box data is unreadable; existing records were preserved.');
  const savedMs=now(),savedAt=new Date(savedMs).toISOString();
  const contents=state.items.map(i=>({chocolateId:i.id,name:i.name,quantity:i.quantity}));
  const captureDurationMs=Math.max(0,savedMs-state.startedAt);
  const record={
    id:`CD-${savedAt.slice(0,10).replaceAll('-','')}-${crypto.randomUUID()}`,
    boxSize:state.capacity,totalPieces:state.count,createdAt:savedAt,savedAt,
    startedAt:new Date(state.startedAt).toISOString(),captureDurationMs,
    contents,slotOrder:[...state.slots],undoCount:state.undoCount,removalCount:state.removalCount,
    // Compatibility with the existing Boxes/Insights consumers; no export UI changes.
    location,pieceCount:state.count,captureSeconds:captureDurationMs/1000,
    items:contents.map(i=>({id:i.chocolateId,name:i.name,qty:i.quantity})),
    undos:state.undoCount,removals:state.removalCount
  };
  storage.setItem(COUNTER_BOX_STORAGE_KEY,JSON.stringify([...records,record]));
  return {record,records:[...records,record]};
}

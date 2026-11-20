// Stable identity for immutable map presentation. Inventory is deliberately
// excluded so availability can never be restored from a visual revision.
export function visualRevisionKey(json='',svg=''){
 let hash=2166136261;
 for(const text of [String(json),String(svg)])for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return 'visual-'+(hash>>>0).toString(16).padStart(8,'0');
}

// Track actual Float32 changes. Keep pending ranges until the GPU consumes them,
// including attributes on hidden meshes that may skip several renders.
export function createAttributeWriter(){
 const dirty=new Set(),tracked=new WeakSet();
 return {
  write(attribute,index,values){
   const start=index*attribute.itemSize,array=attribute.array;let changed=false;
   for(let i=0;i<attribute.itemSize;i++){const value=Math.fround(values[i]);if(array[start+i]!==value){array[start+i]=value;changed=true;}}
   if(!changed)return;
   if(!tracked.has(attribute)){
    tracked.add(attribute);const uploaded=attribute.onUploadCallback;
    attribute.onUpload(function(){this.clearUpdateRanges();uploaded.call(this);});
   }
   const last=attribute.updateRanges.at(-1),end=start+attribute.itemSize;
   // Initial builds and full inventory refreshes usually arrive in index order.
   // Coalesce immediately to avoid allocating a range object for every seat.
   if(last&&start<=last.start+last.count&&end>=last.start){const left=Math.min(start,last.start);last.count=Math.max(end,last.start+last.count)-left;last.start=left;}
   else attribute.addUpdateRange(start,attribute.itemSize);
   dirty.add(attribute);
  },
  flush(){
   for(const attribute of dirty){
    const ranges=attribute.updateRanges;ranges.sort((a,b)=>a.start-b.start);let count=0;
    for(const range of ranges){const previous=ranges[count-1];if(previous&&range.start<=previous.start+previous.count)previous.count=Math.max(previous.start+previous.count,range.start+range.count)-previous.start;else ranges[count++]=range;}
    ranges.length=count;attribute.needsUpdate=true;
   }
   dirty.clear();
  }
 };
}

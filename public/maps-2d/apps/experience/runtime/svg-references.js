// Resolve only references present in the text instead of scanning every SVG ID.
export function rewriteSVGReferences(value,ids,{href=false,selectors=false}={}){
 if(href&&value.startsWith('#'))return ids.has(value.slice(1))?'#'+ids.get(value.slice(1)):value;
 value=value.replace(/url\(\s*(['"]?)#([^\s)'" ]+)\1\s*\)/g,(match,quote,id)=>ids.has(id)?`url(${quote}#${ids.get(id)}${quote})`:match);
 return selectors?value.replace(/#([\w-]+)/g,(match,id)=>ids.has(id)?'#'+ids.get(id):match):value;
}

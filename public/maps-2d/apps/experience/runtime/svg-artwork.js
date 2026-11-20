// SVG remains the visual source of truth. Retain declarative painting and local
// definitions while excluding executable content and external resources.
const elements=new Set(['svg','g','path','polygon','polyline','rect','circle','ellipse','line','text','tspan','title','desc','defs','use','symbol','clipPath','mask','linearGradient','radialGradient','stop','pattern','style','filter','feFlood','feBlend','feColorMatrix','feOffset','feGaussianBlur','feComposite','feMerge','feMergeNode','feComponentTransfer','feFuncR','feFuncG','feFuncB','feFuncA','feMorphology','feTurbulence','feDisplacementMap','feDiffuseLighting','feSpecularLighting','feDistantLight','fePointLight','feSpotLight','feConvolveMatrix','feTile','feDropShadow']);
const properties=new Set(('fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity color filter clip-path clip-rule mask mask-type stop-color stop-opacity flood-color flood-opacity lighting-color color-interpolation color-interpolation-filters paint-order vector-effect display visibility transform transform-origin font-family font-size font-style font-weight font-stretch letter-spacing word-spacing text-anchor dominant-baseline alignment-baseline text-decoration').split(' '));
const localReference=/^#[\w:.-]+$/;
function localURLs(value){
 if(/[\\<>]/.test(value))return false;
 return !/url\s*\(/i.test(value.replace(/url\(\s*(['"]?)#[\w:.-]+\1\s*\)/gi,''));
}
function declarations(style){
 const kept=[];
 for(let i=0;i<style.length;i++){const name=style.item(i),value=style.getPropertyValue(name);if(properties.has(name)&&localURLs(value))kept.push(`${name}:${value}${style.getPropertyPriority(name)?' !important':''}`);}
 return kept.join(';');
}
function stylesheet(text){
 const sheet=new CSSStyleSheet();sheet.replaceSync(text);
 const rules=list=>[...list].flatMap(rule=>{
  if(rule.type===1){const body=declarations(rule.style);return body?[`${rule.selectorText}{${body}}`]:[];}
  if(rule.type===4)return [`@media ${rule.conditionText}{${rules(rule.cssRules)}}`];
  return [];
 }).join('\n');
 return rules(sheet.cssRules);
}
export function sanitizeSVGArtwork(root){
 if(root.ownerDocument.doctype)throw Error('SVG document types and entities are unsupported.');
 for(const el of [root,...root.querySelectorAll('*')]){
  if(!elements.has(el.localName)){el.remove();continue;}
  if(el.localName==='style'){try{el.textContent=stylesheet(el.textContent);}catch{el.remove();continue;}}
  for(const attr of [...el.attributes]){
   if(attr.name==='style'){
    const parsed=document.createElement('span').style;parsed.cssText=attr.value;const value=declarations(parsed);if(value)el.setAttribute('style',value);else el.removeAttribute('style');continue;
   }
   if(/^on/i.test(attr.name)||attr.localName==='src'||attr.localName==='base'||(attr.localName==='href'&&!localReference.test(attr.value))||(/url\s*\(/i.test(attr.value)&&!localURLs(attr.value)))el.removeAttribute(attr.name);
  }
 }
 return root;
}

// Keep the field's ancestor chain: inherited paint, opacity, transforms, clips
// and masks are part of its SVG appearance, even when defined outside the field.
export function surfaceArtworkSVG(svg,field,{x,y,width,height}){
 const art=svg.cloneNode(false);art.setAttribute('xmlns','http://www.w3.org/2000/svg');art.setAttribute('viewBox',`${x} ${y} ${width} ${height}`);art.setAttribute('width',Math.ceil(width*2));art.setAttribute('height',Math.ceil(height*2));
 for(const definition of svg.querySelectorAll('defs,style'))if(!field.contains(definition)&&!definition.parentElement.closest('defs'))art.append(definition.cloneNode(true));
 let copy=field.cloneNode(true);
 for(let parent=field.parentElement;parent&&parent!==svg;parent=parent.parentElement){const wrapper=parent.cloneNode(false);wrapper.append(copy);copy=wrapper;}
 art.append(copy);return art;
}

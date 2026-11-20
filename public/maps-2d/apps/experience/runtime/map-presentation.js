export function structuralBoxOverridesFromMap(raw){
 const overrides={};
 for(const shape of Object.values(raw?.shapes||{})){
  const name=shape.groupPath?.find(token=>/^box_|^(pressbox|shape_press_box)$/.test(token));
  if(name&&(shape.spatial3D||shape.deckId))overrides[name]={...(raw.decks?.[shape.deckId]||{}),...(shape.spatial3D||{}),deckId:shape.deckId||null};
 }
 return overrides;
}

// Missing sport metadata is not evidence of a hockey rink.
export function fieldGlassEnabled(presentation={},raw={}){
 return presentation.glassWall??raw.rendering?.glassWall??presentation.sport==='hockey';
}

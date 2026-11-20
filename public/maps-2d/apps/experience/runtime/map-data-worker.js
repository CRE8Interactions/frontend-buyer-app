import {normalizeMap} from './model.js';
self.onmessage=({data})=>{try{self.postMessage({map:normalizeMap(JSON.parse(data))});}catch(error){self.postMessage({error:error.message});}};

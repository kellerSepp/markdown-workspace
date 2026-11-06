import {EMACS_POLICY} from './emacs-policy.mjs';
const encoder=new TextEncoder();
export const textBytes=text=>encoder.encode(text).byteLength;
export function createKillRing({maxEntries=EMACS_POLICY.maxEntries,maxBytes=EMACS_POLICY.maxBytes}={}){
  if(!Number.isSafeInteger(maxEntries)||maxEntries<1||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('Ungültige Ringgrenze.');
  let entries=[],bytes=0,nextId=1,pointer=null;const listeners=new Set();
  const emit=()=>{for(const listener of listeners)listener();};
  const get=id=>entries.find(entry=>entry.id===id)??null;
  const check=text=>{
    if(typeof text!=='string'||!text.isWellFormed())return {ok:false,message:'Ungültiger Unicode-Text; Ring unverändert.'};
    const size=textBytes(text);
    if(size>maxBytes)return {ok:false,message:'Text überschreitet das UTF-8-Ringbudget; unverändert verworfen.'};
    if(!size)return {ok:false,message:'Leerer Text wird nicht im Ring abgelegt.'};
    return {ok:true,bytes:size};
  };
  return {
    get size(){return entries.length;},get bytes(){return bytes;},get limits(){return {maxEntries,maxBytes};},
    list:()=>entries.slice(),get,check,
    current:()=>get(pointer)??entries[0]??null,
    subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
    select(id){if(!get(id))return false;pointer=id;emit();return true;},
    older(id=pointer){const index=entries.findIndex(e=>e.id===id);return entries.length?entries[(index+1)%entries.length]:null;},
    add(text,{dedupe=true}={}){
      const allowed=check(text);if(!allowed.ok)return allowed;const size=allowed.bytes;
      const existing=dedupe&&entries.find(e=>e.text===text);
      if(existing){entries=[existing,...entries.filter(entry=>entry.id!==existing.id)];pointer=existing.id;emit();return {ok:true,entry:existing,duplicate:true};}
      const entry=Object.freeze({id:nextId++,text,bytes:size});entries.unshift(entry);bytes+=size;pointer=entry.id;
      while(entries.length>maxEntries||bytes>maxBytes){const old=entries.pop();bytes-=old.bytes;}
      emit();
      return {ok:true,entry};
    },
    clear(){entries=[];bytes=0;pointer=null;emit();}
  };
}

// Shared ring/prefix key policy; no editor state or DOM ownership.
export function panelMove(event,{plain=false}={}){
  if(event.isComposing||event.keyCode===229||event.getModifierState?.('AltGraph')||event.ctrlKey||event.metaKey||event.shiftKey)return 0;
  if(!event.altKey&&!plain)return 0;
  return event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
}

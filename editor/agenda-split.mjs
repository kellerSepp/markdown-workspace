import {createPanelLayout} from './panel-layout.mjs';

// The lower panel shares the workspace grid. No document transaction or polling.
export function createAgendaSplit({host,workspace,view,document:doc=globalThis.document}){
  if(!host||!workspace||!view)return {setOpen(){},destroy(){}};
  const layout=createPanelLayout({host,workspace,view,document:doc});
  const separator=doc.createElement('div');separator.className='agenda-separator';separator.tabIndex=0;
  separator.setAttribute('role','separator');separator.setAttribute('aria-label','Höhe der Agenda');separator.setAttribute('aria-orientation','horizontal');
  separator.setAttribute('aria-valuemin','20');separator.setAttribute('aria-valuemax','80');
  let share=50,dragging=null,open=false;
  const old=workspace.style.getPropertyValue('--work-panel-share');
  const listeners=[];
  function listen(el,type,fn){el?.addEventListener(type,fn);listeners.push(()=>el?.removeEventListener(type,fn));}
  function resize(value){share=Math.max(20,Math.min(80,value));if(open)layout.preserve(()=>workspace.style.setProperty('--work-panel-share',share+'%'));separator.setAttribute('aria-valuenow',String(Math.round(share)));}
  listen(separator,'pointerdown',event=>{if(event.button!==0)return;event.preventDefault();dragging=event.pointerId;separator.setPointerCapture?.(event.pointerId);});
  listen(separator,'pointermove',event=>{if(dragging!==event.pointerId)return;const rect=workspace.getBoundingClientRect();if(rect.height>0)resize((rect.bottom-event.clientY)/rect.height*100);});
  const release=event=>{if(event&&event.pointerId!==dragging)return;const pointer=dragging;dragging=null;if(pointer!==null)try{separator.releasePointerCapture?.(pointer);}catch{/* Capture can already have ended at the browser boundary. */}};
  listen(separator,'pointerup',release);listen(separator,'pointercancel',release);listen(separator,'lostpointercapture',release);
  listen(separator,'keydown',event=>{
    if(event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.isComposing||event.keyCode===229)return;
    if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();resize(event.key==='Home'?20:event.key==='End'?80:share+(event.key==='ArrowUp'?5:-5));
  });
  separator.hidden=true;host.append(separator);resize(share);
  return {setOpen(value){open=value;release();separator.hidden=!value;host.classList.toggle('agenda-host',value);layout.preserve(()=>workspace.style.setProperty('--work-panel-share',value?share+'%':old));layout.setOpen(value);},
    destroy(){if(open)this.setOpen(false);for(const dispose of listeners)dispose();separator.remove();layout.destroy();workspace.style.setProperty('--work-panel-share',old);}};
}

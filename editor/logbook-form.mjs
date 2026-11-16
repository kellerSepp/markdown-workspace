export function createLogbookForm({document:doc,cancel,commit}){
  const root=doc.createElement('div'),input=doc.createElement('textarea'),hint=doc.createElement('p'),save=doc.createElement('button'),abort=doc.createElement('button');
  input.rows=6;input.setAttribute('style','width:100%;box-sizing:border-box');input.setAttribute('aria-label','Logbuchnotiz');
  hint.textContent='Mehrzeilige Notiz · C-c c übernehmen · C-c k / Escape abbrechen · Datei anschließend mit Strg+S speichern';
  save.type=abort.type='button';save.textContent='Notiz übernehmen';abort.textContent='Abbrechen';
  save.addEventListener('click',()=>commit(input.value));abort.addEventListener('click',cancel);
  let prefix=false;
  root.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.isComposing||event.keyCode===229||event.altKey||event.metaKey||event.shiftKey||event.getModifierState?.('AltGraph')){prefix=false;return;}
    const key=event.key.toLowerCase();
    if(key==='escape'){event.preventDefault();prefix=false;cancel();return;}
    if(prefix&&!event.ctrlKey){prefix=false;if(key==='c'||key==='k'){event.preventDefault();if(!event.repeat)(key==='c'?()=>commit(input.value):cancel)();}return;}
    if(event.ctrlKey&&key==='c'){event.preventDefault();if(!event.repeat)prefix=true;}else prefix=false;
  });
  root.append(hint,input,save,abort);
  return {root,focus:()=>input.focus(),destroy(){root.remove();}};
}

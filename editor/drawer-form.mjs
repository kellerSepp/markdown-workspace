export function createDrawerForm({document:doc,cancel,commit}){
  const root=doc.createElement('div'),label=doc.createElement('label'),input=doc.createElement('input'),hint=doc.createElement('p'),save=doc.createElement('button'),abort=doc.createElement('button');
  label.textContent='Drawername';input.type='text';input.setAttribute('aria-label','Drawername');input.placeholder='z. B. PEOPLE';label.append(input);
  hint.textContent='Buchstaben, Ziffern, Unterstrich · Enter anlegen · Escape abbrechen · LOGBOOK/PROPERTIES/END reserviert';
  save.type=abort.type='button';save.textContent='Drawer anlegen';abort.textContent='Abbrechen';
  save.addEventListener('click',()=>commit(input.value));abort.addEventListener('click',cancel);
  root.addEventListener('keydown',event=>{
    event.stopPropagation();if(event.isComposing||event.keyCode===229||event.altKey||event.metaKey||event.shiftKey||event.ctrlKey)return;
    if(event.key==='Escape'){event.preventDefault();cancel();}
    if(event.key==='Enter'&&event.target!==abort){event.preventDefault();if(!event.repeat)commit(input.value);}
  });
  root.append(label,hint,save,abort);return {root,focus:()=>input.focus(),destroy(){root.remove();}};
}

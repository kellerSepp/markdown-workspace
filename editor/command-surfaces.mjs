import {isPaletteShortcut} from './command-registry.mjs';

// DOM rendering uses textContent only. No polling, external definitions or HTML templates.
export function createCommandSurfaces({registry,view,document:doc=globalThis.document,notify=()=>{}}) {
  const win=doc.defaultView;
  const dialog=doc.createElement('dialog');dialog.className='command-palette';dialog.setAttribute('aria-label','Command Palette');
  const label=doc.createElement('label');label.textContent='Befehl suchen';
  const search=doc.createElement('input');search.type='search';search.placeholder='Name, Beschreibung oder Kategorie';search.setAttribute('aria-label','Befehle durchsuchen');
  const help=doc.createElement('p');help.className='hint';help.textContent='↑ ↓ auswählen · Enter ausführen · Escape schließen';
  const closeButton=doc.createElement('button');closeButton.textContent='Schließen';closeButton.type='button';
  const results=doc.createElement('div');results.className='command-results';results.id='command-results';results.setAttribute('role','listbox');results.setAttribute('aria-label','Befehle');
  search.setAttribute('role','combobox');search.setAttribute('aria-controls',results.id);search.setAttribute('aria-expanded','true');
  label.append(search);dialog.append(label,help,results,closeButton);doc.body.append(dialog);
  const shortcutButton=doc.createElement('button');shortcutButton.type='button';shortcutButton.textContent='Kürzelübersicht';shortcutButton.setAttribute('aria-pressed','false');dialog.append(shortcutButton);
  const menu=doc.createElement('div');menu.className='command-context';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','Editorbefehle');doc.body.append(menu);
  let mode=null,snapshot=null,rows=[],index=0,shortcutsOnly=false;
  const matches=()=>registry.list(search.value).filter(c=>!shortcutsOnly||c.shortcut||c.orgShortcut);
  shortcutButton.addEventListener('click',()=>{shortcutsOnly=!shortcutsOnly;shortcutButton.setAttribute('aria-pressed',String(shortcutsOnly));render(results,matches());search.focus();});
  function capture() {return {element:doc.activeElement,selection:view.state.selection,doc:view.state.doc};}
  function restoreSelection() {
    if(snapshot?.doc===view.state.doc&&!snapshot.selection.eq(view.state.selection)) view.dispatch({selection:snapshot.selection});
  }
  function close({restore=true,selection=true}={}) {
    if(!mode) return;
    if(selection) restoreSelection();
    const origin=snapshot?.element;
    mode=null;if(dialog.open) dialog.close();menu.hidden=true;
    if(restore) {
      if(origin&&view.dom.contains(origin)) view.focus();
      else if(origin?.isConnected) origin.focus();
    }
    snapshot=null;
  }
  function execute(id) {
    // Restore before executing, never afterwards: formatting/folding can intentionally move selection.
    if(mode==='context'&&snapshot?.executionSelection) snapshot.selection=snapshot.executionSelection;
    close();
    try {Promise.resolve(registry.execute(id)).catch(error=>notify(error.message));}
    catch(error) {notify(error.message);}
  }
  function select(n,focus=false) {
    if(!rows.length) return;
    index=(n+rows.length)%rows.length;
    rows.forEach((row,i)=>{row.classList.toggle('command-active',i===index);row.tabIndex=i===index?0:-1;if(mode==='palette') row.setAttribute('aria-selected',String(i===index));});
    if(mode==='palette') search.setAttribute('aria-activedescendant',rows[index].id);
    if(focus) rows[index].focus();
    rows[index].scrollIntoView({block:'nearest'});
  }
  function render(container,commands) {
    rows=[];container.replaceChildren();index=0;
    for(const command of commands) {
      const row=doc.createElement('button');row.type='button';row.className='command-row';row.dataset.command=command.id;
      row.id='command-'+command.id;row.setAttribute('role',mode==='context'?'menuitem':'option');row.setAttribute('aria-disabled',String(!command.enabled));
      const name=doc.createElement('span');name.className='command-name';name.textContent=command.name+(command.shortcut?' · '+command.shortcut:'');
      const detail=doc.createElement('span');detail.className='command-detail';detail.textContent=command.category+' · '+(command.enabled?command.description:command.reason)+(command.orgShortcut?' · Org: '+command.orgShortcut+' · Workspace: '+command.shortcut+' · '+command.compatibility:'');
      row.append(name,detail);
      row.addEventListener('click',()=>{if(registry.availability(command.id).enabled) execute(command.id);else notify(registry.availability(command.id).reason);});
      row.addEventListener('focus',()=>select(rows.indexOf(row)));
      rows.push(row);container.append(row);
    }
    if(!rows.length) {search.removeAttribute('aria-activedescendant');const empty=doc.createElement('p');empty.textContent='Keine passenden Befehle.';container.append(empty);}
    select(0);
  }
  function palette() {
    if(mode==='palette') {search.focus();return;}
    if(mode) close();
    snapshot=capture();mode='palette';search.value='';shortcutsOnly=false;shortcutButton.setAttribute('aria-pressed','false');dialog.showModal();render(results,matches());search.focus();
  }
  search.addEventListener('input',()=>render(results,matches()));
  closeButton.addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{if(event.target===dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) close();}});
  function keys(event) {
    if(event.isComposing) return;
    if(event.key==='Escape') {event.preventDefault();event.stopPropagation();close();return;}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'||event.key==='Home'&&event.target!==search||event.key==='End'&&event.target!==search) {
      event.preventDefault();select(event.key==='Home'?0:event.key==='End'?rows.length-1:index+(event.key==='ArrowDown'?1:-1),mode==='context'||event.target!==search);return;
    }
    if(event.key==='Enter'&&event.target!==closeButton&&event.target!==shortcutButton) {event.preventDefault();rows[index]?.click();}
    if(event.key==='Tab'&&mode==='context') close({restore:false});
  }
  dialog.addEventListener('keydown',keys);menu.addEventListener('keydown',keys);
  function context(event,keyboard=false) {
    if(mode||event.shiftKey&&!keyboard) return; // Shift+right click keeps the native browser menu.
    if(!view.dom.contains(event.target)) return;
    const original=capture();
    let x=event.clientX,y=event.clientY;
    if(!keyboard) {
      const pos=view.posAtCoords({x,y});
      if(pos==null) return;
      const selected=view.state.selection.ranges.some(r=>!r.empty&&pos>=r.from&&pos<=r.to);
      if(!selected) view.dispatch({selection:{anchor:pos}});
    } else {
      const rect=view.coordsAtPos(view.state.selection.main.head)||view.dom.getBoundingClientRect();x=rect.left;y=rect.bottom;
    }
    event.preventDefault();snapshot=original;mode='context';
    // Keep the target selection for execution, while Escape restores the original selection.
    const targetSelection=view.state.selection;
    const available=registry.list();
    const heading=available.some(c=>c.id.startsWith('structure.heading')&&c.enabled),list=available.some(c=>c.id.startsWith('structure.list')&&c.enabled);
    const commands=available.filter(c=>['edit','fold','format','structure'].includes(c.id.split('.')[0])&&(c.id.startsWith('format.')?!targetSelection.main.empty:c.id.startsWith('structure.heading')?heading:c.id.startsWith('structure.list')?list:true));
    menu.hidden=false;render(menu,commands);
    menu.style.left='0px';menu.style.top='0px';
    const rect=menu.getBoundingClientRect();menu.style.left=Math.max(0,Math.min(x,win.innerWidth-rect.width-8))+'px';menu.style.top=Math.max(0,Math.min(y,win.innerHeight-rect.height-8))+'px';
    // Execution must use the context click target, rather than the old caret.
    snapshot.executionSelection=targetSelection;select(0,true);
  }
  view.dom.addEventListener('contextmenu',context);
  const shortcut=event=>{
    if(isPaletteShortcut(event)) {event.preventDefault();event.stopPropagation();palette();}
    else if(!mode&&view.dom.contains(event.target)&&!event.isComposing&&(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')&&!event.ctrlKey&&!event.altKey&&!event.metaKey) context(event,true);
  };
  const outside=event=>{if(mode==='context'&&!menu.contains(event.target)) close({restore:false});};
  const blur=()=>{if(mode==='context') close({restore:false});};
  win.addEventListener('keydown',shortcut,true);doc.addEventListener('pointerdown',outside,true);win.addEventListener('blur',blur);
  return {palette,close,destroy(){close();dialog.remove();menu.remove();view.dom.removeEventListener('contextmenu',context);win.removeEventListener('keydown',shortcut,true);doc.removeEventListener('pointerdown',outside,true);win.removeEventListener('blur',blur);}};
}

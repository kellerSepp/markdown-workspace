import {EMACS_POLICY} from './emacs-policy.mjs';
import {createPanelLayout,revealPanelRow} from './panel-layout.mjs';
import {panelMove} from './panel-navigation.mjs';

// Search remains substring-based. Tab completes only matching single-line
// prefixes, never an arbitrary substring hit or an entire multiline entry.
export function completeRingSearch(query,entries,maxCharacters=EMACS_POLICY.completionMaxCharacters){
  if(!Number.isSafeInteger(maxCharacters)||maxCharacters<1)throw Error('Ungültige Completiongrenze.');
  const overLimit=text=>{let count=0;for(const _char of text)if(++count>maxCharacters)return true;return false;};
  if(overLimit(query))return {value:query,message:'Suchtext überschreitet die Completiongrenze; unverändert gelassen.'};
  const needle=query.toLocaleLowerCase('de');let first=null,firstFolded=null,common='',unique=true;
  for(const entry of entries)for(const match of entry.text.matchAll(/[^\r\n]+/g)){
    const line=match[0],folded=line.toLocaleLowerCase('de');if(!folded.startsWith(needle))continue;
    if(first===null){first=line;firstFolded=folded;common=line;continue;}
    if(folded!==firstFolded)unique=false;
    const other=line[Symbol.iterator](),prefix=[];
    for(const char of common){
      if(char.toLocaleLowerCase('de')!==other.next().value?.toLocaleLowerCase('de'))break;prefix.push(char);
      if(prefix.length>maxCharacters)break;
    }
    common=prefix.join('');
  }
  if(first===null)return {value:query,message:'Keine Zeile beginnt mit diesem Suchtext; Teilworttreffer bleiben sichtbar.'};
  if(unique){
    if(overLimit(first))return {value:query,message:'Eindeutige Zeile ist zu lang für das Suchfeld; vollständig per Enter auswählen.'};
    return {value:first,message:first===query?'Suchtext ist bereits vollständig.':'Suchtext zur eindeutigen Zeile vervollständigt.'};
  }
  if(overLimit(common))return {value:query,message:'Gemeinsamer Präfix überschreitet die Completiongrenze; Suchtext bleibt unverändert.'};
  if(common.toLocaleLowerCase('de').length>needle.length)return {value:common,message:'Suchtext zum gemeinsamen Präfix erweitert; mehrere Kandidaten bleiben.'};
  return {value:query,message:'Mehrere Präfixkandidaten, keine weitere gemeinsame Erweiterung.'};
}

export function ringPreview(text,limit=EMACS_POLICY.previewLength){
  let short=text.slice(0,limit);if(/[\uD800-\uDBFF]$/.test(short))short=short.slice(0,-1);
  return short.replace(/\r\n?|\n/g,' ↵ ')+(short.length<text.length?' …':'');
}

// Reusable shell: no ring, documents or clipboard access.
export function createPanelShell({host,document:doc=globalThis.document}){
  const root=doc.createElement('section');root.className='work-panel';root.hidden=true;root.setAttribute('aria-label','Unterer Arbeitsbereich');
  const header=doc.createElement('div');header.className='work-panel-header';
  const title=doc.createElement('strong');
  const closeButton=doc.createElement('button');closeButton.type='button';closeButton.textContent='Schließen';
  header.append(title,closeButton);root.append(header);host.append(root);
  return {root,closeButton,show(name){title.textContent=name;root.hidden=false;},hide(){root.hidden=true;},destroy(){root.remove();}};
}

// Ring view owns filtering/target selection, reusing the independent shell.
export function createWorkPanel({host,workspace,view,ring,insert,getContext=()=>({}),notify=()=>{},document:doc=globalThis.document,previewLength=EMACS_POLICY.previewLength,completionMaxCharacters=EMACS_POLICY.completionMaxCharacters,layoutPolicy={}}){
  const layout=createPanelLayout({workspace,host,view,document:doc,policy:layoutPolicy});
  const shell=createPanelShell({host,document:doc}),{root,closeButton}=shell;
  const search=doc.createElement('input');search.type='search';search.placeholder='Ringtext suchen';search.setAttribute('aria-label','Kill-Ring durchsuchen');
  search.setAttribute('role','combobox');search.setAttribute('aria-autocomplete','list');search.setAttribute('aria-controls','kill-ring-results');
  const hint=doc.createElement('p');hint.className='hint';hint.textContent='↑ ↓ / Alt+↑ ↓ wählen · Tab: Zeilenpräfix ergänzen · Enter einfügen · Escape/Strg+G schließen';
  const results=doc.createElement('div');results.className='work-panel-results';results.id='kill-ring-results';results.setAttribute('role','listbox');results.setAttribute('aria-label','Gespeicherte Ringtexte');
  const message=doc.createElement('p');message.className='hint';message.setAttribute('role','status');
  root.append(search,hint,results,message);
  let target=null,rows=[],index=0,destroyed=false,prefixCancel=null,choiceMode=null;
  const disposers=[],rowDisposers=[];
  function clearRows(){
    for(const dispose of rowDisposers.splice(0))dispose();
    for(const row of rows)row.textContent='';
    rows=[];index=0;results.replaceChildren();search.removeAttribute('aria-activedescendant');
  }
  function listen(element,type,fn){element.addEventListener(type,fn);disposers.push(()=>element.removeEventListener(type,fn));}
  function ready(){const c=getContext();return !c.busy&&c.hasDocument!==false&&!view.state.readOnly;}
  function valid(){return target&&target.state===view.state&&ready();}
  function close({restore=true}={}){
    const cancel=prefixCancel;prefixCancel=null;choiceMode=null;cancel?.();
    const focus=restore&&valid();target=null;
    layout.setOpen(false,()=>{
      shell.hide();root.removeAttribute('data-prefix-help');search.setAttribute('aria-expanded','false');clearRows();search.value='';message.textContent='';
      // CodeMirror focus() uses preventScroll; no state transaction is needed.
      if(focus)view.focus();
    });
  }
  function select(next){
    if(!rows.length){search.removeAttribute('aria-activedescendant');return;}
    index=((next%rows.length)+rows.length)%rows.length;
    rows.forEach((row,i)=>{row.setAttribute('aria-selected',String(i===index));row.classList.toggle('work-panel-active',i===index);});
    if(!prefixCancel)search.setAttribute('aria-activedescendant',rows[index].id);
    revealPanelRow(results,rows[index]);
  }
  function moveSelection(delta){
    if(!rows.length)return false;
    for(let step=1;step<=rows.length;step++){
      const next=((index+delta*step)%rows.length+rows.length)%rows.length;
      if(!rows[next].disabled){select(next);return true;}
    }
    return false;
  }
  function activateSelection(){if(!root.hidden&&prefixCancel&&!rows[index]?.disabled)rows[index]?.click();}
  function choose(id){
    if(!valid()){message.textContent='Ziel hat sich geändert. Auswahl am gewünschten Cursor erneut öffnen.';notify(message.textContent);return false;}
    const saved=target;
    if((choiceMode?.choose??insert)(id,saved)){close({restore:false});view.focus();return true;}
    message.textContent='Aktion wurde verworfen; Dokument bleibt unverändert.';return false;
  }
  function render(){
    if(destroyed||root.hidden||prefixCancel)return;
    return layout.preserve(()=>{
    clearRows();
    const query=search.value.toLocaleLowerCase('de');
    for(const entry of (choiceMode?.entries??ring.list()).filter(e=>e.text.toLocaleLowerCase('de').includes(query))){
      const row=doc.createElement('button');row.type='button';row.className='work-panel-row';row.setAttribute('role','option');row.tabIndex=-1;
      row.id='kill-ring-entry-'+entry.id;row.textContent=choiceMode?entry.text:ringPreview(entry.text,previewLength)+' ('+entry.bytes+' UTF-8-Byte)';
      const entryId=entry.id,click=()=>choose(entryId),hover=()=>select(rows.indexOf(row));
      row.addEventListener('click',click);row.addEventListener('mouseenter',hover);
      rowDisposers.push(()=>{row.removeEventListener('click',click);row.removeEventListener('mouseenter',hover);});
      rows.push(row);results.append(row);
    }
    if(!rows.length){const empty=doc.createElement('p');empty.textContent=choiceMode?(choiceMode.empty??'Keine passenden H1-Ziele.'):ring.size?'Keine passenden Einträge.':'Kill-Ring ist leer.';results.append(empty);}
    message.textContent=choiceMode?(choiceMode.summary??'H1-Ziel wählen · aktuelle Datei'):ring.size+' Einträge · '+ring.bytes+' UTF-8-Byte · nur Arbeitsspeicher';select(0);
    });
  }
  function openChoices({title,entries,choose,label='H1-Ziele dieser Datei',hint:choiceHint,empty,summary,fastKeys=false}){
    if(destroyed||!ready())return false;
    close({restore:false});choiceMode={entries,choose,empty,summary,fastKeys};search.hidden=false;results.setAttribute('aria-label',label);search.placeholder=label+' suchen';search.setAttribute('aria-label',label+' durchsuchen');
    hint.textContent=choiceHint??'↑ ↓ / Alt+↑ ↓ wählen · Tab ergänzen · Enter verschieben · Escape/Strg+G abbrechen';
    target={state:view.state,head:view.state.selection.main.head};search.value='';
    layout.setOpen(true,()=>{shell.show(title);search.setAttribute('aria-expanded','true');render();search.focus({preventScroll:true});});return true;
  }
  function openRing(){
    if(destroyed||!ready()){notify('Editor nicht bereit; Ringauswahl nicht geöffnet.');return false;}
    close({restore:false});results.setAttribute('aria-label','Gespeicherte Ringtexte');search.placeholder='Ringtext suchen';search.setAttribute('aria-label','Kill-Ring durchsuchen');search.hidden=false;hint.textContent='↑ ↓ / Alt+↑ ↓ wählen · Tab: Zeilenpräfix ergänzen · Enter einfügen · Escape/Strg+G schließen';
    target={state:view.state,head:view.state.selection.main.head};search.value='';
    layout.setOpen(true,()=>{shell.show('Kill-Ring');search.setAttribute('aria-expanded','true');render();search.focus({preventScroll:true});});return true;
  }
  listen(search,'input',render);
  listen(root,'compositionstart',()=>{if(choiceMode)close();});
  const inside=element=>{for(let n=element;n;n=n.parentNode??n.parent)if(n===root)return true;return false;};
  listen(root,'focusout',event=>{if(choiceMode&&!inside(event.relatedTarget))close({restore:false});});
  if(doc.defaultView?.addEventListener)listen(doc.defaultView,'blur',()=>{if(choiceMode)close({restore:false});});
  // Prefix help leaves the editor focused, including pointer activation.
  listen(root,'mousedown',event=>{if(prefixCancel)event.preventDefault();});
  listen(closeButton,'click',()=>close());
  listen(root,'keydown',event=>{
    if(prefixCancel)return;
    if(event.isComposing||event.keyCode===229||event.metaKey||event.getModifierState?.('AltGraph'))return;
    const move=panelMove(event,{plain:true});
    if(move){event.preventDefault();moveSelection(move);return;}
    if(event.altKey)return;
    if(event.key==='Escape'||event.ctrlKey&&!event.shiftKey&&event.key.toLowerCase()==='g'){
      event.preventDefault();event.stopPropagation();close();return;
    }
    if(event.ctrlKey)return;
    if(choiceMode?.fastKeys&&!event.shiftKey){const entry=choiceMode.entries.find(e=>e.key===event.key.toLowerCase());if(entry){event.preventDefault();if(!event.repeat)choose(entry.id);return;}}
    if(event.key==='Tab'){
      if(event.shiftKey||event.target!==search)return;
      event.preventDefault();const completion=completeRingSearch(search.value,choiceMode?.entries??ring.list(),completionMaxCharacters);
      layout.preserve(()=>{search.value=completion.value;render();message.textContent=completion.message;});return;
    }
    if(event.key==='Enter'&&event.target!==closeButton){event.preventDefault();if(!event.repeat&&!event.shiftKey)rows[index]?.click();}
  });
  function showPrefix(choices,choose,cancel){
    if(destroyed)return false;
    close({restore:false});prefixCancel=cancel;
    layout.setOpen(true,()=>{
      shell.show('C-c · Folgebefehl');search.hidden=true;
      root.setAttribute('data-prefix-help','');
      hint.textContent='C und Strg loslassen · 1 / 2 / 3 / w / t; Strg+C: Regeln laden · Alt+↑/↓ wählen · Enter ausführen · Escape/Strg+G abbrechen · Alt+W kopiert';
      message.textContent='';
      for(const choice of choices){
        const row=doc.createElement('button');row.type='button';row.className='work-panel-row';
        row.setAttribute('role','option');row.tabIndex=-1;
        row.textContent=(choice.label??choice.key)+' · '+choice.name+(choice.enabled?'':' · '+choice.reason);row.disabled=!choice.enabled;
        const click=()=>{if(!row.disabled)choose(choice.key);},hover=()=>{if(!row.disabled)select(rows.indexOf(row));};
        row.addEventListener('click',click);row.addEventListener('mouseenter',hover);
        rowDisposers.push(()=>{row.removeEventListener('click',click);row.removeEventListener('mouseenter',hover);});rows.push(row);results.append(row);
      }
      const first=rows.findIndex(row=>!row.disabled);if(first>=0)select(first);
    });return true;
  }
  const unsubscribe=ring.subscribe(()=>{if(!prefixCancel)render();});
  return {invalidateStale(){if(choiceMode&&!valid())close({restore:false});},openChoices,openRing,showPrefix,moveSelection,activateSelection,close,get isOpen(){return !root.hidden;},refresh:render,preserveViewport:layout.preserve,
    destroy(){if(destroyed)return;close({restore:false});destroyed=true;unsubscribe();for(const dispose of disposers)dispose();clearRows();shell.destroy();layout.destroy();}
  };
}

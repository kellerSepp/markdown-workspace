import {validTag} from './heading-suffix.mjs';
import {revealPanelRow} from './panel-layout.mjs';

// Local draft only. Enter in free input adds tags and returns to the menu;
// Enter in the menu commits the entire draft through the controller once.
export function createTagForm({document:doc,entries,current,inherited,origins=[],warning='',commit,cancel}){
  const root=doc.createElement('div');root.className='tag-form';root.tabIndex=0;root.setAttribute('aria-label','Tagauswahl');
  const inheritedRow=doc.createElement('p'),currentRow=doc.createElement('p'),list=doc.createElement('div'),hint=doc.createElement('p'),notice=doc.createElement('p');
  inheritedRow.className='tag-inherited';inheritedRow.textContent='Inherited · geerbt: '+(inherited.join(' · ')||'keine');
  inheritedRow.title=origins.map(o=>'Zeile '+o.line+': '+o.tags.join(', ')).join('\n');
  list.className='tag-choices';list.setAttribute('role','listbox');list.setAttribute('aria-multiselectable','true');
  hint.className='hint';hint.textContent='Buchstabe/Maus/→: toggeln · ↑ ↓: wählen · Tab: Tag eingeben · Leertaste: eigene leeren · Enter: übernehmen · Escape/Strg+G: abbrechen';
  notice.className='hint';notice.setAttribute('role','status');notice.textContent=warning;
  const label=doc.createElement('label'),input=doc.createElement('input');label.textContent='Tag hinzufügen (mehrere mit Komma): ';input.type='text';input.setAttribute('aria-label','Freie Tags');label.append(input);label.hidden=true;
  const actions=doc.createElement('div');actions.className='toolbar';
  const disposers=[],rowDisposers=[],selected=new Set(current),options=new Map(entries.map(e=>[e.name,{...e}]));
  for(const name of current)if(!options.has(name))options.set(name,{name});
  let rows=[],index=0,free=false,destroyed=false;
  const listen=(el,event,fn)=>{el.addEventListener(event,fn);disposers.push(()=>el.removeEventListener(event,fn));};
  function render(){
    for(const dispose of rowDisposers.splice(0))dispose();list.replaceChildren();rows=[];
    currentRow.textContent='Current · eigene: '+([...selected].join(' · ')||'keine');
    for(const entry of options.values()){
      const button=doc.createElement('button');button.type='button';button.tabIndex=-1;button.setAttribute('role','option');button.setAttribute('aria-selected',String(selected.has(entry.name)));
      button.textContent=`${selected.has(entry.name)?'✓':'○'} ${entry.key?'['+entry.key+'] ':''}${entry.name}`;
      const click=()=>{if(destroyed)return;toggle(entry.name);root.focus({preventScroll:true});};
      button.addEventListener('click',click);rowDisposers.push(()=>button.removeEventListener('click',click));list.append(button);rows.push(button);
    }
    index=Math.max(0,Math.min(index,rows.length-1));rows[index]?.classList.add('work-panel-active');
  }
  function toggle(name){if(selected.has(name))selected.delete(name);else selected.add(name);render();}
  function freeInput(){free=true;label.hidden=false;input.value='';input.focus({preventScroll:true});}
  function add(){
    const names=input.value.split(',').map(name=>name.trim());
    if(!names.length||!names.every(validTag)){notice.textContent='Tagnamen: Buchstaben/Ziffern und _ @ # %, keine Leerzeichen oder Bindestriche.';return;}
    for(const name of names){selected.add(name);if(!options.has(name))options.set(name,{name});}
    free=false;label.hidden=true;input.value='';notice.textContent=warning;render();root.focus({preventScroll:true});
  }
  for(const [text,fn] of [['Tag hinzufügen (Tab)',freeInput],['Eigene Tags leeren',()=>{selected.clear();render();}],['Übernehmen',()=>commit([...selected])],['Abbrechen',cancel]]){
    const button=doc.createElement('button');button.type='button';button.textContent=text;listen(button,'click',fn);actions.append(button);
  }
  root.append(inheritedRow,currentRow,list,label,hint,notice,actions);
  listen(root,'keydown',event=>{
    if(destroyed||event.isComposing||event.keyCode===229||event.altKey||event.metaKey||event.getModifierState?.('AltGraph'))return;
    if(event.key==='Escape'&&!event.ctrlKey||event.ctrlKey&&!event.shiftKey&&event.key.toLowerCase()==='g'){event.preventDefault();event.stopPropagation();cancel();return;}
    if(event.ctrlKey)return;
    if(event.target===input){
      if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();event.stopPropagation();if(!event.repeat)add();}
      if(event.key==='Tab'&&!event.shiftKey){
        event.preventDefault();event.stopPropagation();const parts=input.value.split(','),query=parts.at(-1).trim(),matches=[...options.keys()].filter(name=>name.startsWith(query));
        if(matches.length){let common=Array.from(matches[0]);for(const name of matches.slice(1)){const chars=Array.from(name);let i=0;while(i<common.length&&common[i]===chars[i])i++;common=common.slice(0,i);}parts[parts.length-1]=common.join('');input.value=parts.join(',');}
        notice.textContent=matches.length?'Vervollständigt; Enter fügt hinzu und kehrt zur Auswahl zurück.':'Kein passender vorhandener Tag; freier Tag ist erlaubt.';
      }
      return;
    }
    if(event.shiftKey||event.target!==root&&!rows.includes(event.target))return;
    if(event.key==='Tab'){event.preventDefault();event.stopPropagation();freeInput();return;}
    if(event.key==='Enter'){event.preventDefault();event.stopPropagation();if(!event.repeat)commit([...selected]);return;}
    if(event.key==='ArrowUp'||event.key==='ArrowDown'){
      event.preventDefault();event.stopPropagation();if(rows.length){index=(index+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length;render();revealPanelRow(list,rows[index]);}return;
    }
    if(event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();const entry=[...options.values()][index];if(entry&&!event.repeat)toggle(entry.name);return;}
    if(event.key===' '){event.preventDefault();event.stopPropagation();if(!event.repeat){selected.clear();render();}return;}
    const choice=[...options.values()].find(e=>e.key===event.key.toLowerCase());
    if(choice){event.preventDefault();event.stopPropagation();if(!event.repeat)toggle(choice.name);}
  });
  render();return {root,focus:()=>root.focus({preventScroll:true}),destroy(){destroyed=true;for(const dispose of [...rowDisposers.splice(0),...disposers.splice(0)])dispose();options.clear();selected.clear();root.remove();}};
}

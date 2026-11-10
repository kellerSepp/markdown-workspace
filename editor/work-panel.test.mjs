import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {createWorkPanel,ringPreview,completeRingSearch} from './work-panel.mjs';
import {createEmacsEditing,emacsMark} from './emacs-editing.mjs';
import {createKillRing} from './kill-ring.mjs';
import {createClipboardAdapter} from './clipboard-adapter.mjs';
import {THEMES} from './themes.mjs';
import {createPrefixRouter} from './prefix-router.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {todoRules,createTodoController} from './todo.mjs';
import {markdown} from '@codemirror/lang-markdown';
import {createPlanningController} from './planning.mjs';
const pluginFacet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
class Element{
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.value='';this.scrollTop=0;this.scrollLeft=0;this.clientHeight=90;this.offsetHeight=30;this.classList={toggle:()=>{}};}
  get offsetTop(){return Math.max(0,this.parent?.children.indexOf(this)??0)*30;}get scrollHeight(){return this.children.length*30;}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(key,value){this.attributes[key]=value;}removeAttribute(key){delete this.attributes[key];}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}removeEventListener(type,fn){this.listeners[type]=this.listeners[type]?.filter(x=>x!==fn);}
  emit(type,values={}){const event={key:'',target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...values};for(const fn of this.listeners[type]??[])fn(event);return event;}
  focus(options){this.focusOptions=options;this.ownerDocument.activeElement=this;this.ownerDocument.onFocus?.(this);}click(){this.emit('click');}scrollIntoView(){assert.fail('Panel must not scroll ancestor chain');}remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
}
function fixture({selection={anchor:1,head:0},extra=[],docText='AB'}={}){
  const doc={createElement(tag){return new Element(tag,this);},defaultView:{scrollX:40,scrollY:500,scrollTo({left,top}){this.scrollX=left;this.scrollY=top;}}},host=new Element('host',doc),editor=new Element('editor',doc),ring=createKillRing(),notices=[],context={busy:false,hasDocument:true};
  let state,panel;const controller=createEmacsEditing({ring,clipboard:createClipboardAdapter({clipboard:()=>null}),getContext:()=>context,notify:s=>notices.push(s),openChooser:()=>panel.openRing()});
  const view={hasFocus:true,scrollDOM:{scrollTop:2400,scrollLeft:130,scrollHeight:10000,clientHeight:600,scrollWidth:3000,clientWidth:700},get state(){return state;},focus(){this.hasFocus=true;doc.activeElement=editor;}};
  view.dispatch=spec=>{const tr=spec.startState?spec:state.update(spec);state=tr.state;for(const fn of state.facet(EditorView.updateListener))fn({state,docChanged:tr.docChanged,selectionSet:!!tr.selection,transactions:[tr]});};
  state=EditorState.create({doc:docText,selection,extensions:[history(),controller.extension(id=>controller.run(view,id.replace('edit.emacs-',''))),extra]});
  doc.onFocus=element=>{if(element!==editor&&view.hasFocus){view.hasFocus=false;for(const {plugin} of state.facet(pluginFacet))plugin.domEventHandlers?.blur?.call({}, {},view);}};
  panel=createWorkPanel({host,view,ring,getContext:()=>context,insert:(id,target)=>controller.insertRingEntry(view,id,target),notify:s=>notices.push(s),document:doc});
  const root=host.children[0],search=root.children[1],results=root.children[3],message=root.children[4],close=root.children[0].children[1];
  return {doc,view,controller,ring,panel,host,root,search,results,message,close,notices,context};
}

test('Planning form reuses shared panel with calendar, preview, apply/remove/abort and stale protection',()=>{
 const f=fixture({selection:{anchor:3},docText:'# H\nBody',extra:[markdown(),todoRules]});
 const controller=createPlanningController({view:f.view,panel:f.panel,getContext:()=>f.context});
 const walk=(el,predicate)=>{if(predicate(el))return el;for(const child of el.children){const found=walk(child,predicate);if(found)return found;}};
 const get=text=>walk(f.root,e=>e.textContent===text);
 assert.ok(controller.open('SCHEDULED'));let form=f.root.children.at(-1),date=walk(form,e=>e.attributes?.['aria-label']==='Datum (YYYY-MM-DD)');date.value='2026-11-07';date.emit('input');assert.ok(get('SCHEDULED: <2026-11-07 Sa>'));
 assert.ok(get('Nächster Monat'));get('Nächster Monat').click();assert.ok(get('Dezember 2026'));
 form.emit('keydown',{key:'Enter',target:date});assert.equal(f.view.state.doc.toString(),'# H\nSCHEDULED: <2026-11-07 Sa>\nBody');assert.equal(f.panel.isOpen,false);
 controller.open('DEADLINE');form=f.root.children.at(-1);const state=f.view.state;form.emit('keydown',{key:'Escape'});assert.equal(f.panel.isOpen,false);assert.equal(f.view.state,state);
 controller.open('SCHEDULED');get('Entfernen').click();assert.equal(f.view.state.doc.toString(),'# H\nBody');
 controller.open('SCHEDULED');form=f.root.children.at(-1);const stale=walk(form,e=>/^\d{4}-\d{2}-\d{2}$/.test(e.attributes?.['aria-label']??''));f.view.dispatch({selection:{anchor:1}});stale.click();assert.equal(f.view.state.doc.toString(),'# H\nBody');f.panel.close();
 for(let n=0;n<50;n++){controller.open('SCHEDULED');f.panel.close();}f.panel.destroy();
});

test('Planning unmodified s/d follow sequences dispatch Registry/controller once after Ctrl release',()=>{
 const f=fixture({selection:{anchor:2},docText:'# Task',extra:[markdown(),todoRules]});const planning=createPlanningController({view:f.view,panel:f.panel,getContext:()=>f.context});
 const registry=createCommandRegistry(commandDefinitions({'planning.scheduled':()=>planning.open('SCHEDULED'),'planning.deadline':()=>planning.open('DEADLINE')}),()=>({state:f.view.state,hasDocument:true}));
 const router=createPrefixRouter({registry,getContext:()=>f.context,showHelp:(...o)=>f.panel.showPrefix(...o),hideHelp:()=>f.panel.close({restore:false})});
 for(const key of ['s','d']){f.view.focus();const send=(key,patch={})=>{const event={key,ctrlKey:true,preventDefault(){this.prevented=true;},...patch};router.keyDown(event,f.view);return event;};send('c');router.keyUp({key:'c'});assert.equal(send(key,{ctrlKey:false}).prevented,true);assert.equal(f.root.attributes['data-planning'],'');assert.equal(undoDepth(f.view.state),0);f.panel.close();}
 f.panel.destroy();
});

test('Planning panel abort includes shared close header, form inputs and calendar with modifier/IME guards',()=>{
 const f=fixture({selection:{anchor:2},docText:'# H\nBody',extra:[markdown(),todoRules]});const controller=createPlanningController({view:f.view,panel:f.panel,getContext:()=>f.context});
 for(const targetKind of ['close','input','day'])for(const key of ['Escape','g']){
  controller.open('SCHEDULED');const form=f.root.children.at(-1),strip=form.children.find(e=>e.className==='planning-months'),grid=strip.children.find(e=>e.children.length)?.children[1];const target=targetKind==='close'?f.close:targetKind==='input'?form.children.find(e=>e.tagName==='label').children[0]:grid.children.find(e=>e.tagName==='button');
  const before=f.view.state;target.focus();f.root.emit('keydown',{target,key,ctrlKey:key==='g'});assert.equal(f.panel.isOpen,false);assert.equal(f.view.state,before);assert.equal(f.view.hasFocus,true);
 }
 for(const patch of [{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true},{ctrlKey:true}]){
  controller.open('SCHEDULED');f.root.emit('keydown',{target:f.close,key:'Escape',...patch});assert.equal(f.panel.isOpen,true);f.panel.close();
 }
 f.panel.destroy();
});

test('Compact three-month calendar has one day tabstop, month boundaries, draft preservation and day keyboard guards',()=>{
 const f=fixture({selection:{anchor:2},docText:'# H\nSCHEDULED: <2026-11-07 Sa 15:00-17:00>',extra:[markdown(),todoRules]});const controller=createPlanningController({view:f.view,panel:f.panel,getContext:()=>f.context});
 const walk=(el,fn)=>[...(fn(el)?[el]:[]),...el.children.flatMap(c=>walk(c,fn))];
 controller.open('SCHEDULED');const form=f.root.children.at(-1),days=()=>walk(form,e=>/^\d{4}-\d{2}-\d{2}$/.test(e.attributes?.['aria-label']??'')),labels=()=>walk(form,e=>e.className==='planning-calendar-month').map(e=>e.children[0]?.textContent);
 assert.deepEqual(labels(),['Oktober 2026','November 2026','Dezember 2026']);assert.equal(days().filter(e=>e.tabIndex===0).length,1);
 const date=walk(form,e=>e.attributes?.['aria-label']==='Datum (YYYY-MM-DD)')[0];const next=walk(form,e=>e.textContent==='Nächster Monat')[0];next.click();assert.equal(date.value,'2026-11-07');assert.deepEqual(labels(),['November 2026','Dezember 2026','Januar 2027']);assert.equal(days().filter(e=>e.tabIndex===0).length,1);
 let selected=days().find(e=>e.attributes['aria-label']==='2026-11-07');selected.emit('keydown',{key:'ArrowRight',ctrlKey:true});assert.equal(date.value,'2026-11-07');selected.emit('keydown',{key:'ArrowRight'});assert.equal(date.value,'2026-11-08');assert.equal(days().filter(e=>e.tabIndex===0).length,1);
 for(const edge of ['0001-01-01','9999-12-31']){date.value=edge;date.emit('input');assert.equal(walk(form,e=>e.className==='planning-calendar-month').filter(e=>e.children.length).length,2);assert.equal(days().filter(e=>e.tabIndex===0).length,1);}
 f.panel.close();f.panel.destroy();
});

test('Day activation immediately commits once, closes shared panel and preserves old times with atomic history',()=>{
 const walk=(el,fn)=>[...(fn(el)?[el]:[]),...el.children.flatMap(c=>walk(c,fn))];
 for(const time of ['',' 15:00',' 15:00-17:00'])for(const activation of ['click','Enter',' ']){
  const original='# H\nSCHEDULED: <2026-11-07 Sa'+time+'>\nBody',f=fixture({selection:{anchor:2},docText:original,extra:[markdown(),todoRules,EditorView.updateListener.of(()=>f.panel.invalidateStale())]});const controller=createPlanningController({view:f.view,panel:f.panel,getContext:()=>f.context});
  controller.open('SCHEDULED');const form=f.root.children.at(-1),day=walk(form,e=>e.attributes?.['aria-label']==='2026-11-09')[0];assert.equal(walk(form,e=>e.tagName==='input').length,2);assert.equal(walk(form,e=>e.textContent==='Übernehmen').length,0);
  const before=f.view.state;day.emit('keydown',{key:'ArrowRight',ctrlKey:true});assert.equal(f.view.state,before);day.emit('keydown',{key:'Enter',repeat:true});assert.equal(f.view.state,before);
  if(activation==='click')day.click();else day.emit('keydown',{key:activation});assert.equal(f.panel.isOpen,false);assert.equal(f.view.hasFocus,true);assert.equal(f.view.state.doc.toString(),original.replace('11-07 Sa','11-09 Mo'));assert.equal(undoDepth(f.view.state),1);
  day.click();assert.equal(undoDepth(f.view.state),1);assert.ok(undo(f.view));assert.equal(f.view.state.doc.toString(),original);assert.ok(redo(f.view));assert.equal(f.view.state.doc.toString(),original.replace('11-07 Sa','11-09 Mo'));f.panel.destroy();
 }
 const f=fixture({selection:{anchor:2},docText:'# H',extra:[markdown(),todoRules]});const c=createPlanningController({view:f.view,panel:f.panel,getContext:()=>f.context});c.open('DEADLINE');let form=f.root.children.at(-1);const input=walk(form,e=>e.tagName==='input')[0],initial=f.view.state;input.value='2026-11-09';input.emit('input');assert.equal(f.view.state,initial);form.emit('keydown',{key:'Enter',target:input});assert.equal(f.view.state.doc.toString(),'# H\nDEADLINE: <2026-11-09 Mo>');assert.equal(f.panel.isOpen,false);f.panel.destroy();
});

test('Calendar direct day preserves stored repeater; explicit edit/remove preserves time and is one undo step',()=>{
 const walk=(el,fn)=>[...(fn(el)?[el]:[]),...el.children.flatMap(c=>walk(c,fn))];
 const original='# TODO Own\nSCHEDULED: <2026-11-07 Sa 15:00-17:00 ++2w>\nBody';
 for(const operation of ['day','edit','remove','invalid','abort']){
  const f=fixture({selection:{anchor:2},docText:original,extra:[markdown(),todoRules]});const controller=createPlanningController({view:f.view,panel:f.panel,getContext:()=>f.context});controller.open('SCHEDULED');
  const form=f.root.children.at(-1),repeat=walk(form,e=>e.attributes?.['aria-label']==='Wiederholung (+1w / ++1m / .+1d)')[0];assert.equal(repeat.value,'++2w');repeat.value=operation==='invalid'?'+0d':'.+1m';repeat.emit('input');assert.equal(f.view.state.doc.toString(),original);
  if(operation==='day')walk(form,e=>e.attributes?.['aria-label']==='2026-11-09')[0].click();
  if(operation==='edit'||operation==='invalid')walk(form,e=>e.textContent==='Wiederholung setzen')[0].click();
  if(operation==='remove')walk(form,e=>e.textContent==='Wiederholung entfernen')[0].click();
  if(operation==='abort')walk(form,e=>e.textContent==='Abbrechen')[0].click();
  const expected=operation==='day'?original.replace('11-07 Sa','11-09 Mo'):operation==='edit'?original.replace('++2w','.+1m'):operation==='remove'?original.replace(' ++2w',''):original;
  assert.equal(f.view.state.doc.toString(),expected);assert.equal(f.panel.isOpen,operation==='invalid');
  if(expected!==original){assert.equal(undoDepth(f.view.state),1);assert.ok(undo(f.view));assert.equal(f.view.state.doc.toString(),original);}
  f.panel.destroy();
 }
});

test('Prefix help reuses split layout, keeps focus/state/viewport and cleans rows on cancellation or ring switch',()=>{
  const f=fixture(),state=f.view.state,scroll={top:f.view.scrollDOM.scrollTop,left:f.view.scrollDOM.scrollLeft};
  let cancelled=0,chosen='';
  const choices=[{key:'1',name:'Collapse',enabled:true},{key:'2',name:'Next',enabled:false,reason:'Blocked'},{key:'3',name:'Open',enabled:true}];
  f.panel.showPrefix(choices,key=>chosen=key,()=>cancelled++);
  assert.equal(f.view.hasFocus,true);assert.equal(f.search.hidden,true);assert.equal(f.results.children.length,3);
  assert.match(f.results.children[1].textContent,/Blocked/);assert.equal(f.results.children[1].disabled,true);
  assert.equal(f.root.emit('mousedown').defaultPrevented,true);f.results.children[2].click();assert.equal(chosen,'3');
  f.ring.add('background ring change');assert.equal(f.results.children.length,3);
  assert.equal(f.view.state,state);assert.equal(f.view.scrollDOM.scrollTop,scroll.top);assert.equal(f.view.scrollDOM.scrollLeft,scroll.left);
  const rows=[...f.results.children];f.close.click();assert.equal(cancelled,1);assert.equal(f.panel.isOpen,false);
  assert.equal(f.results.children.length,0);for(const row of rows)assert.equal(row.listeners.click.length,0);
  assert.equal(f.root.attributes['data-prefix-help'],undefined);assert.equal(f.view.state,state);
  f.panel.showPrefix(choices,()=>{},()=>cancelled++);f.panel.openRing();assert.equal(cancelled,2);assert.equal(f.search.hidden,false);assert.match(f.results.children[0].textContent,/background ring/);
});

test('Prefix router and shared panel lifecycle preserve reverse selection/history through mouse dispatch and 100 cancellations',()=>{
  const f=fixture(),calls=[];
  const registry=createCommandRegistry(commandDefinitions({'fold.open':()=>calls.push('open')}),()=>({state:f.view.state,busy:false,hasDocument:true}));
  // Use synthetic available commands so the fixture's plain text has help rows.
  const bridge={get:id=>registry.get(id),availability:()=>({enabled:true,reason:''}),execute:id=>{calls.push(id);return true;}};
  const router=createPrefixRouter({registry:bridge,getContext:()=>f.context,showHelp:(...args)=>f.panel.showPrefix(...args),hideHelp:()=>f.panel.close({restore:false})});
  const state=f.view.state;
  const start=()=>router.keyDown({key:'c',ctrlKey:true,preventDefault(){}},f.view);
  for(let n=0;n<100;n++){start();assert.equal(router.active,true);f.close.click();assert.equal(router.active,false);assert.equal(f.results.children.length,0);}
  start();router.keyUp({key:'c'});f.results.children[2].click();assert.deepEqual(calls,['fold.open']);assert.equal(router.active,false);assert.equal(f.panel.isOpen,false);
  assert.equal(f.view.state,state);assert.equal(f.view.state.selection.main.anchor,1);assert.equal(f.view.state.selection.main.head,0);assert.equal(undoDepth(f.view.state),0);
  f.panel.destroy();router.cancel();
});

test('Public refresh preserves active prefix rows/listeners/router and viewport, then still refreshes ring mode',()=>{
  const f=fixture(),calls=[],state=f.view.state;
  f.ring.add('RING');
  const router=createPrefixRouter({registry:{get:id=>({name:id}),availability:()=>({enabled:true}),execute:id=>calls.push(id)},
    getContext:()=>f.context,showHelp:(...args)=>f.panel.showPrefix(...args),hideHelp:()=>f.panel.close({restore:false})});
  router.keyDown({key:'c',ctrlKey:true,preventDefault(){}},f.view);
  const rows=[...f.results.children],text=rows.map(row=>row.textContent),hint=f.root.children[2].textContent;
  for(let i=0;i<3;i++)f.panel.refresh();
  assert.equal(router.active,true);assert.deepEqual(f.results.children,rows);assert.deepEqual(rows.map(row=>row.textContent),text);
  assert.equal(f.root.children[2].textContent,hint);assert.match(hint,/C und Strg loslassen/);assert.match(hint,/1 \/ 2 \/ 3 \/ w/);assert.doesNotMatch(hint,/C-w/);assert.match(hint,/Alt\+W kopiert/);assert.match(rows[3].textContent,/w/);assert.equal(f.search.hidden,true);assert.equal(f.root.attributes['data-prefix-help'],'');
  assert.equal(f.message.textContent,'');assert.ok(rows.every(row=>row.listeners.click.length===1));
  assert.equal(f.view.state,state);assert.equal(undoDepth(state),0);assert.equal(f.view.hasFocus,true);
  assert.equal(f.view.scrollDOM.scrollTop,2400);assert.equal(f.view.scrollDOM.scrollLeft,130);
  assert.equal(f.doc.defaultView.scrollX,40);assert.equal(f.doc.defaultView.scrollY,500);
  router.keyUp({key:'c'});rows[2].click();assert.deepEqual(calls,['fold.open']);assert.equal(router.active,false);assert.equal(f.panel.isOpen,false);
  assert.ok(rows.every(row=>row.listeners.click.length===0));
  f.panel.refresh();assert.equal(f.results.children.length,0);
  f.panel.openRing();const old=f.results.children[0];f.panel.refresh();assert.match(f.results.children[0].textContent,/RING/);
  assert.notEqual(f.results.children[0],old);assert.equal(old.listeners.click.length,0);
  f.panel.destroy();f.panel.refresh();assert.equal(f.results.children.length,0);
});

test('Gamebook assigns approved prefix shortcuts to folding commands only, never vault selection',async()=>{
  const book=await readFile(new URL('../docs/COMMAND_GAMEBOOK.md',import.meta.url),'utf8');
  const shortcut=id=>book.split('\n').find(line=>line.startsWith('| `'+id+'` |')).split('|')[7].trim();
  for(const [id,key] of [['fold.collapse','1'],['fold.reveal','2'],['fold.open','3']])assert.ok(shortcut(id).includes('C-c '+key),id);
  assert.equal(shortcut('workspace.choose'),'offen');assert.equal(shortcut('structure.refile-h1'),'C-c w (Editor)');
});

test('Ring panel opens after intentional mark blur without invalidating its own target; reverse selection is preserved until insertion',()=>{
  const f=fixture({selection:{anchor:1}});f.ring.add('chosen');f.controller.run(f.view,'mark');f.view.dispatch({selection:{anchor:1,head:0}});
  const before=f.view.state.doc.toString();assert.equal(f.controller.run(f.view,'yank-pop'),true);assert.equal(f.panel.isOpen,true);assert.equal(f.view.state.field(emacsMark).active,false);
  assert.equal(f.view.state.selection.main.anchor,1);assert.equal(f.view.state.selection.main.head,0);assert.equal(f.view.state.doc.toString(),before);assert.equal(undoDepth(f.view.state),0);
  f.results.children[0].click();assert.equal(f.view.state.doc.toString(),'chosenAB');assert.equal(f.panel.isOpen,false);assert.equal(f.view.hasFocus,true);assert.equal(undoDepth(f.view.state),1);
  undo(f.view);assert.equal(f.view.state.doc.toString(),'AB');assert.equal(f.view.state.selection.main.anchor,1);assert.equal(f.view.state.selection.main.head,0);redo(f.view);assert.equal(f.view.state.doc.toString(),'chosenAB');
});
test('Panel search, arrow selection, literal preview, empty results and mouse selection do not mutate history',()=>{
  const f=fixture();f.ring.add('<script>literal</script>');f.ring.add('second');f.controller.run(f.view,'show-ring');
  assert.equal(f.results.children[1].textContent.includes('<script>'),true);assert.equal(f.results.children[1].innerHTML,undefined);
  f.root.emit('keydown',{key:'ArrowDown',target:f.search});assert.equal(f.results.children[1].attributes['aria-selected'],'true');
  const before=f.view.state;f.search.value='no match';f.search.emit('input');assert.equal(f.results.children[0].textContent,'Keine passenden Einträge.');
  assert.equal(f.view.state,before);f.search.value='second';f.search.emit('input');assert.equal(f.results.children.length,1);
  f.root.emit('keydown',{key:'Enter',target:f.search});assert.equal(f.view.state.doc.toString(),'secondAB');
});
test('Escape, C-g and close button return focus without edits; IME/AltGr do not become panel commands',()=>{
  for(const mode of ['Escape','C-g','button']){const f=fixture();f.ring.add('A');f.controller.run(f.view,'show-ring');
    if(mode==='button')f.close.click();else f.root.emit('keydown',{key:mode==='C-g'?'g':mode,ctrlKey:mode==='C-g',target:f.search});
    assert.equal(f.panel.isOpen,false);assert.equal(f.view.hasFocus,true);assert.equal(f.view.state.doc.toString(),'AB');assert.equal(undoDepth(f.view.state),0);
  }
  const f=fixture();f.controller.run(f.view,'show-ring');assert.equal(f.root.emit('keydown',{key:'Enter',isComposing:true}).defaultPrevented,undefined);
  assert.equal(f.root.emit('keydown',{key:'g',ctrlKey:true,getModifierState:()=>true}).defaultPrevented,undefined);assert.equal(f.panel.isOpen,true);
});
test('Panel refuses stale targets after selection/document/busy/file/undo and never steals editor focus on failure',()=>{
  for(const kind of ['selection','document','busy','file','undo']){
    const f=fixture();f.ring.add('incoming');f.controller.run(f.view,'show-ring');
    if(kind==='selection')f.view.dispatch({selection:{anchor:1}});
    if(kind==='document'||kind==='undo')f.view.dispatch({changes:{from:0,insert:'X'}});
    if(kind==='undo')undo(f.view);
    if(kind==='busy')f.context.busy=true;
    if(kind==='file')f.view.dispatch({changes:{from:0,to:2,insert:'ZZ'},selection:{anchor:0}});
    const expected=f.view.state.doc.toString();f.results.children[0].click();assert.equal(f.view.state.doc.toString(),expected,kind);assert.equal(f.view.hasFocus,false,kind);assert.match(f.message.textContent,/Ziel hat sich geändert/,kind);
  }
});
test('Ring clear updates panel, removed rows have no listeners, destroy unsubscribes and removes shell listeners',()=>{
  const f=fixture();f.ring.add('one');f.controller.run(f.view,'show-ring');const old=f.results.children[0];f.ring.clear();assert.equal(f.results.children[0].textContent,'Kill-Ring ist leer.');assert.equal(old.listeners.click.length,0);
  f.ring.add('two');const last=f.results.children[0];f.panel.destroy();f.panel.destroy();assert.equal(f.host.children.length,0);assert.equal(last.listeners.click.length,0);assert.equal(f.root.listeners.keydown.length,0);assert.equal(f.search.listeners.input.length,0);
  f.ring.add('three');assert.equal(f.results.children.length,0);assert.equal(f.panel.openRing(),false);
});
test('Preview normalizes all newline forms visually and protects surrogate boundary; CSS uses existing tokens in all themes',async()=>{
  assert.equal(ringPreview('A\r\nB\rC\nD'),'A ↵ B ↵ C ↵ D');assert.equal(ringPreview('A😀B',2),'A …');
  const css=await readFile(new URL('./styles.css',import.meta.url),'utf8'),panelCss=css.slice(css.indexOf('.work-panel{'));
  for(const theme of THEMES)for(const token of ['surface','text','border','control','focus','hover'])assert.ok(theme.tokens[token],theme.id+' '+token);
  assert.match(panelCss,/grid-template-rows:auto auto auto minmax\(0,1fr\) auto/);assert.match(panelCss,/position:relative;min-height:0;overflow:auto/);assert.doesNotMatch(panelCss,/#[0-9a-f]{3,8}\b/i);
});
test('Panel insertion honors rejected transactions and CRLF/CR normalized ranges',()=>{
  for(const newline of ['\r\n','\r','\n']){const f=fixture();f.ring.add('X'+newline+'Y');f.controller.run(f.view,'show-ring');f.results.children[0].click();assert.equal(f.view.state.doc.toString(),'X\nYAB');assert.equal(f.view.state.selection.main.head,3);undo(f.view);assert.equal(f.view.state.doc.toString(),'AB');redo(f.view);assert.equal(f.view.state.doc.toString(),'X\nYAB');}
  const f=fixture({extra:EditorState.transactionFilter.of(tr=>tr.docChanged?[]:tr)});f.ring.add('no');f.controller.run(f.view,'show-ring');f.results.children[0].click();assert.equal(f.view.state.doc.toString(),'AB');assert.equal(f.view.hasFocus,false);assert.match(f.message.textContent,/verworfen/);
});

test('Closed panel drops previews, row listeners, search and active descendant before hidden ring/vault clears',()=>{
  const f=fixture();f.ring.add('STALE VAULT SECRET');f.controller.run(f.view,'show-ring');
  f.search.value='STALE';f.search.emit('input');const old=f.results.children[0];assert.match(old.textContent,/STALE VAULT SECRET/);assert.equal(old.listeners.click.length,1);
  f.panel.close();assert.equal(f.panel.isOpen,false);assert.equal(f.ring.size,1);assert.equal(f.results.children.length,0);assert.equal(f.search.value,'');assert.equal(f.message.textContent,'');assert.equal(f.search.attributes['aria-activedescendant'],undefined);assert.equal(old.textContent,'');assert.equal(old.listeners.click.length,0);assert.equal(old.listeners.mouseenter.length,0);
  f.controller.invalidate({clearRing:true});assert.equal(f.ring.size,0);assert.equal(f.results.children.length,0);assert.equal(f.message.textContent,'');
  f.ring.add('NEW VAULT');assert.equal(f.results.children.length,0);assert.equal(f.search.value,'');f.ring.clear();assert.equal(f.results.children.length,0);
  f.controller.run(f.view,'show-ring');assert.equal(f.results.children[0].textContent,'Kill-Ring ist leer.');
});
test('Repeated open/filter/close/hidden-clear cycles leave no preview closures or handlers in retained old rows',()=>{
  const f=fixture();const oldRows=[];
  for(let n=0;n<50;n++){
    f.ring.add('synthetic vault '+n);f.controller.run(f.view,'show-ring');f.search.value='vault';f.search.emit('input');oldRows.push(f.results.children[0]);f.panel.close();f.controller.invalidate({clearRing:true});
    assert.equal(f.results.children.length,0);assert.equal(f.search.value,'');assert.equal(f.message.textContent,'');assert.equal(f.search.attributes['aria-activedescendant'],undefined);
  }
  f.panel.destroy();for(const row of oldRows){assert.equal(row.textContent,'');assert.equal(row.listeners.click.length,0);assert.equal(row.listeners.mouseenter.length,0);}
  f.ring.add('after destruction');assert.equal(f.results.children.length,0);assert.equal(f.root.listeners.keydown.length,0);
});

test('Tab completion uses case-insensitive line prefixes, unique text or longest safe common prefix; substring hits remain untouched',()=>{
  const entries=texts=>texts.map(text=>({text}));
  assert.equal(completeRingSearch('ro',entries(['ROT'])).value,'ROT');
  assert.equal(completeRingSearch('gr',entries(['GRUEN','gruenlich'])).value,'GRUEN');
  assert.equal(completeRingSearch('gruen',entries(['GRUEN','gruenlich'])).value,'gruen');
  assert.equal(completeRingSearch('ott',entries(['Rotten'])).value,'ott');assert.match(completeRingSearch('ott',entries(['Rotten'])).message,/Teilworttreffer/);
  assert.equal(completeRingSearch('missing',entries(['ROT'])).value,'missing');
  assert.equal(completeRingSearch('ro',entries(['first line\r\nROT\rBLAU\nlast'])).value,'ROT');
  assert.equal(completeRingSearch('ä',entries(['Äpfel','äPFEL'])).value,'Äpfel');
  assert.equal(completeRingSearch('😀',entries(['😀eins','😀zwei'])).value,'😀');
});
test('Completion caps huge single lines and Unicode character boundaries without truncating ring text',()=>{
  const text='A'.repeat(8*1024*1024);const long=completeRingSearch('A',[{text}]);assert.equal(long.value,'A');assert.match(long.message,/zu lang/);assert.equal(text.length,8*1024*1024);
  const exact='😀'.repeat(256),over=exact+'😀';assert.equal(completeRingSearch('😀',[{text:exact}]).value,exact);assert.equal(completeRingSearch('😀',[{text:over}]).value,'😀');
  assert.equal(completeRingSearch('😀',[{text:over+'A'},{text:over+'B'}]).value,'😀');
  assert.equal(completeRingSearch('Ä',[{text:'Äpfel'}],3).value,'Ä');
});
test('Panel Tab completes search only, Shift-Tab exits normally, Meta arrows stay local and guarded; page/editor viewport stays fixed',()=>{
  const f=fixture();for(const text of ['ROT','GRUEN','GRUENLICH','BLAU','ORANGE','VIOLETT'])f.ring.add(text);
  const state=f.view.state;f.controller.run(f.view,'show-ring');assert.deepEqual(f.search.focusOptions,{preventScroll:true});
  f.search.value='gr';f.search.emit('input');const completed=f.root.emit('keydown',{key:'Tab',target:f.search});assert.equal(completed.defaultPrevented,true);assert.equal(f.search.value,'GRUEN');assert.equal(f.view.state,state);
  assert.equal(f.root.emit('keydown',{key:'Tab',target:f.search,shiftKey:true}).defaultPrevented,undefined);assert.equal(f.root.emit('keydown',{key:'Tab',target:f.close}).defaultPrevented,undefined);
  for(const guard of [{isComposing:true},{keyCode:229},{getModifierState:()=>true},{ctrlKey:true},{metaKey:true}])assert.equal(f.root.emit('keydown',{key:'Tab',target:f.search,...guard}).defaultPrevented,undefined);
  f.search.value='';f.search.emit('input');for(let n=0;n<5;n++)assert.equal(f.root.emit('keydown',{key:'ArrowDown',target:f.search,altKey:true}).defaultPrevented,true);
  assert.equal(f.results.scrollTop,90);assert.equal(f.results.children[5].attributes['aria-selected'],'true');
  for(const guard of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{getModifierState:()=>true}])assert.equal(f.root.emit('keydown',{key:'ArrowUp',altKey:true,...guard}).defaultPrevented,undefined);
  assert.equal(f.view.scrollDOM.scrollTop,2400);assert.equal(f.view.scrollDOM.scrollLeft,130);assert.equal(f.doc.defaultView.scrollY,500);assert.equal(f.doc.defaultView.scrollX,40);assert.equal(f.view.state,state);assert.equal(undoDepth(f.view.state),0);
  f.panel.close();assert.equal(f.view.scrollDOM.scrollTop,2400);assert.equal(f.view.scrollDOM.scrollLeft,130);assert.equal(f.view.state,state);
});

test('Toolbar opening guards focus before layout capture with offscreen caret, preserving long-document selection and horizontal viewport',()=>{
  const docText=Array.from({length:200},(_,n)=>'Line '+n+' horizontal '.repeat(30)).join('\n'),f=fixture({docText,selection:{anchor:docText.length}});
  f.ring.add('candidate');const state=f.view.state,selection=state.selection;
  const focus=f.view.focus.bind(f.view);f.view.focus=()=>{focus();f.view.scrollDOM.scrollTop=0;f.view.scrollDOM.scrollLeft=0;f.doc.defaultView.scrollY=0;};
  f.panel.preserveViewport(()=>f.view.focus());f.controller.run(f.view,'show-ring');
  assert.equal(f.view.scrollDOM.scrollTop,2400);assert.equal(f.view.scrollDOM.scrollLeft,130);assert.equal(f.doc.defaultView.scrollY,500);assert.equal(f.view.state,state);assert.ok(f.view.state.selection.eq(selection));assert.equal(undoDepth(f.view.state),0);
  f.panel.close();assert.equal(f.view.scrollDOM.scrollTop,2400);assert.equal(f.view.scrollDOM.scrollLeft,130);assert.equal(f.doc.defaultView.scrollY,500);
});

test('Prefix uses ring selection/reveal for tiny result viewport, skips disabled rows and keeps editor unchanged',()=>{
  const f=fixture(),state=f.view.state,calls=[];f.results.clientHeight=30;
  const router=createPrefixRouter({registry:{get:id=>({name:id}),availability:id=>({enabled:['fold.collapse','fold.open'].includes(id),reason:'Blocked'}),execute:id=>{calls.push(id);return true;}},
    showHelp:(...args)=>f.panel.showPrefix(...args),hideHelp:()=>f.panel.close({restore:false}),moveHelp:d=>f.panel.moveSelection(d),activateHelp:()=>f.panel.activateSelection()});
  const down=(key,patch={})=>router.keyDown({type:'keydown',key,preventDefault(){},...patch},f.view);
  down('c',{ctrlKey:true});router.keyUp({key:'c'});down('Alt',{altKey:true,code:'AltLeft'});down('ArrowDown',{altKey:true,repeat:true});
  assert.equal(f.results.children[2].attributes['aria-selected'],'true');assert.equal(f.results.scrollTop,60);
  down('ArrowDown',{altKey:true});assert.equal(f.results.children[0].attributes['aria-selected'],'true');assert.equal(f.results.scrollTop,0);
  down('ArrowUp',{altKey:true});down('Enter',{repeat:true});assert.deepEqual(calls,[]);down('Enter');assert.deepEqual(calls,['fold.open']);
  assert.equal(f.view.state,state);assert.equal(undoDepth(state),0);assert.equal(f.view.hasFocus,true);
  assert.equal(f.view.scrollDOM.scrollTop,2400);assert.equal(f.view.scrollDOM.scrollLeft,130);assert.equal(f.doc.defaultView.scrollY,500);
  f.panel.showPrefix([{key:'1',name:'Blocked',enabled:false,reason:'No context'}],()=>assert.fail('disabled'),()=>{});
  assert.equal(f.panel.moveSelection(1),false);f.panel.activateSelection();f.panel.destroy();
});

test('Refile reuses panel search/completion/navigation, distinguishes duplicate H1, guards repeats, restores focus and drops rows',async()=>{
 const {createRefileController}=await import('./refile.mjs');const {markdown}=await import('@codemirror/lang-markdown');
 const text='# Source\nbody\n# Dup\none\n# Dup\ntwo',f=fixture({docText:text,selection:{anchor:3},extra:markdown()});
 const refile=createRefileController({view:f.view,panel:f.panel,getContext:()=>f.context,notify:m=>f.notices.push(m)}),before=f.view.state;
 assert.equal(refile.open(),true);assert.equal(f.view.state,before);assert.equal(undoDepth(f.view.state),0);assert.equal(f.view.scrollDOM.scrollTop,2400);
 assert.equal(f.results.attributes['aria-label'],'H1-Ziele dieser Datei');assert.match(f.results.children[0].textContent,/Zeile 3/);assert.match(f.results.children[1].textContent,/Zeile 5/);
 f.search.value='No match';f.search.emit('input');assert.equal(f.results.children[0].textContent,'Keine passenden H1-Ziele.');
 f.search.value='D';f.root.emit('keydown',{key:'Tab',target:f.search});assert.match(f.search.value,/^Dup/);assert.equal(f.view.state,before);
 f.search.value='';f.search.emit('input');f.root.emit('keydown',{key:'ArrowDown',target:f.search});assert.equal(f.results.children[1].attributes['aria-selected'],'true');
 f.root.emit('keydown',{key:'Enter',repeat:true,target:f.search});assert.equal(f.view.state,before);
 f.root.emit('keydown',{key:'Enter',target:f.search});assert.equal(f.panel.isOpen,false);assert.equal(f.results.children.length,0);assert.equal(undoDepth(f.view.state),1);
 assert.match(f.view.state.doc.toString(),/# Dup\ntwo\n\n## Source\nbody/);assert.equal(f.view.hasFocus,true);f.panel.destroy();
});

test('TODO shared panel fast keys, none/Space, navigation, stale cleanup and empty active mark preserve target and history',()=>{
 const original='# TODO Parent\n## TODO Child\n### DONE Grandchild',f=fixture({docText:original,selection:{anchor:23},extra:[markdown(),todoRules]});
 const todo=createTodoController({view:f.view,panel:f.panel,getContext:()=>f.context,notify:m=>f.notices.push(m)});
 f.controller.run(f.view,'mark');assert.equal(f.view.state.field(emacsMark).active,true);
 assert.equal(todo.open(),true);assert.equal(f.view.state.field(emacsMark).active,false);const before=f.view.state;
 assert.equal(f.panel.isOpen,true);assert.match(f.results.children[1].textContent,/aktuell/);assert.match(f.hint?.textContent??f.root.children[2].textContent,/Leertaste/);
 f.root.emit('keydown',{key:'d',repeat:true,target:f.search});assert.equal(f.view.state,before);
 f.root.emit('keydown',{key:'d',getModifierState:()=>true,target:f.search});assert.equal(f.view.state,before);
 f.root.emit('keydown',{key:'d',target:f.search});assert.equal(f.panel.isOpen,false);assert.equal(f.view.state.doc.toString(),'# TODO Parent\n## DONE Child\n### DONE Grandchild');assert.equal(undoDepth(f.view.state),1);
 assert.equal(f.view.scrollDOM.scrollTop,2400);assert.equal(f.view.scrollDOM.scrollLeft,130);assert.equal(f.doc.defaultView.scrollY,500);
 todo.open();f.root.emit('keydown',{key:' ',target:f.search});assert.equal(f.view.state.doc.toString(),'# TODO Parent\n## Child\n### DONE Grandchild');assert.equal(undoDepth(f.view.state),2);
 todo.open();f.root.emit('keydown',{key:'ArrowDown',target:f.search});f.root.emit('keydown',{key:'Enter',target:f.search});assert.equal(f.view.state.doc.toString(),original);assert.equal(undoDepth(f.view.state),3);
 for(let i=0;i<100;i++){todo.open();const rows=[...f.results.children];f.root.emit('keydown',{key:'Escape',target:f.search});assert.equal(f.panel.isOpen,false);for(const row of rows)assert.equal(row.listeners.click.length,0);}
 todo.open();f.view.dispatch({selection:{anchor:0}});f.panel.invalidateStale();assert.equal(f.panel.isOpen,false);f.panel.destroy();
});

test('TODO real Registry plus prefix router opens status panel and C-c C-c reloads only declaration',()=>{
 const text='#+SEQ_TODO: NEXT(n) | DONE(d)\n# NEXT Parent\n## DONE Child',f=fixture({docText:text,selection:{anchor:33},extra:[markdown(),todoRules]});
 const todo=createTodoController({view:f.view,panel:f.panel,getContext:()=>f.context});
 const registry=createCommandRegistry(commandDefinitions({'todo.status':()=>todo.open(),'todo.reload':()=>todo.reload(),'editor.confirm':()=>todo.reload()}),()=>({...f.context,state:f.view.state}));
 const prefix=createPrefixRouter({registry,showHelp:(...args)=>f.panel.showPrefix(...args),hideHelp:()=>f.panel.close({restore:false})});
 const down=(key,patch={})=>prefix.keyDown({key,preventDefault(){},...patch},f.view);
 down('c',{ctrlKey:true});prefix.keyUp({key:'c'});down('t');assert.equal(f.panel.isOpen,true);assert.match(f.results.children[1].textContent,/NEXT/);f.root.emit('keydown',{key:'d',target:f.search});assert.match(f.view.state.doc.toString(),/# DONE Parent\n## DONE Child/);
 f.view.dispatch({selection:{anchor:3}});f.view.dispatch({changes:{from:12,to:16,insert:'WAIT'}});assert.equal(f.view.state.field(todoRules).rules[0].name,'NEXT');
 down('c',{ctrlKey:true});prefix.keyUp({key:'c'});down('c',{ctrlKey:true});assert.equal(f.view.state.field(todoRules).rules[0].name,'WAIT');assert.equal(f.panel.isOpen,false);
 f.panel.destroy();
});

test('Refile clears empty active mark before intentional blur; cancel leaves text/selection/history intact and reopening can execute',async()=>{
 const {createRefileController}=await import('./refile.mjs');const {markdown}=await import('@codemirror/lang-markdown');
 const text='# Source\nbody\n# Target',f=fixture({docText:text,selection:{anchor:3},extra:markdown()});
 const refile=createRefileController({view:f.view,panel:f.panel,getContext:()=>f.context});
 f.controller.run(f.view,'mark');assert.equal(f.view.state.field(emacsMark).active,true);const selection=f.view.state.selection;
 assert.equal(refile.open(),true);assert.equal(f.view.state.field(emacsMark).active,false);assert.ok(f.view.state.selection.eq(selection));
 f.root.emit('keydown',{key:'Escape',target:f.search});assert.equal(f.view.state.doc.toString(),text);assert.equal(undoDepth(f.view.state),0);assert.equal(f.view.hasFocus,true);
 f.controller.run(f.view,'mark');refile.open();f.results.children[0].click();assert.equal(f.panel.isOpen,false);assert.equal(undoDepth(f.view.state),1);
});

test('Refile rejects stale changes and busy, cancels focus exit/composition and cleans rows across 100 cycles',async()=>{
 const {createRefileController}=await import('./refile.mjs');const {markdown}=await import('@codemirror/lang-markdown');
 const f=fixture({docText:'# Source\nbody\n# Target',selection:{anchor:3},extra:markdown()}),refile=createRefileController({view:f.view,panel:f.panel,getContext:()=>f.context});
 refile.open();f.view.dispatch({selection:{anchor:4}});f.results.children[0].click();assert.equal(undoDepth(f.view.state),0);f.panel.invalidateStale();assert.equal(f.panel.isOpen,false);
 refile.open();f.context.busy=true;f.results.children[0].click();assert.equal(undoDepth(f.view.state),0);f.context.busy=false;f.panel.close();
 for(let i=0;i<100;i++){refile.open();const rows=[...f.results.children];f.root.emit('focusout',{relatedTarget:null});assert.equal(f.panel.isOpen,false);assert.ok(rows.every(row=>row.listeners.click.length===0));}
 refile.open();f.root.emit('compositionstart');assert.equal(f.panel.isOpen,false);assert.equal(undoDepth(f.view.state),0);f.panel.destroy();
});

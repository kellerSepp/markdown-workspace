import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState,Compartment} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {todoRules} from './todo.mjs';
import {history,undoDepth} from '@codemirror/commands';
import {createAgendaView,AGENDA_CHOICES} from './agenda-view.mjs';
import {createAgendaIndex} from './agenda-index.mjs';
import {createAgendaSource} from './agenda-source.mjs';
import {createSession} from './storage-session.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {createCommandSurfaces} from './command-surfaces.mjs';

// Deterministic DOM model: behavior/focus contracts, not native layout evidence.
class Element{
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.listeners={};this.style={};this.dataset={};this.hidden=false;this.disabled=false;this.scrollTop=0;this.scrollHeight=1000;this.clientHeight=50;this.offsetHeight=20;this.offsetTop=0;const names=new Set();this.classList={add:n=>names.add(n),toggle(n,on){if(on)names.add(n);else names.delete(n);},contains:n=>names.has(n)};}
  get isConnected(){return this===this.ownerDocument.body||!!this.parent?.isConnected;}
  append(...children){for(const value of children){const child=typeof value==='string'?this.ownerDocument.createTextNode(value):value;child.parent=this;this.children.push(child);}}
  replaceChildren(...children){for(const child of this.children)child.parent=null;this.children=[];this._text='';this.append(...children);}
  set textContent(value){this.replaceChildren();this._text=value;}get textContent(){return (this._text??'')+this.children.map(c=>c.textContent).join('');}
  setAttribute(n,v){this.attributes[n]=String(v);}removeAttribute(n){delete this.attributes[n];}
  addEventListener(n,fn){(this.listeners[n]??=[]).push(fn);}removeEventListener(n,fn){this.listeners[n]=this.listeners[n]?.filter(x=>x!==fn);}
  emit(n,values={}){const e={target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...values};for(let el=this;el;el=el.parent){for(const fn of [...el.listeners[n]??[]])fn(e);if(e.stopped)break;}return e;}
  focus(){this.ownerDocument.activeElement=this;}click(){if(!this.disabled)this.emit('click');}
  showModal(){this.open=true;}close(){this.open=false;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}
  contains(el){return el===this||this.children.some(c=>c.contains(el));}scrollIntoView(){}
}
function dom(){const doc={createElement(tag){return new Element(tag,this);},createTextNode(text){const n=new Element('#text',this);n.textContent=text;return n;}};doc.body=doc.createElement('body');doc.defaultView=doc.createElement('window');doc.defaultView.innerWidth=1000;doc.defaultView.innerHeight=800;doc.listeners={};doc.addEventListener=Element.prototype.addEventListener;doc.removeEventListener=Element.prototype.removeEventListener;return doc;}
function all(root,fn){return [root,...root.children.flatMap(c=>all(c,fn))].filter(fn);}
const encoded=text=>new TextEncoder().encode(text);
function rootOf(entries){return {name:'synthetic',async queryPermission(){return 'granted';},async *entries(){for(const name of Object.keys(entries))yield [name,{kind:'file'}];},async getFileHandle(name){return {async getFile(){return {async arrayBuffer(){return encoded(entries[name]).buffer;}};}};}};}
async function fixture(extra={}){
  const doc=dom(),origin=doc.createElement('div');doc.body.append(origin);origin.focus();const entries={'a.md':'# TODO Open\nSCHEDULED: <2026-11-08 So 09:00-10:00> DEADLINE: <2026-11-08 So 11:00>\n# DONE Closed\n# Other\nSCHEDULED: <2026-11-08 So 14:00>'},index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(rootOf(entries));
  const commands=[],navigation=[],notices=[];let controller;
  controller=createAgendaView({index,document:doc,now:()=>new Date(2026,10,8,12),execute:id=>{commands.push(id);if(id==='agenda.week')return controller.openWeek();if(id==='agenda.todo')return controller.openTodos();if(id==='agenda.status')return controller.openStatus();if(id==='agenda.refresh')return index.rebuild();},navigate:async id=>{navigation.push(id);return false;},onClose:()=>origin.focus(),...extra});
  return {doc,origin,index,controller,commands,navigation,notices,rows:()=>all(controller.element,e=>e.className==='agenda-row'),results:()=>all(controller.element,e=>e.className==='agenda-results')[0],buttons:()=>all(controller.element,e=>e.tagName==='button'),key:(key,patch={})=>doc.activeElement.emit('keydown',{key,...patch})};
}
test('Agenda dispatcher two active choices and disabled plans use plain keys/mouse, modifier and IME guards',async()=>{
  const f=await fixture();f.controller.openDispatcher();assert.equal(f.controller.element.open,true);assert.equal(f.controller.element.attributes['data-mode'],'dispatch');
  assert.equal(AGENDA_CHOICES.filter(c=>!c.disabled).length,2);const match=f.buttons().find(b=>b.textContent.includes('[m]'));assert.equal(match.disabled,true);match.click();f.key('m');assert.deepEqual(f.commands,[]);
  for(const patch of [{ctrlKey:true},{altKey:true},{shiftKey:true},{metaKey:true},{isComposing:true},{keyCode:229},{repeat:true},{getModifierState:()=>true}])f.key('a',patch);
  assert.deepEqual(f.commands,[]);f.key('a');assert.deepEqual(f.commands,['agenda.week']);assert.equal(f.rows().length,2);
  f.key('q');assert.equal(f.controller.active,false);assert.equal(f.doc.activeElement,f.origin);f.controller.openDispatcher();f.buttons().find(b=>b.textContent.includes('[t]')).click();assert.equal(f.rows().length,1);
});

function timerModel(){let next=0;const tasks=new Map();return {setTimeout(fn){const id=++next;tasks.set(id,fn);return id;},clearTimeout(id){tasks.delete(id);},flush(){for(const [id,fn] of [...tasks]){tasks.delete(id);fn();}},get size(){return tasks.size;}};}
test('Agenda C-c t uses released local prefix, selected record and upper status lifecycle without closing agenda',async()=>{
 const calls=[],f=await fixture({onStatus:async(id,options)=>{assert.equal(options.current(),true);calls.push(id);return true;}});
 f.controller.openWeek();f.key('ArrowDown');const target=f.index.query().find(r=>r.title==='Other');
 f.key('c',{ctrlKey:true});f.results().emit('keyup',{key:'c'});f.key('t');await Promise.resolve();
 assert.deepEqual(calls,[target.id]);assert.equal(f.controller.active,true);assert.equal(f.controller.canStatus,false);
 f.key('ArrowUp');assert.equal(f.navigation.length,0);f.controller.endStatus();assert.equal(f.controller.canStatus,true);assert.equal(f.doc.activeElement,f.results());
 f.buttons().find(b=>b.textContent==='Status · C-c t').click();await Promise.resolve();assert.equal(calls.length,2);f.controller.destroy();
});
test('Agenda status prefix protects early/repeated/modifier/IME keys and stale selection; loading cancels before source commit',async()=>{
 let calls=0,cancelled=0,resolve,valid;
 const f=await fixture({onStatus:async(_id,options)=>{calls++;valid=options.current;await new Promise(r=>{resolve=r;});return options.current();},cancelStatus:()=>cancelled++});
 f.controller.openWeek();
 for(const patch of [{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}])f.key('c',{ctrlKey:true,...patch});
 assert.equal(calls,0);f.key('c',{ctrlKey:true});f.key('t');assert.equal(calls,0);
 f.key('c',{ctrlKey:true});f.results().emit('keyup',{key:'c'});f.key('t',{repeat:true});assert.equal(calls,0);f.key('t');await Promise.resolve();assert.equal(calls,1);
 f.key('Escape');assert.equal(valid(),false);assert.equal(cancelled,1);resolve();await Promise.resolve();await Promise.resolve();assert.equal(f.controller.canStatus,true);
 f.key('c',{ctrlKey:true});f.results().emit('keyup',{key:'c'});f.controller.update(f.index.snapshot());f.key('t');assert.equal(calls,1);f.controller.destroy();
});
test('Failed status source keeps feedback and agenda visible; actual commit phase blocks premature cancellation',async()=>{
 let f;f=await fixture({onStatus:async()=>{f.controller.message('Bitte zuerst speichern.');return false;}});f.controller.openWeek();await f.controller.openStatus();assert.match(f.controller.element.textContent,/Bitte zuerst speichern/);assert.equal(f.controller.active,true);
 let resolve;const g=await fixture({onStatus:async()=>new Promise(r=>{resolve=r;})});g.controller.openWeek();const pending=g.controller.openStatus();g.controller.setCommitting(true);g.key('Escape');assert.equal(g.controller.active,true);assert.equal(g.controller.canStatus,false);g.controller.setCommitting(false);resolve(false);await pending;assert.equal(g.controller.canStatus,true);g.controller.destroy();f.controller.destroy();
});
test('Follow reads and opens alternate real sessions repeatedly despite parser-only editor updates after the first file',async()=>{
 const doc=dom(),timers=timerModel(),entries={'a.md':'# TODO Alpha','b.md':'#+SEQ_TODO: NEXT(n) | FIN(f)\n# NEXT Beta'},vault=rootOf(entries),origin=doc.createElement('div');doc.body.append(origin);origin.focus();
 let controller,attempt=0;const jumps=[],notices=[],editable=new Compartment();
 const index=createAgendaIndex({onChange:next=>controller?.update(next),yieldTask:async()=>{}});await index.selectVault(vault);
 const session=createSession({store:{put:async()=>{}}});await session.open({vault,handle:await vault.getFileHandle('a.md'),path:'a.md'});
 const make=()=>EditorState.create({doc:session.text,extensions:[markdown({base:markdownLanguage}),todoRules,history(),editable.of([])]});
 const view={state:make()};view.dispatch=spec=>{view.state=view.state.update(spec).state;};await index.setEditor(view.state,'a.md',vault);
 const source=createAgendaSource({index,getVault:()=>vault,getSession:()=>session,getState:()=>view.state,
  permission:async()=>{await Promise.resolve();if(attempt>1)view.dispatch({});},
  onCommit:value=>controller.setCommitting(value),notify:message=>{notices.push(message);controller.message(message);},
  open:async target=>{await session.open(target);view.state=make();await index.setEditor(view.state,session.path,vault);},jump:from=>{view.dispatch({selection:{anchor:from}});jumps.push(session.path);}});
 controller=createAgendaView({index,document:doc,timers,execute:()=>{},navigate:async(id,options)=>{
  attempt++;const path=session.path;view.dispatch({effects:editable.reconfigure(EditorState.readOnly.of(true))});
  try{const success=await source.navigate(id,options);if(success&&session.path!==path)void index.updateFile(session.path,vault);return success;}
  finally{view.dispatch({effects:editable.reconfigure(EditorState.readOnly.of(false))});}
 },cancelNavigation:()=>source.cancel()});
 controller.openTodos();const results=all(controller.element,e=>e.className==='agenda-results')[0];results.emit('keydown',{key:'F',shiftKey:true});
 for(const path of ['b.md','a.md','b.md','a.md']){
  const row=all(controller.element,e=>e.className==='agenda-row').find(row=>row.textContent.startsWith(path));assert.ok(row);row.click();timers.flush();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(session.path,path);assert.equal(session.dirty,false);assert.equal(doc.activeElement,results);assert.equal(controller.active,true);
 }
 assert.deepEqual(jumps,['b.md','a.md','b.md','a.md']);assert.deepEqual(notices,[]);controller.destroy();
});
test('Navigation errors survive passive index/commit publications and clear only for a new explicit action',async()=>{
 const f=await fixture();f.controller.openWeek();f.controller.message('Ungespeicherte Änderungen: zuerst speichern.');
 f.controller.update(f.index.snapshot());assert.match(f.controller.element.textContent,/Ungespeicherte Änderungen: zuerst speichern/);
 f.controller.setCommitting(true);f.key('Escape');f.controller.setCommitting(false);assert.match(f.controller.element.textContent,/Ungespeicherte Änderungen: zuerst speichern/);
 f.key('ArrowDown');assert.doesNotMatch(f.controller.element.textContent,/Ungespeicherte Änderungen: zuerst speichern/);assert.match(f.controller.element.textContent,/Dateien/);f.controller.destroy();
});
test('Opening a source after mouse Follow keeps agenda focus before disabling the focused toolbar button',async()=>{
 const timers=timerModel();let f,inFlight=false,cancelled=0;
 f=await fixture({timers,cancelNavigation:()=>{if(inFlight)cancelled++;},navigate:async()=>{inFlight=true;f.controller.setCommitting(true);await Promise.resolve();f.controller.setCommitting(false);inFlight=false;return cancelled===0;}});
 f.controller.openWeek();const button=f.buttons().find(b=>b.textContent.startsWith('Follow:'));
 let disabled=false;Object.defineProperty(button,'disabled',{get:()=>disabled,set:value=>{disabled=value;if(value&&f.doc.activeElement===button){f.doc.activeElement=f.doc.body;button.emit('focusout',{relatedTarget:null});}}});
 button.focus();button.click();timers.flush();await Promise.resolve();await Promise.resolve();
 assert.equal(cancelled,0);assert.equal(f.doc.activeElement,f.results());assert.equal(f.controller.active,true);f.controller.destroy();
});
test('A temporary missing source during editor indexing cannot replace Friday selection with Saturday and follow back',async()=>{
 const timers=timerModel(),calls=[];let f,hidden=false,inFlight=false,cancelled=0;
 f=await fixture({timers,cancelNavigation:()=>{if(inFlight)cancelled++;},navigate:async id=>{
  const record=f.index.query().find(r=>r.id===id);calls.push(record.path);inFlight=true;
  hidden=true;f.controller.update({...f.index.snapshot(),editorPending:true,editorPath:'friday.md'});await Promise.resolve();
  hidden=false;f.controller.update(f.index.snapshot());inFlight=false;return true;
 }});
 await f.index.selectVault(rootOf({'friday.md':'# TODO Friday\nSCHEDULED: <2026-11-06 Fr>','saturday.md':'# TODO Saturday\nSCHEDULED: <2026-11-07 Sa>'}));
 const query=f.index.query;f.index.query=options=>query(options).filter(r=>!hidden||r.path!=='friday.md');
 f.controller.openWeek();f.key('ArrowDown');f.key('F',{shiftKey:true});f.key('ArrowUp');timers.flush();await Promise.resolve();await Promise.resolve();
 const selected=f.rows().find(row=>row.attributes['aria-selected']==='true');assert.match(selected.textContent,/Friday/);assert.equal(cancelled,0);assert.deepEqual(calls,['friday.md']);assert.equal(timers.size,0);f.controller.destroy();
});
test('Passive removal of selected task chooses a fallback without initiating a source-opening follow loop',async()=>{
 const timers=timerModel(),calls=[],f=await fixture({timers,navigate:async id=>{calls.push(id);return true;}});f.controller.openWeek();f.key('F',{shiftKey:true});timers.flush();await Promise.resolve();await Promise.resolve();const before=calls.length;
 const original=f.index.query;f.index.query=options=>original(options).filter(record=>record.title!=='Open');f.controller.update(f.index.snapshot());timers.flush();await Promise.resolve();
 assert.equal(calls.length,before);assert.equal(f.rows().some(row=>row.attributes['aria-selected']==='true'),true);f.controller.destroy();
});
test('Actual app source-open callback waits for editor indexing before reporting completion',async()=>{
 const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
 const start=app.indexOf('agendaSource=createAgendaSource({'),end=app.indexOf('\n});',start)+4;let release,entered=false,finished=false;
 const gate=new Promise(resolve=>{release=resolve;}),session={vault:{},async open(target){this.path=target.path;}};
 const context={createAgendaSource:options=>options,agendaIndex:{},vault:session.vault,session,view:{},permission:async()=>{},agenda:{setCommitting(){},message(){}},status(){},syncAgendaFileSelection(){},useRingVault:async()=>{},syncEditor:()=>{entered=true;return gate;}};
 const source=new Function(...Object.keys(context),'let agendaSource,persistPending=true;'+app.slice(start,end)+';return agendaSource;')(...Object.values(context));
 const pending=source.open({path:'b.md'}).then(()=>{finished=true;});await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(entered,true);assert.equal(finished,false);release();await pending;assert.equal(finished,true);
});
test('Passive redraw moves focus off removed rows; actual outside focus/window blur still cancels navigation',async()=>{
 let cancelled=0;const timers=timerModel(),f=await fixture({timers,cancelNavigation:()=>cancelled++,navigate:async()=>true});f.controller.openWeek();
 const results=f.results(),row=f.rows()[0],replace=results.replaceChildren.bind(results);
 results.replaceChildren=(...children)=>{if(f.rows().includes(f.doc.activeElement)){const old=f.doc.activeElement;f.doc.activeElement=f.doc.body;old.emit('focusout',{relatedTarget:null});}replace(...children);};
 row.focus();const before=cancelled;f.controller.update(f.index.snapshot());assert.equal(f.doc.activeElement,results);assert.equal(cancelled,before);
 f.key('F',{shiftKey:true});assert.equal(timers.size,1);results.emit('focusout',{relatedTarget:f.origin});f.origin.focus();assert.equal(timers.size,0);assert.ok(cancelled>before);
 results.focus();f.key('ArrowDown');assert.equal(timers.size,1);f.doc.defaultView.emit('blur');assert.equal(timers.size,0);f.controller.destroy();
});
test('Follow debounces to latest row, keeps focus, and never repeats from unchanged index publication',async()=>{
  const timers=timerModel(),calls=[],f=await fixture({timers,navigate:async(...args)=>{calls.push(args);return true;}});f.controller.openWeek();
  f.key('F',{shiftKey:true});assert.equal(timers.size,1);f.key('ArrowDown');assert.equal(timers.size,1);timers.flush();await Promise.resolve();
  assert.equal(calls.length,1);assert.equal(calls[0][0],f.index.query().find(r=>r.title==='Other').id);assert.deepEqual(calls[0][1],{follow:true});assert.equal(f.controller.active,true);assert.equal(f.doc.activeElement,f.results());
  f.controller.update(f.index.snapshot());timers.flush();await Promise.resolve();assert.equal(calls.length,1);
  f.key('F',{shiftKey:true});f.key('ArrowUp');timers.flush();assert.equal(calls.length,1);f.controller.destroy();
});
test('Follow serializes pending source checks and runs only latest surviving selection',async()=>{
  const timers=timerModel(),calls=[];let finish;
  const f=await fixture({timers,navigate:(...args)=>{calls.push(args);return new Promise(resolve=>{finish=resolve;});}});f.controller.openWeek();
  f.key('F',{shiftKey:true});timers.flush();assert.equal(calls.length,1);
  f.key('ArrowDown');timers.flush();assert.equal(calls.length,1);f.key('ArrowUp');timers.flush();assert.equal(calls.length,1);
  finish(true);await Promise.resolve();await Promise.resolve();assert.equal(calls.length,2);assert.equal(calls[1][0],f.index.query().find(r=>r.title==='Open').id);
  f.key('F',{shiftKey:true});finish(true);await Promise.resolve();assert.equal(f.controller.active,true);assert.equal(timers.size,0);f.controller.destroy();
});
test('Weekday headings mark weekend separately and today remains distinguishable',async()=>{
  const f=await fixture();f.controller.openWeek();const headings=all(f.controller.element,e=>e.className==='agenda-day');
  assert.equal(headings.length,7);assert.equal(headings.filter(e=>e.classList.contains('agenda-weekend')).length,2);assert.equal(headings[6].classList.contains('agenda-today'),true);f.controller.destroy();
});
test('Agenda active lifecycle notifies integration once per open/actual close including forced cleanup',async()=>{
  const changes=[],f=await fixture({onActiveChange:active=>changes.push(active)});
  f.controller.openDispatcher();f.controller.openWeek();f.controller.openTodos();assert.deepEqual(changes,[true]);
  f.controller.setCommitting(true);f.controller.close();assert.deepEqual(changes,[true]);
  f.controller.update({...f.index.snapshot(),epoch:f.index.snapshot().epoch+1});assert.deepEqual(changes,[true,false]);
  f.controller.setCommitting(false);f.controller.openWeek();f.controller.close({restore:false});assert.deepEqual(changes,[true,false,true,false]);
  f.controller.openTodos();f.controller.destroy();f.controller.destroy();assert.deepEqual(changes,[true,false,true,false,true,false]);
});
test('Agenda week keyboard/mouse date navigation, selection and source activation share controller path',async()=>{
  const f=await fixture();f.controller.openWeek();assert.match(f.controller.element.textContent,/KW 45\/2026/);assert.equal(f.rows().length,2);assert.match(f.rows()[0].textContent,/09:00-10:00.*11:00/);
  f.key('ArrowDown');assert.equal(f.rows()[1].attributes['aria-selected'],'true');f.key('Enter');await Promise.resolve();assert.equal(f.navigation[0],f.index.query().find(r=>r.title==='Other').id);
  await Promise.resolve();f.rows()[0].click();await Promise.resolve();assert.equal(f.navigation[1],f.index.query().find(r=>r.title==='Open').id);
  f.key('f');assert.match(f.controller.element.textContent,/KW 46\/2026/);f.key('b');assert.match(f.controller.element.textContent,/KW 45\/2026/);f.key('b');f.key('.');assert.match(f.controller.element.textContent,/KW 45\/2026/);
  f.buttons().find(b=>b.textContent==='f →').click();assert.match(f.controller.element.textContent,/KW 46\/2026/);f.key('Escape');assert.equal(f.doc.activeElement,f.origin);
});
test('Agenda labels current editor rows and distinguishes saved external paths without taking focus',async()=>{
 const f=await fixture();
 await f.index.setEditor(EditorState.create({doc:'# TODO Local draft',extensions:[markdown({base:markdownLanguage}),todoRules]}),'draft.md');
 f.controller.openTodos();
 const current=f.rows().find(row=>row.textContent.includes('Local draft')),other=f.rows().find(row=>row.textContent.includes('Open'));
 assert.match(current.textContent,/draft\.md · aktuelle Datei/);assert.doesNotMatch(other.textContent,/aktuelle Datei/);assert.match(other.textContent,/a\.md/);
 assert.match(f.controller.element.textContent,/auch ungespeichert/);assert.equal(f.doc.activeElement,f.results());f.controller.destroy();
});
test('Agenda renders own and inherited tags separately from the task title',async()=>{
 const f=await fixture();
 await f.index.setEditor(EditorState.create({doc:'# Project :WORK:\n## TODO Tagged :URGENT:',extensions:[markdown({base:markdownLanguage}),todoRules]}),'a.md');
 f.controller.openTodos();const row=f.rows()[0];
 assert.match(row.textContent,/Tagged :URGENT:/);assert.match(row.textContent,/geerbt: WORK/);
 assert.equal(f.index.query()[0].title,'Tagged');f.controller.destroy();
});
test('Today prewarning renders remaining days with original source identity and follows editor updates',async()=>{
 const timers=timerModel(),f=await fixture({timers});
 const state=EditorState.create({doc:'# Parent :WORK:\n## TODO Upcoming :URGENT:\nSCHEDULED: <2026-11-16 Mo> DEADLINE: <2026-11-10 Di>',extensions:[markdown({base:markdownLanguage}),todoRules]});
 await f.index.setEditor(state,'a.md');f.controller.openWeek();
 assert.equal(f.rows().length,1);assert.match(f.rows()[0].textContent,/DEADLINE · in 2 Tagen \(2026-11-10\)/);assert.match(f.rows()[0].textContent,/Upcoming/);
 assert.match(f.rows()[0].textContent,/URGENT/);assert.match(f.rows()[0].textContent,/geerbt: WORK/);
 assert.ok(all(f.rows()[0],e=>e.classList.contains('agenda-deadline-warning')).length);
 const target=f.index.query()[0];f.key('F',{shiftKey:true});timers.flush();await Promise.resolve();assert.deepEqual(f.navigation,[target.id]);assert.equal(f.doc.activeElement,f.results());
 const changed=state.update({changes:{from:state.doc.toString().indexOf('TODO'),to:state.doc.toString().indexOf('TODO')+4,insert:'DONE'}}).state;
 await f.index.setEditor(changed,'a.md');f.controller.update(f.index.snapshot());assert.equal(f.rows().length,0);f.controller.destroy();
});

test('Agenda TODO filter, live snapshots, errors, refresh and vault reset preserve safe modal focus boundary',async()=>{
  const f=await fixture();f.controller.openTodos();assert.equal(f.rows().length,1);const filter=all(f.controller.element,e=>e.tagName==='input')[0];filter.checked=true;filter.emit('change');assert.equal(f.rows().length,2);assert.match(f.rows()[1].textContent,/DONE Closed/);
  f.controller.update({...f.index.snapshot(),diagnostics:[{path:'nested/bad.md',line:2,message:'Permission denied'}]});assert.match(f.controller.element.textContent,/Index unvollständig/);assert.match(f.controller.element.textContent,/nested\/bad.md:2: Permission denied/);
  f.key('r');assert.ok(f.commands.includes('agenda.refresh'));f.controller.update({...f.index.snapshot(),epoch:f.index.snapshot().epoch+1,records:[]});assert.equal(f.controller.active,false);assert.equal(f.rows().length,0);
  f.controller.destroy();assert.equal(f.controller.element.isConnected,false);
});
test('Agenda vault reset and destroy force lifecycle cleanup even while user close is commit-locked',async()=>{
  const f=await fixture();f.controller.openTodos();f.controller.setCommitting(true);f.controller.close();assert.equal(f.controller.active,true);
  f.controller.update({...f.index.snapshot(),epoch:f.index.snapshot().epoch+1,records:[]});assert.equal(f.controller.active,false);assert.equal(f.rows().length,0);assert.equal(f.controller.element.open,false);
  f.controller.setCommitting(false);f.controller.openTodos();f.controller.setCommitting(true);f.controller.destroy();assert.equal(f.controller.element.isConnected,false);f.controller.setCommitting(false);
});
test('Agenda shortcut isolation disables mutating Registry actions and blocks global Alt+X palette entry',async()=>{
  const f=await fixture();let mutation=0;const editor={state:EditorState.create({doc:'# TODO Keep',extensions:history()}),dom:f.origin,focus:()=>f.origin.focus()};
  const context={busy:false,agendaActive:true,synthetic:true,vault:{},hasDocument:true,state:editor.state};
  const registry=createCommandRegistry(commandDefinitions({'todo.next':()=>mutation++}),()=>context);
  for(const id of ['todo.next','edit.undo','file.open','file.save','structure.heading-demote']){assert.equal(registry.availability(id).enabled,false);assert.equal(registry.execute(id),false);}
  assert.equal(mutation,0);assert.equal(registry.availability('agenda.week').enabled,true);
  const surfaces=createCommandSurfaces({registry,view:editor,document:f.doc,blocked:()=>true});surfaces.palette();assert.ok(!all(f.doc.body,e=>e.className==='command-palette')[0].open);f.doc.defaultView.emit('keydown',{key:'x',altKey:true});assert.ok(!all(f.doc.body,e=>e.className==='command-palette')[0].open);surfaces.destroy();
});
test('Agenda successful source activation restores editor focus after modal close, respecting native inertness',async()=>{
  const f=await fixture();let closed=0,controller;const order=[];controller=createAgendaView({index:f.index,document:f.doc,now:()=>new Date(2026,10,8),execute(){},navigate:async()=>{order.push('jump');if(!controller.element.open)f.origin.focus();return true;},onClose:()=>{assert.equal(controller.element.open,false);order.push('focus');closed++;f.origin.focus();}});
  controller.openWeek();const result=all(controller.element,e=>e.className==='agenda-results')[0];result.emit('keydown',{key:'Enter'});await Promise.resolve();await Promise.resolve();assert.equal(controller.active,false);assert.equal(closed,1);assert.deepEqual(order,['jump','focus']);assert.equal(f.doc.activeElement,f.origin);controller.destroy();
});
test('Agenda actual app source adapter synchronizes file selection for nested/same-file/missing-option sources and preserves selection on refusal',async()=>{
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8'),start=app.indexOf('function syncAgendaFileSelection(){'),end=app.indexOf('\n});',app.indexOf('agendaSource=createAgendaSource({'))+4;
  assert.ok(start>=0&&end>start);const vault=rootOf({'project.md':'# TODO Source'}),nested=rootOf({'project.md':'# TODO Destination'}),map=new Map();let n=0;
  nested.kind='directory';vault.entries=async function*(){yield ['project.md',{kind:'file'}];yield ['nested',nested];};vault.getDirectoryHandle=async name=>{assert.equal(name,'nested');return nested;};
  const files={options:[{text:'project.md',value:'project.md'},{text:'nested/project.md',value:'nested/project.md'}],selected:'project.md',get value(){return this.selected;},set value(value){this.selected=this.options.some(option=>option.value===value)?value:'';},append(option){this.options.push(option);}};
  const Option=class{constructor(text,value){this.text=text;this.value=value;}};
  const session=createSession({store:{put:async(k,v)=>map.set(k,v),get:async k=>map.get(k),keys:async()=>[...map.keys()]},id:()=>String(++n)});await session.open({vault,handle:await vault.getFileHandle('project.md'),path:'project.md'});
  const agendaIndex=createAgendaIndex({yieldTask:async()=>{}});await agendaIndex.selectVault(vault);const messages=[],jumps=[],view={state:EditorState.create({doc:session.text,extensions:history()}),dispatch(spec){jumps.push(spec.selection.anchor);this.state=this.state.update(spec).state;},focus(){}};
  const context={createAgendaSource,agendaIndex,vault,session,view,$:id=>{assert.equal(id,'files');return files;},Option,permission:async()=>{},status:m=>messages.push(m),agenda:{message:m=>messages.push(m),setCommitting(){}},useRingVault:async()=>{},syncEditor:()=>{view.state=EditorState.create({doc:session.text,extensions:history()});},EditorView:{scrollIntoView:()=>({})}};
  const {source,sync}=new Function(...Object.keys(context),'let agendaSource,persistPending=false;'+app.slice(start,end)+';return {source:agendaSource,sync:syncAgendaFileSelection};')(...Object.values(context));
  // Filter the placeholder effect in this minimal state adapter; production uses EditorView.scrollIntoView.
  view.dispatch=spec=>{jumps.push(spec.selection.anchor);view.state=view.state.update({selection:spec.selection}).state;};
  const target=agendaIndex.query().find(r=>r.path==='nested/project.md');session.applyChanges([{from:session.text.length,to:session.text.length,insert:' unsaved'}]);assert.equal(await source.navigate(target.id),false);assert.equal(session.path,'project.md');assert.equal(session.dirty,true);assert.match(messages.at(-1),/Ungespeicherte/);assert.equal(files.value,'project.md');
  // Explicit test cleanup opens a fresh real session source, then proves successful read navigation.
  await session.open({vault,handle:await vault.getFileHandle('project.md'),path:'project.md'});view.state=EditorState.create({doc:session.text,extensions:history()});
  assert.equal(await source.navigate(target.id),true);assert.equal(session.path,'nested/project.md');assert.equal(files.value,'nested/project.md');assert.equal(view.state.doc.toString(),'# TODO Destination');assert.deepEqual(jumps,[0]);assert.equal(undoDepth(view.state),0);
  files.value='project.md';const sameState=view.state;assert.equal(await source.navigate(target.id),true);assert.equal(view.state.doc,sameState.doc);assert.equal(files.value,'nested/project.md');assert.equal(files.options.length,2);
  files.options=files.options.filter(option=>option.value!=='nested/project.md');files.value='project.md';assert.equal(await source.navigate(target.id),true);assert.equal(files.value,'nested/project.md');assert.deepEqual(files.options.at(-1),new Option('nested/project.md','nested/project.md'));
  files.value='project.md';const getFile=nested.getFileHandle;nested.getFileHandle=async()=>{throw Error('denied nested source');};assert.equal(await source.navigate(target.id),false);assert.equal(files.value,'project.md');assert.match(messages.at(-1),/denied nested source/);nested.getFileHandle=getFile;
  // A successful session.open must sync the actual source even when its second
  // read changes and subsequent navigation validation correctly refuses a jump.
  await session.open({vault,handle:await vault.getFileHandle('project.md'),path:'project.md'});view.state=EditorState.create({doc:session.text,extensions:history()});files.options=files.options.filter(option=>option.value!=='nested/project.md');files.value='project.md';let reads=0;
  nested.getFileHandle=async()=>({async getFile(){const text=++reads===1?'# TODO Destination':'# TODO External second read';return {async arrayBuffer(){return encoded(text).buffer;}};}});
  assert.equal(await source.navigate(target.id),false);assert.equal(session.path,'nested/project.md');assert.equal(files.value,'nested/project.md');assert.equal(view.state.doc.toString(),'# TODO External second read');assert.equal(jumps.length,3);
  const foreign=rootOf({'else.md':'# TODO Foreign'});await session.open({vault:foreign,handle:await foreign.getFileHandle('else.md'),path:'else.md'});files.value='project.md';const optionsBefore=files.options.length;sync();assert.equal(files.value,'project.md');assert.equal(files.options.length,optionsBefore);
});
test('Agenda commit phase locks q/Escape/close and other actions during actual deferred session.open; errors unlock without queued close',async()=>{
  for(const failure of [false,true]){
    const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve};},gate=deferred(),entered=deferred();
    const entries={'a.md':'# TODO A','b.md':'# TODO B'},vault=rootOf(entries),originalGet=vault.getFileHandle;let reads=0,watch=false;
    vault.getFileHandle=async name=>{const handle=await originalGet(name),get=handle.getFile;handle.getFile=async()=>{if(watch&&name==='b.md'&&++reads===2){entered.resolve();await gate.promise;if(failure)throw Error('deferred source failure');}return get();};return handle;};
    const map=new Map();let n=0;const session=createSession({store:{put:async(k,v)=>map.set(k,v),get:async k=>map.get(k),keys:async()=>[...map.keys()]},id:()=>String(++n)});await session.open({vault,handle:await vault.getFileHandle('a.md'),path:'a.md'});
    const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(vault);const doc=dom(),origin=doc.createElement('div');doc.body.append(origin);origin.focus();let state={},controller,source,pending;const jumps=[],executed=[],commit=[];
    source=createAgendaSource({index,getVault:()=>vault,getSession:()=>session,getState:()=>state,onCommit:value=>{commit.push(value);controller.setCommitting(value);},notify:text=>controller.message(text),jump:from=>jumps.push(from),open:async target=>{await session.open(target);state={};}});
    controller=createAgendaView({index,document:doc,execute:id=>executed.push(id),onClose:()=>origin.focus(),cancelNavigation:()=>source.cancel(),navigate:id=>(pending=source.navigate(id))});
    controller.openTodos();const results=all(controller.element,e=>e.className==='agenda-results')[0];results.emit('keydown',{key:'ArrowDown'});watch=true;results.emit('keydown',{key:'Enter'});await entered.promise;
    assert.deepEqual(commit,[true]);results.emit('keydown',{key:'q'});assert.equal(controller.active,true);assert.match(controller.element.textContent,/Schließen.*gesperrt/);
    results.emit('keydown',{key:'Escape'});controller.element.emit('cancel');all(controller.element,e=>e.tagName==='button'&&e.textContent==='Schließen')[0].click();assert.equal(controller.active,true);
    results.emit('keydown',{key:'r'});results.emit('keydown',{key:'f'});controller.openDispatcher();assert.deepEqual(executed,[]);assert.equal(controller.element.attributes['data-mode'],'todo');
    const filter=all(controller.element,e=>e.tagName==='input')[0];assert.equal(filter.disabled,true);filter.checked=true;filter.emit('change');assert.equal(filter.checked,false);
    gate.resolve();await pending;await Promise.resolve();assert.deepEqual(commit,[true,false]);
    if(failure){assert.equal(controller.active,true);assert.match(controller.element.textContent,/deferred source failure/);assert.equal(session.path,'a.md');assert.equal(jumps.length,0);results.emit('keydown',{key:'q'});assert.equal(controller.active,false);}
    else{assert.equal(session.path,'b.md');assert.deepEqual(jumps,[0]);assert.equal(controller.active,false);assert.equal(doc.activeElement,origin);}
    controller.destroy();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {todoRules} from './todo.mjs';
import {createAgendaStatus} from './agenda-status.mjs';
import {createAgendaSource} from './agenda-source.mjs';
import {createAgendaIndex} from './agenda-index.mjs';
import {createKillRing} from './kill-ring.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
class Element{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.hidden=false;this.value='';this.scrollTop=0;this.scrollLeft=0;this.clientHeight=100;this.scrollHeight=1000;this.offsetHeight=20;this.offsetTop=0;this.classList={toggle(){}};}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}replaceChildren(...nodes){for(const n of this.children)n.parent=null;this.children=[];this._text='';this.append(...nodes);}
 set textContent(value){this.replaceChildren();this._text=value;}get textContent(){return (this._text??'')+this.children.map(n=>n.textContent).join('');}
 setAttribute(k,v){this.attributes[k]=String(v);}removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}removeEventListener(k,fn){this.listeners[k]=this.listeners[k]?.filter(f=>f!==fn);}
 emit(type,patch={}){const e={target:this,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...patch};for(let n=this;n;n=n.parent){for(const fn of [...n.listeners[type]??[]])fn(e);if(e.stopped)break;}return e;}
 focus(){this.ownerDocument.activeElement=this;}click(){if(!this.disabled)this.emit('click');}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
}
const make=text=>EditorState.create({doc:text,extensions:[markdown({base:markdownLanguage}),history(),todoRules]});
async function fixture(options={}){
 const disk={'a.md':'# TODO First\nBody','b.md':'#+SEQ_TODO: NEXT(n) WAIT(w) | FIN(f)\n# NEXT Foreign\nBody','repeat.md':'# TODO Repeat\nSCHEDULED: <2026-11-12 Do +1d>'};let opened=0,reads=0,permissions=0,saves=0;const savingStates=[],savedPaths=[];
 const vault={name:'synthetic',async *entries(){for(const path of Object.keys(disk))yield [path,{kind:'file'}];},async getFileHandle(path){reads++;return {async getFile(){return {async arrayBuffer(){return new TextEncoder().encode(disk[path]).buffer;}};}};}};
 const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(vault);
 const doc={createElement(tag){return new Element(tag,this);}};doc.defaultView=doc.createElement('window');doc.body=doc.createElement('body');
 const host=doc.createElement('div'),editor=doc.createElement('div'),lower=doc.createElement('div');doc.body.append(editor,host,lower);lower.focus();
 const session={hasDocument:true,vault,path:'a.md',text:disk['a.md'],dirty:false};const view={state:make(session.text),focus:()=>editor.focus()},context={busy:false,hasDocument:true},notices=[];let status,active=true,closes=0;
 view.dispatch=spec=>{const tr=spec.startState?spec:view.state.update(spec);view.state=tr.state;if(tr.docChanged){session.text=view.state.doc.toString();session.dirty=true;}status?.invalidateStale();};
 await index.setEditor(view.state,session.path,vault);
 const source=createAgendaSource({index,getVault:()=>vault,getSession:()=>session,getState:()=>view.state,permission:async()=>{permissions++;},notify:m=>notices.push(m),jump:from=>view.dispatch({selection:{anchor:from}}),open:async target=>{opened++;Object.assign(session,{path:target.path,text:disk[target.path],dirty:false});view.state=make(session.text);await index.setEditor(view.state,session.path,vault);}});
 status=createAgendaStatus({host,editor,view,ring:createKillRing(),getContext:()=>context,navigate:(id,options)=>source.navigate(id,options),getSource:()=>({session,vault:session.vault,path:session.path}),
  saveForeign:options.autoSave?async({source,doc})=>{assert.equal(source.session,session);assert.equal(source.path,session.path);assert.equal(view.state.doc,doc);if(options.saveGate)await options.saveGate;if(options.saveError)throw Error(options.saveError);saves++;savedPaths.push(source.path);disk[source.path]=session.text;session.dirty=false;await index.updateFile(source.path,source.vault);return {backupName:'synthetic-backup'};}:null,
  onSaving:value=>savingStates.push(value),cancelNavigation:()=>source.cancel(),isActive:()=>active,onClose:()=>closes++,focusAgenda:()=>lower.focus(),notify:m=>notices.push(m),document:doc,now:()=>new Date(2026,10,12,12)});
 return {disk,vault,index,source,status,session,view,context,host,editor,lower,doc,notices,savingStates,savedPaths,get saves(){return saves;},get opened(){return opened;},get reads(){return reads;},get closes(){return closes;},get permissions(){return permissions;},set active(value){active=value;},key(key,patch={}){return doc.activeElement.emit('keydown',{key,...patch});}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('Custom file status panel survives parser-only updates and autosaves only the initially foreign file',async()=>{
 const f=await fixture({autoSave:true}),original=f.disk['a.md'],id=f.index.query().find(r=>r.path==='b.md').id;
 assert.equal(await f.status.open(id),true);const before=f.view.state;f.view.dispatch({});assert.notEqual(f.view.state,before);assert.equal(f.status.active,true);assert.equal(f.editor.hidden,true);assert.match(f.host.textContent,/WAIT/);
 f.key('f');assert.equal(f.status.saving,true);await settle();
 assert.equal(f.saves,1);assert.deepEqual(f.savedPaths,['b.md']);assert.match(f.disk['b.md'],/# FIN Foreign/);assert.equal(f.disk['a.md'],original);assert.equal(f.session.dirty,false);assert.equal(f.status.active,false);assert.deepEqual(f.savingStates,[true,false]);assert.match(f.notices.at(-1),/Status gespeichert/);
 assert.equal(undo(f.view),true);assert.match(f.session.text,/# NEXT Foreign/);assert.equal(f.session.dirty,true);assert.match(f.disk['b.md'],/# FIN Foreign/);f.status.destroy();
});
test('Initially open files, cancellation and same-status choices do not autosave',async()=>{
 const f=await fixture({autoSave:true});
 await f.status.open(f.index.query().find(r=>r.path==='a.md').id);f.key('d');await settle();assert.equal(f.saves,0);assert.equal(f.session.dirty,true);assert.match(f.disk['a.md'],/# TODO First/);
 f.session.dirty=false;await f.status.open(f.index.query().find(r=>r.path==='b.md').id);f.key('Escape');await settle();assert.equal(f.saves,0);
 await f.index.setEditor(f.view.state,'b.md',f.vault);await f.status.open(f.index.query().find(r=>r.path==='b.md').id);f.key('n');await settle();assert.equal(f.saves,0);f.status.destroy();
 const g=await fixture({autoSave:true});await g.status.open(g.index.query().find(r=>r.path==='b.md').id);g.key('n');await settle();assert.equal(g.saves,0);g.status.destroy();
});
test('Parser tolerance still rejects real selection/rule/source changes, and autosave failures preserve the draft',async()=>{
 const f=await fixture({autoSave:true,saveError:'synthetic external conflict'});await f.status.open(f.index.query().find(r=>r.path==='b.md').id);f.key('f');await settle();
 assert.equal(f.saves,0);assert.equal(f.session.dirty,true);assert.match(f.session.text,/# FIN Foreign/);assert.match(f.disk['b.md'],/# NEXT Foreign/);assert.match(f.notices.at(-1),/nicht bestätigt.*external conflict/);assert.equal(f.status.saving,false);f.status.destroy();
 for(const change of ['selection','source','rules']){
  const g=await fixture({autoSave:true});await g.status.open(g.index.query().find(r=>r.path==='b.md').id);const input=g.doc.activeElement;
  if(change==='selection')g.view.dispatch({selection:{anchor:0}});
  if(change==='source'){g.session.path='a.md';g.status.invalidateStale();}
  if(change==='rules'){const {reloadTodo}=await import('./todo.mjs');g.view.dispatch({effects:reloadTodo.of({rules:[{name:'OTHER',key:'o',closed:false},{name:'FIN',key:'f',closed:true}]})});}
  assert.equal(g.status.active,false,change);input.emit('keydown',{key:'f'});await settle();assert.equal(g.saves,0);assert.match(g.disk['b.md'],/# NEXT Foreign/);g.status.destroy();
 }
});
test('Pending automatic save is serialized and cannot be redirected to another source before it starts',async()=>{
 let resolve;const gate=new Promise(r=>{resolve=r;}),f=await fixture({autoSave:true,saveGate:gate});await f.status.open(f.index.query().find(r=>r.path==='b.md').id);f.key('f');
 assert.equal(await f.status.open(f.index.query().find(r=>r.path==='a.md').id),false);assert.equal(f.status.saving,true);await Promise.resolve();resolve();await settle();assert.equal(f.saves,1);assert.deepEqual(f.savedPaths,['b.md']);f.status.destroy();
 const g=await fixture({autoSave:true});await g.status.open(g.index.query().find(r=>r.path==='b.md').id);g.key('f');g.session.path='a.md';await settle();assert.equal(g.saves,0);assert.match(g.notices.at(-1),/Speicherziel/);g.status.destroy();
});
test('Agenda upper status uses exact dirty same-file source, preserves draft and one-step undo/redo without saving',async()=>{
 const f=await fixture();f.view.dispatch({changes:{from:0,insert:'Draft\n\n'}});await f.index.setEditor(f.view.state,'a.md',f.vault);const record=f.index.query().find(r=>r.path==='a.md'),reads=f.reads,depth=undoDepth(f.view.state);
 assert.equal(await f.status.open(record.id),true);assert.equal(f.editor.hidden,true);assert.equal(f.host.hidden,false);assert.equal(f.status.active,true);
 f.key('d');assert.equal(f.session.text,'Draft\n\n# DONE First\nBody');assert.equal(f.session.dirty,true);assert.equal(f.disk['a.md'],'# TODO First\nBody');assert.equal(f.opened,0);assert.equal(f.reads,reads);assert.equal(f.permissions,0);
 assert.equal(f.editor.hidden,false);assert.equal(f.host.hidden,true);assert.equal(f.doc.activeElement,f.lower);assert.equal(undoDepth(f.view.state),depth+1);
 assert.equal(undo(f.view),true);assert.match(f.session.text,/# TODO First/);assert.equal(redo(f.view),true);assert.match(f.session.text,/# DONE First/);f.status.destroy();
});
test('Foreign source keeps dirty gate, then loads file-local states and changes only draft after clean opening',async()=>{
 const f=await fixture(),id=f.index.query().find(r=>r.path==='b.md').id;f.session.dirty=true;
 assert.equal(await f.status.open(id),false);assert.equal(f.opened,0);assert.equal(f.editor.hidden,false);assert.match(f.notices.at(-1),/zuerst speichern/);
 f.session.dirty=false;assert.equal(await f.status.open(id),true);assert.equal(f.opened,1);assert.match(f.host.textContent,/NEXT/);assert.match(f.host.textContent,/WAIT/);assert.match(f.host.textContent,/FIN/);
 f.key('f');assert.equal(f.session.path,'b.md');assert.match(f.session.text,/# FIN Foreign/);assert.match(f.disk['b.md'],/# NEXT Foreign/);assert.equal(f.session.dirty,true);assert.equal(f.doc.activeElement,f.lower);f.status.destroy();
});
test('Agenda recurrence completion reuses TODO planner and LOGBOOK as one undoable draft change',async()=>{
 const f=await fixture(),target=f.index.query().find(r=>r.path==='repeat.md');assert.equal(await f.status.open(target.id),true);f.key('d');
 assert.match(f.session.text,/# TODO Repeat/);assert.match(f.session.text,/<2026-11-13 Fr \+1d>/);assert.match(f.session.text,/:LOGBOOK:/);assert.equal(undoDepth(f.view.state),1);
 assert.equal(undo(f.view),true);assert.equal(f.session.text,f.disk['repeat.md']);f.status.destroy();
});
test('Escape, no-status, stale target, close and repeat lifecycle restore upper editor and agenda focus safely',async()=>{
 const f=await fixture();for(let i=0;i<30;i++){
  await f.index.setEditor(f.view.state,f.session.path,f.vault);const id=f.index.query().find(r=>r.path==='a.md').id;
  assert.equal(await f.status.open(id),true);const before=f.session.text;f.key('Escape');assert.equal(f.session.text,before);assert.equal(f.editor.hidden,false);assert.equal(f.doc.activeElement,f.lower);
 }
 const id=f.index.query().find(r=>r.path==='a.md').id;await f.status.open(id);const old=f.doc.activeElement;
 f.view.dispatch({selection:{anchor:1}});assert.equal(f.status.active,false);old.emit('keydown',{key:'d'});assert.match(f.session.text,/# TODO First/);
 await f.status.open(id);f.key(' ');assert.equal(f.session.text,'# First\nBody');assert.equal(f.editor.hidden,false);f.status.destroy();
});
test('Cancellation while permission is pending cannot later open a source or display the status host',async()=>{
 const f=await fixture();let resolve;const gate=new Promise(r=>{resolve=r;});
 // Source adapter cancellation is checked before the first directory/file read.
 const source=createAgendaSource({index:f.index,getVault:()=>f.vault,getSession:()=>f.session,getState:()=>f.view.state,permission:()=>gate,open:()=>assert.fail('Cancelled source must not open'),jump:()=>assert.fail()});
 const host=f.doc.createElement('div');const controller=createAgendaStatus({host,editor:f.editor,view:f.view,ring:createKillRing(),getContext:()=>f.context,navigate:(...args)=>source.navigate(...args),cancelNavigation:()=>source.cancel(),isActive:()=>true,document:f.doc});
 const pending=controller.open(f.index.query().find(r=>r.path==='b.md').id);controller.close();resolve();assert.equal(await pending,false);assert.equal(controller.active,false);assert.equal(f.editor.hidden,false);controller.destroy();f.status.destroy();
});
test('Agenda status Registry availability and upper-menu isolation keep modal and busy guards',()=>{
 let calls=0;const context={state:make('# TODO Task'),busy:false,agendaActive:true,agendaDocked:true,agendaFocused:true,agendaCanStatus:true,hasDocument:true};
 const registry=createCommandRegistry(commandDefinitions({'agenda.status':()=>calls++}),()=>context);
 registry.execute('agenda.status');assert.equal(calls,1);context.busy=true;assert.equal(registry.execute('agenda.status'),false);context.busy=false;context.agendaStatusActive=true;
 for(const id of ['agenda.status','todo.status','file.save','edit.undo','tags.edit'])assert.equal(registry.execute(id),false,id);assert.equal(calls,1);
});

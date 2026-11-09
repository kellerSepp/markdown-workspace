import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgendaView} from './agenda-view.mjs';
import {createAgendaIndex} from './agenda-index.mjs';
import {createAgendaSplit} from './agenda-split.mjs';
import {createAgendaSource} from './agenda-source.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {EditorState,Compartment} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {history,undo,redo} from '@codemirror/commands';
import {readFile} from 'node:fs/promises';
import {createPrefixRouter} from './prefix-router.mjs';

// Independent DOM contract model. No claim about native layout or key delivery.
class Node {
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.hidden=false;this.dataset={};this.scrollTop=0;this.clientHeight=80;this.scrollHeight=1000;this.offsetTop=0;this.offsetHeight=18;const css=new Map(),classes=new Set();this.style={getPropertyValue:k=>css.get(k)??'',setProperty:(k,v)=>css.set(k,v)};this.classList={add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,value){if(value)classes.add(k);else classes.delete(k);},contains:k=>classes.has(k)};}
  get isConnected(){return this===this.ownerDocument.body||!!this.parent?.isConnected;}
  append(...nodes){for(const n of nodes){n.parent?.children.splice(n.parent.children.indexOf(n),1);n.parent=this;this.children.push(n);}}
  replaceChildren(...nodes){for(const n of this.children)n.parent=null;this.children=[];this._text='';this.append(...nodes);}
  set textContent(v){this.replaceChildren();this._text=v;}get textContent(){return (this._text??'')+this.children.map(n=>n.textContent).join('');}
  setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}removeAttribute(k){delete this.attributes[k];}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}removeEventListener(k,fn){this.listeners[k]=this.listeners[k]?.filter(x=>x!==fn);}
  emit(type,data={}){const e={target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...data};for(let n=this;n;n=n.parent){for(const fn of [...n.listeners[type]??[]])fn(e);if(e.stopped)break;}return e;}
  focus(){this.ownerDocument.activeElement=this;}click(){if(!this.disabled)this.emit('click');}showModal(){this.open=true;}close(){this.open=false;}
  contains(n){return this===n||this.children.some(c=>c.contains(n));}remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}
  getBoundingClientRect(){return {top:100,bottom:900,height:800};}setPointerCapture(id){this.capture=id;}releasePointerCapture(){this.capture=null;}
}
function documentModel(){const doc={createElement:t=>new Node(t,doc),createTextNode:t=>{const n=new Node('#text',doc);n.textContent=t;return n;}};doc.body=doc.createElement('body');doc.defaultView=doc.createElement('window');return doc;}
const nodes=(root,p)=>[root,...root.children.flatMap(n=>nodes(n,p))].filter(p);
const flush=async()=>{for(let n=0;n<12;n++)await Promise.resolve();};
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve};};
async function fixture(extra={}){
  const doc=documentModel(),workspace=doc.createElement('div'),origin=doc.createElement('div'),host=doc.createElement('div');doc.body.append(workspace);workspace.append(origin,host);origin.focus();
  const text='# TODO Alpha\nSCHEDULED: <2026-11-09 Mo>\n# TODO Beta\nSCHEDULED: <2026-11-10 Di>\n# TODO Gamma\nSCHEDULED: <2026-11-11 Mi>';
  const vault={name:'synthetic',async *entries(){yield ['qa.md',{kind:'file'}];},async getFileHandle(){return {async getFile(){return {async arrayBuffer(){return new TextEncoder().encode(text).buffer;}};}};}};
  const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(vault);const calls=[];
  let controller;controller=createAgendaView({index,document:doc,host,workspace,view:{state:{},scrollDOM:{},focus:()=>origin.focus()},now:()=>new Date(2026,10,9),execute:id=>{if(id==='agenda.week')controller.openWeek();},navigate:async(...args)=>{calls.push(args);return true;},onClose:()=>origin.focus(),...extra});
  return {doc,workspace,origin,host,index,vault,text,controller,calls,results:()=>nodes(doc.body,n=>n.className==='agenda-results')[0],button:label=>nodes(doc.body,n=>n.tagName==='button'&&n.textContent.includes(label))[0],key:(key,patch={})=>doc.activeElement.emit('keydown',{key,...patch})};
}

test('QA separator bounds, pointer ownership, modifier guards and teardown retain editor state',()=>{
  const doc=documentModel(),workspace=doc.createElement('div'),host=doc.createElement('div');doc.body.append(workspace);workspace.append(host);workspace.style.setProperty('--work-panel-share','45%');const state={},view={state,scrollDOM:{scrollTop:20,scrollLeft:7,scrollHeight:1000,clientHeight:100}};
  const split=createAgendaSplit({host,workspace,view,document:doc}),separator=host.children[0];split.setOpen(true);assert.equal(separator.attributes['aria-valuenow'],'50');
  for(const modifiers of [{altKey:true},{ctrlKey:true},{shiftKey:true},{metaKey:true},{isComposing:true}])separator.emit('keydown',{key:'End',...modifiers});assert.equal(separator.attributes['aria-valuenow'],'50');
  separator.emit('pointerdown',{button:0,pointerId:1});separator.emit('pointermove',{pointerId:2,clientY:100});assert.equal(separator.attributes['aria-valuenow'],'50');separator.emit('pointermove',{pointerId:1,clientY:0});assert.equal(separator.attributes['aria-valuenow'],'80');separator.emit('pointermove',{pointerId:1,clientY:1000});assert.equal(separator.attributes['aria-valuenow'],'20');
  separator.emit('pointercancel',{pointerId:1});separator.emit('pointermove',{pointerId:1,clientY:500});assert.equal(separator.attributes['aria-valuenow'],'20');split.destroy();assert.equal(separator.isConnected,false);assert.equal(workspace.style.getPropertyValue('--work-panel-share'),'45%');assert.equal(Object.values(separator.listeners).flat().length,0);assert.equal(view.state,state);
});

test('QA follow starts off; only Shift+F toggles, with no Alt/Control/Meta/IME/repeat toggles',async()=>{
  const f=await fixture();f.controller.openWeek();
  for(const patch of [{altKey:true,shiftKey:true},{ctrlKey:true,shiftKey:true},{metaKey:true,shiftKey:true},{isComposing:true,shiftKey:true},{keyCode:229,shiftKey:true},{repeat:true,shiftKey:true},{shiftKey:true,getModifierState:()=>true}])f.key('F',patch);
  await new Promise(r=>setTimeout(r,25));assert.equal(f.calls.length,0);f.key('F',{shiftKey:true});await new Promise(r=>setTimeout(r,250));assert.equal(f.calls.length,1);assert.equal(f.calls[0][1]?.follow,true);assert.equal(f.doc.activeElement,f.results());assert.equal(f.controller.active,true);f.key('q');assert.equal(f.doc.activeElement,f.origin);f.controller.destroy();
});

test('QA no deferred navigation after close/off/vault switch/destroy or keyboard focus exit',async()=>{
  for(const action of ['close','off','vault','destroy','focus']){
    const f=await fixture();f.controller.openWeek();f.key('F',{shiftKey:true});
    if(action==='close')f.controller.close();if(action==='off')f.key('F',{shiftKey:true});if(action==='vault')f.controller.update({...f.index.snapshot(),epoch:999});if(action==='destroy')f.controller.destroy();if(action==='focus')f.origin.focus();
    await new Promise(r=>setTimeout(r,250));assert.equal(f.calls.length,0,action);f.controller.destroy();
  }
});

test('QA explicit navigation resolving after close and reopen cannot close a newer agenda',async()=>{
  const gate=deferred();let calls=0;const f=await fixture({navigate:async()=>{calls++;return gate.promise;}});f.controller.openWeek();f.key('Enter');assert.equal(calls,1);f.controller.close();f.controller.openWeek();gate.resolve(true);await flush();assert.equal(f.controller.active,true);assert.equal(f.doc.activeElement,f.results());f.controller.destroy();
});

test('QA pending follow uses current revision ID after index refresh without changing row identity',async()=>{
  const f=await fixture();f.controller.openWeek();f.key('F',{shiftKey:true});const old=f.index.query()[0].id;
  await f.index.rebuild();f.controller.update(f.index.snapshot());assert.notEqual(f.index.query()[0].id,old);
  await new Promise(r=>setTimeout(r,250));assert.equal(f.calls.length,1);assert.ok(f.index.source(f.calls[0][0]),'Follow must not navigate with an obsolete index ID');f.controller.destroy();
});

test('QA rapid traversal coalesces to latest row and follow completion leaves agenda focused',async()=>{
  const f=await fixture();f.controller.openWeek();f.key('F',{shiftKey:true});for(let n=0;n<30;n++)f.key('ArrowDown');
  await new Promise(r=>setTimeout(r,250));assert.equal(f.calls.length,1);assert.match(f.index.source(f.calls[0][0]).title,/Gamma/);assert.equal(f.doc.activeElement,f.results());assert.equal(f.controller.active,true);f.controller.destroy();
});

test('QA follow keeps commit close-lock and permits normal close only after completion',async()=>{
  const f=await fixture();f.controller.openWeek();f.key('F',{shiftKey:true});f.controller.setCommitting(true);f.key('q');f.key('Escape');f.controller.close();f.key('F',{shiftKey:true});assert.equal(f.controller.active,true);assert.match(f.controller.element.textContent,/gesperrt/);
  f.controller.setCommitting(false);f.controller.close();assert.equal(f.controller.active,false);await new Promise(r=>setTimeout(r,250));assert.equal(f.calls.length,0);f.controller.destroy();
});

test('QA 1200 lifecycle cycles release debounce handles and UI listeners (bounded model resource probe)',async t=>{
  const started=performance.now(),samples=[],latencies=[];let maxTimers=0;
  for(let n=0;n<1200;n++){
    const timers=new Map();let seq=0;const start=performance.now(),f=await fixture({timers:{setTimeout(fn){timers.set(++seq,fn);return seq;},clearTimeout(id){timers.delete(id);}}});
    f.controller.openWeek();f.key('F',{shiftKey:true});f.key('ArrowDown');maxTimers=Math.max(maxTimers,timers.size);f.controller.close();assert.equal(timers.size,0);f.controller.openDispatcher();f.controller.openTodos();f.key('F',{shiftKey:true});const dialog=f.controller.element,separator=f.host.children.find(n=>n.className==='agenda-separator');f.controller.destroy();assert.equal(timers.size,0);assert.equal(dialog.isConnected,false);assert.equal(Object.values(dialog.listeners).flat().length,0);assert.equal(Object.values(separator.listeners).flat().length,0);latencies.push(performance.now()-start);
    if(n===0||n===599||n===1199){globalThis.gc?.();samples.push({cycle:n+1,elapsedMs:Math.round(performance.now()-started),heapUsed:process.memoryUsage().heapUsed});}
  }
  assert.equal(maxTimers,1);latencies.sort((a,b)=>a-b);t.diagnostic(JSON.stringify({scope:'DOM model, not native/hour-scale evidence',durationMs:Math.round(performance.now()-started),cycles:1200,maxTimers,gc:!!globalThis.gc,samples,p50Ms:latencies[599],p95Ms:latencies[1139],p99Ms:latencies[1187]}));
});

test('QA docked agenda permits actual edit history and explicit save while modal/focused agenda isolates editor commands',()=>{
  let state=EditorState.create({doc:'# TODO Synthetic',extensions:history()}),saved='',saves=0;
  const context={busy:false,agendaActive:true,agendaDocked:true,agendaFocused:false,hasDocument:true,synthetic:true,vault:{},get state(){return state;}};
  const target={get state(){return state;},dispatch:t=>{state=t.state??state.update(t).state;}};
  const registry=createCommandRegistry(commandDefinitions({'edit.undo':()=>undo(target),'edit.redo':()=>redo(target),'file.save':()=>{saved=state.doc.toString();saves++;return true;}}),()=>context);
  state=state.update({changes:{from:state.doc.length,insert:' edited'}}).state;assert.equal(registry.execute('edit.undo'),true);assert.equal(state.doc.toString(),'# TODO Synthetic');assert.equal(registry.execute('edit.redo'),true);assert.match(state.doc.toString(),/edited$/);assert.equal(registry.execute('file.save'),true);assert.equal(saved,state.doc.toString());assert.equal(saves,1);
  for(const id of ['file.open','file.find','workspace.choose','draft.recover'])assert.equal(registry.availability(id).enabled,false,id);
  context.agendaFocused=true;for(const id of ['edit.undo','file.save'])assert.equal(registry.execute(id),false,id);assert.equal(saves,1);
  context.agendaFocused=false;context.agendaDocked=false;for(const id of ['edit.undo','file.save','view.line-wrap'])assert.equal(registry.availability(id).enabled,false,id);
  context.agendaDocked=true;context.busy=true;assert.equal(registry.availability('file.save').enabled,false);
});

test('QA editing the upper source cancels awaited follow and dirty navigation cannot overwrite or reindex it',async()=>{
  const pendingTimers=new Map();let seq=0,source;const permission=deferred(),notices=[],jumps=[];let opens=0;
  const f=await fixture({timers:{setTimeout(fn){pendingTimers.set(++seq,fn);return seq;},clearTimeout(id){pendingTimers.delete(id);}},cancelNavigation:()=>source?.cancel(),navigate:(id,options)=>source.navigate(id,options)});
  let state=EditorState.create({doc:f.text,extensions:history()});const session={hasDocument:true,vault:f.vault,path:'qa.md',text:f.text,dirty:false};const revision=f.index.snapshot().revision;
  source=createAgendaSource({index:f.index,getVault:()=>f.vault,getSession:()=>session,getState:()=>state,permission:()=>permission.promise,open:async()=>{opens++;},jump:from=>jumps.push(from),notify:m=>notices.push(m)});
  f.controller.openWeek();f.key('F',{shiftKey:true});const run=()=>{for(const [id,fn] of [...pendingTimers]){pendingTimers.delete(id);fn();}};run();await flush();
  f.results().emit('focusout',{relatedTarget:f.origin});f.origin.focus();state=state.update({changes:{from:state.doc.length,insert:'\nlocal draft'}}).state;session.text=state.doc.toString();session.dirty=true;permission.resolve();await flush();assert.equal(opens,0);assert.deepEqual(jumps,[]);assert.equal(f.index.snapshot().revision,revision);assert.match(session.text,/local draft$/);
  f.results().focus();f.key('ArrowDown');run();await flush();assert.equal(opens,0);assert.deepEqual(jumps,[]);assert.match(notices.at(-1),/Ungespeicherte/);assert.match(state.doc.toString(),/local draft$/);assert.equal(f.controller.active,true);assert.equal(f.index.snapshot().revision,revision);f.controller.destroy();
});

test('QA actual typing listener only persists the draft and does not refresh the agenda index',async()=>{
  const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n'),start=app.indexOf('EditorView.updateListener.of(update => {'),end=app.indexOf('\n  })\n];',start);assert.ok(start>=0&&end>start);
  let applied=0,rendered=0,timers=0,indexChanges=0;const before=EditorState.create({doc:'# TODO Source'}),transaction=before.update({changes:{from:before.doc.length,insert:' changed'}});
  const context={session:{applyChanges(changes){applied++;assert.deepEqual(changes,[{from:13,to:13,insert:' changed'}]);}},render(){rendered++;},clearTimeout(){},setTimeout(){timers++;return 1;},persistDraft(){throw Error('not scheduled synchronously');},status(){},agendaIndex:{updateFile(){indexChanges++;},rebuild(){indexChanges++;}}};
  const listener=new Function(...Object.keys(context),'let syncing=false,persistPending=false,timer;const EditorView={updateListener:{of:fn=>fn}};return '+app.slice(start,end)+'\n  });')(...Object.values(context));listener({docChanged:true,transactions:[transaction]});assert.equal(applied,1);assert.equal(rendered,1);assert.equal(timers,1);assert.equal(indexChanges,0);
});

test('QA actual app Registry context permits toolbar save without editor focus and prefix replacement preserves history',async()=>{
  const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n'),f=await fixture();f.controller.openWeek();
  const toolbar=f.doc.createElement('button');f.doc.body.append(toolbar);toolbar.focus();let state=EditorState.create({doc:'# TODO Synthetic',extensions:history()});state=state.update({changes:{from:state.doc.length,insert:' draft'}}).state;let saves=0;
  const view={hasFocus:false,get state(){return state;},dispatch:t=>{state=t.state??state.update(t).state;}};
  const start=app.indexOf('const registry=createCommandRegistry('),end=app.indexOf('\nconst surfaces=',start);assert.ok(start>=0&&end>start);
  const context={createCommandRegistry,commandDefinitions,handlers:{'file.save':()=>{saves++;return true;}},usesSharedWorkPanel:()=>false,prepareWorkPanel:()=>true,busy:false,agenda:f.controller,filePicker:null,session:{hasDocument:true},view,vault:f.vault,document:f.doc,$:()=>({checked:true,value:''}),status(){}};
  const registry=new Function(...Object.keys(context),app.slice(start,end)+';return registry;')(...Object.values(context));assert.equal(registry.execute('file.save'),true);assert.equal(saves,1);assert.equal(f.controller.active,true);assert.equal(view.hasFocus,false);
  const prepStart=app.indexOf('function prepareWorkPanel(){'),prepEnd=app.indexOf('\nconst prefix=',prepStart);const prepare=new Function('agenda',app.slice(prepStart,prepEnd)+';return prepareWorkPanel;')(f.controller);let shown=0;
  const prefix=createPrefixRouter({registry:{get:id=>({name:id}),availability:()=>({enabled:true}),execute:()=>true},getContext:()=>({busy:false,hasDocument:true}),showHelp:()=>{assert.equal(prepare(),true);shown++;}});view.hasFocus=true;f.origin.focus();const before=state;
  prefix.keyDown({key:'c',ctrlKey:true,preventDefault(){}},view);assert.equal(shown,1);assert.equal(f.controller.active,false);assert.equal(state,before);assert.equal(undo(view),true);assert.equal(state.doc.toString(),'# TODO Synthetic');prefix.cancel();f.controller.destroy();
});

test('QA actual app agenda-close callback does not invalidate the prefix captured before shared helper opens',async()=>{
  const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');const editable=new Compartment();let state=EditorState.create({doc:'# TODO Source',extensions:[history(),editable.of([])]});const view={hasFocus:true,get state(){return state;},dispatch:spec=>{state=state.update(spec).state;}};
  const busyStart=app.indexOf('function setBusy(value) {'),busyEnd=app.indexOf('\nfunction syncEditor()',busyStart);let f;const setBusy=new Function('view','editable','EditorState','EditorView','document','session','prefix','workPanel','emacs','agenda','let busy=false;'+app.slice(busyStart,busyEnd)+';return setBusy;')(view,editable,EditorState,EditorView,{querySelectorAll:()=>[]},{hasDocument:true},{cancel(){}},{close(){}},{invalidate(){}},{get active(){return f?.controller.active;}});
  const start=app.indexOf('agenda=createAgendaView('),end=app.indexOf("\nhandlers['agenda.dispatch']",start);assert.ok(start>=0&&end>start);const configContext={createAgendaView:options=>options,agendaIndex:{},$:()=>({}),view,registry:{},setBusy,busy:false,prefix:{cancel(){}},workPanel:{close(){}},emacs:{invalidate(){}},agendaSource:{cancel(){}},run:()=>{},requireSynthetic(){},session:{},vault:{}};
  const config=new Function(...Object.keys(configContext),'let agenda;'+app.slice(start,end)+';return agenda;')(...Object.values(configContext));f=await fixture({onActiveChange:config.onActiveChange});f.controller.openWeek();f.origin.focus();let executed=0;
  const prepStart=app.indexOf('function prepareWorkPanel(){'),prepEnd=app.indexOf('\nconst prefix=',prepStart),prepare=new Function('agenda',app.slice(prepStart,prepEnd)+';return prepareWorkPanel;')(f.controller);
  const prefix=createPrefixRouter({registry:{get:id=>({name:id}),availability:()=>({enabled:true}),execute:()=>{executed++;return true;}},getContext:()=>({busy:false,hasDocument:true}),showHelp:()=>prepare()});prefix.keyDown({key:'c',ctrlKey:true,preventDefault(){}},view);prefix.keyUp({key:'c'});prefix.keyDown({key:'l',preventDefault(){}},view);assert.equal(executed,1,'Closing dock for prefix help must preserve the captured prefix state');assert.equal(f.controller.active,false);prefix.cancel();f.controller.destroy();
});

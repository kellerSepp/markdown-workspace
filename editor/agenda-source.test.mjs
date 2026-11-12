import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgendaSource} from './agenda-source.mjs';
import {createAgendaIndex} from './agenda-index.mjs';
import {EditorState,StateEffect} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {todoRules,reloadTodo} from './todo.mjs';
const bytes=t=>new TextEncoder().encode(t);
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve};};
async function fixture(){
  let text='# TODO One\n\n# TODO Duplicate\n\n# TODO Duplicate',readGate=null,permissionGate=null,state={},opened=0;const jumps=[],notices=[];
  const handle={async getFile(){if(readGate)await readGate.promise;return {async arrayBuffer(){return bytes(text).buffer;}};}};
  const vault={name:'synthetic',async *entries(){yield ['a.md',{kind:'file'}];},async getFileHandle(){return handle;}};
  const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(vault);
  const session={hasDocument:false,dirty:false,text:''};let selectedVault=vault,selectedSession=session,openHook=null;
  const source=createAgendaSource({index,getVault:()=>selectedVault,getSession:()=>selectedSession,getState:()=>state,permission:async()=>{if(permissionGate)await permissionGate.promise;},jump:from=>jumps.push(from),notify:t=>notices.push(t),open:async target=>{opened++;if(openHook)await openHook();session.text=text;session.vault=target.vault;session.path=target.path;session.hasDocument=true;}});
  return {index,source,session,vault,jumps,notices,get opened(){return opened;},set text(value){text=value;},get text(){return text;},set state(value){state=value;},set readGate(value){readGate=value;},set permissionGate(value){permissionGate=value;},set openHook(value){openHook=value;},set selectedVault(value){selectedVault=value;},set selectedSession(value){selectedSession=value;}};
}
test('Agenda reserves cancellation before asynchronous permission checks, not only before file reads',async()=>{
  const f=await fixture(),gate=deferred();f.permissionGate=gate;const pending=f.source.navigate(f.index.query()[0].id);f.source.cancel();gate.resolve();assert.equal(await pending,false);assert.equal(f.opened,0);assert.equal(f.jumps.length,0);
});
test('Agenda source validates duplicate title by offset, opens exact heading and never writes',async()=>{
  const f=await fixture(),target=f.index.query().at(-1);assert.equal(await f.source.navigate(target.id),true);assert.equal(f.opened,1);assert.deepEqual(f.jumps,[target.from]);
});

test('Agenda follow passes focus policy through validated cross-file and same-file jumps only',async()=>{
  const f=await fixture(),jumps=[];
  const source=createAgendaSource({index:f.index,getVault:()=>f.vault,getSession:()=>f.session,getState:()=>null,
    open:async target=>Object.assign(f.session,{hasDocument:true,vault:target.vault,path:target.path,text:f.text}),
    jump:(from,options)=>jumps.push({from,...options})});
  const first=f.index.query()[0],last=f.index.query().at(-1);
  assert.equal(await source.navigate(first.id,{follow:true}),true);
  assert.equal(await source.navigate(last.id,{follow:true}),true);
  assert.equal(await source.navigate(first.id),true);
  assert.deepEqual(jumps,[{from:first.from,follow:true},{from:last.from,follow:true},{from:first.from,follow:false}]);
  f.session.dirty=true;
  assert.equal(await source.navigate(last.id,{follow:true}),false);
  assert.equal(jumps.length,3);
});
test('Agenda source rejects all dirty editor navigation and preserves same-file history boundary',async()=>{
  const f=await fixture();f.session.dirty=true;assert.equal(await f.source.navigate(f.index.query()[0].id),false);assert.equal(f.opened,0);assert.match(f.notices[0],/Ungespeicherte/);
  f.session.dirty=false;f.session.hasDocument=true;f.session.vault=f.vault;f.session.path='a.md';f.session.text=f.text;assert.equal(await f.source.navigate(f.index.query()[1].id),true);assert.equal(f.opened,0);
});
test('Agenda source rejects changed offsets/status and stale M7a IDs without guessing',async()=>{
  const f=await fixture(),id=f.index.query()[0].id;f.text='prefix\n'+f.text;assert.equal(await f.source.navigate(id),false);assert.equal(f.opened,0);assert.match(f.notices[0],/geändert/);
  await f.index.rebuild();assert.equal(await f.source.navigate(id),false);assert.match(f.notices.at(-1),/veraltet/);
});
test('Agenda source invalidates pending reads on cancel, vault/state/session changes and newer index',async()=>{
  for(const change of ['cancel','vault','state','session','index']){
    const f=await fixture(),gate=deferred();f.readGate=gate;const pending=f.source.navigate(f.index.query()[0].id);await Promise.resolve();
    if(change==='cancel')f.source.cancel();if(change==='vault')f.selectedVault={};if(change==='state')f.state={};if(change==='session')f.selectedSession={};if(change==='index')await f.index.selectVault(null);
    gate.resolve();assert.equal(await pending,false,change);assert.equal(f.opened,0,change);assert.equal(f.jumps.length,0,change);
  }
});
test('Agenda source rejects a newer revision/dirty session after the awaited open and a changed second read',async()=>{
  for(const change of ['revision','dirty','text']){
    const f=await fixture(),id=f.index.query()[0].id;f.openHook=async()=>{if(change==='revision')await f.index.rebuild();if(change==='dirty')f.session.dirty=true;if(change==='text')f.text='# TODO Other';};
    assert.equal(await f.source.navigate(id),false,change);assert.equal(f.jumps.length,0,change);assert.ok(f.notices.length);
  }
});
test('Agenda source keeps same-file editor on external change and reports isolated read errors',async()=>{
  const f=await fixture();f.session.hasDocument=true;f.session.path='a.md';f.session.vault=f.vault;f.session.text='old';assert.equal(await f.source.navigate(f.index.query()[0].id),false);assert.equal(f.opened,0);assert.match(f.notices[0],/extern/);
  f.vault.getFileHandle=async()=>{throw Error('denied a.md');};assert.equal(await f.source.navigate(f.index.query()[0].id),false);assert.match(f.notices.at(-1),/denied/);
});
test('Awaited source reads tolerate parser-only states but reject actual doc, selection, workflow and readonly changes',async()=>{
 for(const change of ['parser','doc','selection','rules','readonly']){
  const f=await fixture(),gate=deferred(),state=EditorState.create({doc:f.text,extensions:[markdown(),todoRules]});f.state=state;f.permissionGate=gate;
  const pending=f.source.navigate(f.index.query()[0].id);
  if(change==='parser')f.state=state.update({}).state;
  if(change==='doc')f.state=state.update({changes:{from:0,insert:'x'}}).state;
  if(change==='selection')f.state=state.update({selection:{anchor:1}}).state;
  if(change==='rules')f.state=state.update({effects:reloadTodo.of({rules:[{name:'NEXT',key:'n',closed:false},{name:'FIN',key:'f',closed:true}]})}).state;
  if(change==='readonly')f.state=state.update({effects:StateEffect.appendConfig.of(EditorState.readOnly.of(true))}).state;
  gate.resolve();assert.equal(await pending,change==='parser',change);assert.equal(f.opened,change==='parser'?1:0,change);
 }
});

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {EditorState,Compartment} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undoDepth} from '@codemirror/commands';
import {codeFolding,foldEffect,foldedRanges} from '@codemirror/language';
import {createAgendaIndex,parseAgendaFile} from '../editor/agenda-index.mjs';
import {createAgendaView} from '../editor/agenda-view.mjs';
import {createAgendaSource} from '../editor/agenda-source.mjs';
import {agendaWeek,addAgendaDays,moveAgendaWeek,projectAgendaWeek,projectAgendaTodos,localToday} from '../editor/agenda-model.mjs';
import {createSession} from '../editor/storage-session.mjs';
import {createCommandRegistry} from '../editor/command-registry.mjs';
import {commandDefinitions} from '../editor/commands.mjs';
import {createCommandSurfaces} from '../editor/command-surfaces.mjs';
import {createPrefixRouter} from '../editor/prefix-router.mjs';

// Independent synthetic behavioral model. No browser or native claims.
const encoded=s=>new TextEncoder().encode(s),immediate=async()=>{},flush=()=>new Promise(r=>setImmediate(r));
const gate=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve};};
let groups=0;const findings=[],measurements={};
async function check(name,fn){if(process.argv.includes('--select')&&!name.startsWith('Select:'))return;try{await fn();groups++;console.log('PASS '+name);}catch(error){findings.push({name,error:error.message});console.log('FINDING '+name+': '+error.stack);}}
class Node{
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.style={};this.dataset={};this._text='';this.hidden=false;this.disabled=false;this.scrollTop=0;this.clientHeight=90;this.offsetHeight=20;this.tabIndex=tag==='button'||tag==='input'?0:-1;this.classes=new Set();this.classList={add:n=>this.classes.add(n),toggle:(n,on)=>on?this.classes.add(n):this.classes.delete(n),contains:n=>this.classes.has(n)};}
  get isConnected(){return this===this.ownerDocument.body||!!this.parent?.isConnected;}
  get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}set textContent(v){this.replaceChildren();this._text=String(v);}
  get offsetTop(){return Math.max(0,this.parent?.children.indexOf(this)??0)*20;}get scrollHeight(){return Math.max(this.clientHeight,this.children.length*20);}
  append(...nodes){for(const n of nodes){const el=typeof n==='string'?this.ownerDocument.createTextNode(n):n;el.parent=this;this.children.push(el);}}
  replaceChildren(...nodes){this.children.forEach(n=>n.parent=null);this.children=[];this._text='';this.append(...nodes);}
  setAttribute(n,v){this.attributes[n]=String(v);}removeAttribute(n){delete this.attributes[n];}
  addEventListener(type,fn,capture=false){(this.listeners[type]??=[]).push({fn,capture});}removeEventListener(type,fn){this.listeners[type]=this.listeners[type]?.filter(x=>x.fn!==fn);}
  contains(node){return node===this||this.children.some(n=>n.contains(node));}
  closest(selector){for(let n=this;n;n=n.parent)if(selector.split(',').some(s=>(n.className??'').split(' ').includes(s.trim().slice(1))))return n;return null;}
  focus(){if(this.ownerDocument.modal&&!this.ownerDocument.modal.contains(this))return;this.ownerDocument.activeElement=this;}
  showModal(){this.open=true;this.ownerDocument.modal=this;this.ownerDocument.dialogEvents.push('show');}
  close(){this.open=false;if(this.ownerDocument.modal===this)this.ownerDocument.modal=null;this.ownerDocument.dialogEvents.push('close');}
  remove(){this.parent?.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}scrollIntoView(){throw Error('Agenda must scroll locally');}
  emit(type,props={}){
    const event={type,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...props};
    const path=[];for(let el=this;el;el=el.parent)path.push(el);
    for(const el of [...path].reverse())for(const l of el.listeners[type]??[])if(l.capture){l.fn(event);if(event.stopped)return event;}
    for(const el of path){for(const l of el.listeners[type]??[])if(!l.capture)l.fn(event);if(event.stopped)break;}
    return event;
  }
  click(){if(!this.disabled)this.emit('click');}
}
function documentModel(){const doc={modal:null,dialogEvents:[],createElement:t=>new Node(t,doc),createTextNode:t=>{const n=new Node('#text',doc);n._text=t;return n;}};doc.defaultView=new Node('window',doc);doc.body=new Node('body',doc);doc.body.parent=doc.defaultView;doc.addEventListener=(...a)=>doc.defaultView.addEventListener(...a);doc.removeEventListener=(...a)=>doc.defaultView.removeEventListener(...a);doc.querySelectorAll=selector=>descendants(doc.body,n=>selector.split(',').includes(n.tagName));return doc;}
const descendants=(root,fn)=>[...(fn(root)?[root]:[]),...root.children.flatMap(n=>descendants(n,fn))];
function nativeKey(target,key,props={}){const event=target.emit('keydown',{key,...props});if(!event.defaultPrevented){if(key==='Enter'&&target.tagName==='button')target.click();if(key===' '&&target.tagName==='input'){target.checked=!target.checked;target.emit('change');}}return event;}
function fsVault(initial,name='Synthetic'){
  const sources=new Map(Object.entries(initial));const reads=new Map();let readHook=null,writes=0;
  const dir=prefix=>({name,kind:'directory',async queryPermission(){return 'granted';},async isSameEntry(other){return other===root;},async *entries(){const emitted=new Set();for(const path of sources.keys()){if(!path.startsWith(prefix))continue;const rest=path.slice(prefix.length),entry=rest.split('/')[0];if(emitted.has(entry))continue;emitted.add(entry);yield [entry,rest.includes('/')?dir(prefix+entry+'/'):handle(prefix+entry)];}},async getDirectoryHandle(name,options){assert.ok(!options?.create,'no directory creation');return dir(prefix+name+'/');},async getFileHandle(name,options){assert.ok(!options?.create,'no file creation');if(!sources.has(prefix+name))throw Error('NotFound '+prefix+name);return handle(prefix+name);}});
  function handle(path){return {kind:'file',async getFile(){reads.set(path,(reads.get(path)??0)+1);if(readHook)await readHook(path,reads.get(path));const value=sources.get(path);if(value instanceof Error)throw value;if(value===undefined)throw Error('NotFound '+path);const bytes=value instanceof Uint8Array?value:encoded(value);return {async arrayBuffer(){return bytes.slice().buffer;}};},async createWritable(){writes++;throw Error('No writes authorized through agenda');}};}
  const root=dir('');return {root,sources,reads,get writes(){return writes;},set readHook(hook){readHook=hook;}};
}
async function indexed(initial){const fs=fsVault(initial),index=createAgendaIndex({yieldTask:immediate});await index.selectVault(fs.root);return {fs,index};}
function realSession(){const drafts=new Map();let n=0;return createSession({store:{async put(k,v){drafts.set(k,v);},async get(k){return drafts.get(k);},async keys(){return [...drafts.keys()];}},id:()=>String(++n),locks:{request:async(_key,fn)=>fn()}});}
const app=await readFile(new URL('../editor/app.mjs',import.meta.url),'utf8');
function appChunk(start,end='\n});'){const from=app.indexOf(start),to=app.indexOf(end,from)+end.length;assert.ok(from>=0&&to>from);return app.slice(from,to);}
async function appFixture(initial={'a.md':'# TODO Old','sub/b.md':'# TODO Exact\n\n## TODO Same\n\n## TODO Same'}){
  const fs=fsVault(initial),index=createAgendaIndex({yieldTask:immediate}),session=realSession();await index.selectVault(fs.root);await session.open({vault:fs.root,handle:await fs.root.getFileHandle('a.md'),path:'a.md'});
  const doc=documentModel(),origin=doc.createElement('div');doc.body.append(origin);origin.focus();const events=[],messages=[],jumps=[];
  const files=doc.createElement('select');files.id='files';Object.defineProperty(files,'options',{get:()=>files.children});Object.defineProperty(files,'value',{get:()=>files._selectedValue??'',set:value=>{files._selectedValue=files.options.some(o=>o.value===value)?value:'';}});doc.body.append(files);
  const OptionModel=function(text,value){const option=doc.createElement('option');option.textContent=text;option.value=value;return option;};
  for(const path of Object.keys(initial))files.append(new OptionModel(path,path));files.value=session.path;
  const editable=new Compartment();const makeState=(text,locked=false)=>EditorState.create({doc:text,extensions:[history(),markdown({base:markdownLanguage}),codeFolding(),editable.of(EditorState.readOnly.of(locked))]});
  const view={dom:origin,state:makeState(session.text),dispatch(spec){if(spec.selection)jumps.push(spec.selection.anchor);this.state=this.state.update(spec).state;},focus(){events.push('editor-focus');origin.focus();}};
  let permissionHook=async()=>{};
  let agendaRef;const context={createAgendaSource,createAgendaView,agendaIndex:index,vault:fs.root,session,view,EditorView,$:id=>{assert.equal(id,'files');return files;},Option:OptionModel,permission:async()=>permissionHook(),status:t=>messages.push(t),useRingVault:async()=>{},syncEditor(){events.push('sync');view.state=makeState(session.text,true);},prefix:{cancel(){events.push('prefix-cancel');}},workPanel:{close(){events.push('panel-close');}},emacs:{invalidate(){events.push('mark-cancel');}},requireSynthetic(){},registry:{execute(id){if(id==='agenda.refresh')return index.rebuild();if(id==='agenda.week')return agendaRef.openWeek();if(id==='agenda.todo')return agendaRef.openTodos();if(id==='agenda.dispatch')return agendaRef.openDispatcher();}}};
  const busyDeps={prefix:context.prefix,workPanel:context.workPanel,emacs:context.emacs,document:doc,view,editable,EditorState,EditorView,session,render(){},status:context.status,persistDraft:async()=>{}};
  const busyCode=appChunk('function setBusy(value) {','\n}')+'\n'+appChunk('async function run(action) {','\n}');
  const runner=new Function(...Object.keys(busyDeps),'let busy=false,timer,persistPending=false;'+busyCode+';return {run,get busy(){return busy;}};')(...Object.values(busyDeps));context.run=runner.run;
  // Only the actual app callbacks are evaluated; dependencies remain explicit synthetic adapters.
  const chunk=appChunk('function syncAgendaFileSelection(){','\n}')+'\n'+appChunk('agendaSource=createAgendaSource({')+'\n'+appChunk('agenda=createAgendaView({');
  const make=new Function(...Object.keys(context),'document','let agendaSource,agenda,persistPending=false;'+chunk+';return {agendaSource,agenda,syncSelection:syncAgendaFileSelection,setSelectedVault:next=>vault=next};');
  // createAgendaView takes document through its default in app, supplied here explicitly by factory wrapper.
  context.createAgendaView=options=>createAgendaView({...options,document:doc,now:()=>new Date(2026,10,8,12)});
  const {agendaSource,agenda,syncSelection,setSelectedVault}=make(...Object.values(context),doc);agendaRef=agenda;
  const sourceId=()=>index.query().find(r=>r.path==='sub/b.md')?.id;
  return {fs,index,session,doc,origin,view,events,messages,jumps,files,syncSelection,setSelectedVault,source:agendaSource,agenda,sourceId,get busy(){return runner.busy;},set permissionHook(fn){permissionHook=fn;},rows:()=>descendants(agenda.element,n=>n.className==='agenda-row'),results:()=>descendants(agenda.element,n=>n.className==='agenda-results')[0],key:(key,p={})=>nativeKey(doc.activeElement,key,p)};
}

await check('Select: actual app source switches nested same-name file and same-file jump restores selection',async()=>{
  const f=await appFixture({'a.md':'# TODO Initial','project.md':'# TODO Root','team/project.md':'# TODO Nested'}),nested=f.index.query().find(r=>r.path==='team/project.md');f.files.value='project.md';
  assert.equal(await f.source.navigate(nested.id),true);assert.equal(f.session.path,'team/project.md');assert.equal(f.files.value,'team/project.md');assert.equal(f.view.state.doc.toString(),'# TODO Nested');
  const options=f.files.options.length,syncs=f.events.filter(e=>e==='sync').length;f.files.value='project.md';assert.equal(await f.source.navigate(nested.id),true);assert.equal(f.files.value,'team/project.md');assert.equal(f.files.options.length,options);assert.equal(f.events.filter(e=>e==='sync').length,syncs,'same source must not reopen');assert.equal(f.fs.writes,0);
});
await check('Select: absent relative option is inserted once with matching label and value',async()=>{
  const f=await appFixture({'a.md':'# TODO Initial','project.md':'# TODO Root','team/project.md':'# TODO Nested'}),target=f.index.query().find(r=>r.path==='team/project.md');f.files.replaceChildren(...f.files.options.filter(o=>o.value!=='team/project.md'));f.files.value='project.md';
  assert.equal(await f.source.navigate(target.id),true);assert.equal(f.files.value,'team/project.md');const matching=f.files.options.filter(o=>o.value==='team/project.md');assert.equal(matching.length,1);assert.equal(matching[0].textContent,'team/project.md');
  f.files.value='project.md';assert.equal(await f.source.navigate(target.id),true);assert.equal(f.files.options.filter(o=>o.value==='team/project.md').length,1);assert.equal(f.files.value,f.session.path);
});
await check('Select: dirty and read-failure refusals preserve current selection and Session',async()=>{
  const f=await appFixture({'a.md':'# TODO Initial','project.md':'# TODO Root','team/project.md':'# TODO Nested'}),target=f.index.query().find(r=>r.path==='team/project.md');f.files.value='project.md';f.session.applyChanges([{from:0,to:0,insert:'unsaved\n'}]);const text=f.session.text;
  assert.equal(await f.source.navigate(target.id),false);assert.equal(f.files.value,'project.md');assert.equal(f.session.path,'a.md');assert.equal(f.session.text,text);
  const failed=await appFixture({'a.md':'# TODO Initial','project.md':'# TODO Root','team/project.md':'# TODO Nested'}),other=failed.index.query().find(r=>r.path==='team/project.md');failed.files.value='project.md';failed.fs.sources.set('team/project.md',Error('Read denied'));
  assert.equal(await failed.source.navigate(other.id),false);assert.equal(failed.files.value,'project.md');assert.equal(failed.session.path,'a.md');assert.match(failed.messages.at(-1),/Read denied/);assert.equal(failed.files.options.length,3);
});
await check('Select: successful open followed by second-read mismatch still reflects actual loaded source',async()=>{
  const f=await appFixture({'a.md':'# TODO Initial','project.md':'# TODO Root','team/project.md':'# TODO Nested'}),target=f.index.query().find(r=>r.path==='team/project.md');f.files.value='project.md';f.fs.reads.set('team/project.md',0);f.fs.readHook=async(path,n)=>{if(path==='team/project.md'&&n===2)f.fs.sources.set(path,'prefix\n# TODO Changed during open');};
  assert.equal(await f.source.navigate(target.id),false);assert.equal(f.session.path,'team/project.md');assert.equal(f.files.value,'team/project.md');assert.equal(f.view.state.doc.toString(),'prefix\n# TODO Changed during open');assert.equal(f.jumps.length,0);assert.match(f.messages.at(-1),/während des Öffnens geändert/);
});
await check('Select: selected-vault identity guard does not adopt an older Session path',async()=>{
  const f=await appFixture({'a.md':'# TODO Initial','project.md':'# TODO Root'}),other=fsVault({'foreign.md':'# TODO Foreign'});const option=f.doc.createElement('option');option.textContent=option.value='foreign.md';f.files.replaceChildren(option);f.files.value='foreign.md';f.setSelectedVault(other.root);f.syncSelection();
  assert.equal(f.files.value,'foreign.md');assert.deepEqual(f.files.options.map(o=>o.value),['foreign.md']);assert.equal(f.session.path,'a.md');assert.equal(f.session.vault,f.fs.root);
});

await check('ISO calendar week/year, leap/DST and valid boundary dates',async()=>{
  for(const [date,year,week,monday] of [['2015-12-31',2015,53,'2015-12-28'],['2016-01-03',2015,53,'2015-12-28'],['2016-01-04',2016,1,'2016-01-04'],['2020-12-31',2020,53,'2020-12-28'],['2027-01-01',2026,53,'2026-12-28'],['2027-01-04',2027,1,'2027-01-04'],['0001-01-01',1,1,'0001-01-01'],['9999-12-31',9999,52,'9999-12-27']])assert.deepEqual(agendaWeek(date),{year,week,monday});
  assert.equal(addAgendaDays('2028-02-28',1),'2028-02-29');assert.equal(addAgendaDays('2026-10-25',1),'2026-10-26');assert.equal(moveAgendaWeek('0001-01-01',-1),'0001-01-01');assert.equal(moveAgendaWeek('9999-12-27',1),'9999-12-27');assert.equal(localToday(new Date(2026,10,8,23,59)),'2026-11-08');
  assert.throws(()=>agendaWeek('2026-02-29'));assert.throws(()=>agendaWeek('0000-01-01'));
});
await check('physical synthetic fixture and documented week/TODO counts',async()=>{
  const files={};for(const path of ['project.md','team/project.md','team/jahreswechsel.md'])files[path]=await readFile(new URL('./m7b-agenda/'+path,import.meta.url),'utf8');const {index}=await indexed(files);
  assert.equal(index.query().length,13);assert.equal(index.snapshot().diagnostics.length,0);assert.equal(projectAgendaTodos(index).length,9);assert.equal(projectAgendaTodos(index,{includeClosed:true}).length,12);
  const week=projectAgendaWeek(index,{date:'2026-11-08',today:'2026-11-08'});assert.equal(week.days.flatMap(d=>d.entries).length,10);assert.deepEqual(week.days.map(d=>d.date),['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08']);
  const sun=week.days[6].entries;assert.equal(sun.length,5);assert.equal(sun.filter(e=>e.record.title==='Review vorbereiten').length,1);assert.equal(sun.find(e=>e.record.title==='Review vorbereiten').marks.length,2);assert.ok(sun.find(e=>!e.record.status));assert.ok(!sun.some(e=>e.record.closed));
  assert.equal(projectAgendaWeek(index,{date:'2026-11-09',today:'2026-11-08'}).days.flatMap(d=>d.entries).length,2);assert.equal(projectAgendaWeek(index,{date:'2027-01-01',today:'2026-11-08'}).days.flatMap(d=>d.entries).length,2);
});
await check('backlogs combine same-day kinds, retain times, and exclude completed/statusless carry-forward',async()=>{
  const {index}=await indexed({'a.md':'#+SEQ_TODO: NEXT(n) WAITING(w) | FIN(f) CANCELLED(c)\n# NEXT Both\nSCHEDULED: <2026-11-01 So 12:00-12:30> DEADLINE: <2026-11-08 So 08:00>\n# FIN Closed\nSCHEDULED: <2026-11-01 So> DEADLINE: <2026-11-08 So>\n# CANCELLED No carry\nDEADLINE: <2026-11-01 So>\n# Meeting\nSCHEDULED: <2026-11-01 So>\n# WAITING Untimed\nDEADLINE: <2026-11-08 So>'});
  const week=projectAgendaWeek(index,{date:'2026-11-08',today:'2026-11-08'});const entries=week.days[6].entries;assert.equal(entries.length,3);assert.equal(entries[0].record.title,'Both');assert.equal(entries[0].marks.length,2);assert.equal(entries[0].marks[0].endTime,'12:30');assert.equal(entries[0].marks[0].late,true);assert.equal(entries[0].marks[1].late,false);assert.equal(entries[1].marks[0].late,false);assert.ok(!entries.some(e=>e.record.status===null||e.record.status==='CANCELLED'));
  assert.equal(projectAgendaWeek(index,{date:'2026-11-16',today:'2026-11-08'}).days.flatMap(d=>d.entries).length,0);
});
await check('actual app dispatcher close preserves EditorState and default/native controls',async()=>{
  const f=await appFixture();const state=f.view.state;f.agenda.openDispatcher();assert.ok(f.events.includes('prefix-cancel'));assert.ok(f.events.includes('panel-close'));f.key('m');f.key('s');assert.equal(f.agenda.element.attributes['data-mode'],'dispatch');
  // Dispatcher direct registry callbacks are tested separately; use actual active choice click registration here.
  f.key('q');assert.equal(f.agenda.active,false);assert.equal(f.view.state,state);assert.equal(f.doc.activeElement,f.origin);f.agenda.openTodos();assert.equal(f.rows().length,4);
  const filter=descendants(f.agenda.element,n=>n.tagName==='input')[0];filter.focus();const enter=f.key('Enter');assert.equal(enter.defaultPrevented,false);f.key(' ');assert.equal(filter.checked,true);f.key('Escape');assert.equal(f.view.state,state);assert.equal(undoDepth(f.view.state),0);
});
await check('view keyboard/month/year navigation, local scroll and click/Enter selection',async()=>{
  const f=await appFixture({'a.md':'# TODO A\nDEADLINE: <2026-11-08 So>', 'sub/b.md':'# TODO B\nSCHEDULED: <2026-11-08 So 06:00>\n# TODO C\nSCHEDULED: <2026-11-08 So 08:00>'});f.agenda.openWeek();assert.match(f.agenda.element.textContent,/KW 45\/2026/);
  f.key('f');assert.match(f.agenda.element.textContent,/KW 46\/2026/);f.key('b');assert.match(f.agenda.element.textContent,/KW 45\/2026/);f.key('b');f.key('.');assert.match(f.agenda.element.textContent,/KW 45\/2026/);
  descendants(f.agenda.element,n=>n.tagName==='button'&&n.textContent==='f →')[0].focus();const enter=f.key('Enter');assert.equal(enter.defaultPrevented,false);assert.match(f.agenda.element.textContent,/KW 46\/2026/);f.key('.');
  f.key('ArrowDown');assert.equal(f.rows()[1].attributes['aria-selected'],'true');assert.ok(f.results().scrollTop>0);f.key('ArrowUp');assert.equal(f.rows()[0].attributes['aria-selected'],'true');f.key('q');
});
await check('modifier/IME/repeat isolation and registry/AltX guard',async()=>{
  const f=await appFixture();f.agenda.openDispatcher();for(const p of [{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229},{repeat:true},{getModifierState:()=>true}]){f.key('q',p);assert.equal(f.agenda.active,true);}
  let called=0;const ctx={busy:false,agendaActive:true,synthetic:true,vault:f.fs.root,hasDocument:true,state:f.view.state};const handlers=Object.fromEntries(['todo.next','edit.undo','structure.heading-demote','file.save','file.open','workspace.choose'].map(id=>[id,()=>called++]));const reg=createCommandRegistry(commandDefinitions(handlers),()=>ctx);
  for(const id of Object.keys(handlers)){assert.equal(reg.execute(id),false);}assert.equal(called,0);assert.equal(reg.availability('agenda.todo').enabled,true);
  const surfaces=createCommandSurfaces({registry:reg,view:f.view,document:f.doc,blocked:()=>f.agenda.active});surfaces.palette();assert.ok(!descendants(f.doc.body,n=>n.className==='command-palette')[0].open);f.doc.defaultView.emit('keydown',{key:'x',altKey:true});assert.ok(!descendants(f.doc.body,n=>n.className==='command-palette')[0].open);surfaces.destroy();f.agenda.close();
});
await check('real prefixrouter and Registry deliver C-c a only after release then dispatcher a/t',async()=>{
  const f=await appFixture();Object.defineProperty(f.view,'hasFocus',{get:()=>f.doc.activeElement===f.origin});const notices=[];const handlers={'agenda.dispatch':()=>f.agenda.openDispatcher(),'agenda.week':()=>f.agenda.openWeek(),'agenda.todo':()=>f.agenda.openTodos()};
  const registry=createCommandRegistry(commandDefinitions(handlers),()=>({state:f.view.state,busy:f.busy,hasDocument:true,synthetic:true,vault:f.fs.root,agendaActive:f.agenda.active}));const router=createPrefixRouter({registry,getContext:()=>({busy:f.busy,hasDocument:true}),showHelp(){},hideHelp(){},notify:t=>notices.push(t)});
  const down=(key,patch={})=>router.keyDown({key,preventDefault(){},...patch},f.view);
  down('c',{ctrlKey:true});down('a');assert.equal(f.agenda.active,false);down('c',{ctrlKey:true});router.keyUp({key:'c'});down('a',{ctrlKey:true});assert.equal(f.agenda.active,false);
  down('c',{ctrlKey:true});router.keyUp({key:'c'});down('a');assert.equal(f.agenda.element.attributes['data-mode'],'dispatch');const buttons=descendants(f.agenda.element,n=>n.tagName==='button');assert.equal(buttons.filter(n=>n.textContent.includes('geplant')&&n.disabled).length,2);f.key('t');assert.equal(f.agenda.element.attributes['data-mode'],'todo');assert.equal(f.rows().length,4);f.key('q');assert.equal(f.doc.activeElement,f.origin);
  down('c',{ctrlKey:true});router.keyUp({key:'c'});down('a');f.key('a');assert.equal(f.agenda.element.attributes['data-mode'],'week');f.key('Escape');assert.equal(f.agenda.active,false);assert.ok(notices.length>=2);
});
await check('actual App source navigation exact nested duplicate and focus after modal close',async()=>{
  const f=await appFixture(),target=f.index.query().filter(r=>r.path==='sub/b.md').at(-1);f.agenda.openTodos();const row=f.rows().find(r=>r.textContent.endsWith('TODO Same '))??f.rows().at(-1);assert.match(row.textContent,/sub\/b.md/);row.click();await flush();await flush();assert.equal(f.session.path,'sub/b.md');assert.equal(f.view.state.selection.main.head,target.from);assert.equal(f.session.text,f.fs.sources.get('sub/b.md'));assert.equal(f.agenda.active,false);assert.equal(f.doc.modal,null);assert.equal(f.doc.activeElement,f.origin);assert.equal(f.fs.writes,0);
});
await check('real dirty Session and same-source history remain intact',async()=>{
  const f=await appFixture();f.session.applyChanges([{from:0,to:0,insert:'unsaved\n'}]);f.view.state=f.view.state.update({changes:{from:0,insert:'unsaved\n'},userEvent:'input'}).state;const text=f.session.text,state=f.view.state;f.agenda.openTodos();f.rows().at(-1).click();await flush();assert.equal(f.session.path,'a.md');assert.equal(f.session.text,text);assert.ok(f.view.state.doc===state.doc);assert.ok(f.view.state.selection.eq(state.selection));assert.equal(undoDepth(f.view.state),undoDepth(state));assert.equal(f.session.dirty,true);assert.match(f.agenda.element.textContent,/Ungespeicherte/);await f.index.rebuild();f.agenda.update(f.index.snapshot());assert.equal(f.session.text,text);f.key('q');assert.ok(f.view.state.doc===state.doc);assert.ok(f.view.state.selection.eq(state.selection));assert.equal(f.view.state.readOnly,false);
});
await check('same-file folded target becomes visible without reopening source',async()=>{
  const f=await appFixture({'a.md':'# Parent\n\n## TODO Child\n\ncontent','sub/b.md':'# TODO Other'}),target=f.index.query().find(r=>r.path==='a.md');f.view.state=f.view.state.update({effects:foldEffect.of({from:8,to:f.session.text.length})}).state;assert.equal(foldedRanges(f.view.state).size,1);const before=f.view.state.doc;assert.equal(await f.source.navigate(target.id),true);assert.equal(f.view.state.doc,before);assert.equal(foldedRanges(f.view.state).size,0);assert.equal(f.view.state.selection.main.head,target.from);
});
await check('source rejects changed text/positions/definitions, read failures and stale identifiers',async()=>{
  for(const changed of ['prefix\n# TODO Exact','#+SEQ_TODO: NEXT(n) | FIN(f)\n# NEXT Exact','# DONE Exact']){const f=await appFixture();f.fs.sources.set('sub/b.md',changed);assert.equal(await f.source.navigate(f.sourceId()),false);assert.equal(f.session.path,'a.md');assert.equal(f.jumps.length,0);assert.match(f.messages.at(-1),/geändert/);}
  const f=await appFixture(),id=f.sourceId();f.fs.sources.set('sub/b.md',Error('Permission denied'));assert.equal(await f.source.navigate(id),false);assert.match(f.messages.at(-1),/Permission denied/);await f.index.rebuild();assert.equal(await f.source.navigate(id),false);assert.match(f.messages.at(-1),/veraltet/);assert.equal(f.session.path,'a.md');
});
await check('pending permission/read cancellation and newer index never navigate',async()=>{
  for(const phase of ['permission','read']){const f=await appFixture(),block=gate(),entered=gate();if(phase==='permission')f.permissionHook=async()=>{entered.resolve();await block.promise;};else f.fs.readHook=async(path)=>{if(path==='sub/b.md'){entered.resolve();await block.promise;}};const p=f.source.navigate(f.sourceId());await entered.promise;f.source.cancel();block.resolve();assert.equal(await p,false);assert.equal(f.session.path,'a.md');assert.equal(f.jumps.length,0);}
  const f=await appFixture(),block=gate(),entered=gate();f.permissionHook=async()=>{entered.resolve();await block.promise;};const p=f.source.navigate(f.sourceId());await entered.promise;await f.index.selectVault(fsVault({'other.md':'# TODO New'},'Other').root);block.resolve();assert.equal(await p,false);assert.equal(f.session.path,'a.md');
});
await check('actual q/close before permission finishes cancels without replacing editor',async()=>{
  const f=await appFixture(),entered=gate(),block=gate();f.permissionHook=async()=>{entered.resolve();await block.promise;};f.agenda.openTodos();f.rows().at(-1).click();await entered.promise;assert.equal(f.busy,true);assert.equal(f.view.state.readOnly,true);f.key('q');assert.equal(f.agenda.active,false);block.resolve();await flush();await flush();assert.equal(f.session.path,'a.md');assert.equal(f.busy,false);assert.equal(f.view.state.readOnly,false);
});
await check('actual non-interruptible open commit prevents false q and unlocks on success/failure',async()=>{
  for(const fail of [false,true]){
    const f=await appFixture(),entered=gate(),block=gate();f.fs.reads.set('sub/b.md',0);f.fs.readHook=async(path,n)=>{if(path==='sub/b.md'&&n===2){entered.resolve();await block.promise;if(fail)throw Error('Commit read failed');}};
    f.agenda.openTodos();f.rows().at(-1).click();await entered.promise;assert.equal(f.busy,true);assert.equal(f.view.state.readOnly,true);
    f.key('q');f.key('Escape');f.agenda.element.emit('cancel');descendants(f.agenda.element,n=>n.tagName==='button'&&n.textContent==='Schließen')[0].click();assert.equal(f.agenda.active,true);assert.match(f.agenda.element.textContent,/Schließen.*gesperrt/);assert.equal(f.session.path,'a.md');
    const filter=descendants(f.agenda.element,n=>n.tagName==='input')[0];assert.equal(filter.disabled,true);const before=f.rows().length;filter.checked=true;filter.emit('change');assert.equal(filter.checked,false);assert.equal(f.rows().length,before);assert.equal(f.agenda.openDispatcher(),false);const revision=f.index.snapshot().revision;f.key('r');assert.equal(f.index.snapshot().revision,revision);
    block.resolve();await flush();await flush();assert.equal(f.busy,false);assert.equal(f.view.state.readOnly,false);
    if(fail){assert.equal(f.session.path,'a.md');assert.equal(f.agenda.active,true);assert.match(f.agenda.element.textContent,/Commit read failed/);f.key('q');assert.equal(f.agenda.active,false);}
    else{assert.equal(f.session.path,'sub/b.md');assert.equal(f.agenda.active,false);assert.equal(f.doc.activeElement,f.origin);}
  }
});
await check('live updates, partial diagnostics and vault-generation clear',async()=>{
  const fs=fsVault({'a.md':'# TODO Original','broken.md':Error('blocked file')}),doc=documentModel();let view;const index=createAgendaIndex({yieldTask:immediate,onChange:s=>view?.update(s)});await index.selectVault(fs.root);view=createAgendaView({index,document:doc,now:()=>new Date(2026,10,8),execute:id=>{if(id==='agenda.refresh')return index.rebuild();},navigate:async()=>false});view.openTodos();assert.match(view.element.textContent,/Index unvollständig/);assert.match(view.element.textContent,/broken.md: Error: blocked file/);assert.equal(descendants(view.element,n=>n.className==='agenda-row').length,1);
  fs.sources.set('a.md','# DONE Original\n# TODO New');await index.updateFile('a.md',fs.root);assert.match(view.element.textContent,/TODO New/);assert.ok(!descendants(view.element,n=>n.className==='agenda-row').some(n=>n.textContent.includes('DONE')));await index.selectVault(fsVault({'x.md':'# TODO Foreign'},'Other').root);assert.equal(view.active,false);assert.equal(descendants(view.element,n=>n.className==='agenda-row').length,0);view.destroy();
});
await check('500-row modal lifecycle and idle sample',async()=>{
  const lines=Array.from({length:500},(_,n)=>`# TODO R${n}\nSCHEDULED: <2026-11-08 So>`).join('\n');const {index}=await indexed({'many.md':lines});const doc=documentModel(),origin=doc.createElement('div');doc.body.append(origin);origin.focus();global.gc?.();const before=process.memoryUsage().heapUsed,start=performance.now(),timings=[];
  for(let n=0;n<30;n++){const t=performance.now(),v=createAgendaView({index,document:doc,now:()=>new Date(2026,10,8),execute(){},navigate:async()=>false,onClose:()=>origin.focus()});v.openTodos();assert.equal(descendants(v.element,e=>e.className==='agenda-row').length,500);for(let step=0;step<10;step++)nativeKey(doc.activeElement,'ArrowDown');v.openWeek();assert.equal(descendants(v.element,e=>e.className==='agenda-row').length,500);v.close();v.destroy();assert.equal(doc.body.children.length,1);timings.push(performance.now()-t);await flush();}
  const html=doc.body.textContent;await new Promise(r=>setTimeout(r,100));assert.equal(doc.body.textContent,html);global.gc?.();measurements.lifecycle={rows:500,cycles:30,totalMs:performance.now()-start,minMs:Math.min(...timings),maxMs:Math.max(...timings),heapBefore:before,heapAfter:process.memoryUsage().heapUsed,gc:!!global.gc,idleMs:100};
});
console.log(JSON.stringify({groups,findings,measurements},null,2));if(findings.length)process.exitCode=2;

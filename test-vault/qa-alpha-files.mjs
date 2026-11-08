import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {EditorState,Compartment} from '@codemirror/state';
import {history,undoDepth} from '@codemirror/commands';
import {EditorView} from '@codemirror/view';
import {createSession} from '../editor/storage-session.mjs';
import {createAgendaIndex} from '../editor/agenda-index.mjs';
import {normalizeVaultFilePath,inspectVaultPath,completeVaultPath,executeVaultFile} from '../editor/vault-files.mjs';
import {createFilePicker} from '../editor/file-picker.mjs';
import {createPrefixRouter} from '../editor/prefix-router.mjs';
import {createCommandRegistry} from '../editor/command-registry.mjs';
import {commandDefinitions} from '../editor/commands.mjs';
import {createCommandSurfaces} from '../editor/command-surfaces.mjs';

// Independent synthetic filesystem and modal model. No native browser claim.
const encode=s=>new TextEncoder().encode(s),flush=()=>new Promise(r=>setImmediate(r));
const gate=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve};};
const error=(name,text=name)=>Object.assign(Error(text),{name});
let groups=0;const findings=[],measurements={};
async function check(name,fn){try{await fn();groups++;console.log('PASS '+name);}catch(e){findings.push({name,message:e.message});console.log('FINDING '+name+'\n'+e.stack);}}
class Element{
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.listeners={};this._text='';this.value='';this.disabled=false;this.hidden=false;this.style={};this.dataset={};this.scrollTop=0;this.clientHeight=70;this.offsetHeight=20;this.classList={toggle(){},add(){}};}
  get isConnected(){return this===this.ownerDocument.body||!!this.parent?.isConnected;}
  get offsetTop(){return Math.max(0,this.parent?.children.indexOf(this)??0)*20;}
  get scrollHeight(){return Math.max(this.children.length*20,this.clientHeight);}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}set textContent(v){this.replaceChildren();this._text=String(v);}
  append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
  replaceChildren(...nodes){this.children.forEach(n=>n.parent=null);this.children=[];this._text='';this.append(...nodes);}
  setAttribute(k,v){this.attributes[k]=String(v);}removeAttribute(k){delete this.attributes[k];}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}removeEventListener(type,fn){this.listeners[type]=this.listeners[type]?.filter(f=>f!==fn);}
  contains(n){return n===this||this.children.some(c=>c.contains(n));}
  closest(selectors){for(let n=this;n;n=n.parent)if(selectors.split(',').some(s=>(n.className??'').split(' ').includes(s.trim().slice(1))))return n;return null;}
  emit(type,props={}){const e={target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...props};for(let n=this;n;n=n.parent){for(const fn of n.listeners[type]??[])fn(e);if(e.stopped)break;}return e;}
  focus(){if(this.disabled||this.ownerDocument.modal&&!this.ownerDocument.modal.contains(this))return;this.ownerDocument.activeElement=this;}
  click(){if(!this.disabled)this.emit('click');}
  showModal(){this.open=true;this.ownerDocument.modal=this;}close(){this.open=false;if(this.ownerDocument.modal===this)this.ownerDocument.modal=null;}
  remove(){this.parent?.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}
  scrollIntoView(){throw Error('Global scrolling must not be needed');}
}
const all=(root,fn)=>[...(fn(root)?[root]:[]),...root.children.flatMap(n=>all(n,fn))];
function documentModel(){const doc={createElement:t=>new Element(t,doc)};doc.body=doc.createElement('body');doc.defaultView=doc.createElement('window');doc.body.parent=doc.defaultView;doc.querySelectorAll=s=>all(doc.body,n=>s.split(',').includes(n.tagName));doc.addEventListener=(...a)=>doc.defaultView.addEventListener(...a);doc.removeEventListener=(...a)=>doc.defaultView.removeEventListener(...a);return doc;}
function filesystem(initial={'Root.md':'\ufeff# TODO Original\r\n','Team/Plan.md':'# TODO Plan','Team/Project.md':'# TODO Project','Team/ä note.MD':'# TODO Unicode'}){
  const files=new Map(Object.entries(initial).map(([p,t])=>[p,t instanceof Uint8Array?t:encode(t)])),dirs=new Set(['']);
  for(const path of files.keys()){const p=path.split('/');p.pop();while(p.length){dirs.add(p.join('/'));p.pop();}}
  const calls=[],reads=new Map();let lookupHook,createHook,readHook,permissionHook;
  const canonical=(set,path)=>[...set].find(p=>p.toLowerCase()===path.toLowerCase());
  function directory(prefix=''){return {kind:'directory',name:prefix.split('/').at(-1)||'QA-alpha',async queryPermission(){if(permissionHook)return permissionHook();return 'granted';},async getDirectoryHandle(name,options){assert.ok(!options?.create);const path=[prefix,name].filter(Boolean).join('/');if(lookupHook)await lookupHook(path,'directory');const found=canonical(dirs,path);if(found!==undefined)return directory(found);throw error(canonical(files.keys(),path)!==undefined?'TypeMismatchError':'NotFoundError');},async getFileHandle(name,options){const path=[prefix,name].filter(Boolean).join('/');calls.push({path,create:!!options?.create});if(lookupHook)await lookupHook(path,'file');let found=canonical(files.keys(),path);if(found===undefined&&options?.create){if(createHook)await createHook(path);found=canonical(files.keys(),path);if(found===undefined){files.set(path,new Uint8Array());found=path;}}if(found===undefined)throw error(canonical(dirs,path)!==undefined?'TypeMismatchError':'NotFoundError');return handle(found);},async *entries(){for(const p of dirs){if(!p)continue;if(p.slice(0,p.lastIndexOf('/')<0?0:p.lastIndexOf('/'))===prefix)yield [p.split('/').at(-1),directory(p)];}for(const p of files.keys()){const parts=p.split('/');if(parts.slice(0,-1).join('/')===prefix)yield [parts.at(-1),handle(p)];}},async removeEntry(){assert.fail('No deletion');}};}
  function handle(path){return {kind:'file',name:path.split('/').at(-1),async getFile(){const n=(reads.get(path)??0)+1;reads.set(path,n);if(readHook)await readHook(path,n);return {async arrayBuffer(){return files.get(path).slice().buffer;}};},async createWritable(){assert.fail('No writable or truncate call');}};}
  return {root:directory(),files,dirs,calls,reads,get creations(){return calls.filter(c=>c.create).length;},set lookupHook(v){lookupHook=v;},set createHook(v){createHook=v;},set readHook(v){readHook=v;},set permissionHook(v){permissionHook=v;}};
}
const app=await readFile(new URL('../editor/app.mjs',import.meta.url),'utf8');
function chunk(start,end){const n=app.indexOf(start),m=app.indexOf(end,n);assert.ok(n>=0&&m>n,start);return app.slice(n,m);}
async function fixture(initial,withDocument=true){
  const fs=filesystem(initial),doc=documentModel(),origin=doc.createElement('div');origin.className='editor';doc.body.append(origin);origin.focus();
  const checkbox=doc.createElement('input');checkbox.checked=true;doc.body.append(checkbox);const files=doc.createElement('select');files.options=files.children;doc.body.append(files);
  files.append=(...nodes)=>{Element.prototype.append.call(files,...nodes);files.options=files.children;};
  const stored=new Map();let counter=0,persistHook;
  const session=createSession({store:{async put(k,v){if(persistHook)await persistHook();stored.set(k,v);},get:async k=>stored.get(k),keys:async()=>[...stored.keys()]},id:()=>String(++counter)});
  if(withDocument)await session.open({vault:fs.root,handle:await fs.root.getFileHandle('Root.md'),path:'Root.md'});
  const editable=new Compartment();const stateOf=()=>EditorState.create({doc:session.text,extensions:[history(),editable.of(EditorState.readOnly.of(!session.hasDocument))]});
  const view={state:stateOf(),dom:origin,focus(){origin.focus();},dispatch(spec){this.state=this.state.update(spec).state;}};
  Object.defineProperty(view,'hasFocus',{get:()=>doc.activeElement===origin});
  const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(fs.root);const messages=[];
  const context={EditorState,EditorView,createFilePicker:options=>createFilePicker({...options,document:doc}),executeVaultFile,session,vault:fs.root,view,editable,document:doc,$:id=>id==='synthetic'?checkbox:files,Option:class extends Element{constructor(text,value){super('option',doc);this.textContent=text;this.value=value;}},agendaIndex:index,status:m=>messages.push(m),prefix:{cancel(){}},workPanel:{close(){}},emacs:{invalidate(){}},requireSynthetic(){if(!checkbox.checked)throw Error('Alpha acceptance missing');},permission:async()=>{if(await fs.root.queryPermission()!=='granted')throw Error('Permission denied');},useRingVault:async()=>{},syncEditor(){view.state=stateOf();},render(){},persistDraft:async()=>{}};
  const body='let busy=false,timer,persistPending=false,filePicker;'+chunk('function syncAgendaFileSelection(){','agendaSource=createAgendaSource({')+chunk('function setBusy(value)','function syncEditor()')+chunk('async function run(action)','const actionIds=')+chunk('async function executeFilePath(','const refile=')+chunk('filePicker=createFilePicker({',"handlers['file.find']")+';return {picker:filePicker,executeFilePath,get busy(){return busy;},setVault(v){vault=v;}};';
  const api=new Function(...Object.keys(context),body)(...Object.values(context)),picker=api.picker;
  const input=all(picker.element,e=>e.tagName==='input')[0],submit=all(picker.element,e=>e.tagName==='button'&&e.textContent==='Öffnen')[0];
  const rows=()=>all(picker.element,e=>e.className==='file-row');
  async function type(value){input.value=value;input.emit('input');await flush();}
  return {fs,doc,origin,session,index,picker,input,submit,rows,files,checkbox,view,messages,api,type,key:(key,props={})=>input.emit('keydown',{key,...props}),set persistHook(v){persistHook=v;}};
}

await check('storage validation/canonical/Unicode and Markdown boundaries',async()=>{
  for(const p of ['../a','C:\\a.md','/a.md','a//b.md','a/../b.md','CON.md','lpt².md','bad?.md','.git/a.md','.storage-spike-backups/a.md','.hidden/a.md','bad.txt'])assert.throws(()=>normalizeVaultFilePath(p),p);
  assert.equal(normalizeVaultFilePath('Team\\ä note'),'Team/ä note.md');const fs=filesystem();assert.equal((await inspectVaultPath(fs.root,'team/Ä NOTE.md')).path,'Team/ä note.MD');
  const before=fs.files.get('Root.md').slice();const result=await executeVaultFile(fs.root,'root.md',{open:async()=>{}});assert.equal(result.creationRequested,false);assert.deepEqual(fs.files.get('Root.md'),before);assert.equal(fs.creations,0);
});
await check('completion ambiguity/codepoints/incomplete list and fair no-match yields',async()=>{
  const fs=filesystem({'😀alpha.md':'','😃beta.md':'','note.md':'','notes.md':''});let r=await completeVaultPath(fs.root,'');assert.ok(r.value.isWellFormed());assert.equal(r.candidates.length,4);
  r=await completeVaultPath(fs.root,'not');assert.equal(r.value,'note');assert.equal(r.candidates.length,2);assert.equal(fs.creations,0);
  const many={};for(let n=0;n<5010;n++)many[`skip${n}.txt`]='';many['match.md']='';const big=filesystem(many);let yields=0;r=await completeVaultPath(big.root,'m',{yieldTask:async()=>{yields++;}});assert.equal(r.incomplete,true);assert.equal(r.value,'m');assert.ok(yields>=100);assert.match(r.message,/unvollständig/);
});
await check('Denied/other lookup errors never treated as new file',async()=>{
  for(const kind of ['NotAllowedError','SecurityError','TypeMismatchError','UnknownError']){const fs=filesystem();fs.lookupHook=async(p,type)=>{if(type==='file')throw error(kind);};await assert.rejects(executeVaultFile(fs.root,'Missing'),e=>e.name===kind);assert.equal(fs.creations,0,kind);}
});
await check('external creation race preserves bytes and does not claim exclusive creation',async()=>{
  const fs=filesystem(),existing=encode('# TODO External\r\n');fs.createHook=async p=>fs.files.set(p,existing.slice());const result=await executeVaultFile(fs.root,'Race',{open:async target=>assert.deepEqual(new Uint8Array(await (await target.handle.getFile()).arrayBuffer()),existing)});assert.equal(result.creationRequested,true);assert.ok(!('created' in result));assert.deepEqual(fs.files.get('Race.md'),existing);
});
await check('actual app empty vault create, readonly busy and source/Select/index/focus synchronization',async()=>{
  const f=await fixture({},false);assert.equal(f.view.state.readOnly,true);assert.equal(f.picker.open(),true);await f.type('First');assert.match(f.picker.element.textContent,/Neue Datei anlegen: First.md/);assert.equal(f.fs.creations,0);assert.equal(await f.picker.submit(),true);await flush();assert.equal(f.session.path,'First.md');assert.equal(f.files.value,'First.md');assert.equal(f.index.snapshot().files,1);assert.equal(f.fs.files.get('First.md').length,0);assert.equal(f.api.busy,false);assert.equal(f.view.state.readOnly,false);assert.equal(f.doc.activeElement,f.origin);
});
await check('actual app nested canonical open and completion candidates never execute implicitly',async()=>{
  const f=await fixture(),before=f.fs.files.get('Team/Project.md').slice();f.picker.open();await f.type('te');await f.picker.complete();assert.equal(f.input.value,'Team/');await f.picker.complete();assert.equal(f.rows().length,3);f.key('ArrowDown');f.key('Enter');await flush();assert.equal(f.session.path,'Root.md');assert.equal(f.fs.creations,0);await f.type('team/project.md');assert.equal(await f.picker.submit(),true);assert.equal(f.session.path,'Team/Project.md');assert.equal(f.files.value,'Team/Project.md');assert.deepEqual(f.fs.files.get('Team/Project.md'),before);
});
await check('dirty and persistence/permission failures preserve source selection/history and create nothing',async()=>{
  const f=await fixture();f.session.applyChanges([{from:0,to:0,insert:'unsaved '}]);f.view.dispatch({changes:{from:0,insert:'unsaved '},selection:{anchor:3},userEvent:'input'});const state=f.view.state,text=f.session.text;f.picker.open();await f.type('New');assert.equal(await f.picker.submit(),false);assert.equal(f.fs.creations,0);assert.equal(f.session.text,text);assert.equal(f.view.state.doc,state.doc);assert.ok(f.view.state.selection.eq(state.selection));assert.equal(undoDepth(f.view.state),undoDepth(state));f.key('Escape');
  for(const phase of ['permission','persist']){const g=await fixture();g.picker.open();await g.type('NoCreate');if(phase==='permission')g.fs.permissionHook=async()=> 'denied';else g.persistHook=async()=>{throw Error('Synthetic quota failure');};assert.equal(await g.picker.submit(),false);assert.equal(g.fs.creations,0);assert.equal(g.session.path,'Root.md');assert.equal(g.api.busy,false);assert.equal(g.view.state.readOnly,false);}
});
await check('actual permission cancellation and stale input/vault/doc invalidate before side effects',async()=>{
  const f=await fixture(),entered=gate(),block=gate();f.picker.open();await f.type('Cancelled');f.fs.permissionHook=async()=>{entered.resolve();await block.promise;return 'granted';};const p=f.picker.submit();await entered.promise;assert.equal(f.api.busy,true);assert.equal(f.view.state.readOnly,true);f.key('g',{ctrlKey:true});block.resolve();assert.equal(await p,false);assert.equal(f.fs.creations,0);assert.equal(f.session.path,'Root.md');assert.equal(f.api.busy,false);
  const g=await fixture(),read=gate();g.picker.open();g.fs.lookupHook=async p=>{if(p==='Old')await read.promise;};g.input.value='Old';g.input.emit('input');await g.type('Latest');read.resolve();await flush();assert.match(g.picker.element.textContent,/Latest.md/);g.api.setVault({});g.picker.invalidate();assert.equal(g.picker.active,false);assert.equal(g.fs.creations,0);
});
await check('actual create/open commit locks close and unlocks success/failure with accurate file warning',async()=>{
  for(const fail of [false,true]){const f=await fixture(),entered=gate(),block=gate();f.picker.open();await f.type('Created');f.fs.createHook=async()=>{entered.resolve();await block.promise;};if(fail)f.fs.readHook=async p=>{if(p==='Created.md')throw Error('Synthetic newly created read failure');};const p=f.picker.submit();await entered.promise;assert.equal(f.input.disabled,true);f.key('Escape');f.key('g',{ctrlKey:true});f.picker.element.emit('cancel');all(f.picker.element,e=>e.tagName==='button'&&e.textContent==='Schließen')[0].click();assert.equal(f.picker.active,true);assert.equal(f.api.busy,true);block.resolve();const result=await p;await flush();assert.equal(result,!fail);assert.ok(f.fs.files.has('Created.md'));assert.equal(f.fs.files.get('Created.md').length,0);assert.equal(f.api.busy,false);assert.equal(f.view.state.readOnly,false);if(fail){assert.equal(f.session.path,'Root.md');assert.match(f.picker.element.textContent,/Created.md.*read failure/);assert.match(f.picker.element.textContent,/nicht automatisch gelöscht/);assert.match(f.picker.element.textContent,/Öffnen: Created.md/);assert.equal(f.index.snapshot().files,5);f.key('Escape');assert.equal(f.picker.active,false);}else assert.equal(f.session.path,'Created.md');}
});
await check('stale completion/doc/create results do not overwrite newer UI or jump after cancellation',async()=>{
  const f=await fixture(),entered=gate(),block=gate(),entries=f.fs.root.entries;f.picker.open();await f.type('Te');f.fs.root.entries=async function*(){entered.resolve();await block.promise;yield* entries.call(this);};const pending=f.picker.complete();await entered.promise;await f.type('Latest');block.resolve();assert.equal(await pending,false);assert.equal(f.input.value,'Latest');assert.match(f.picker.element.textContent,/Latest.md/);assert.equal(f.fs.creations,0);
  f.view.dispatch({changes:{from:0,insert:'changed externally to picker'}});f.picker.invalidate();assert.equal(f.picker.active,false);
  const fs=filesystem(),createEntered=gate(),createBlock=gate();let current=true,opens=0;fs.createHook=async()=>{createEntered.resolve();await createBlock.promise;};const p=executeVaultFile(fs.root,'Delayed',{current:()=>current,open:async()=>{opens++;}});await createEntered.promise;current=false;createBlock.resolve();const result=await p;assert.equal(result.stale,true);assert.equal(result.creationRequested,true);assert.equal(result.opened,false);assert.equal(opens,0);assert.ok(fs.files.has('Delayed.md'));assert.match(result.message,/bereits leer angelegt/);
  const before=fs.creations;await assert.rejects(executeVaultFile(fs.root,'MissingFolder/New'));assert.equal(fs.creations,before);
});
await check('C-c f release/no-doc guards, Cut unchanged, modal Registry and AltX isolation',async()=>{
  const f=await fixture({},false),context={busy:false,hasDocument:false,canFindFile:true,synthetic:true,vault:f.fs.root,state:f.view.state};let called=0;const registry=createCommandRegistry(commandDefinitions({'file.find':()=>{called++;return true;}}),()=>context);const router=createPrefixRouter({registry,getContext:()=>context});const down=(key,props={})=>router.keyDown({key,preventDefault(){},...props},f.view);down('c',{ctrlKey:true});down('f');assert.equal(called,0);down('c',{ctrlKey:true});router.keyUp({key:'c'});down('f',{ctrlKey:true});assert.equal(called,0);down('c',{ctrlKey:true});router.keyUp({key:'c'});down('f');assert.equal(called,1);assert.equal(registry.availability('todo.status').enabled,false);context.filePickerActive=true;for(const id of ['file.open','file.save','agenda.week','todo.next'])assert.equal(registry.execute(id),false);const surfaces=createCommandSurfaces({registry,view:f.view,document:f.doc,blocked:()=>true});surfaces.palette();assert.ok(!all(f.doc.body,n=>n.className==='command-palette')[0].open);surfaces.destroy();const policy=await readFile(new URL('../editor/emacs-policy.mjs',import.meta.url),'utf8');assert.match(policy,/id:'cut',key:'x',ctrl:true/);
});
await check('Alpha/help/build boundaries and unchanged storage core/workflow',async()=>{
  const html=await readFile(new URL('../editor/index.html',import.meta.url),'utf8');assert.match(html,/Markdown-Workspace · Alpha/);assert.match(html,/Datei … \(C-c f\)/);assert.match(html,/title="Strg\+C drücken, C und Strg loslassen, dann f/);assert.ok(!html.includes('ausschließlich einen synthetischen Test-Vault'));const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');assert.match(build,/entryPoints:\['editor\/app.mjs'\]/);assert.ok(!app.includes('m7b-preview')&&!app.includes('test-vault/'));const workflow=await readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');assert.match(workflow,/path: \.\/dist/);
});
await check('short modal lifecycle/idle sample',async()=>{
  const f=await fixture(),start=performance.now();for(let n=0;n<40;n++){assert.equal(f.picker.open(),true);await f.type('Team/Project.md');f.key('Escape');assert.equal(f.session.path,'Root.md');assert.equal(f.fs.creations,0);}const text=f.picker.element.textContent;await new Promise(r=>setTimeout(r,100));assert.equal(f.picker.element.textContent,text);f.picker.destroy();assert.ok(!f.picker.element.isConnected);measurements.lifecycle={cycles:40,totalMs:performance.now()-start,idleMs:100};
});
console.log(JSON.stringify({groups,findings,measurements},null,2));if(findings.length)process.exitCode=2;

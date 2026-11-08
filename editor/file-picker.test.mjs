import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState,Compartment} from '@codemirror/state';
import {history,undoDepth} from '@codemirror/commands';
import {createFilePicker} from './file-picker.mjs';
import {executeVaultFile} from './vault-files.mjs';
import {createSession} from './storage-session.mjs';
import {createAgendaIndex} from './agenda-index.mjs';
import {createPrefixRouter} from './prefix-router.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {createCommandSurfaces} from './command-surfaces.mjs';

// Behavioral DOM model; no native dialog, pixels or key delivery are claimed.
class Element{
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.listeners={};this.style={};this.dataset={};this.hidden=false;this.disabled=false;this.value='';this.scrollTop=0;this.clientHeight=50;this.offsetHeight=20;this.offsetTop=0;this.classList={toggle(){},add(){}};}
  get isConnected(){return this===this.ownerDocument.body||!!this.parent?.isConnected;}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  replaceChildren(...children){for(const c of this.children)c.parent=null;this.children=[];this._text='';this.append(...children);}
  set textContent(value){this.replaceChildren();this._text=value;}get textContent(){return (this._text??'')+this.children.map(c=>c.textContent).join('');}
  setAttribute(n,v){this.attributes[n]=String(v);}removeAttribute(n){delete this.attributes[n];}
  addEventListener(n,fn){(this.listeners[n]??=[]).push(fn);}removeEventListener(n,fn){this.listeners[n]=this.listeners[n]?.filter(f=>f!==fn);}
  emit(n,patch={}){const e={target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...patch};for(let el=this;el;el=el.parent){for(const fn of el.listeners[n]??[])fn(e);if(e.stopped)break;}return e;}
  click(){if(!this.disabled)this.emit('click');}focus(){if(!this.disabled)this.ownerDocument.activeElement=this;}
  showModal(){this.open=true;}close(){this.open=false;}contains(el){return el===this||this.children.some(c=>c.contains(el));}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}
}
function documentModel(){const doc={createElement(tag){return new Element(tag,this);}};doc.body=doc.createElement('body');doc.defaultView=doc.createElement('window');doc.listeners={};doc.addEventListener=Element.prototype.addEventListener;doc.removeEventListener=Element.prototype.removeEventListener;return doc;}
const all=(root,predicate)=>[root,...root.children.flatMap(c=>all(c,predicate))].filter(predicate);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const gate=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve};};
const bytes=t=>new TextEncoder().encode(t);
function filesystem(initial={'Root.md':'# TODO Root','Team/Project.md':'# TODO Project','Team/Plan.md':'# TODO Plan'}){
  const files=new Map(Object.entries(initial).map(([path,text])=>[path,bytes(text)])),dirs=new Set(['','Team']);let creates=0,permission='granted',readHook=null,createHook=null;
  const error=name=>Object.assign(Error(name),{name}),canonical=(values,path)=>[...values].find(p=>p.toLowerCase()===path.toLowerCase());
  function directory(prefix=''){return {kind:'directory',name:prefix.split('/').at(-1)||'synthetic',async queryPermission(){return permission;},async getDirectoryHandle(name,options){assert.ok(!options?.create);const path=prefix?prefix+'/'+name:name,found=canonical(dirs,path);if(found!==undefined)return directory(found);throw error(canonical(files.keys(),path)!==undefined?'TypeMismatchError':'NotFoundError');},async getFileHandle(name,options){const path=prefix?prefix+'/'+name:name;let found=canonical(files.keys(),path);if(found===undefined&&options?.create){creates++;if(createHook)await createHook(path);found=canonical(files.keys(),path);if(found===undefined){files.set(path,new Uint8Array());found=path;}}if(found===undefined)throw error(canonical(dirs,path)!==undefined?'TypeMismatchError':'NotFoundError');return {kind:'file',name:found.split('/').at(-1),async getFile(){if(readHook)await readHook(found);return {async arrayBuffer(){return files.get(found).slice().buffer;}};},async createWritable(){assert.fail('file opening/creation must not truncate');}};},async *entries(){for(const path of dirs){if(!path)continue;const parts=path.split('/');if(parts.slice(0,-1).join('/')===prefix)yield [parts.at(-1),directory(path)];}for(const path of files.keys()){const parts=path.split('/');if(parts.slice(0,-1).join('/')===prefix)yield [parts.at(-1),{kind:'file'}];}}};}
  return {root:directory(),files,get creates(){return creates;},set permission(v){permission=v;},set readHook(v){readHook=v;},set createHook(v){createHook=v;}};
}
const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
function chunk(start,end){const from=app.indexOf(start);assert.ok(from>=0,start);const to=app.indexOf(end,from);assert.ok(to>from,end);return app.slice(from,to);}
async function fixture(initial,withDocument=true){
  const fs=filesystem(initial),doc=documentModel(),origin=doc.createElement('div');doc.body.append(origin);origin.focus();const store=new Map();let counter=0;
  const session=createSession({store:{put:async(k,v)=>store.set(k,v),get:async k=>store.get(k),keys:async()=>[...store.keys()]},id:()=>String(++counter)});
  if(withDocument)await session.open({vault:fs.root,handle:await fs.root.getFileHandle('Root.md'),path:'Root.md'});
  const readonly=new Compartment();let state=EditorState.create({doc:session.text,extensions:[history(),readonly.of(EditorState.readOnly.of(!withDocument))]}),selectedVault=fs.root,accepted=true,permissionHook=null;
  const files={options:[],value:'',append(option){this.options.push(option);}},notices=[],index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(fs.root);
  const syncEditor=()=>{state=EditorState.create({doc:session.text,extensions:[history(),readonly.of(EditorState.readOnly.of(false))]});};
  const context={session,vault:fs.root,executeVaultFile,permission:async()=>{if(permissionHook)await permissionHook();if(fs.root&&await fs.root.queryPermission()!=='granted')throw Error('Ordnerrechte fehlen.');},requireSynthetic(){if(!accepted)throw Error('Alpha-Nutzungshinweis zuerst bestätigen.');},syncEditor,useRingVault:async()=>{},agendaIndex:index,status:m=>notices.push(m),$:()=>files,Option:class{constructor(text,value){this.text=text;this.value=value;}},render(){},reconfigure(value){state=state.update({effects:readonly.reconfigure(EditorState.readOnly.of(value||!session.hasDocument))}).state;},persistDraft:async()=>{}};
  const setup='let timer,persistPending=false,busy=false;function setBusy(value){busy=value;reconfigure(value);}';
  const execute=new Function(...Object.keys(context),setup+chunk('function syncAgendaFileSelection(){','agendaSource=createAgendaSource({')+chunk('async function executeFilePath(','const refile=')+chunk('async function run(action)','const actionIds=')+';return executeFilePath;')(...Object.values(context));
  const picker=createFilePicker({document:doc,getContext:()=>({vault:selectedVault,doc:state.doc,path:session.vault===selectedVault?session.path:'',accepted}),execute,onClose:()=>origin.focus()});
  const input=all(picker.element,e=>e.tagName==='input')[0],button=all(picker.element,e=>e.tagName==='button'&&e.textContent==='Öffnen')[0];
  async function type(value){input.value=value;input.emit('input');await flush();}
  return {fs,doc,origin,session,index,picker,input,button,files,notices,type,get state(){return state;},get accepted(){return accepted;},set accepted(v){accepted=v;},set permissionHook(v){permissionHook=v;},set vault(v){selectedVault=v;},key:(key,patch={})=>input.emit('keydown',{key,...patch})};
}

test('File picker starts without a document and previews a normalized new file before explicit Enter',async()=>{
  const f=await fixture({},false);assert.equal(f.picker.open(),true);await f.type('New');assert.match(f.picker.element.textContent,/Neue Datei anlegen: New.md/);assert.equal(f.fs.creates,0);
  assert.equal(await f.picker.submit(),true);await flush();assert.ok(f.fs.files.has('New.md'));assert.equal(f.fs.files.get('New.md').length,0);assert.equal(f.session.path,'New.md');assert.equal(f.files.value,'New.md');assert.equal(f.index.snapshot().files,1);assert.equal(f.picker.active,false);assert.equal(f.doc.activeElement,f.origin);
});
test('Actual app file callback opens canonical nested source, syncs Select/index and never rewrites existing bytes',async()=>{
  const f=await fixture(),original=f.fs.files.get('Team/Project.md').slice();f.picker.open();await f.type('team/project.md');assert.match(f.picker.element.textContent,/Öffnen: Team\/Project.md/);
  assert.equal(await f.picker.submit(),true);await flush();assert.equal(f.session.path,'Team/Project.md');assert.equal(f.files.value,'Team/Project.md');assert.deepEqual(f.fs.files.get('Team/Project.md'),original);assert.equal(f.fs.creates,0);assert.equal(f.state.doc.toString(),'# TODO Project');assert.equal(undoDepth(f.state),0);
});
test('Tab completion handles folders, common prefixes, candidate keyboard and mouse without implicit execution',async()=>{
  const f=await fixture();f.picker.open();await f.type('Te');await f.picker.complete();assert.equal(f.input.value,'Team/');await f.picker.complete();assert.equal(f.input.value,'Team/P');assert.equal(f.fs.creates,0);
  let rows=all(f.picker.element,e=>e.className==='file-row');assert.equal(rows.length,2);f.key('ArrowDown');f.key('Enter');await flush();assert.equal(f.input.value,'Team/Plan.md');assert.equal(f.session.path,'Root.md');
  await f.type('Team/Pr');await f.picker.complete();assert.equal(f.input.value,'Team/Project.md');rows=all(f.picker.element,e=>e.className==='file-row');rows[0].click();await flush();assert.equal(f.session.path,'Root.md');assert.equal(await f.picker.submit(),true);
});
test('Dirty documents, permission failures and invalid paths never create or replace the editor',async()=>{
  const f=await fixture();f.session.applyChanges([{from:0,to:0,insert:'unsaved '}]);const dirty=f.session.text;f.picker.open();await f.type('New');assert.equal(await f.picker.submit(),false);assert.equal(f.fs.creates,0);assert.equal(f.session.text,dirty);assert.match(f.picker.element.textContent,/Ungespeicherte/);f.key('Escape');assert.equal(f.doc.activeElement,f.origin);
  const g=await fixture();g.picker.open();await g.type('../outside');assert.equal(g.button.disabled,true);await g.picker.submit();assert.equal(g.fs.creates,0);await g.type('Denied');g.fs.permission='denied';assert.equal(await g.picker.submit(),false);assert.equal(g.fs.creates,0);assert.match(g.picker.element.textContent,/Ordnerrechte/);
});
test('Cancellation before awaited permission, stale inspections and vault changes cannot create a file',async()=>{
  const f=await fixture(),entered=gate(),block=gate();f.permissionHook=async()=>{entered.resolve();await block.promise;};f.picker.open();await f.type('New');const pending=f.picker.submit();await entered.promise;f.key('g',{ctrlKey:true});assert.equal(f.picker.active,false);block.resolve();assert.equal(await pending,false);assert.equal(f.fs.creates,0);assert.equal(f.session.path,'Root.md');
  const g=await fixture();g.picker.open();g.input.value='Old';g.input.emit('input');await g.type('Latest');assert.match(g.picker.element.textContent,/Latest.md/);g.vault={};g.picker.invalidate();assert.equal(g.picker.active,false);assert.equal(g.fs.creates,0);
});
test('Non-abortable create/open locks close; read failure unlocks and refreshes existing-file preview with path warning',async()=>{
  const f=await fixture(),entered=gate(),block=gate();f.fs.createHook=async()=>{entered.resolve();await block.promise;};f.fs.readHook=async path=>{if(path==='New.md')throw Error('Synthetic new read failed');};f.picker.open();await f.type('New');const pending=f.picker.submit();await entered.promise;
  f.key('Escape');f.picker.element.emit('cancel');assert.equal(f.picker.active,true);assert.equal(f.input.disabled,true);assert.match(f.picker.element.textContent,/gesperrt|warten/);block.resolve();assert.equal(await pending,false);await flush();assert.ok(f.fs.files.has('New.md'));assert.equal(f.session.path,'Root.md');assert.match(f.picker.element.textContent,/Öffnen: New.md/);assert.match(f.picker.element.textContent,/New.md.*Synthetic new read failed/);assert.match(f.picker.element.textContent,/nicht automatisch gelöscht/);assert.equal(f.input.disabled,false);f.key('Escape');assert.equal(f.picker.active,false);
});
test('File modal guards Registry/AltX and prefix can enter from an empty readonly editor without enabling document actions',async()=>{
  const f=await fixture({},false),view={state:f.state,hasFocus:true,dom:f.origin,focus:()=>f.origin.focus()};let active=false;
  const context={busy:false,hasDocument:false,synthetic:true,vault:f.fs.root,canFindFile:true,state:view.state};const registry=createCommandRegistry(commandDefinitions({'file.find':()=>{active=true;return true;}}),()=>context);
  const router=createPrefixRouter({registry,getContext:()=>context});router.keyDown({key:'c',ctrlKey:true,preventDefault(){}},view);router.keyUp({key:'c'});router.keyDown({key:'f',preventDefault(){}},view);assert.equal(active,true);assert.equal(registry.availability('file.save').enabled,false);
  context.filePickerActive=true;assert.equal(registry.execute('file.save'),false);assert.equal(registry.execute('todo.next'),false);assert.equal(registry.execute('agenda.week'),false);
  const surfaces=createCommandSurfaces({registry,view,document:f.doc,blocked:()=>true});surfaces.palette();f.doc.defaultView.emit('keydown',{key:'x',altKey:true});assert.ok(!all(f.doc.body,e=>e.className==='command-palette')[0].open);surfaces.destroy();
});

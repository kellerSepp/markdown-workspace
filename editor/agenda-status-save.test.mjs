import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {createSession} from './storage-session.mjs';
const bytes=text=>new TextEncoder().encode(text);
function file(initial){let disk=initial.slice();return {writes:0,fail:false,get disk(){return disk;},external(value){disk=value.slice();},async getFile(){const value=disk.slice();return {arrayBuffer:async()=>value.buffer};},async createWritable(){this.writes++;if(this.fail)throw Error('write failure');let pending;return {async write(value){pending=value.slice();},async close(){disk=pending;},async abort(){}};}};}
test('Actual app autosave callback uses existing session backup/conflict/permission checks for the bound source only',async()=>{
 const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
 const config=app.slice(app.indexOf('agendaStatus=createAgendaStatus('),app.indexOf('\nasync function navigateAgenda'));
 const save=app.slice(app.indexOf('async function save() {'),app.indexOf("\nbind('save',save);"));
 for(const kind of ['success','conflict','backup','permission','write','wrong-source','wrong-doc']){
  const records=new Map(),backups=new Map(),original=bytes('\ufeff#+SEQ_TODO: NEXT(n) | FIN(f)\r\n# NEXT Task\r\n'),handle=file(original),other=file(bytes('# TODO Untouched'));let seq=0;
  const vault={name:'synthetic',allowed:true,async queryPermission(){return this.allowed?'granted':'denied';},async getDirectoryHandle(){if(kind==='backup')throw Error('backup failure');return {async getFileHandle(name){if(!backups.has(name))backups.set(name,file(bytes('')));return backups.get(name);}};}};
  const locks={names:[],async request(name,fn){this.names.push(name);return fn();}};
  const session=createSession({store:{put:async(k,v)=>records.set(k,v)},locks,id:()=>String(++seq),now:()=>123});await session.open({vault,handle,path:'b.md'});
  const at=session.text.indexOf('# NEXT')+2;session.applyChanges([{from:at,to:at+4,insert:'FIN'}]);const view={state:EditorState.create({doc:session.text})};let updates=0;
  const context={createAgendaStatus:options=>options,agendaStatusHost:{},$:()=>({}),view,emacs:{ring:{}},editingContext:()=>({}),session,vault,requireSynthetic(){},navigateAgenda(){},agendaSource:{cancel(){}},agenda:{setCommitting(){},get docked(){return true;},endStatus(){},focusSelection(){},message(){}},status(){},run:async fn=>fn(),sameVault:async(a,b)=>a===b,agendaIndex:{updateFile(){updates++;}}};
  const hooks=new Function(...Object.keys(context),'let agendaStatus,persistPending=true;'+save+'\n'+config+'\nreturn agendaStatus;')(...Object.values(context));
  const source={session,vault,path:kind==='wrong-source'?'a.md':'b.md'},doc=kind==='wrong-doc'?EditorState.create({doc:session.text}).doc:view.state.doc;
  if(kind==='conflict')handle.external(bytes('# NEXT Extern'));
  if(kind==='permission')vault.allowed=false;
  if(kind==='write')handle.fail=true;
  if(kind==='success'){
    const result=await hooks.saveForeign({source,doc});assert.equal(result.unchanged,false);assert.equal(handle.writes,1);assert.equal(session.dirty,false);assert.equal(updates,1);assert.deepEqual(backups.get(result.backupName).disk,original);assert.match(new TextDecoder().decode(handle.disk),/# FIN Task\r\n/);assert.deepEqual(locks.names,['storage-spike-write']);
  }else{
    await assert.rejects(hooks.saveForeign({source,doc}));assert.equal(session.dirty,true);assert.equal(updates,0);assert.deepEqual(handle.disk,kind==='conflict'?bytes('# NEXT Extern'):original);if(kind!=='write')assert.equal(handle.writes,0);
  }
  assert.equal(other.writes,0);assert.deepEqual(other.disk,bytes('# TODO Untouched'));
 }
});

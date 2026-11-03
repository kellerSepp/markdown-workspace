import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from './storage-session.mjs';
const bytes = text => new TextEncoder().encode(text);
function file(initial) {
  let disk = initial.slice();
  return {writes:0,fail:false,external(b){disk=b.slice();},get disk(){return disk;},
    async getFile(){const b=disk.slice();return {arrayBuffer:async()=>b.buffer};},
    async createWritable(){this.writes++;if(this.fail)throw Error('Schreibfehler');let pending;return {async write(b){pending=b.slice();},async close(){disk=pending;},async abort(){}};}};
}
function fixture() {
  const records = new Map(), backups = new Map(); let seq=0;
  const store = {fail:false,async put(k,v){if(this.fail)throw Error('Quota');records.set(k,{...v,base:v.base.slice(),draft:v.draft.slice()});},async get(k){return records.get(k);},async keys(){return [...records.keys()];}};
  const vault = {name:'synthetisch',allowed:true,async queryPermission(){return this.allowed?'granted':'denied';},async requestPermission(){this.allowed=true;return 'granted';},async getDirectoryHandle(name){assert.equal(name,'.storage-spike-backups');return {async getFileHandle(name){if(!backups.has(name))backups.set(name,file(bytes('')));return backups.get(name);}};}};
  const locks={names:[],async request(name,fn){this.names.push(name);return fn();}};
  const session=createSession({store,locks,id:()=>String(++seq),now:()=>123});
  return {session,store,vault,records,backups,locks};
}
test('Unverändert und Undo öffnen keinen Stream, keine Sicherung',async()=>{
  const {session,vault,backups}=fixture(), handle=file(bytes('\ufeffA\r\nB\n'));
  await session.open({vault,handle,path:'mixed.md'});
  assert.deepEqual(await session.save(),{unchanged:true,backupName:undefined});
  session.applyChanges([{from:0,to:1,insert:'X'}]);session.applyChanges([{from:0,to:1,insert:'A'}]);
  assert.equal(session.dirty,false);await session.save();assert.equal(handle.writes,0);assert.equal(backups.size,0);
});
test('Bearbeitung sichert Rohbytes und dauerhafte Zuordnung vor Zielschreiben',async()=>{
  const {session,vault,backups,locks}=fixture(), original=bytes('\ufeff---\r\nx: ä\n---\rText'),handle=file(original);
  await session.open({vault,handle,path:'sub/test.md'});
  session.applyChanges([{from:session.text.indexOf('Text'),to:session.text.length,insert:'Neu'}]);
  const result=await session.save();assert.equal(result.unchanged,false);assert.equal(session.dirty,false);
  assert.deepEqual(backups.get(result.backupName).disk,original);
  const metadata=JSON.parse(new TextDecoder().decode(backups.get(result.backupName.replace('.bak','.json')).disk));
  assert.equal(metadata.path,'sub/test.md');assert.equal(metadata.backup,result.backupName);
  assert.equal(locks.names[0],'storage-spike-write');
  assert.deepEqual(handle.disk,bytes('\ufeff---\r\nx: ä\n---\rNeu'));
});
test('Konflikt blockiert; Entwurf dauerhaft erhalten und nach Reload geforkt',async()=>{
  const {session,vault,store,records}=fixture(),handle=file(bytes('Alt'));
  await session.open({vault,handle,path:'test.md'});session.applyChanges([{from:0,to:3,insert:'Entwurf'}]);handle.external(bytes('Extern'));
  assert.deepEqual(await session.check(),{conflict:true});await assert.rejects(session.save(),/Konflikt/);
  assert.equal(handle.writes,0);assert.equal(session.text,'Entwurf');
  // Browser handles are structured-cloneable; reattach mock methods after the snapshot.
  const key=(await session.listDrafts())[0].key;Object.assign(records.get(key),{vault,handle});
  const restored=createSession({store,id:()=> 'recovered'});await restored.recover(key);
  assert.equal(restored.text,'Entwurf');assert.equal(records.size,2);assert.equal(restored.dirty,true);
});
test('Entwurf-/Sicherungs-/Rechtefehler blockieren Ziel und erhalten Bearbeitung',async()=>{
  for(const kind of ['draft','backup','permission','write']) {
    const {session,vault,store}=fixture(),handle=file(bytes('Alt'));
    await session.open({vault,handle,path:'test.md'});session.applyChanges([{from:0,to:3,insert:'Neu'}]);
    if(kind==='draft')store.fail=true;
    if(kind==='backup')vault.getDirectoryHandle=async()=>{throw Error('Sicherung');};
    if(kind==='permission')vault.allowed=false;
    if(kind==='write')handle.fail=true;
    await assert.rejects(session.save());assert.equal(session.text,'Neu');assert.deepEqual(handle.disk,bytes('Alt'));
    if(kind!=='write')assert.equal(handle.writes,0);
  }
});
test('Vault-Wechsel sichert alten Entwurf unter eigener Identität',async()=>{
  const {session,vault,records}=fixture(),a=file(bytes('A')),b=file(bytes('B'));
  await session.open({vault,handle:a,path:'a.md'});session.applyChanges([{from:0,to:1,insert:'Entwurf A'}]);
  await session.open({vault:{...vault,name:'anderer Testvault'},handle:b,path:'b.md'});
  assert.equal(records.size,2);assert.equal(session.text,'B');assert.equal(a.writes,0);
  assert.ok([...records.values()].some(d=>new TextDecoder().decode(d.draft)==='Entwurf A'));
});
test('Fehlende dauerhafte Sicherungszuordnung blockiert trotz vorhandener Rohbytes',async()=>{
  const {session,vault,backups}=fixture(),handle=file(bytes('Alt'));
  const directory=vault.getDirectoryHandle.bind(vault);
  vault.getDirectoryHandle=async name=>{
    const dir=await directory(name),get=dir.getFileHandle.bind(dir);
    dir.getFileHandle=async name=>{if(name.endsWith('.json'))throw Error('Zuordnung nicht schreibbar');return get(name);};
    return dir;
  };
  await session.open({vault,handle,path:'test.md'});session.applyChanges([{from:0,to:3,insert:'Neu'}]);
  await assert.rejects(session.save(),/Zuordnung/);assert.equal(handle.writes,0);assert.equal(backups.size,1);assert.equal(session.text,'Neu');
});
test('Speichern sperrt konkurrierende Editoränderungen bis Lock abgeschlossen',async()=>{
  const {vault,store}=fixture(),handle=file(bytes('Alt'));let entered,release;
  const waiting=new Promise(resolve=>{entered=resolve;});
  const locks={async request(name,fn){entered();await new Promise(resolve=>{release=resolve;});return fn();}};
  const session=createSession({store,locks,id:()=>crypto.randomUUID()});
  await session.open({vault,handle,path:'test.md'});session.applyChanges([{from:0,to:3,insert:'Neu'}]);
  const saving=session.save();await waiting;
  assert.throws(()=>session.applyChanges([{from:0,to:0,insert:'X'}]),/läuft/);
  release();await saving;assert.equal(session.text,'Neu');assert.deepEqual(handle.disk,bytes('Neu'));
});

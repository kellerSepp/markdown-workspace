import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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

async function recoveredFixture(){
 const f=fixture(),handle=file(bytes('\ufeffOriginal\r\n'));
 await f.session.open({vault:f.vault,handle,path:'inbox.md'});
 f.session.applyChanges([{from:0,to:8,insert:'Entwurf'}]);await f.session.persist();
 const key=(await f.session.listDrafts())[0].key;
 handle.external(bytes('Neuer Dateistand\n'));
 await f.session.recover(key);
 return {...f,handle};
}

test('Explizite Entwurfsübernahme sichert aktuellen statt alten Stand und setzt neue Ladebasis',async()=>{
 const f=await recoveredFixture();let confirmations=0;
 const result=await f.session.restoreDraft(target=>{confirmations++;assert.deepEqual(target,{vaultName:'synthetisch',path:'inbox.md'});return true;});
 assert.equal(confirmations,1);assert.deepEqual(f.backups.get(result.backupName).disk,bytes('Neuer Dateistand\n'));
 assert.deepEqual(f.handle.disk,bytes('\ufeffEntwurf\r\n'));assert.equal(f.session.dirty,false);assert.equal(f.session.recovered,false);
 assert.ok([...f.records.values()].some(d=>new TextDecoder().decode(d.draft)==='Entwurf\r\n'));
 assert.deepEqual(await f.session.check(),{conflict:false});await f.session.save();assert.equal(f.handle.writes,1);
 f.session.applyChanges([{from:0,to:7,insert:'Weiter'}]);await f.session.save();assert.equal(f.handle.writes,2);
});

test('Abbruch der Übernahme erhält Datei, Entwurf und alte Konfliktbasis ohne Sicherung',async()=>{
 const f=await recoveredFixture();const count=f.records.size;
 assert.deepEqual(await f.session.restoreDraft(()=>false),{cancelled:true});
 assert.equal(f.handle.writes,0);assert.equal(f.backups.size,0);assert.equal(f.records.size,count);
 assert.equal(f.session.text,'Entwurf\n');assert.equal(f.session.recovered,true);
 await assert.rejects(f.session.save(),/Konflikt/);
});

test('Änderungen während Bestätigung oder Sicherung blockieren Entwurfsübernahme',async()=>{
 for(const phase of ['confirm','backup']){
  const f=await recoveredFixture();
  if(phase==='backup'){const original=f.vault.getDirectoryHandle;f.vault.getDirectoryHandle=async name=>{f.handle.external(bytes('Noch neuer'));return original(name);};}
  await assert.rejects(f.session.restoreDraft(()=>{if(phase==='confirm')f.handle.external(bytes('Noch neuer'));return true;}),/Konflikt/);
  assert.equal(f.handle.writes,0);assert.equal(f.session.recovered,true);assert.equal(f.session.text,'Entwurf\n');
 }
});

test('Übernahmefehler erhalten Entwurf und verweigern unsichere Zielschreibvorgänge',async()=>{
 for(const kind of ['draft','permission','backup','write','readback']){
  const f=await recoveredFixture();let asked=false;
  if(kind==='draft')f.store.fail=true;
  if(kind==='permission')f.vault.allowed=false;
  if(kind==='backup')f.vault.getDirectoryHandle=async()=>{throw Error('Sicherung fehlgeschlagen');};
  if(kind==='write')f.handle.fail=true;
  if(kind==='readback'){const original=f.handle.createWritable;f.handle.createWritable=async()=>{const stream=await original.call(f.handle),close=stream.close;stream.close=async()=>{await close();f.handle.external(bytes('Abweichend'));};return stream;};}
  await assert.rejects(f.session.restoreDraft(()=>{asked=true;return true;}));
  assert.equal(f.session.recovered,true);assert.equal(f.session.text,'Entwurf\n');
  if(['draft','permission'].includes(kind))assert.equal(asked,false);
  if(['draft','permission','backup'].includes(kind))assert.equal(f.handle.writes,0);
 }
});

test('Übernahme benötigt geladenen Entwurf und sperrt konkurrierende Änderungen',async()=>{
 const f=fixture(),handle=file(bytes('Text'));
 await f.session.open({vault:f.vault,handle,path:'normal.md'});
 await assert.rejects(f.session.restoreDraft(()=>true),/Entwurf laden/);
 const r=await recoveredFixture();let release,entered;
 const gate=new Promise(resolve=>{entered=resolve;});
 const pending=r.session.restoreDraft(async()=>{entered();return await new Promise(resolve=>{release=resolve;});});
 await gate;assert.throws(()=>r.session.applyChanges([{from:0,insert:'X'}]),/läuft/);
 await assert.rejects(r.session.open({vault:r.vault,handle:r.handle,path:'other.md'}),/läuft/);
 await assert.rejects(r.session.recover('missing'),/läuft/);await assert.rejects(r.session.save(),/läuft/);
 release(false);await pending;
});

test('Bytegleicher Entwurf aktualisiert Basis ohne Schreiben; fehlende Web Locks blockieren',async()=>{
 const f=await recoveredFixture();f.handle.external(bytes('\ufeffEntwurf\r\n'));
 const result=await f.session.restoreDraft(()=>true);
 assert.equal(result.unchanged,true);assert.equal(f.handle.writes,0);assert.equal(f.backups.size,0);assert.equal(f.session.dirty,false);
 const r=await recoveredFixture(),session=createSession({store:r.store,locks:null,id:()=> 'no-lock'});
 await session.recover((await r.session.listDrafts())[0].key);
 await assert.rejects(session.restoreDraft(()=>assert.fail('Keine Bestätigung ohne Lock')) ,/Web Locks/);
 assert.equal(r.handle.writes,0);assert.equal(session.recovered,true);
});

test('Tatsächlicher Apphandler bestätigt konkrete Quelle, aktualisiert Index nur nach Erfolg',async()=>{
 const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
 const body=/bind\('restoreDraft', async \(\) => \{([\s\S]*?)\n\}\);/.exec(app)?.[1];assert.ok(body);
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const handler=new AsyncFunction('session','requireSynthetic','window','sameVault','vault','agendaIndex','status','persistPending',body);
 for(const approved of [false,true]){
  const f=await recoveredFixture(),messages=[],updates=[],prompts=[];
  await handler(f.session,()=>{}, {confirm:text=>{prompts.push(text);return approved;}},async(a,b)=>a===b,f.vault,{updateFile:async path=>updates.push(path)},text=>messages.push(text),true);
  assert.equal(prompts.length,1);assert.match(prompts[0],/synthetisch\/inbox.md/);assert.match(prompts[0],/gesamten Dateiinhalt/);
  assert.deepEqual(updates,approved?['inbox.md']:[]);assert.equal(f.handle.writes,approved?1:0);
  assert.match(messages[0],approved?/übernommen und geprüft/:/abgebrochen/);
 }
});
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

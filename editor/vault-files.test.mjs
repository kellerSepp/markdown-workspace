import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVaultFilePath,inspectVaultPath,completeVaultPath,executeVaultFile} from './vault-files.mjs';

const failure=(name,message=name)=>Object.assign(Error(message),{name});
function fixture(){
  const files=new Map([['Root.md',new TextEncoder().encode('\ufeff# TODO Original\r\n')],['Team/Project.md',new TextEncoder().encode('# TODO Child')]]),directories=new Set(['','Team']),calls=[];
  let createHook=null,readError=null;
  const canonical=path=>[...files.keys(),...directories].find(p=>p.toLowerCase()===path.toLowerCase());
  function directory(prefix=''){
    return {kind:'directory',name:prefix.split('/').at(-1)||'synthetic-vault',
      async getDirectoryHandle(name,options){calls.push(['directory',prefix,name,options]);assert.ok(!options?.create);const path=prefix?prefix+'/'+name:name,found=canonical(path);if(found!==undefined&&directories.has(found))return directory(found);if(found!==undefined)throw failure('TypeMismatchError');throw failure('NotFoundError');},
      async getFileHandle(name,options){calls.push(['file',prefix,name,options]);if(readError)throw readError;const path=prefix?prefix+'/'+name:name;let found=canonical(path);
        if(found!==undefined&&directories.has(found))throw failure('TypeMismatchError');
        if(found===undefined&&options?.create){if(createHook)await createHook(path);found=canonical(path);if(found===undefined){files.set(path,new Uint8Array());found=path;}}
        if(found===undefined)throw failure('NotFoundError');return file(found);},
      async *entries(){for(const path of directories){if(!path||!(prefix?path.startsWith(prefix+'/'):true))continue;const rest=prefix?path.slice(prefix.length+1):path;if(!rest.includes('/'))yield [rest,directory(path)];}for(const path of files.keys()){if(prefix&&!path.startsWith(prefix+'/'))continue;const rest=prefix?path.slice(prefix.length+1):path;if(!rest.includes('/'))yield [rest,file(path)];}},
      async removeEntry(){assert.fail('no deletion');}
    };
  }
  function file(path){return {kind:'file',name:path.split('/').at(-1),async getFile(){return {async arrayBuffer(){return files.get(path).slice().buffer;}};},async createWritable(){assert.fail('no writable stream');}};}
  return {root:directory(),files,directories,calls,set createHook(value){createHook=value;},set readError(value){readError=value;}};
}

test('Vault file paths normalize separators/extension and reject traversal, absolute, Windows and internal names',()=>{
  assert.equal(normalizeVaultFilePath('Team\\Notiz'),'Team/Notiz.md');assert.equal(normalizeVaultFilePath('ä notiz.MD'),'ä notiz.MD');
  for(const path of ['', '/tmp/a.md','C:\\x.md','../x.md','a/../x.md','a//x.md','a/./x.md','a/','CON.md','LPT1.txt','com¹.md','x?.md','x.','x ','a.txt','.git/x.md','.CODEx/x.md','.hidden/x.md','node_modules/x.md','.#project.md','a/\u0000.md'])assert.throws(()=>normalizeVaultFilePath(path),path);
});
test('Vault inspect resolves real canonical names, root/folders, and missing Markdown without creating',async()=>{
  const f=fixture();assert.equal((await inspectVaultPath(f.root,'root.md')).path,'Root.md');assert.equal((await inspectVaultPath(f.root,'team/project.md')).path,'Team/Project.md');
  assert.equal((await inspectVaultPath(f.root,'Team')).kind,'directory');assert.equal((await inspectVaultPath(f.root,'Team/')).path,'Team/');assert.equal((await inspectVaultPath(f.root,'')).path,'');
  assert.deepEqual(await inspectVaultPath(f.root,'team/New'),{kind:'missing',path:'Team/New.md'});assert.ok(!f.calls.some(c=>c[3]?.create));
  await assert.rejects(inspectVaultPath(f.root,'Missing/new.md'),/Pfad prüfen/);
});
test('Vault inspect never mistakes permission or directory-kind errors for a new file',async()=>{
  const f=fixture();f.readError=failure('NotAllowedError','denied');await assert.rejects(inspectVaultPath(f.root,'new.md'),e=>e.name==='NotAllowedError'&&e.message.includes('denied'));await assert.rejects(executeVaultFile(f.root,'new.md'),/denied/);assert.ok(!f.calls.some(c=>c[3]?.create));
  f.readError=null;await assert.rejects(executeVaultFile(f.root,'Team/'),/Dateinamen/);assert.equal(f.files.size,2);
});
test('Vault completion is read-only, canonical, Unicode-aware and keeps ambiguous candidates instead of choosing',async()=>{
  const f=fixture();f.files.set('Team/Project2.md',new Uint8Array());f.files.set('Team/Äpfel.md',new Uint8Array());f.files.set('Team/no.txt',new Uint8Array());f.directories.add('.git');f.files.set('.git/secret.md',new Uint8Array());
  assert.equal((await completeVaultPath(f.root,'te')).value,'Team/');assert.equal((await completeVaultPath(f.root,'team/ä')).value,'Team/Äpfel.md');
  const result=await completeVaultPath(f.root,'Team/Pro');assert.equal(result.value,'Team/Project');assert.equal(result.candidates.length,2);
  const empty=await completeVaultPath(f.root,'Team/zzz');assert.equal(empty.value,'Team/zzz');assert.equal(empty.candidates.length,0);
  f.directories.add('Emoji');f.files.set('Emoji/😀a.md',new Uint8Array());f.files.set('Emoji/😃b.md',new Uint8Array());const unicode=await completeVaultPath(f.root,'Emoji/');assert.equal(unicode.value,'Emoji/');assert.equal(unicode.value.isWellFormed(),true);
  assert.ok(!(await completeVaultPath(f.root,'')).candidates.some(c=>c.path.startsWith('.git')));assert.ok(!f.calls.some(c=>c[3]?.create));
});
test('Vault completion reports limits and read errors, and cancellation never publishes partial results',async()=>{
  const f=fixture();for(let n=0;n<120;n++)f.files.set(`Team/n${n}.md`,new Uint8Array());let yields=0;
  const full=await completeVaultPath(f.root,'Team/',{yieldTask:async()=>{yields++;}});assert.equal(full.incomplete,false);assert.ok(yields>=2);
  const partial=await completeVaultPath(f.root,'Team/n',{maxEntries:3});assert.equal(partial.incomplete,true);assert.equal(partial.value,'Team/n');assert.match(partial.message,/unvollständig/);
  let skippedYields=0;await completeVaultPath(f.root,'Team/no-match',{yieldTask:async()=>{skippedYields++;}});assert.ok(skippedYields>=2);
  let current=true;assert.equal(await completeVaultPath(f.root,'Team/',{current:()=>current,yieldTask:async()=>{current=false;}}),null);
  const broken={async *entries(){throw failure('NotAllowedError','denied enumeration');}};await assert.rejects(completeVaultPath(broken,''),/denied enumeration/);
});
test('Vault execute opens existing bytes untouched and creates only an empty missing file under a commit lock',async()=>{
  const f=fixture(),before=f.files.get('Root.md').slice(),locks=[],opened=[];
  const existing=await executeVaultFile(f.root,'root.md',{onCommit:v=>locks.push(v),open:async target=>opened.push(target)});assert.equal(existing.path,'Root.md');assert.equal(existing.creationRequested,false);assert.deepEqual(f.files.get('Root.md'),before);
  const created=await executeVaultFile(f.root,'Team/New',{onCommit:v=>locks.push(v),open:async target=>opened.push(target)});assert.equal(created.path,'Team/New.md');assert.equal(created.creationRequested,true);assert.equal(f.files.get('Team/New.md').length,0);assert.deepEqual(locks,[true,false,true,false]);assert.equal(opened.length,2);
  assert.equal(f.calls.filter(c=>c[3]?.create).length,1);
});
test('Vault external creation race loads concurrent bytes without truncation and uses the returned canonical name',async()=>{
  const f=fixture();f.createHook=async()=>f.files.set('Team/RACE.MD',new TextEncoder().encode('concurrent data'));
  const result=await executeVaultFile(f.root,'team/race.md');assert.equal(result.creationRequested,true);assert.equal(result.path,'Team/RACE.MD');assert.equal(new TextDecoder().decode(f.files.get('Team/RACE.MD')),'concurrent data');
});
test('Vault canceled pre-create work does not create, while stale post-create work reports the possible remaining file',async()=>{
  const f=fixture();let current=false;assert.equal(await executeVaultFile(f.root,'Team/New',{current:()=>current}),null);assert.equal(f.files.size,2);
  current=true;const locks=[];assert.equal(await executeVaultFile(f.root,'Team/Before',{current:()=>current,onCommit:v=>{locks.push(v);if(v)current=false;}}),null);assert.equal(f.files.size,2);assert.deepEqual(locks,[true,false]);
  current=true;f.createHook=async()=>{current=false;};let opened=0;const result=await executeVaultFile(f.root,'Team/After',{current:()=>current,open:async()=>opened++});assert.equal(result.stale,true);assert.equal(result.opened,false);assert.equal(opened,0);assert.equal(f.files.has('Team/After.md'),true);assert.match(result.message,/bereits leer angelegt/);
});
test('Vault failed open leaves an explicitly named possible new file and always releases commit without deletion',async()=>{
  const f=fixture(),locks=[];await assert.rejects(executeVaultFile(f.root,'Team/New',{onCommit:v=>locks.push(v),open:async()=>{throw Error('session persistence failed');}}),e=>e.creationRequested&&e.path==='Team/New.md'&&e.message.includes('nicht automatisch gelöscht'));
  assert.equal(f.files.has('Team/New.md'),true);assert.deepEqual(locks,[true,false]);
  const f2=fixture();await assert.rejects(executeVaultFile(f2.root,'Root.md',{open:async()=>{throw Error('read failed');}}),e=>e.creationRequested===false);assert.equal(f2.files.size,2);
});

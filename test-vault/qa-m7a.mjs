import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {parseAgendaFile,createAgendaIndex} from '../editor/agenda-index.mjs';
import {createSession} from '../editor/storage-session.mjs';

const bytes=s=>new TextEncoder().encode(s), immediate=async()=>{};
let groups=0;const findings=[];
const check=async(name,fn)=>{await fn();groups++;console.log('PASS '+name);};
const gate=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve};};
async function settle(index){const deadline=performance.now()+5000;while(index.snapshot().running){assert.ok(performance.now()<deadline,'index completion timeout');await new Promise(r=>setTimeout(r,0));}}
function directory(name,entries){
  return {kind:'directory',name,entriesData:entries,async queryPermission(){return 'granted';},async isSameEntry(other){return this===other;},
    async *entries(){for(const [name,value] of Object.entries(entries))yield [name,value?.kind?value:file(name,()=>entries[name])];},
    async getFileHandle(name,options){assert.ok(!options?.create,'no file creation');if(!(name in entries))throw Error('Missing '+name);return entries[name]?.kind?entries[name]:file(name,()=>entries[name]);},
    async getDirectoryHandle(name,options){assert.ok(!options?.create,'no folder creation');if(!entries[name]?.kind)throw Error('Missing folder '+name);return entries[name];},
    async removeEntry(){assert.fail('no deletes');}};
}
function file(name,read){return {kind:'file',name,async getFile(){let value=read();if(typeof value==='function')value=await value();if(value instanceof Error)throw value;const content=value instanceof Uint8Array?value:bytes(value);return {async arrayBuffer(){return content.slice().buffer;}};},async createWritable(){assert.fail('index cannot write');}};}
function session(){const map=new Map();let n=0;return createSession({store:{async put(k,v){map.set(k,v);},async get(k){return map.get(k);},async keys(){return [...map.keys()];}},id:()=>String(++n),locks:{request:async(_key,fn)=>fn()}});}
const app=await readFile(new URL('../editor/app.mjs',import.meta.url),'utf8');

await check('H1–H6 independent status, ancestors including irrelevant parents, BOM/CRLF/Unicode offsets',async()=>{
  const raw='\ufeff#+SEQ_TODO: NEXT(n) WAIT(w) | FIN(f) DROP(d)\r\n# NEXT Root 😃\r\n## Holder\r\n### FIN Child\r\n#### WAIT Fourth\r\n##### Plain\r\n###### DROP Sixth\r\n# Date only\r\nSCHEDULED: <2026-11-08 So 00:00-23:59> DEADLINE: <2026-11-09 Mo 12:30>\r\n- [ ] no\r\n- [x] no';
  const p=await parseAgendaFile(bytes(raw),'sub/ä.MD');assert.deepEqual(p.records.map(r=>[r.level,r.status,r.closed]),[[1,'NEXT',false],[3,'FIN',true],[4,'WAIT',false],[6,'DROP',true],[1,null,null]]);
  const six=p.records[3];assert.deepEqual(six.ancestors.map(a=>a.level),[1,2,3,4,5]);assert.equal(six.from,raw.slice(1).replaceAll('\r\n','\n').indexOf('######'));
  assert.equal(p.records[4].scheduled.endTime,'23:59');assert.equal(p.records[4].deadline.startTime,'12:30');assert.equal(p.diagnostics.length,0);
});
await check('containers, frontmatter, workflow exclusions, empty files',async()=>{
  for(const text of ['', '# Plain\n- [ ] TODO x\n- [x] DONE y','---\n# TODO yaml\n#+SEQ_TODO: BAD(b) | FIN(f)\n---','```md\n# TODO no\n#+SEQ_TODO: BAD(b) | FIN(f)\n```','~~~\n# TODO no\n~~~','    # TODO no','> # TODO no','- # TODO no','<div>\n# TODO no\n</div>','<!--\n# TODO no\n-->']){
    const p=await parseAgendaFile(bytes(text+'\n\n# TODO Real'),'a.md');assert.deepEqual(p.records.map(r=>r.title),['Real']);
  }
});
await check('valid/invalid leap dates, times, windows, duplicate/misplaced metadata',async()=>{
  for(const value of ['<2028-02-29 Di>','<0001-01-01 Mo>','<9999-12-31 Fr>','<2026-11-08 00:00>','<2026-11-08 So 12:00-12:00>']){
    const p=await parseAgendaFile(bytes('# A\nSCHEDULED: '+value),'a.md');assert.equal(p.records.length,1,value);assert.equal(p.diagnostics.length,0);
  }
  for(const line of ['SCHEDULED: <2026-02-29 So>','SCHEDULED: <0000-01-01 Mo>','DEADLINE: <2026-11-08 So 25:00>','DEADLINE: <2026-11-08 So 10:60>','DEADLINE: <2026-11-08 So 20:00-10:00>','SCHEDULED: <2026-11-08 So +1w>','SCHEDULED: <2026-11-08 So> SCHEDULED: <2026-11-09 Mo>','body\nSCHEDULED: <2026-11-08 So>','\nDEADLINE: <2026-11-08 So>']){
    const p=await parseAgendaFile(bytes('# TODO A\n'+line+'\n# TODO B'),'a.md');assert.equal(p.records.length,2,line);assert.equal(p.records[0].scheduled,null);assert.equal(p.records[0].deadline,null);assert.equal(p.diagnostics.length,1,line);
  }
});
await check('workflow latest valid/default/reset and multiple definitions',async()=>{
  const entries={'a.md':'#+SEQ_TODO: NEXT(n) | FIN(f)\n# NEXT a'},root=directory('A',entries),index=createAgendaIndex({yieldTask:immediate});await index.selectVault(root);
  entries['a.md']='#+SEQ_TODO: X(x) | Y(y)\n#+SEQ_TODO: NEXT(n) | FIN(f)\n# NEXT a';await index.rebuild();assert.equal(index.query()[0].status,'NEXT');assert.equal(index.snapshot().diagnostics.length,1);
  await index.selectVault(root);assert.equal(index.query().length,0);assert.equal(index.snapshot().diagnostics.length,1);
  entries['a.md']='# TODO default';await index.rebuild();assert.equal(index.query()[0].status,'TODO');assert.equal(index.snapshot().diagnostics.length,0);
});
await check('recursive hidden sources/deep traversal, read/directory/UTF8 failures isolated, reads only',async()=>{
  let deep=directory('leaf',{'leaf.md':'# TODO Leaf'});for(let n=0;n<14;n++)deep=directory(String(n),{child:deep});
  const entries={deep,'.hidden':directory('.hidden',{'hidden.md':'# DONE Hidden'}),'bad.md':new Uint8Array([0xff]),'denied.md':Object.assign(Error('denied'),{name:'NotAllowedError'}),'empty.md':'hello',broken:{kind:'directory',async *entries(){throw Error('directory denied');}},'.storage-spike-backups':directory('backup',{'copy.md':'# TODO excluded'}),'no.txt':'# TODO no'},root=directory('synthetic',entries),index=createAgendaIndex({yieldTask:immediate});await index.selectVault(root);
  assert.deepEqual(index.query().map(r=>r.title).sort(),['Hidden','Leaf']);assert.equal(index.snapshot().files,5);assert.equal(index.snapshot().diagnostics.length,3);assert.ok(index.snapshot().diagnostics.some(d=>d.path==='denied.md'&&d.message.includes('NotAllowedError')));
});
await check('queries date boundaries/ranges/overdue/statusless/status/immutable/source',async()=>{
  const root=directory('A',{'a.md':'# TODO Open\nSCHEDULED: <2026-11-08 So> DEADLINE: <2026-11-09 Mo>\n# DONE Closed\nDEADLINE: <2026-11-01 So>\n# Appointment\nSCHEDULED: <2026-11-08 So>\n# TODO Undated\n# Last\nDEADLINE: <9999-12-31 Fr>\n# First\nDEADLINE: <0001-01-01 Mo>'}),index=createAgendaIndex({yieldTask:immediate});await index.selectVault(root);
  assert.equal(index.query({type:'open'}).length,2);assert.equal(index.query({type:'closed'}).length,1);assert.equal(index.query({type:'todo'}).length,3);assert.equal(index.query({status:null}).length,3);
  assert.equal(index.query({type:'day',from:'2026-11-08'}).length,2);assert.equal(index.query({type:'week',from:'2026-11-02'}).length,2);assert.equal(index.query({type:'week',from:'9999-12-30'}).length,1);assert.equal(index.query({type:'week',from:'0001-01-01'}).length,1);
  assert.equal(index.query({type:'overdue',today:'2026-11-09'}).length,0);assert.deepEqual(index.query({type:'overdue',today:'2026-11-10'}).map(r=>r.title),['Open']);
  for(const q of [{type:'day'},{type:'week'},{type:'overdue'},{from:'2026-02-29'},{from:'2026-11-09',to:'2026-11-08'},{type:'unknown'}])assert.throws(()=>index.query(q));
  const snap=index.snapshot(),record=snap.records[0];assert.ok(Object.isFrozen(snap));assert.ok(Object.isFrozen(record));assert.throws(()=>record.ancestors.push({}));assert.throws(()=>record.source.line=5);assert.equal(index.source(record.id).path,'a.md');index.query().pop();assert.equal(index.query().length,6);await index.rebuild();assert.equal(index.source(record.id),null);
});
await check('new/deleted/changed sources and definitions, updated positions',async()=>{
  const entries={'a.md':'# TODO Old'},root=directory('A',entries),index=createAgendaIndex({yieldTask:immediate});await index.selectVault(root);const old=index.query()[0];
  entries['a.md']='intro\n\n#+SEQ_TODO: NEXT(n) | FIN(f)\n# FIN Changed';await index.updateFile('a.md',root);assert.equal(index.query()[0].title,'Changed');assert.equal(index.query()[0].closed,true);assert.equal(index.query()[0].line,4);assert.equal(index.source(old.id),null);
  entries['new.md']='# TODO New';delete entries['a.md'];await index.rebuild();assert.deepEqual(index.query().map(r=>r.path),['new.md']);
  for(const path of ['../new.md','./new.md','/new.md','new.txt','a//new.md'])await index.updateFile(path,root);assert.equal(index.query().length,1);
});
await check('old vault async results, same-name switch, synchronous clearing and foreign saves',async()=>{
  const delay=gate(),started=gate(),a=directory('same',{'a.md':async()=>{started.resolve();return delay.promise;}}),b=directory('same',{'b.md':'# TODO B'}),index=createAgendaIndex({yieldTask:immediate});
  const pending=index.selectVault(a);await started.promise;const next=index.selectVault(b);assert.equal(index.query().length,0);await next;const revision=index.snapshot().revision;delay.resolve('# TODO Stale');await pending;assert.equal(index.snapshot().revision,revision);assert.equal(index.query()[0].title,'B');await index.updateFile('a.md',a);assert.equal(index.query()[0].title,'B');await index.selectVault(null);assert.equal(index.query().length,0);
});
await check('overlapping same-vault builds, concurrent saves, stale read failure',async()=>{
  const entries={'a.md':'# TODO A','b.md':'# TODO B'},root=directory('A',entries),index=createAgendaIndex({yieldTask:immediate});await index.selectVault(root);
  let reads=0;const delay=gate(),started=gate();entries['a.md']=async()=>{if(++reads===1){started.resolve();return delay.promise;}return '# DONE fresh A';};entries['b.md']='# DONE fresh B';
  const old=index.updateFile('a.md',root);await started.promise;await index.updateFile('b.md',root);const revision=index.snapshot().revision;delay.resolve(Error('stale denied'));await old;assert.equal(index.snapshot().revision,revision);assert.deepEqual(index.query().map(r=>r.closed),[true,true]);assert.equal(index.snapshot().diagnostics.length,0);
});

// Execute actual trusted app callback source with real Session and Index, using
// synthetic file handles; this is not a native browser test.
function callback(name,context){
  const marker=`bind('${name}', async () => {`,start=app.indexOf(marker);assert.ok(start>=0);
  const end=app.indexOf('\n});',start)+5;assert.ok(end>start);
  const keys=Object.keys(context),values=Object.values(context);let captured;
  new Function(...keys,'bind','let persistPending = true;\n'+app.slice(start,end))(...values,(_name,fn)=>captured=fn);
  return captured;
}
await check('actual app open callback reload/index consistency probe',async()=>{
  const entries={'a.md':'# TODO Original'},root=directory('A',entries),index=createAgendaIndex({yieldTask:immediate}),s=session();await index.selectVault(root);
  entries['a.md']='prefix\n\n# DONE Reloaded';let editor='';
  await callback('open',{requireSynthetic(){},permission:async()=>{},session:s,$:()=>({value:'a.md'}),vault:root,useRingVault:async()=>{},sameVault:async(l,r)=>l===r,syncEditor(){editor=s.text;},status(){},view:{focus(){}},agendaIndex:index})();
  await settle(index);
  assert.equal(editor,entries['a.md']);
  // Report a confirmed issue without preventing the rest of independent QA.
  if(index.query()[0]?.title!=='Reloaded')findings.push('P2 file.open lädt extern geänderte Datei neu in Session/Editor, aktualisiert Index aber nicht: Index Original/from0, Editor Reloaded/from8.');
  else {assert.equal(index.query()[0].from,8);assert.equal(index.query()[0].closed,true);}
});
await check('actual app recovery resets vault without indexing recovered unsaved draft',async()=>{
  const a=directory('A',{'a.md':'# TODO A'}),b=directory('B',{'b.md':'# TODO Saved B'}),index=createAgendaIndex({yieldTask:immediate});await index.selectVault(a);let selected=a,editor='';
  const s={vault:b,text:'# DONE Unsaved draft',async persist(){},async recover(){}};
  // Scope vault is local in the executed callback as in app.mjs.
  const run=callback('recover',{requireSynthetic(){},session:s,$:()=>({value:'draft',replaceChildren(){}}),vault:selected,useRingVault:async()=>{},agendaIndex:index,syncEditor(){editor=s.text;},status(){}});await run();
  await settle(index);assert.equal(index.snapshot().vaultName,'B');assert.equal(index.query()[0].title,'Saved B');assert.equal(editor,'# DONE Unsaved draft');
});
await check('actual app save callback does not refresh on save failure or foreign vault',async()=>{
  const start=app.indexOf('async function save() {'),end=app.indexOf("\nbind('save',save);",start);const source=app.slice(start,end);
  let updates=0;const a={},b={},deps={requireSynthetic(){},session:{hasDocument:true,vault:a,path:'a.md',async save(){throw Error('conflict');}},vault:a,sameVault:async(l,r)=>l===r,agendaIndex:{updateFile(){updates++;}},status(){}};
  const make=d=>new Function(...Object.keys(d),'let persistPending=true;'+source+';return save;')(...Object.values(d));await assert.rejects(make(deps)(),/conflict/);assert.equal(updates,0);
  deps.session.save=async()=>({unchanged:true});deps.vault=b;await make(deps)();assert.equal(updates,0);deps.vault=a;await make(deps)();assert.equal(updates,1);
});
await check('real dirty Session survives index refresh, and conflicting save preserves source and index',async()=>{
  const entries={'a.md':'# TODO Saved'},root=directory('A',entries),index=createAgendaIndex({yieldTask:immediate}),s=session();await s.open({vault:root,handle:await root.getFileHandle('a.md'),path:'a.md'});await index.selectVault(root);
  s.applyChanges([{from:0,to:0,insert:'draft\n\n'}]);const draft=s.text;await index.rebuild();assert.equal(s.text,draft);assert.equal(s.dirty,true);assert.equal(index.query()[0].from,0);
  entries['a.md']='# DONE External';await index.rebuild();assert.equal(index.query()[0].closed,true);assert.equal(s.text,draft);assert.equal((await s.check()).conflict,true);await assert.rejects(s.save());assert.equal(entries['a.md'],'# DONE External');assert.equal(s.text,draft);assert.equal(index.query()[0].title,'External');
});
await check('500 files and 1000-heading single source; cooperative/idle/rebuild resource sample',async()=>{
  const entries={};for(let n=0;n<500;n++)entries[`f${n}.md`]=`# TODO T${n}\nSCHEDULED: <2026-11-08 So>`;
  const root=directory('Load',{nested:directory('nested',entries)});let yields=0,changes=0;const index=createAgendaIndex({yieldTask:async()=>{yields++;await new Promise(r=>setImmediate(r));},onChange(){changes++;}});
  global.gc?.();const before=process.memoryUsage().heapUsed,start=performance.now();await index.selectVault(root);assert.equal(index.query().length,500);assert.ok(yields>=500);const first=performance.now()-start,stable=changes;await new Promise(r=>setTimeout(r,100));assert.equal(changes,stable,'no idle publication/poll');
  const timings=[];for(let n=0;n<20;n++){const t=performance.now();await index.rebuild();timings.push(performance.now()-t);assert.equal(index.query().length,500);}global.gc?.();const after=process.memoryUsage().heapUsed;
  const text=Array.from({length:1000},(_,n)=>`# TODO ${n}\n${'body '.repeat(30)}\n`).join('');const t=performance.now();const parsed=await parseAgendaFile(bytes(text),'large.md');assert.equal(parsed.records.length,1000);
  console.log(JSON.stringify({load:{files:500,firstMs:first,yields,rebuilds:20,minMs:Math.min(...timings),maxMs:Math.max(...timings),totalMs:performance.now()-start,heapBefore:before,heapAfter:after,gc:!!global.gc,singleChars:text.length,singleHeadings:1000,singleMs:performance.now()-t}},null,2));
});
console.log(JSON.stringify({groups,findings},null,2));
if(findings.length)process.exitCode=2;

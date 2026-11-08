import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseAgendaFile,createAgendaIndex} from './agenda-index.mjs';
import {COMMAND_METADATA} from './commands.mjs';
import {createSession} from './storage-session.mjs';
const bytes=text=>new TextEncoder().encode(text);
const immediate=async()=>{};
function vault(entries,name='synthetic'){
  const directory={kind:'directory',name,async *entries(){for(const [key,value] of Object.entries(entries)){if(value instanceof Error)yield [key,{kind:'file',async getFile(){throw value;}}];else if(typeof value==='string'||typeof value==='function')yield [key,{kind:'file',async getFile(){const content=typeof value==='function'?await value():value;return {async arrayBuffer(){return bytes(content).buffer;}};}}];else yield [key,value];}},async getDirectoryHandle(key){if(!entries[key])throw Error('missing folder');return entries[key];},async getFileHandle(key){for await(const [entry,handle] of this.entries())if(entry===key)return handle;throw Error('missing file');}};
  return directory;
}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('M7a parses nested H1–H6, workflow, dates, hierarchy and no checkbox tasks',async()=>{
  const text='#+SEQ_TODO: NEXT(n) WAIT(w) | FIN(f)\r\n# Container\r\n## NEXT Parent\r\nSCHEDULED: <2026-11-08 So 10:00-12:00> DEADLINE: <2026-11-10 Di>\r\n### FIN Child\r\n#### Appointment\r\nDEADLINE: <2026-11-09 Mo 15:00>\r\n##### WAIT Five\r\n###### NEXT Six\r\n- [ ] no\r\n- [x] no';
  const parsed=await parseAgendaFile(bytes('\ufeff'+text),'nested/test.md');
  assert.equal(parsed.records.length,5);assert.equal(parsed.diagnostics.length,0);
  const [parent,child,appointment,five,six]=parsed.records;
  assert.equal(parent.level,2);assert.equal(parent.closed,false);assert.equal(child.closed,true);assert.equal(appointment.status,null);
  assert.equal(parent.scheduled.startTime,'10:00');assert.equal(parent.scheduled.endTime,'12:00');assert.equal(appointment.deadline.startTime,'15:00');
  assert.equal(six.level,6);assert.equal(five.level,5);assert.equal(six.ancestors.length,5);assert.equal(parent.ancestors[0].title,'Container');
  assert.equal(parent.from,text.replaceAll('\r\n','\n').indexOf('## NEXT'));assert.equal(parent.line,3);
});
test('M7a ignores frontmatter, fences, indented code, quotes, lists, HTML and Setext',async()=>{
  const text='---\n# TODO YAML\n---\n```\n# TODO fence\n```\n    # TODO code\n\n> # TODO quote\n\n- # TODO list\n\n<div>\n# TODO html\n</div>\n\nTODO setext\n===\n\n# TODO Real';
  const parsed=await parseAgendaFile(bytes(text),'safe.md');assert.deepEqual(parsed.records.map(r=>r.title),['Real']);
  assert.equal((await parseAgendaFile(bytes('# Plain\nText\n- [ ] box'),'empty.md')).records.length,0);
});
test('M7a malformed planning diagnoses independently; invalid workflows retain latest valid rules',async()=>{
  const valid=await parseAgendaFile(bytes('#+SEQ_TODO: NEXT(n) | FIN(f)\n# NEXT work'),'a.md');
  const invalid=await parseAgendaFile(bytes('#+SEQ_TODO: broken\n# NEXT work\nSCHEDULED: <2026-02-30 Mo>\n# TODO Unknown\n# Date\nDEADLINE: <2026-11-08 So>'),'a.md',valid.rules);
  assert.equal(invalid.records.length,2);assert.equal(invalid.records[0].status,'NEXT');assert.equal(invalid.records[0].scheduled,null);assert.equal(invalid.diagnostics.length,2);
  const defaults=await parseAgendaFile(bytes('#+SEQ_TODO: broken\n# TODO default'),'a.md');assert.equal(defaults.records[0].status,'TODO');
  for(const stamp of ['<2026-11-08 So 24:00>','<2026-11-08 So 15:00-14:00>','<2026-11-08 So +1w>']){
    const p=await parseAgendaFile(bytes('# TODO A\nSCHEDULED: '+stamp+'\n# TODO B'),'a.md');assert.equal(p.records.length,2);assert.equal(p.diagnostics.length,1);
  }
});
test('M7a recursively reads hidden files, isolates read/directory errors and never writes',async()=>{
  const broken={kind:'directory',async *entries(){throw Error('denied folder');}};
  const root=vault({'a.md':'# TODO A',sub:vault({'b.MD':'# DONE B','.hidden.md':'# TODO H'}),'bad.md':Error('denied file'),broken,'.storage-spike-backups':vault({'not.md':'# TODO backup'}),'other.txt':'# TODO no'});
  const index=createAgendaIndex({yieldTask:immediate});await index.selectVault(root);
  const snapshot=index.snapshot();assert.equal(snapshot.records.length,3);assert.equal(snapshot.files,4);assert.equal(snapshot.diagnostics.length,2);
  assert.ok(snapshot.diagnostics.some(e=>e.path==='bad.md'));assert.ok(snapshot.diagnostics.some(e=>e.path==='broken/'));
  assert.throws(()=>snapshot.records.push({}));assert.throws(()=>snapshot.records[0].source.from=99);
});
test('M7a query API separates tasks, statusless dates, week and overdue deadlines',async()=>{
  const index=createAgendaIndex({yieldTask:immediate});await index.selectVault(vault({'a.md':'# TODO A\nSCHEDULED: <2026-11-08 So> DEADLINE: <2026-11-09 Mo>\n# DONE B\nDEADLINE: <2026-11-01 So>\n# Date\nDEADLINE: <2026-11-02 Mo>'}));
  assert.equal(index.query({type:'todo'}).length,2);assert.equal(index.query({type:'open'}).length,1);assert.equal(index.query({type:'closed'}).length,1);
  assert.equal(index.query({type:'scheduled'}).length,1);assert.equal(index.query({type:'deadline'}).length,3);
  assert.equal(index.query({type:'day',from:'2026-11-08'}).length,1);assert.equal(index.query({type:'week',from:'2026-11-02'}).length,2);
  assert.equal(index.query({type:'overdue',today:'2026-11-09'}).length,0);assert.equal(index.query({type:'overdue',today:'2026-11-10'}).length,1);
  assert.equal(index.query({status:'DONE'}).length,1);assert.throws(()=>index.query({type:'day'}));assert.throws(()=>index.query({from:'2026-02-30'}));
  assert.throws(()=>index.query({type:'overdue'}));assert.throws(()=>index.query({type:'other'}));
});
test('M7a saved-file update rereads source, invalidates locators and full refresh removes/adds files',async()=>{
  const entries={'a.md':'# TODO Original'},root=vault(entries),index=createAgendaIndex({yieldTask:immediate});await index.selectVault(root);
  const old=index.snapshot().records[0];assert.ok(index.source(old.id));
  entries['a.md']='prefix\n\n# DONE Changed';await index.updateFile('a.md',root);
  assert.equal(index.source(old.id),null);assert.equal(index.query()[0].from,8);assert.equal(index.query()[0].closed,true);
  entries['b.md']='# TODO New';delete entries['a.md'];await index.rebuild();assert.deepEqual(index.query().map(r=>r.title),['New']);
  await index.updateFile('../bad.md',root);assert.equal(index.query().length,1);
});
test('M7a vault reset discards slow prior reads, same-vault rebuild races and foreign saves',async()=>{
  const slow=deferred(),started=deferred();let count=0;
  const first=vault({'a.md':async()=>{started.resolve();return slow.promise;}}),second=vault({'b.md':'# TODO B'});
  const index=createAgendaIndex({yieldTask:immediate}),old=index.selectVault(first);await started.promise;
  await index.selectVault(second);slow.resolve('# TODO stale');await old;assert.deepEqual(index.query().map(r=>r.title),['B']);
  await index.updateFile('a.md',first);assert.deepEqual(index.query().map(r=>r.title),['B']);
  const delay=deferred(),readStarted=deferred(),entries={'x.md':async()=>{if(++count===1){readStarted.resolve();return delay.promise;}return '# TODO fresh';}};
  const root=vault(entries),stale=index.selectVault(root);await readStarted.promise;await index.rebuild();delay.resolve('# TODO old');await stale;assert.equal(index.query()[0].title,'fresh');
  await index.selectVault(null);assert.equal(index.query().length,0);assert.equal(index.snapshot().vaultName,null);
});
test('M7a concurrent save updates preserve both changed files',async()=>{
  const entries={'a.md':'# TODO A','b.md':'# TODO B'},root=vault(entries),index=createAgendaIndex({yieldTask:immediate});await index.selectVault(root);
  const delay=deferred(),started=deferred();let reads=0;entries['a.md']=async()=>{if(++reads===1){started.resolve();return delay.promise;}return '# DONE Anew';};entries['b.md']='# DONE Bnew';
  const a=index.updateFile('a.md',root);await started.promise;await index.updateFile('b.md',root);delay.resolve('# TODO old');await a;
  assert.deepEqual(index.query().map(r=>r.closed),[true,true]);
});
test('M7a 400 synthetic nested files yield cooperatively; no hard file-count cutoff',async t=>{
  const entries={};for(let n=0;n<400;n++)entries[`${n}.md`]=`# TODO Task ${n}\nSCHEDULED: <2026-11-08 So>`;
  let yields=0;const index=createAgendaIndex({yieldTask:async()=>{yields++;}}),start=performance.now();
  await index.selectVault(vault({nested:vault(entries)}));assert.equal(index.query().length,400);assert.ok(yields>=400);
  t.diagnostic(`400 Dateien: ${(performance.now()-start).toFixed(1)} ms, ${yields} Yield-Aufrufe (Node-Modell, keine native Latenzmessung).`);
});
test('M7a background reads stay detached; M7b dispatcher adds its own shortcut without remapping refresh',async()=>{
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
  assert.match(app,/void agendaIndex.selectVault\(vault\)/);assert.match(app,/const result = await session.save\(\)/);
  assert.match(app,/sameVault\(session.vault,vault\)/);assert.match(app,/void agendaIndex.updateFile\(session.path,vault\)/);
  const refresh=COMMAND_METADATA.find(c=>c.id==='agenda.refresh');assert.ok(refresh);assert.equal(refresh.shortcut,'');
  assert.match(COMMAND_METADATA.find(c=>c.id==='agenda.dispatch').shortcut,/C-c a/);
});
test('M7a week clamps to the supported last year and preserves years below 100',async()=>{
  const index=createAgendaIndex({yieldTask:immediate});await index.selectVault(vault({'a.md':'# Last\nSCHEDULED: <9999-12-31 Fr>\n# First\nDEADLINE: <0001-01-01 Mo>'}));
  assert.equal(index.query({type:'week',from:'9999-12-29'}).length,1);assert.equal(index.query({type:'week',from:'0001-01-01'}).length,1);
});
test('M7a large single document completes the real parser and 600 independent headings',async t=>{
  const text=Array.from({length:600},(_,n)=>`# TODO Item ${n}\nSCHEDULED: <2026-11-08 So>\n${'paragraph '.repeat(40)}\n\n`).join('');
  let yields=0;const start=performance.now(),parsed=await parseAgendaFile(bytes(text),'large.md',undefined,{yieldTask:async()=>{yields++;}});
  assert.equal(parsed.records.length,600);assert.equal(parsed.diagnostics.length,0);assert.equal(parsed.records.at(-1).title,'Item 599');
  t.diagnostic(`${text.length} Zeichen/600 Headings: ${(performance.now()-start).toFixed(1)} ms, ${yields} Parser-Yields (Node-Modell).`);
});
test('M7a actual file.open reload updates indexed status/title/position without editor injection',async()=>{
  const entries={'a.md':'# TODO Original'},root=vault(entries),index=createAgendaIndex({yieldTask:immediate});root.queryPermission=async()=> 'granted';
  await index.selectVault(root);const original=index.query()[0];
  const values=new Map();let counter=0;
  const session=createSession({store:{put:async(k,v)=>values.set(k,v),get:async k=>values.get(k),keys:async()=>[...values.keys()]},id:()=>String(++counter)});
  entries['a.md']='prefix\n\n# DONE Reloaded';let editor='';
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8'),start=app.indexOf("bind('open', async () => {"),end=app.indexOf('\n});',start)+5;
  assert.ok(start>=0&&end>start);let callback;
  const context={requireSynthetic(){},permission:async()=>{},session,$:()=>({value:'a.md'}),vault:root,useRingVault:async()=>{},syncEditor(){editor=session.text;},sameVault:async(a,b)=>a===b,status(){},view:{focus(){}},agendaIndex:index};
  new Function(...Object.keys(context),'bind','let persistPending=true;'+app.slice(start,end))(...Object.values(context),(_name,fn)=>callback=fn);
  await callback();while(index.snapshot().running)await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(editor,entries['a.md']);const record=index.query()[0];assert.equal(record.title,'Reloaded');assert.equal(record.status,'DONE');assert.equal(record.closed,true);assert.equal(record.from,8);assert.equal(record.line,3);assert.equal(index.source(original.id),null);
});

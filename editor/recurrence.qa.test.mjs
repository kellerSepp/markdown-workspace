import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {ensureSyntaxTree} from '@codemirror/language';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {parseRepeater,parseTimestamp,timestamp} from './planning-date.mjs';
import {planningContext,planPlanning} from './planning.mjs';
import {todoRules,readTodoRules,planTodo,createTodoController} from './todo.mjs';
import {readRepeatMetadata,planRepeatLog} from './recurrence-metadata.mjs';
import {readPlanningDrawers} from './planning-drawers.mjs';
import {createPlanningForm} from './planning-calendar.mjs';
import {parseAgendaFile,createAgendaIndex} from './agenda-index.mjs';
import {addRepeatInterval,nextRepeatDate} from './recurrence-date.mjs';

const make=(doc,pos=0)=>EditorState.create({doc,selection:{anchor:pos},extensions:[markdown(),todoRules,history()]});
const meta=s=>readRepeatMetadata(s,planningContext(s),s.field(todoRules).rules);
const own='# TODO Own\nSCHEDULED: <2026-11-10 Di 09:10-10:20 +1w>\n';

test('Independent QA timestamp grammar roundtrips all bounded repeat combinations and rejects malformed values',()=>{
  for(const mode of ['+','++','.+'])for(const n of [1,2,37])for(const unit of ['d','w','m','y'])for(const times of [{},{startTime:'00:00'},{startTime:'23:58',endTime:'23:59'}]){
    const value={date:'2024-02-29',...times,repeat:mode+n+unit},formatted=timestamp(value);assert.equal(formatted.message,undefined);assert.equal(parseTimestamp(formatted.text).text,formatted.text);assert.equal(parseRepeater(value.repeat).interval,n);
  }
  for(const repeat of ['++0m','.+01y','+1.5d','+1e2w','+1h','+1D','+1m -2d','+1d +2w','+9007199254740992m','+Infinityd','+1w\n','\n+1w'])assert.ok(parseRepeater(repeat).message,repeat);
  assert.ok(parseTimestamp('<2026-11-10 Di 23:59-00:00 +1d>').message);assert.ok(parseTimestamp('[2026-11-10 Di +1d]').message);
});

test('Independent QA approved calendar clamping is per rewritten interval without hidden original-day anchor',()=>{
  let date='2026-01-31';const expected=['2026-02-28','2026-03-28','2026-04-28','2026-05-28'];for(const next of expected){date=addRepeatInterval(date,'+1m').date;assert.equal(date,next);}
  assert.equal(addRepeatInterval('2024-02-29','+1y').date,'2025-02-28');assert.equal(addRepeatInterval('2096-02-29','+4y').date,'2100-02-28');assert.equal(addRepeatInterval('2026-01-31','+2m').date,'2026-03-31');
  for(const unit of ['d','w','m','y'])assert.ok(addRepeatInterval('9999-12-31','+1'+unit).message);assert.equal(addRepeatInterval('0001-01-01','+1y').date,'0002-01-01');
});

test('Independent QA planning edits preserve repeater/time independently and undo exactly once',()=>{
  let state=make(own+'Body\n## TODO Child\nDEADLINE: <2026-11-20 Fr .+1m>'),original=state.doc.toString();const view={get state(){return state;},dispatch:spec=>{state=spec.state??state.update(spec).state;}};
  const plan=planPlanning(state,'SCHEDULED',{date:'2026-11-11',startTime:'09:10',endTime:'10:20'});view.dispatch(plan.spec);assert.equal(state.doc.toString(),original.replace('11-10 Di','11-11 Mi'));assert.equal(undoDepth(state),1);assert.equal(undo(view),true);assert.equal(state.doc.toString(),original);assert.equal(redo(view),true);
  const edited=state.doc.toString();for(const repeat of ['+0d','++1h','bad']){assert.ok(planPlanning(state,'SCHEDULED',{date:'2026-11-12',repeat}).message);assert.equal(state.doc.toString(),edited);}
});

test('Independent QA local reset rejects malformed metadata and does not inherit parent/child properties',()=>{
  const text='#+SEQ_TODO: NEXT(n) WAIT(w) | DONE(d) CANCEL(c)\n# NEXT Parent\nSCHEDULED: <2026-11-10 Di +1w>\n:PROPERTIES:\n:REPEAT_TO_STATE: WAIT\n:END:\n## NEXT Child\nSCHEDULED: <2026-11-10 Di +1d>\nBody';
  const parent=make(text,text.indexOf('# NEXT')),child=make(text,text.indexOf('## NEXT'));assert.equal(meta(parent).resetState,'WAIT');assert.equal(meta(child).resetState,'NEXT');
  for(const body of [':PROPERTIES:\n:REPEAT_TO_STATE: TODO\n:REPEAT_TO_STATE: TODO\n:END:',':LOGBOOK:\nold',':LOGBOOK:\n:PROPERTIES:\n:END:',':END:',':PROPERTIES:\nunknown raw line\n:END:']){const state=make(own+body);assert.ok(meta(state).message,body);assert.equal(state.doc.toString(),own+body);}
});

test('Independent QA inert LOGBOOK stays outside rules and agenda; one log append preserves historical text',async()=>{
  const old=':LOGBOOK:\n- State "DONE" from "TODO" [2026-11-03 Di 17:00]\n#+SEQ_TODO: ALIEN(a) | CLOSED(c)\nDEADLINE: <2026-01-01 Do>\n:END:',state=make(own+old+'\nBody'),original=state.doc.toString();assert.equal(readTodoRules(state).rules[0].name,'TODO');assert.equal(planningContext(state).entries.SCHEDULED.repeat,'+1w');
  const planned=planRepeatLog(state,meta(state),{fromState:'TODO',toState:'DONE',now:new Date(2026,10,10,12,34)}),next=state.update({changes:planned.changes}).state;assert.match(next.doc.toString(),/\[2026-11-10 Di 12:34\]/);assert.equal(next.doc.toString().replace('- State "DONE" from "TODO" [2026-11-10 Di 12:34]\n',''),original);
  const parsed=await parseAgendaFile(new TextEncoder().encode(next.doc.toString()),'synthetic.md');assert.equal(parsed.records.length,1);assert.equal(parsed.records[0].status,'TODO');assert.equal(parsed.records[0].deadline,null);assert.equal(parsed.records[0].scheduled.repeat,'+1w');
});

class Element{
  constructor(tag,doc){this.tagName=tag;this.doc=doc;this.children=[];this.listeners={};this.attributes={};this.value='';}
  append(...nodes){for(const n of nodes){n.parent?.children.splice(n.parent.children.indexOf(n),1);n.parent=this;this.children.push(n);}}
  replaceChildren(...nodes){for(const n of this.children)n.parent=null;this.children=[];this.append(...nodes);}
  setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}removeEventListener(k,fn){this.listeners[k]=this.listeners[k]?.filter(x=>x!==fn);}
  emit(type,data={}){const e={target:this,preventDefault(){},stopPropagation(){this.stopped=true;},...data};for(let n=this;n;n=n.parent){for(const fn of n.listeners[type]??[])fn(e);if(e.stopped)break;}}
  click(){if(!this.disabled)this.emit('click');}focus(){this.doc.activeElement=this;}remove(){this.parent?.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}
}
const all=(node,p)=>[node,...node.children.flatMap(n=>all(n,p))].filter(p);
function formFixture(value){const doc={createElement:tag=>new Element(tag,doc)},commits=[],form=createPlanningForm({document:doc,kind:'SCHEDULED',value,commit:value=>commits.push(value),cancel(){}});return {doc,form,commits,inputs:all(form.root,n=>n.tagName==='input'),button:text=>all(form.root,n=>n.tagName==='button'&&n.textContent===text)[0]};}

test('Independent QA calendar explicit repeat changes/remove and direct day preserve old repeat until accepted',()=>{
  const value={date:'2026-11-10',startTime:'09:10',endTime:'10:20',repeat:'+1w'},f=formFixture(value);f.inputs[1].value='.+2m';f.inputs[1].emit('input');assert.deepEqual(f.commits,[]);all(f.form.root,n=>n.attributes['aria-label']==='2026-11-11')[0].click();assert.deepEqual(f.commits[0],{...value,date:'2026-11-11'});f.form.destroy();
  const edit=formFixture(value);edit.inputs[1].value='++3d';edit.button('Wiederholung setzen').click();assert.deepEqual(edit.commits[0],{...value,repeat:'++3d'});edit.form.destroy();
  const remove=formFixture(value);remove.button('Wiederholung entfernen').click();assert.deepEqual(remove.commits[0],{...value,repeat:''});remove.form.destroy();
  const invalid=formFixture(value);invalid.inputs[1].value='+0m';invalid.button('Wiederholung setzen').click();assert.deepEqual(invalid.commits,[]);invalid.form.destroy();
});

test('Independent QA code and quote drawer lookalikes are inert and calendar cleanup removes listeners',()=>{
  for(const wrap of [s=>'```\n'+s+'\n```',s=>s.split('\n').map(l=>'> '+l).join('\n'),s=>s.split('\n').map(l=>'    '+l).join('\n')])assert.equal(readPlanningDrawers(make(own+'\n'+wrap(':PROPERTIES:\n:REPEAT_TO_STATE: DONE\n:END:'))).drawers.length,0);
  const f=formFixture({date:'2026-11-10',repeat:'+1w'}),retained=all(f.form.root,()=>true);f.form.destroy();assert.equal(retained.reduce((sum,n)=>sum+Object.values(n.listeners).flat().length,0),0);
});

test('Independent QA frontmatter and incomplete cross-heading drawers cannot hide live rules or expose historical ones',()=>{
  const front='---\n:LOGBOOK:\n---\n#+SEQ_TODO: NEXT(n) | FIN(f)\n# NEXT Own\nSCHEDULED: <2026-11-10 Di +1w>\n:END:';assert.equal(readTodoRules(make(front)).rules?.[0].name,'NEXT','frontmatter drawer lookalike must not hide the real workflow');
  const crossed='# TODO First\n:LOGBOOK:\n#+SEQ_TODO: ALIEN(a) | CLOSED(c)\n# NEXT Second\n#+SEQ_TODO: NEXT(n) | FIN(f)\n:END:';assert.equal(readTodoRules(make(crossed)).rules?.[0].name,'NEXT','incomplete history ends at heading without leaking its rules or swallowing next heading rules');
});

test('Independent QA misplaced local PROPERTIES after prose is refused without migration',()=>{
  const doc=own+'Ordinary body\n:PROPERTIES:\n:REPEAT_TO_STATE: TODO\n:END:',state=make(doc);assert.ok(meta(state).message);assert.equal(state.doc.toString(),doc);
});

test('Independent QA strict future ++ handles today clock equality and minimum step while .+ keeps completion basis',()=>{
  const now=new Date(2026,10,10,12,0,30),base={date:'2026-11-09',repeat:'++1d'};
  for(const [startTime,expected] of [['20:00','2026-11-10'],['12:01','2026-11-10'],['12:00','2026-11-11'],['11:59','2026-11-11'],[null,'2026-11-11']])assert.equal(nextRepeatDate({...base,startTime},now).date,expected,String(startTime));
  assert.equal(nextRepeatDate({date:'2026-11-20',repeat:'++1d'},now).date,'2026-11-21');assert.equal(nextRepeatDate({date:'2026-01-31',repeat:'++1m'},new Date(2026,2,1,12)).date,'2026-03-28');
  assert.equal(nextRepeatDate({date:'2026-12-31',repeat:'.+1d'},now).date,'2026-11-11');assert.equal(nextRepeatDate({date:'2026-01-01',repeat:'+1d'},now).date,'2026-01-02');
});

test('Independent QA mixed repeated deadline removes scheduled in either combined order without moving surviving metadata behind LOGBOOK',()=>{
  const deadline='DEADLINE: <2026-11-10 Di +1w>',scheduled='SCHEDULED: <2026-11-09 Mo>';
  for(const join of [' ','\n'])for(const reverse of [false,true])for(const properties of ['',':PROPERTIES:\n:REPEAT_TO_STATE: TODO\n:END:\n']){
    const doc='# TODO Own\n'+(reverse?[scheduled,deadline]:[deadline,scheduled]).join(join)+'\n'+properties+'Body',s=make(doc),plan=planTodo(s,'DONE',{now:new Date(2026,10,10,12)});assert.ok(plan.spec,plan.message);const next=s.update(plan.spec).state,context=planningContext(next);assert.equal(context.message,undefined,JSON.stringify({join,reverse,properties}));assert.equal(context.entries.DEADLINE.date,'2026-11-17');assert.equal(context.entries.SCHEDULED,undefined);assert.match(next.doc.toString(),/\[2026-11-10 Di 12:00\]/);assert.equal((next.doc.toString().match(/- State/g)??[]).length,1);
  }
});

test('Independent QA both repeat fields/log/reset are one undo step; raw typing and redo create no extra event',()=>{
  const doc='#+SEQ_TODO: NEXT(n) WAIT(w) | FIN(f)\n# WAIT Own\nSCHEDULED: <2026-11-09 Mo 20:00 ++1d> DEADLINE: <2026-01-31 Sa +1m>\n:PROPERTIES:\n:REPEAT_TO_STATE: WAIT\n:END:\nBody\n## NEXT Child\nSCHEDULED: <2026-11-03 Di +1d>',now=new Date(2026,10,10,12);let state=make(doc,doc.indexOf('# WAIT'));const initial=state,view={get state(){return state;},dispatch:spec=>{state=spec.state??state.update(spec).state;}};
  view.dispatch(planTodo(state,'FIN',{now}).spec);const changed=state.doc.toString();assert.match(changed,/# WAIT Own/);assert.match(changed,/2026-11-10 Di 20:00 \+\+1d/);assert.match(changed,/2026-02-28 Sa \+1m/);assert.ok(changed.endsWith(doc.slice(doc.indexOf('## NEXT Child'))));assert.equal((changed.match(/- State/g)??[]).length,1);assert.match(changed,/- State "FIN" from "WAIT"/);assert.equal(undoDepth(state),1);
  for(let n=0;n<30;n++){assert.equal(undo(view),true);assert.equal(state.doc.toString(),initial.doc.toString());assert.equal(redo(view),true);assert.equal(state.doc.toString(),changed);}
  let raw=make(own);raw=raw.update({changes:{from:2,to:6,insert:'DONE'},userEvent:'input.type'}).state;assert.equal(raw.doc.toString(),own.replace('TODO','DONE'));assert.equal(raw.doc.toString().includes('LOGBOOK'),false);
});

test('Independent QA unsafe repeating completion refuses all text edits and metadata changes atomically',()=>{
  for(const body of [':PROPERTIES:\n:REPEAT_TO_STATE: TODO',':LOGBOOK:\n:END:\n:LOGBOOK:\n:END:','Body\n:PROPERTIES:\n:REPEAT_TO_STATE: TODO\n:END:',':LOGBOOK: extra\nold\n:END:',':LOGBOOK:\nold\n:END: extra']){const doc=own+body,s=make(doc),plan=planTodo(s,'DONE',{now:new Date(2026,10,10,12)});assert.ok(plan.message,body);assert.equal(plan.spec,undefined);assert.equal(s.doc.toString(),doc);}
  for(const stamp of ['<9999-12-31 Fr +1d>','<2026-11-10 Di +0w>','<2026-11-10 Di +1h>','<2026-11-10 Di +1w> SCHEDULED: <2026-11-11 Mi>']){const doc='# TODO Own\nSCHEDULED: '+stamp,s=make(doc),plan=planTodo(s,'DONE',{now:new Date(2026,10,10,12)});assert.ok(plan.message,stamp);assert.equal(plan.spec,undefined);assert.equal(s.doc.toString(),doc);}
});

test('Independent QA real status controller rejects stale double activation but accepts two explicit completion events in one minute',()=>{
  let state=make(own+'Body'),options;const view={get state(){return state;},dispatch:spec=>{state=spec.state??state.update(spec).state;}},controller=createTodoController({view,panel:{openChoices(value){options=value;return true;}},now:()=>new Date(2026,10,10,12,34)});
  controller.open();const saved={state};assert.equal(options.choose('DONE',saved),true);const first=state.doc.toString();assert.equal(options.choose('DONE',saved),false);assert.equal(state.doc.toString(),first);assert.equal((first.match(/- State/g)??[]).length,1);
  controller.open();assert.equal(options.choose('DONE',{state}),true);assert.equal((state.doc.toString().match(/- State/g)??[]).length,2);assert.match(state.doc.toString(),/2026-11-24 Di 09:10-10:20 \+1w/);
});

test('Independent QA saved index stays old before update and reflects one same-task recurrence afterward',async()=>{
  let saved=own+'Body\n## TODO Child\nSCHEDULED: <2026-11-11 Mi +1d>';const vault={name:'synthetic',async *entries(){yield ['qa.md',{kind:'file'}];},async getFileHandle(){return {async getFile(){return {async arrayBuffer(){return new TextEncoder().encode(saved).buffer;}};}};}};
  const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(vault);const original=index.snapshot(),s=make(saved),next=s.update(planTodo(s,'DONE',{now:new Date(2026,10,10,12)}).spec).state;
  assert.equal(index.snapshot(),original);assert.equal(index.query()[0].scheduled.date,'2026-11-10');saved=next.doc.toString();await index.updateFile('qa.md',vault);assert.equal(index.query().length,2);assert.equal(index.query()[0].scheduled.date,'2026-11-17');assert.equal(index.query()[1].scheduled.date,'2026-11-11');assert.equal(index.query()[1].ancestors[0].title,'Own');assert.equal(index.snapshot().diagnostics.length,0);
});

test('Independent QA bounded recurrence arithmetic load and large historical log stay deterministic without timers',async t=>{
  const now=new Date(9998,10,10,12),samples=[],started=performance.now();for(let n=0;n<1000;n++){const before=performance.now();assert.equal(nextRepeatDate({date:'0001-01-31',repeat:'++1m'},now).date,'9998-11-28');assert.equal(nextRepeatDate({date:'0001-01-01',repeat:'++1d'},now).date,'9998-11-11');samples.push(performance.now()-before);}
  const historyText=':LOGBOOK:\n'+Array.from({length:500},(_,n)=>`- State "DONE" from "TODO" [2025-01-01 Mi 12:00] note${n}`).join('\n')+'\n:END:';const doc=own+historyText+'\nBody\n'+Array.from({length:200},(_,n)=>`## TODO Child${n}\nSCHEDULED: <2026-11-10 Di +1d>`).join('\n'),parserStart=performance.now();let s=make(doc);assert.ok(ensureSyntaxTree(s,s.doc.length,1000));s=s.update({}).state;const plan=planTodo(s,'DONE',{now:new Date(2026,10,10,12)});assert.ok(plan.spec,plan.message);const parsed=await parseAgendaFile(new TextEncoder().encode(s.update(plan.spec).state.doc.toString()),'large-synthetic.md');assert.equal(parsed.records.length,201);assert.equal(parsed.diagnostics.length,0);samples.sort((a,b)=>a-b);
  t.diagnostic(JSON.stringify({scope:'bounded Node arithmetic/parser, not native or hours',pairs:1000,arithmeticMs:Math.round(parserStart-started),p50Ms:samples[499],p95Ms:samples[949],p99Ms:samples[989],documentCharacters:doc.length,historyRecords:500,tasks:201,parseAndCompletionMs:Math.round(performance.now()-parserStart)}));
});

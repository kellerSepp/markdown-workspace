import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {todoRules,readTodoRules,todoDefinitionLine,planTodo,createTodoController} from './todo.mjs';
import {parseDate,parseRepeater,parseTimestamp,timestamp} from './planning-date.mjs';
import {planningContext,planPlanning,planningRecords} from './planning.mjs';
import {readRepeatMetadata,planRepeatLog} from './recurrence-metadata.mjs';
import {addRepeatInterval,completionDate,civilDay,nextRepeatDate} from './recurrence-date.mjs';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {TextCodec} from './text-codec.mjs';
import {parseAgendaFile} from './agenda-index.mjs';

const make=(doc,pos=0)=>EditorState.create({doc,selection:{anchor:pos},extensions:[markdown(),todoRules]});
const metadata=state=>readRepeatMetadata(state,planningContext(state),state.field(todoRules).rules);
const clock=new Date(2026,10,10,12,0);
test('Approved +/++/.+ choose original/catchup/completion basis and strictly future timed catchup',()=>{
  for(const [date,repeat,startTime,expected] of [
    ['2026-11-01','+1w',null,'2026-11-08'],['2026-11-01','++1w',null,'2026-11-15'],['2026-11-01','.+1w','14:00','2026-11-17'],
    ['2026-11-09','++1d','20:00','2026-11-10'],['2026-11-09','++1d','12:00','2026-11-11'],['2026-11-09','++1d',null,'2026-11-11'],['2026-11-20','++1d','20:00','2026-11-21']
  ])assert.equal(nextRepeatDate({date,repeat,startTime},clock).date,expected,JSON.stringify({date,repeat,startTime}));
  assert.equal(nextRepeatDate({date:'2026-01-31',repeat:'++1m'},new Date(2026,2,1)).date,'2026-03-28');
  assert.equal(nextRepeatDate({date:'2024-02-29',repeat:'++1y'},new Date(2026,0,1)).date,'2026-02-28');
  assert.equal(nextRepeatDate({date:'0001-01-01',repeat:'++1d'},clock).date,'2026-11-11');
  assert.ok(nextRepeatDate({date:'9999-12-31',repeat:'++1d'},clock).message);
});
test('Civil recurrence intervals use approved per-step month/year clamp and preserve year bounds',()=>{
  let next=addRepeatInterval('2026-01-31','+1m');assert.equal(next.date,'2026-02-28');next=addRepeatInterval(next.date,'+1m');assert.equal(next.date,'2026-03-28');
  assert.equal(addRepeatInterval('2024-02-29','+1y').date,'2025-02-28');assert.equal(addRepeatInterval('2000-02-29','+4y').date,'2004-02-29');
  assert.equal(addRepeatInterval('0001-01-01','+1w').date,'0001-01-08');assert.equal(addRepeatInterval('2026-12-31','+1d').date,'2027-01-01');
  for(const rule of ['+1d','+1w','+1m','+1y','+9007199254740991d'])assert.ok(addRepeatInterval('9999-12-31',rule).message,rule);
  assert.equal(completionDate(new Date(2026,10,10,23,59)),'2026-11-10');assert.equal(completionDate(new Date(NaN)),null);assert.equal(civilDay('2026-11-11')-civilDay('2026-11-10'),1);
});
test('Repeat grammar accepts positive d/w/m/y +/++/.+ and preserves nonrepeating timestamp shape',()=>{
  assert.deepEqual(parseTimestamp('<2026-11-10 Di>').value,{date:'2026-11-10',startTime:null,endTime:null});
  for(const mode of ['+','++','.+'])for(const unit of ['d','w','m','y']){
    const text=mode+'2'+unit,p=parseRepeater(text);assert.equal(p.mode,mode);assert.equal(p.interval,2);assert.equal(p.unit,unit);
    const value={date:'2026-11-10',startTime:'09:00',endTime:'10:30',repeat:text};assert.deepEqual(parseTimestamp(timestamp(value).text).value,value);
  }
  for(const repeat of ['+0d','+01w','+-1d','+1h','+1D','+++1d','.+1','++1w/2w','+9007199254740992d',' +1w',0,false,{}])assert.ok(timestamp({date:'2026-11-10',repeat}).message,JSON.stringify(repeat));
  for(const stamp of ['<2026-02-30 Mo +1w>','<2026-11-10 Di +0w>','<2026-11-10 Di +1w +2w>','<2026-11-10 Di>--<2026-11-12 Do>'])assert.ok(parseTimestamp(stamp).message,stamp);
  assert.equal(parseDate('2024-02-29').weekday,4);
});
test('Planning date edits preserve an omitted repeat; explicit empty/null removes it without touching other metadata',()=>{
  const original='# TODO Own\nSCHEDULED: <2026-11-10 Di 09:00-10:00 ++2w> DEADLINE: <2026-11-12 Do +1m>\nBody',state=make(original);
  let next=state.update(planPlanning(state,'SCHEDULED',{date:'2026-11-11',startTime:'09:00',endTime:'10:00'}).spec).state;
  assert.equal(next.doc.toString(),original.replace('11-10 Di','11-11 Mi'));assert.equal(planningRecords(next).records[0].scheduled.repeat,'++2w');
  for(const repeat of ['',null]){next=state.update(planPlanning(state,'SCHEDULED',{date:'2026-11-10',startTime:'09:00',endTime:'10:00',repeat}).spec).state;assert.equal(next.doc.toString(),original.replace(' ++2w',''));}
  assert.ok(planPlanning(state,'SCHEDULED',{date:'2026-11-10',repeat:'+0d'}).message);assert.equal(state.doc.toString(),original);
});
test('Local reset property accepts only own open state, with explicit invalid fallback warning and no inheritance',()=>{
  const prefix='#+SEQ_TODO: NEXT(n) WAIT(w) | FIN(f)\n# NEXT Own\nSCHEDULED: <2026-11-10 Di +1w>\n';
  for(const [target,expected,warning] of [['WAIT','WAIT',false],['FIN','NEXT',true],['MISSING','NEXT',true],['','NEXT',true]]){
    const state=make(prefix+':PROPERTIES:\n:OTHER: preserve\n:REPEAT_TO_STATE: '+target+'\n:END:\nBody',prefix.indexOf('# NEXT'));
    const result=metadata(state);assert.equal(result.resetState,expected);assert.equal(!!result.warning,warning);assert.equal(result.properties.kind,'PROPERTIES');
  }
  const text=prefix+'Body\n## WAIT Child\n:PROPERTIES:\n:REPEAT_TO_STATE: WAIT\n:END:',state=make(text,prefix.indexOf('# NEXT'));
  assert.equal(metadata(state).resetState,'NEXT');assert.equal(metadata(state).properties,undefined);assert.equal(metadata(state).ownEnd,text.indexOf('## WAIT'));
});
test('Malformed/duplicate metadata drawers refuse atomically; code lookalikes remain inert',()=>{
  const prefix='# TODO Own\nSCHEDULED: <2026-11-10 Di +1w>\n';
  for(const body of [':PROPERTIES:\n:REPEAT_TO_STATE: TODO',':END:',':PROPERTIES:\nnot a property\n:END:',':PROPERTIES:\n:REPEAT_TO_STATE: TODO\n:REPEAT_TO_STATE: TODO\n:END:',':LOGBOOK:\nold\n:END:\n:LOGBOOK:\nold\n:END:',':PROPERTIES:\n:LOGBOOK:\n:END:',':REPEAT_TO_STATE: TODO',':PROPERTIES:\n## Child\n:END:',':LOGBOOK: extra\nold\n:END:',':LOGBOOK:\nold\n:END: extra']){
    const state=make(prefix+body);assert.ok(metadata(state).message,body);assert.equal(state.doc.toString(),prefix+body);
  }
  for(const wrap of [body=>'```\n'+body+'\n```',body=>body.split('\n').map(x=>'> '+x).join('\n'),body=>'    '+body.replaceAll('\n','\n    ')]){
    const result=metadata(make(prefix+'\n'+wrap(':PROPERTIES:\n:REPEAT_TO_STATE: DONE\n:END:')));assert.equal(result.resetState,'TODO');assert.equal(result.warning,'');
  }
});
test('LOGBOOK prepends one inactive old-to-closed entry and preserves existing text and child history',()=>{
  const prefix='# TODO Own\nSCHEDULED: <2026-11-10 Di +1w>\n',old=':LOGBOOK:\n- State "DONE" from "TODO" [2026-11-03 Di 09:00]\n:END:',child='\n## TODO Child\n:LOGBOOK:\nchild original\n:END:',now=new Date(2026,10,10,14,25);
  const state=make(prefix+old+child),meta=metadata(state),plan=planRepeatLog(state,meta,{fromState:'TODO',toState:'DONE',now});
  assert.equal(state.update({changes:plan.changes}).state.doc.toString(),prefix+':LOGBOOK:\n- State "DONE" from "TODO" [2026-11-10 Di 14:25]\n'+old.slice(':LOGBOOK:\n'.length)+child);
  const bare=make(prefix+'Body'+child),created=planRepeatLog(bare,metadata(bare),{fromState:'TODO',toState:'DONE',now});
  const text=bare.update({changes:created.changes}).state.doc.toString();assert.match(text,/SCHEDULED:.*\n:LOGBOOK:\n- State.*\n:END:\nBody/);assert.ok(text.endsWith(child));assert.ok(metadata(make(text)).logbook);
});
test('Recognized drawers cannot introduce file TODO rules or out-of-block live scheduling',()=>{
  const doc='# TODO Own\nSCHEDULED: <2026-11-10 Di +1w>\n:LOGBOOK:\n#+SEQ_TODO: ALIEN(a) | CLOSED(c)\nSCHEDULED: <2026-01-01 Do>\n:END:\nBody';let state=make(doc);
  assert.equal(readTodoRules(state).rules[0].name,'TODO');assert.equal(planningContext(state).entries.SCHEDULED.repeat,'+1w');
  state=state.update({selection:{anchor:doc.indexOf('#+SEQ_TODO')}}).state;assert.equal(todoDefinitionLine(state),false);
});

test('Completion advances both repeated fields, resets own status and creates one log in a single undo/redo transaction',()=>{
  const original='#+SEQ_TODO: NEXT(n) WAIT(w) | FIN(f) CANCEL(c)\n# WAIT Own\nSCHEDULED: <2026-11-01 So 09:00-10:00 ++1w> DEADLINE: <2026-11-09 Mo 20:00 ++1d>\n:PROPERTIES:\n:CUSTOM-FIELD: preserve\n:REPEAT_TO_STATE: WAIT\n:END:\nOwn body\n## NEXT Child\nSCHEDULED: <2026-11-01 So +1w>\n:LOGBOOK:\nchild unchanged\n:END:';
  let state=EditorState.create({doc:original,selection:{anchor:original.indexOf('# WAIT')},extensions:[markdown(),history(),todoRules]});const plan=planTodo(state,'FIN',{now:clock});assert.ok(plan.spec,plan.message);
  const apply=spec=>{state=spec.startState?spec.state:state.update(spec).state;};apply(plan.spec);const changed=state.doc.toString();
  assert.match(changed,/# WAIT Own\nSCHEDULED: <2026-11-15 So 09:00-10:00 \+\+1w> DEADLINE: <2026-11-10 Di 20:00 \+\+1d>/);
  assert.match(changed,/:END:\n:LOGBOOK:\n- State "FIN" from "WAIT" \[2026-11-10 Di 12:00\]\n:END:\nOwn body/);assert.ok(changed.endsWith(original.slice(original.indexOf('## NEXT'))));
  assert.equal(undoDepth(state),1);const view={get state(){return state;},dispatch:apply};assert.ok(undo(view));assert.equal(state.doc.toString(),original);assert.ok(redo(view));assert.equal(state.doc.toString(),changed);
});
test('Mixed recurring completion removes only nonrepeating SCHEDULED and preserves nonrepeating DEADLINE',()=>{
  for(const join of [' ','\n'])for(const reverse of [false,true]){
    const stamps=['SCHEDULED: <2026-11-01 So>','DEADLINE: <2026-11-02 Mo +1w>'];if(reverse)stamps.reverse();const original='# TODO Own\n'+stamps.join(join)+'\nBody';
    const state=make(original),plan=planTodo(state,'DONE',{now:clock});assert.ok(plan.spec,plan.message);const changed=state.update(plan.spec).state.doc.toString();assert.ok(!changed.includes('SCHEDULED:'));assert.match(changed,/DEADLINE: <2026-11-09 Mo \+1w>\n:LOGBOOK:/);assert.ok(changed.endsWith('\nBody'));
  }
  const original='# TODO Own\nSCHEDULED: <2026-11-01 So +1w> DEADLINE: <2026-11-30 Mo>\nBody',state=make(original),changed=state.update(planTodo(state,'DONE',{now:clock}).spec).state.doc.toString();assert.ok(changed.includes('DEADLINE: <2026-11-30 Mo>'));
});
test('Only genuine open-to-closed commands recur, and malformed repeated metadata refuses the whole command',()=>{
  for(const [status,target] of [['DONE','DONE'],['DONE','TODO'],['','DONE'],['TODO',null]]){
    const original='# '+(status?status+' ':'')+'Own\nSCHEDULED: <2026-11-01 So +1w>',state=make(original),plan=planTodo(state,target,{now:clock});const changed=plan.noop?original:state.update(plan.spec).state.doc.toString();assert.ok(changed.includes('<2026-11-01 So +1w>'));assert.ok(!changed.includes('LOGBOOK'));
  }
  const original='# TODO Own\nSCHEDULED: <2026-11-01 So +1w>',state=make(original),raw=state.update({changes:{from:2,to:6,insert:'DONE'},userEvent:'input'}).state;assert.ok(raw.doc.toString().includes('<2026-11-01 So +1w>'));assert.ok(!raw.doc.toString().includes('LOGBOOK'));
  for(const text of ['# TODO Own\nSCHEDULED: <2026-11-01 So +0w>','# TODO Own\nSCHEDULED: <2026-11-01 So +1w>\n:LOGBOOK:\nold','# TODO Own\nSCHEDULED: <9999-12-31 Fr +1d>']){const s=make(text),p=planTodo(s,'DONE',{now:clock});assert.ok(p.message,text);assert.equal(p.spec,undefined);assert.equal(s.doc.toString(),text);}
  const ordinary=make('# TODO Own\nSCHEDULED: <bad>');assert.ok(planTodo(ordinary,'DONE',{now:clock}).spec,'ordinary tasks retain prior status behavior despite unrelated invalid date');
});
test('Controller warnings occur after accepted atomic repeat; no warning or partial changes after rejected transaction',()=>{
  const original='# TODO Own\nSCHEDULED: <2026-11-01 So +1w>\n:PROPERTIES:\n:REPEAT_TO_STATE: DONE\n:END:';
  for(const reject of [false,true]){
    let state=make(original),options;const messages=[],view={get state(){return state;},dispatch(spec){if(!reject)state=state.update(spec).state;}};
    const controller=createTodoController({view,panel:{openChoices(o){options=o;return true;}},now:()=>clock,notify:m=>messages.push(m)});assert.equal(controller.open(),true);
    assert.equal(options.choose('DONE',{state}),!reject);assert.equal(messages.length,reject?0:1);if(reject)assert.equal(state.doc.toString(),original);else{assert.match(messages[0],/REPEAT_TO_STATE.*TODO verwendet/);assert.match(state.doc.toString(),/# TODO Own/);}
  }
});
test('Recurring transaction retains codec BOM/mixed endings and exact undo bytes; saved agenda reads only current occurrence',async()=>{
  const original='\ufeff# TODO Own\r\nSCHEDULED: <2026-11-01 So +1w>\r\nBody\n## TODO Child\r\nChild body',bytes=new TextEncoder().encode(original),codec=new TextCodec(bytes);let state=EditorState.create({doc:codec.text,selection:{anchor:2},extensions:[markdown(),history(),todoRules]});
  const dispatch=spec=>{const tr=spec.startState?spec:state.update(spec),changes=[];tr.changes.iterChanges((from,to,_a,_b,insert)=>changes.push({from,to,insert:insert.toString()}));codec.applyChanges(changes);state=tr.state;};
  dispatch(planTodo(state,'DONE',{now:clock}).spec);const saved=codec.bytes(),indexed=await parseAgendaFile(saved,'synthetic.md');assert.equal(indexed.diagnostics.length,0);assert.equal(indexed.records.length,2);assert.equal(indexed.records[0].scheduled.date,'2026-11-08');assert.equal(indexed.records[0].scheduled.repeat,'+1w');assert.equal(indexed.records[0].status,'TODO');
  assert.ok(undo({get state(){return state;},dispatch}));assert.deepEqual(codec.bytes(),bytes);
});

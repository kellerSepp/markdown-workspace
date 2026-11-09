import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {todoRules} from './todo.mjs';
import {parseDate,timestamp,parseTimestamp,planningContext,planPlanning,planningRecords,createPlanningController} from './planning.mjs';
import {monthCells,shiftDate,createPlanningForm} from './planning-calendar.mjs';
import {TextCodec} from './text-codec.mjs';
const make=(doc,pos=0,extra=[])=>EditorState.create({doc,selection:{anchor:pos},extensions:[markdown(),history(),todoRules,extra]});
const value={date:'2026-11-07',startTime:'15:00',endTime:'17:00'};
test('Calendar validation handles leap centuries, strict times, weekday normalization and arithmetic',()=>{
 for(const date of ['2024-02-29','2000-02-29','0001-01-01','9999-12-31'])assert.ok(parseDate(date));
 for(const date of ['1900-02-29','2026-02-29','2026-13-01','2026-04-31','0000-01-01'])assert.equal(parseDate(date),null);
 assert.equal(timestamp(value).text,'<2026-11-07 Sa 15:00-17:00>');assert.equal(parseTimestamp('<2026-11-07 Mon>').text,'<2026-11-07 Sa>');
 for(const v of [{...value,startTime:'24:00'},{...value,endTime:'14:00'},{...value,startTime:''}])assert.ok(timestamp(v).message);
 assert.equal(parseTimestamp('<2026-11-07 Sa +1w>').value.repeat,'+1w');assert.equal(monthCells(2026,11)[6],'2026-11-01');assert.equal(shiftDate('2024-02-28',1),'2024-02-29');
});
test('H1-H6 current section including every column, body and child boundaries',()=>{
 for(let level=1;level<=6;level++){const head='#'.repeat(level)+' Heading';for(let col=0;col<=head.length;col++){const s=make(head+'\nBody',col),p=planPlanning(s,'SCHEDULED',value);assert.equal(s.update(p.spec).state.doc.toString(),head+'\nSCHEDULED: <2026-11-07 Sa 15:00-17:00>\nBody');}}
 const doc='# TODO Parent\nNotes\n## Child\n```\n# Fake\nSCHEDULED: <2026-11-07 Sa>\n```';const s=make(doc,doc.indexOf('Fake'));assert.equal(planningContext(s).heading.level,2);
 const next=s.update(planPlanning(s,'DEADLINE',value).spec).state;assert.match(next.doc.toString(),/## Child\nDEADLINE:/);assert.equal(next.doc.toString().split('SCHEDULED:').length,2);
});
test('Combined and separate metadata update/remove only requested field and preserve foreign text',()=>{
 for(const join of [' ','\n']){let s=make('# H\nDEADLINE: <2026-11-30 Mo>'+join+'SCHEDULED: <2026-11-07 Sa>\nBody');s=s.update(planPlanning(s,'SCHEDULED',value).spec).state;assert.match(s.doc.toString(),/DEADLINE: <2026-11-30 Mo>/);s=s.update(planPlanning(s,'SCHEDULED',null).spec).state;assert.equal(s.doc.toString(),'# H\nDEADLINE: <2026-11-30 Mo>\nBody');}
 for(const doc of ['# H\nSCHEDULED: <2026-11-07 Sa>',' # H\nSCHEDULED: <2026-11-07 Sa>\n']){const s=make(doc);assert.ok(planPlanning(s,'SCHEDULED',null).spec);}
});
test('Unsafe syntax/duplicates/out-of-block/selection/read-only protected',()=>{
 for(const doc of ['# H\nSCHEDULED: <bad>','# H\nSCHEDULED: <2026-11-07 Sa> SCHEDULED: <2026-11-08 So>','# H\n\nSCHEDULED: <2026-11-07 Sa>','# H\nSCHEDULED: <2026-11-07 Sa> FOO: bar','> # H','- # H','H\n===','```\n# H\n```','---\n# H\n---'])assert.ok(planPlanning(make(doc),'SCHEDULED',value).message,doc);
 assert.ok(planningContext(make('# H',0,EditorState.readOnly.of(true))).message);let s=make('# H');s=s.update({selection:EditorSelection.range(0,2)}).state;assert.ok(planningContext(s).message);
});
test('Isolated atomic undo/redo and stale controller preserve document',()=>{
 let state=make('# TODO Heading\n## Child',8);const initial=state;const view={get state(){return state;},dispatch(spec){state=spec.startState?spec.state:state.update(spec).state;}};
 view.dispatch(planPlanning(state,'SCHEDULED',value).spec);assert.equal(undoDepth(state),1);const changed=state.doc.toString();for(let n=0;n<20;n++){assert.ok(undo(view));assert.equal(state.doc.toString(),initial.doc.toString());assert.equal(state.selection.main.head,initial.selection.main.head);assert.ok(redo(view));assert.equal(state.doc.toString(),changed);}
 let options;const controller=createPlanningController({view,panel:{openPlanning(o){options=o;return true;}}});assert.ok(controller.open('SCHEDULED'));const saved={state};view.dispatch({selection:{anchor:0}});assert.equal(options.choose(null,saved),false);
});
test('Future agenda records reuse loaded file TODO rules and retain parent/source metadata',()=>{
 const s=make('#+SEQ_TODO: NEXT(n) | FIN(f)\n# NEXT Parent\nSCHEDULED: <2026-11-07 Sa>\n## FIN Child\nDEADLINE: <2026-11-30 Mo>');const result=planningRecords(s,'synthetic.md');assert.equal(result.records.length,2);assert.equal(result.records[1].parentFrom,result.records[0].from);assert.equal(result.records[1].status,'FIN');assert.equal(result.records[0].title,'Parent');assert.equal(result.records[1].deadline.date,'2026-11-30');assert.equal(result.records[1].file,'synthetic.md');
});

test('Planning record TODO boundaries match editor whitespace convention, including tabs and Unicode',()=>{
 for(const whitespace of [' ','\t','\u00a0','\u2003']){
  const s=make('# TODO'+whitespace+'Titel');const record=planningRecords(s,'synthetic.md').records[0];assert.equal(record.status,'TODO');assert.equal(record.title,'Titel');
 }
 for(const title of ['TODOIST Titel','**TODO** Titel','todo Titel']){const record=planningRecords(make('# '+title)).records[0];assert.equal(record.status,null);assert.equal(record.title,title);}
});
test('Planning mutations preserve codec BOM/CRLF/unrelated mixed EOL and undo bytes',()=>{
 const original='\ufeff# TODO Title\r\nSCHEDULED: <2026-11-07 Sa>\r\nBody\n## Child\r\nText';const bytes=new TextEncoder().encode(original),codec=new TextCodec(bytes);let state=make(codec.text,8);
 const tr=state.update(planPlanning(state,'SCHEDULED',{date:'2026-11-08'}).spec),changes=[];tr.changes.iterChanges((from,to,_a,_b,insert)=>changes.push({from,to,insert:insert.toString()}));codec.applyChanges(changes);assert.equal(new TextDecoder('utf-8',{ignoreBOM:true}).decode(codec.bytes()),original.replace('2026-11-07 Sa','2026-11-08 So'));
 state=tr.state;const view={get state(){return state;},dispatch(t){t.changes.iterChanges((from,to,_a,_b,insert)=>codec.applyChanges([{from,to,insert:insert.toString()}]));state=t.state;}};assert.ok(undo(view));assert.deepEqual(codec.bytes(),bytes);
});

test('Bounded file records handle 1000 synthetic headings without editor transactions',()=>{
 const doc=Array.from({length:1000},(_,i)=>`## TODO Item ${i}\nSCHEDULED: <2026-11-07 Sa>`).join('\n');let s=make(doc);
 const tree=s.field(todoRules);assert.ok(tree.rules); // rule loading completes parser context
 // Publish the completed parser snapshot without modifying the source.
 s=s.update({}).state;const result=planningRecords(s,'large.md');if(result.message)assert.match(result.message,/analysiert/);else assert.equal(result.records.length,1000);
});

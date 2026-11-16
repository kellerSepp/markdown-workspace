import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges} from '@codemirror/language';
import {history,undo,redo} from '@codemirror/commands';
import {readDrawers,drawerFoldRanges} from './planning-drawers.mjs';
import {planDrawer,createDrawerController} from './drawers.mjs';
import {applyStartupVisibility} from './startup-visibility.mjs';
import {cycleContext,headingSections} from './section-folding.mjs';
import {parseAgendaFile} from './agenda-index.mjs';
import {todoRules,planTodo} from './todo.mjs';
import {cycleFoldAt,revealFoldAt} from './folding.mjs';
import {collapseContext} from './section-folding.mjs';
const make=(doc,selection={anchor:0})=>EditorState.create({doc,selection,extensions:[markdown({base:markdownLanguage}),codeFolding(),history(),todoRules]});
function view(doc,selection){const v={state:make(doc,selection)};v.dispatch=spec=>{v.state=v.state.update(spec).state;};return v;}
const folds=v=>{const out=[];foldedRanges(v.state).between(0,v.state.doc.length,(from,to)=>out.push({from,to}));return out;};

test('QA gutter cycling on open heading with a closed drawer must collapse the heading',()=>{
 const v=view('# H\nIntro\n:PEOPLE:\nPerson\n:END:\nTail');applyStartupVisibility(v);
 const h=headingSections(v.state)[0];assert.equal(folds(v).length,1);
 cycleContext(v,()=>{},0);
 assert.ok(folds(v).some(r=>r.from===h.range.from&&r.to===h.range.to),'heading must collapse on gutter cycle');
});

test('QA wrapping preserves exact exterior, selection direction and history at all full-line boundaries',()=>{
 for(const tail of ['','\n','\n# Sibling\nTail'])for(const includeLF of [false,true])for(const backward of [false,true]){
  const prefix='## H :PHONE:\n',content='Ä first\nSecond',doc=prefix+content+tail,from=prefix.length,to=prefix.length+content.length+(includeLF&&tail?1:0);
  const v=view(doc,{anchor:backward?to:from,head:backward?from:to}),before=v.state.selection,p=planDrawer(v.state,'QA_1');assert.ok(p.spec,p.message);
  v.dispatch(p.spec);v.dispatch({selection:v.state.selection,userEvent:'select.qa'});
  const expected=prefix+':QA_1:\n'+content+'\n:END:'+tail,after=v.state.selection;assert.equal(v.state.doc.toString(),expected);
  assert.equal(v.state.sliceDoc(after.main.from,after.main.to),doc.slice(from,to));
  undo(v);assert.equal(v.state.doc.toString(),doc);assert.ok(v.state.selection.eq(before));redo(v);assert.equal(v.state.doc.toString(),expected);assert.ok(v.state.selection.eq(after));
 }
});

test('QA free drawer scanner rejects malformed scopes and leaves protected examples inert',()=>{
 for(const source of [':A:\n:INNER:\nText\n:END:\n:END:',':A:\n# Changed heading\n:END:',':A:\nno end']){
  const s=make('# Parent\n'+source);assert.ok(readDrawers(s).errors.length);assert.equal(drawerFoldRanges(s).length,0);
 }
 for(const text of ['---\n:FAKE:\n:END:\n---\n# H','<!--\n:FAKE:\n:END:\n-->\n# H','# H\n```\n:FAKE:\n:END:\n```','# H\n> :FAKE:\n> :END:'])assert.equal(drawerFoldRanges(make(text)).length,0);
 assert.deepEqual(readDrawers(make('# H\n:PROPERTIES:\n:EMPTY:\n:REPEAT_TO_STATE: TODO\n:END:')).drawers.map(d=>d.kind),['PROPERTIES']);
});

test('QA actual agenda parse ignores example dates in free drawer and preserves real child record',async()=>{
 const bytes=await readFile(new URL('../test-vault/drawers/drawers.md',import.meta.url));
 const result=await parseAgendaFile(bytes,'drawers.md');assert.ok(result);
 assert.equal(result.records.filter(r=>r.scheduled||r.deadline).length,0);
 assert.ok(result.records.some(r=>r.title.includes('Rückfrage')));
});

test('QA actual repeating completion retains free drawer, tag suffix and previous logs atomically',()=>{
 const doc='# TODO Repeat :PHONE:\nSCHEDULED: <2026-11-16 Mo +1w>\n:PROPERTIES:\n:REPEAT_TO_STATE: TODO\n:END:\n:DETAILS:\nContext remains\n:END:\n:LOGBOOK:\n- Old history\n:END:\n';
 const v=view(doc,{anchor:3}),p=planTodo(v.state,'DONE',{now:new Date(2026,10,16,11,12)});assert.ok(p.spec,p.message);v.dispatch(p.spec);
 assert.match(v.state.doc.toString(),/2026-11-23 Mo \+1w/);assert.ok(v.state.doc.toString().includes(':DETAILS:\nContext remains\n:END:'));assert.match(v.state.doc.toString(),/:PHONE:/);assert.match(v.state.doc.toString(),/- Old history/);
 undo(v);assert.equal(v.state.doc.toString(),doc);redo(v);assert.equal((v.state.doc.toString().match(/- State/g)||[]).length,1);
});

test('QA stale controller target and busy state refuse commit without editor changes',()=>{
 for(const kind of ['stale','busy','missing','readonly']){
  const v=view('# H\nText',{anchor:5});let options,ctx={};const c=createDrawerController({view:v,panel:{openDrawer:o=>{options=o;return true;}},getContext:()=>ctx});
  assert.equal(c.open(),true);const saved={state:v.state};
  if(kind==='stale')v.dispatch({selection:{anchor:6}});if(kind==='busy')ctx.busy=true;if(kind==='missing')ctx.hasDocument=false;if(kind==='readonly')v.state=EditorState.create({doc:v.state.doc,extensions:[markdown(),EditorState.readOnly.of(true)]});
  const before=v.state.doc.toString();assert.equal(options.choose('SAFE',saved),false);assert.equal(v.state.doc.toString(),before);
 }
});

test('QA positional click adapter opens only selected drawer and moves a hidden cursor out on closing',()=>{
 const doc='# H\n:PEOPLE:\nPerson\n:END:\n:DETAILS:\nDetail\n:END:\nTail',v=view(doc,{anchor:2});
 applyStartupVisibility(v);const people=doc.indexOf(':PEOPLE:'),details=doc.indexOf(':DETAILS:');assert.equal(folds(v).length,2);
 assert.equal(revealFoldAt(v,()=>{},people),true);assert.equal(folds(v).length,1);
 v.dispatch({selection:{anchor:doc.indexOf('Person')+2}});cycleFoldAt(v,()=>{},people);
 assert.equal(folds(v).length,2);assert.equal(v.state.selection.main.head,people);
 revealFoldAt(v,()=>{},details);assert.equal(folds(v).length,1);assert.equal(v.state.doc.toString(),doc);
});

test('QA positional adapter keeps standalone code/list fold behavior and bounded drawer/heading cycles stable',()=>{
 for(const doc of ['```text\nBody\n```','- Parent\n  - Child\n']){
  const v=view(doc);assert.equal(collapseContext(v,()=>{},0),true);assert.ok(folds(v).length);revealFoldAt(v,()=>{},0);assert.equal(folds(v).length,0);assert.equal(v.state.doc.toString(),doc);
 }
 const doc='# H\nIntro\n:PEOPLE:\nPerson\n:END:\nTail',v=view(doc,{anchor:2}),start=performance.now(),heapStart=process.memoryUsage().heapUsed;
 applyStartupVisibility(v);
 for(let n=0;n<300;n++){
  cycleContext(v,()=>{},0);cycleContext(v,()=>{},0);
  revealFoldAt(v,()=>{},doc.indexOf(':PEOPLE:'));cycleFoldAt(v,()=>{},doc.indexOf(':PEOPLE:'));
  assert.equal(v.state.doc.toString(),doc);assert.equal(folds(v).length,1);
 }
 console.log(JSON.stringify({scope:'bounded Node model, no hour-scale leak claim',cycles:300,durationMs:performance.now()-start,heapStart,heapEnd:process.memoryUsage().heapUsed}));
});

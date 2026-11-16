import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges,foldEffect} from '@codemirror/language';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {DrawerFoldCleanup,guardInvalidDrawer} from './drawers.mjs';
import {readDrawers} from './planning-drawers.mjs';
import {applyStartupVisibility} from './startup-visibility.mjs';
import {orgTab,enableFocusNavigation} from './structure-keymap.mjs';
import {cycleFoldAt,revealFoldAt} from './folding.mjs';
const example=':ZUTATEN:\n# asda #asd a [50%]\n- [x] adasd\n- [ ] dasdad  \n:END:';
const make=(doc,readonly=false)=>EditorState.create({doc,extensions:[markdown({base:markdownLanguage}),codeFolding(),history(),EditorState.readOnly.of(readonly)]});
function fixture(doc){let cleanup;const v={state:make(doc),dispatchCount:0,setTabFocusMode(){}};v.dispatch=spec=>{const tr=v.state.update(spec);v.state=tr.state;v.dispatchCount++;cleanup?.update({docChanged:tr.docChanged,startState:tr.startState,changes:tr.changes});};v.attach=()=>cleanup=new DrawerFoldCleanup(v);return v;}
const folds=v=>{const out=[];foldedRanges(v.state).between(0,v.state.doc.length,(from,to)=>out.push({from,to}));return out;};
const tick=()=>Promise.resolve();

test('QA PO raw text H1-H6 refuses local/global Tab and click folds with text/history unchanged',()=>{
 for(let level=1;level<=6;level++){
  const doc=example.replace('# asda','#'.repeat(level)+' asda'),v=fixture(doc);applyStartupVisibility(v);
  for(const needle of [':ZUTATEN:','asda','- [x]','- [ ]',':END:'])for(const shift of [false,true]){
   const pos=doc.indexOf(needle),notices=[];v.dispatch({selection:{anchor:pos}});
   assert.equal(orgTab(v,shift,()=>true,()=>assert.fail('must not route to structural edit'),m=>notices.push(m)),true);assert.ok(notices.length);assert.equal(v.state.doc.toString(),doc);assert.equal(undoDepth(v.state),0);assert.equal(folds(v).length,0);
   assert.equal(cycleFoldAt(v,()=>{},pos),true);assert.equal(revealFoldAt(v,()=>{},pos),true);assert.equal(folds(v).length,0);
  }
 }
});

test('QA asynchronous cleanup removes mapped invalid drawer only and preserves safe neighbor folds',async()=>{
 for(let level=1;level<=6;level++){
  const doc='# Parent\n:ZUTATEN:\nasda\n:END:\n# Safe\n:NOTES:\nKeep\n:END:',v=fixture(doc);applyStartupVisibility(v);const cleanup=v.attach();
  v.dispatch({changes:{from:doc.indexOf('asda'),insert:'#'.repeat(level)+' '}});assert.equal(folds(v).length,2);await tick();
  assert.equal(folds(v).length,1);assert.equal(undoDepth(v.state),1);assert.ok(!folds(v).some(r=>r.from===doc.indexOf(':ZUTATEN:')+9));
  const after=v.state.doc.toString();undo(v);await tick();assert.equal(v.state.doc.toString(),doc);redo(v);await tick();assert.equal(v.state.doc.toString(),after);assert.equal(folds(v).length,1);cleanup.destroy();
 }
});

test('QA queued cleanup rechecks repaired content and maps rapid outside edits',async()=>{
 const doc='# Parent\n:ZUTATEN:\nasda\n:END:',v=fixture(doc);applyStartupVisibility(v);const cleanup=v.attach(),p=doc.indexOf('asda');
 v.dispatch({changes:{from:p,insert:'# '}});v.dispatch({changes:{from:p,to:p+2,insert:''}});await tick();assert.equal(v.state.doc.toString(),doc);assert.equal(folds(v).length,1,'rapid repair must retain still-valid fold');
 v.dispatch({changes:{from:0,insert:'Outside\n'}});await tick();assert.equal(folds(v).length,1,'normal outside edit retains valid fold');
 v.dispatch({changes:{from:v.state.doc.toString().indexOf('asda'),insert:'# '}});v.dispatch({changes:{from:0,insert:'More\n'}});await tick();assert.equal(folds(v).length,0,'mapped invalid fold removed after rapid outside edit');cleanup.destroy();
});

test('QA destroyed cleanup never dispatches into a newly selected editor state',async()=>{
 const doc='# H\n:ZUTATEN:\nasda\n:END:',v=fixture(doc);applyStartupVisibility(v);const cleanup=v.attach();v.dispatch({changes:{from:doc.indexOf('asda'),insert:'# '}});
 cleanup.destroy();v.state=make('# New\nIndependent content');const before=v.state,count=v.dispatchCount;await tick();assert.equal(v.state,before);assert.equal(v.dispatchCount,count);
});

test('QA invalid diagnostics bounded by explicit END or safe following heading, not blanket suppression',()=>{
 const doc='# Parent\n'+example+'\n# Safe\nOrdinary text\n:END:\n# Next\n:NOTES:\nValid\n:END:',v=fixture(doc),safe=doc.indexOf('# Safe');
 assert.equal(guardInvalidDrawer(v,safe),false);assert.equal(guardInvalidDrawer(v,doc.indexOf('Ordinary')),false);assert.equal(guardInvalidDrawer(v,doc.indexOf(':NOTES:')),false);
 cycleFoldAt(v,()=>{},doc.indexOf(':NOTES:'));assert.equal(folds(v).length,1);assert.ok(readDrawers(v.state).errors.length);
 const open=fixture('# H\n:ZUTATEN:\n# Safe\nText\n# Later\nText');assert.equal(guardInvalidDrawer(open,open.state.doc.toString().indexOf('# Safe')),false);
});

test('QA readonly diagnostics preserve text while escape focus navigation wins',()=>{
 const v=fixture(example),doc=v.state.doc;v.state=make(example,true);guardInvalidDrawer(v,example.indexOf('asda'));assert.ok(v.state.doc.eq(doc));assert.equal(undoDepth(v.state),0);
 enableFocusNavigation(v);assert.equal(orgTab(v,false,()=>true,()=>assert.fail('escaped focus'),()=>{}),null);
});

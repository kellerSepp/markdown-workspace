import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges,forceParsing,foldEffect} from '@codemirror/language';
import {history,undoDepth} from '@codemirror/commands';
import {readDrawers,drawerFoldRanges} from './planning-drawers.mjs';
import {DrawerFoldCleanup,guardInvalidDrawer,toggleDrawer} from './drawers.mjs';
import {orgTab,enableFocusNavigation} from './structure-keymap.mjs';
import {revealFoldAt,cycleFoldAt} from './folding.mjs';
import {applyStartupVisibility} from './startup-visibility.mjs';

const example=':ZUTATEN:\n# asda #asd a [50%]\n- [x] adasd\n- [ ] dasdad  \n:END:';
function fixture(doc){const v={state:EditorState.create({doc,extensions:[markdown({base:markdownLanguage}),codeFolding(),history()]}),setTabFocusMode(){}};v.dispatch=spec=>{v.state=v.state.update(spec).state;};return v;}
const folds=v=>{const out=[];foldedRanges(v.state).between(0,v.state.doc.length,(from,to)=>out.push({from,to}));return out;};

test('PO exact raw example stays visible; marker, heading and list Tab refuse ambiguous Drawer context',()=>{
 for(const prefix of ['', '# Existing\n'])for(const level of [1,2,3,4,5,6]){
  const doc=prefix+example.replace('# asda','#'.repeat(level)+' asda'),v=fixture(doc);applyStartupVisibility(v);
  assert.equal(drawerFoldRanges(v.state).length,0);assert.equal(folds(v).length,0);
  assert.ok(readDrawers(v.state).errors.length);
  for(const text of [':ZUTATEN:', 'asda','- [x]','- [ ]']){
    v.dispatch({selection:{anchor:doc.indexOf(text)}});const before=v.state.doc.toString(),history=undoDepth(v.state),notices=[];
    assert.equal(orgTab(v,false,()=>true,()=>assert.fail('must not dispatch heading/list command'),m=>notices.push(m)),true);
    assert.ok(notices.some(m=>m.includes('Ungültiger Drawer')));assert.equal(v.state.doc.toString(),before);assert.equal(undoDepth(v.state),history);assert.equal(folds(v).length,0);
  }
 }
});

test('Interactive Heading insertion unfolds formerly valid mapped Drawer fold without text/history repair',async()=>{
 const doc='# Existing\n:ZUTATEN:\nasda #asd a [50%]\n- [x] adasd\n- [ ] dasdad  \n:END:\n# Safe\n:NOTES:\nValid\n:END:';
 for(let level=1;level<=6;level++){
  const v=fixture(doc);applyStartupVisibility(v);const cleanup=new DrawerFoldCleanup(v),initial=folds(v);assert.equal(initial.length,2);
  const tr=v.state.update({changes:{from:doc.indexOf('asda'),insert:'#'.repeat(level)+' '}});v.state=tr.state;
  assert.equal(folds(v).length,2,'CodeMirror retains mapped old drawer fold');
  cleanup.update({docChanged:true,startState:tr.startState,changes:tr.changes});await Promise.resolve();
  assert.equal(folds(v).length,1);assert.equal(drawerFoldRanges(v.state).length,1);assert.match(v.state.doc.toString(),new RegExp('#'.repeat(level)+' asda'));
  assert.equal(undoDepth(v.state),1);cleanup.destroy();
 }
});

test('Stale placeholder/gutter clicks clear mapped fold and do not fold offending Heading',()=>{
 for(const action of [revealFoldAt,cycleFoldAt]){
  const doc='# Existing\n:ZUTATEN:\nasda\n- [ ] Item\n:END:',v=fixture(doc);applyStartupVisibility(v);
  v.dispatch({changes:{from:doc.indexOf('asda'),insert:'# '}});forceParsing(v,v.state.doc.length,100);assert.equal(folds(v).length,1);
  const notices=[];assert.equal(action(v,m=>notices.push(m),doc.indexOf(':ZUTATEN:')),true);assert.equal(folds(v).length,0);assert.ok(notices.length);
 }
});

test('Diagnostics stop before unrelated Headings and do not block valid neighboring Drawer',()=>{
 const doc='# Parent\n:BAD:\n# Offending\nText\n# Safe\n:NOTES:\nValid\n:END:',v=fixture(doc);
 assert.equal(guardInvalidDrawer(v,doc.indexOf('# Safe')),false);
 v.dispatch({selection:{anchor:doc.indexOf(':NOTES:')}});assert.equal(toggleDrawer(v),true);assert.equal(folds(v).length,1);
 const unmatched=fixture('# Parent\n:BAD:\n# Safe\nNormal');assert.equal(guardInvalidDrawer(unmatched,unmatched.state.doc.toString().indexOf('# Safe')),false);
});

test('Focus-navigation escape wins and readonly diagnostic never changes document',()=>{
 const v=fixture('# Parent\n'+example),pos=v.state.doc.toString().indexOf('asda');v.dispatch({selection:{anchor:pos}});
 enableFocusNavigation(v);assert.equal(orgTab(v,false,()=>true,()=>assert.fail('focus escape'),()=>{}),null);
 const ro={state:EditorState.create({doc:example,extensions:[markdown(),codeFolding(),EditorState.readOnly.of(true)]}),dispatch:spec=>{ro.state=ro.state.update(spec).state;}};
 const before=ro.state.doc.toString();assert.equal(guardInvalidDrawer(ro,example.indexOf('asda')),true);assert.equal(ro.state.doc.toString(),before);
});

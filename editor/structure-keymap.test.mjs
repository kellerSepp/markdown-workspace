import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {runScopeHandlers} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {ensureSyntaxTree,codeFolding,syntaxTree} from '@codemirror/language';
import {history,undo,redo,defaultKeymap} from '@codemirror/commands';
import {keymap} from '@codemirror/view';
import {structureKeyboard,tabContext,focusEntered} from './structure-keymap.mjs';

const tab=(shift=false)=>({key:'Tab',keyCode:9,shiftKey:shift,ctrlKey:false,altKey:false,metaKey:false});
function harness(doc,pos=0,children=true) {
  let state=EditorState.create({doc,selection:{anchor:pos},extensions:[markdown(),codeFolding(),history(),structureKeyboard(()=>children),keymap.of(defaultKeymap)]});
  const modes=[],inside={};
  const view={get state(){return state;},dispatch(spec){state=state.update(spec).state;},setTabFocusMode(value){modes.push(value);},dom:{contains:node=>node===inside}};
  assert.ok(ensureSyntaxTree(state,state.doc.length,1000));
  return {view,modes,inside};
}
test('Tab und Shift+Tab in echten Überschriften respektieren Children und Undo/Redo',()=>{
  for(const children of [true,false]) {
    const doc='# Root\nText\n## Child\nBody', {view}=harness(doc,3,children);
    assert.ok(runScopeHandlers(view,tab(),'editor'));
    assert.equal(view.state.doc.toString(),children?'## Root\nText\n### Child\nBody':'## Root\nText\n## Child\nBody');
    assert.ok(undo(view));assert.equal(view.state.doc.toString(),doc);
    assert.ok(redo(view));assert.ok(runScopeHandlers(view,tab(true),'editor'));
    assert.equal(view.state.doc.toString(),doc);
  }
  const {view}=harness('Title\n=====\nBody',2);assert.equal(tabContext(view.state),'heading');
  assert.ok(runScopeHandlers(view,tab(),'editor'));assert.equal(view.state.doc.toString(),'Title\n-----\nBody');
});
test('Absatz-Tab navigiert; H1/H6 und ungültige Einrückung fügen keine Tabzeichen ein',()=>{
  for(const [doc,pos,event,handled] of [['# H\nAbsatz',6,tab(),false],['# H',2,tab(true),true],['###### H',8,tab(),true],['- First',3,tab(),true]]) {
    const {view}=harness(doc,pos);assert.equal(runScopeHandlers(view,event,'editor'),handled);assert.equal(view.state.doc.toString(),doc);
  }
});
test('Five list levels: filled Tab preserves source and cursor; empty Tab indents',()=>{
  for(let depth=1;depth<=5;depth++) {
    let doc='';for(let n=0;n<depth-1;n++)doc+='  '.repeat(n)+'- Parent'+n+'\n';
    doc+='  '.repeat(depth-1)+'- First\n'+'  '.repeat(depth-1)+'- Second\n';
    const pos=doc.indexOf('Second'),{view}=harness(doc,pos);
    assert.equal(tabContext(view.state),'list');assert.ok(runScopeHandlers(view,tab(),'editor'));
    assert.equal(view.state.doc.toString(),doc);assert.equal(view.state.selection.main.head,pos);
    const empty=doc.replace('Second',''),v=harness(empty,empty.length-1).view;
    assert.ok(runScopeHandlers(v,tab(),'editor'));
    assert.equal(v.state.doc.toString(),empty.slice(0,empty.lastIndexOf('\n',empty.length-2)+1)+'  '.repeat(depth)+'- \n');
    assert.ok(undo(v));assert.equal(v.state.doc.toString(),empty);
  }
});

test('List Home/whitespace and continuation Tab fold or no-op, never change source',()=>{
  for(const pos of [4,5,6,12]) {
    const doc='- A\n  - B\n    - C\n',{view}=harness(doc,pos);
    assert.ok(runScopeHandlers(view,tab(),'editor'));assert.equal(view.state.doc.toString(),doc);
    assert.equal(view.state.selection.main.head,pos);
  }
  const doc='- A\n  continuation\n- B',pos=8,{view}=harness(doc,pos);
  assert.ok(runScopeHandlers(view,tab(),'editor'));assert.equal(view.state.doc.toString(),doc);
  assert.equal(view.state.selection.main.head,pos);
});

test('Codeblock-Tab bleibt native Codeeinrückung einschließlich Mehrzeilenauswahl',()=>{
  const doc='```js\nconst a=1;\nconst b=2;\n```',{view}=harness(doc,8);
  view.dispatch({selection:{anchor:doc.indexOf('const a'),head:doc.indexOf('const b')+8}});
  assert.equal(tabContext(view.state),'code');assert.ok(runScopeHandlers(view,tab(),'editor'));
  assert.equal(view.state.doc.toString(),'```js\n  const a=1;\n  const b=2;\n```');
  assert.ok(runScopeHandlers(view,tab(true),'editor'));assert.equal(view.state.doc.toString(),doc);
});
test('Escape gibt Tab ohne Zeitlimit frei, innerer Fokuswechsel setzt Escape nicht zurück',()=>{
  const doc='# Root\nText',{view,modes,inside}=harness(doc,3);
  runScopeHandlers(view,{key:'Escape',keyCode:27,shiftKey:false,ctrlKey:false,altKey:false,metaKey:false},'editor');
  assert.equal(modes.at(-1),true);assert.equal(runScopeHandlers(view,tab(),'editor'),false);
  focusEntered({relatedTarget:inside},view);assert.equal(runScopeHandlers(view,tab(true),'editor'),false);
  focusEntered({relatedTarget:{}},view);assert.equal(modes.at(-1),false);
  assert.equal(runScopeHandlers(view,tab(),'editor'),true);assert.equal(view.state.doc.toString(),'## Root\nText');
});

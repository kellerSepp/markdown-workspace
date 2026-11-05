import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {ViewPlugin,keymap} from '@codemirror/view';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,defaultKeymap,undo,redo} from '@codemirror/commands';
import {structureKeyboard,withoutOrgArrowConflicts} from './structure-keymap.mjs';
import {runOrgStructure} from './org-structure.mjs';

// Read the actual resolved CM view-plugin facet in the pinned installed version.
// This exercises its ordered DOM handlers, including the real keymap handler;
// it is deliberately not a native browser or layout test.
const pluginFacet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
const event=(key,patch={})=>({type:'keydown',key,keyCode:({Alt:18,ArrowLeft:37,ArrowRight:39}[key]??0),altKey:true,ctrlKey:false,metaKey:false,shiftKey:false,isComposing:false,
  preventDefault(){this.defaultPrevented=true;},...patch});
function harness(doc,pos=0) {
  let state,calls=0,fallback=0;
  const execute=id=>{calls++;return runOrgStructure(view,id.slice('structure.'.length));};
  const nativeFallback=[{key:'Alt-ArrowLeft',run:()=>{fallback++;return true;},shift:()=>{fallback++;return true;}},
    {key:'Alt-ArrowRight',run:()=>{fallback++;return true;},shift:()=>{fallback++;return true;}}];
  state=EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),history(),
    // Intentionally place a matching ordinary keymap before structureKeyboard.
    keymap.of([...nativeFallback,...withoutOrgArrowConflicts(defaultKeymap)]),structureKeyboard(()=>false,()=>{},execute)]});
  const view={hasFocus:true,get state(){return state;},dispatch(spec){state=state.update(spec).state;},setTabFocusMode(){}};
  function dispatch(e) {
    for(const {plugin} of state.facet(pluginFacet)) {
      if(e.defaultPrevented) break;
      if(plugin.domEventHandlers?.[e.type]?.call({},e,view)) {e.preventDefault();break;}
    }
    return e;
  }
  return {view,dispatch,get calls(){return calls;},get fallback(){return fallback;}};
}

test('Aufgelöste CM-DOM-Reihenfolge: Alt Links/Rechts erreicht Org vor Cursor-Keymap, genau einmal',()=>{
  for(const [key,shiftKey,expected] of [
    ['ArrowLeft',false,'# A\n### B'],['ArrowRight',false,'### A\n### B'],
    ['ArrowLeft',true,'# A\n## B'],['ArrowRight',true,'### A\n#### B']
  ]) {
    const f=harness('## A\n### B',3),e=f.dispatch(event(key,{shiftKey}));
    assert.equal(f.view.state.doc.toString(),expected);assert.equal(f.calls,1);assert.equal(f.fallback,0);assert.equal(e.defaultPrevented,true);
    assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),'## A\n### B');
    assert.equal(redo(f.view),true);assert.equal(f.view.state.doc.toString(),expected);
  }
  for(const [doc,key,shiftKey,expected] of [
    ['- A\n- B\n  - Kid','ArrowRight',false,'- A\n  - B\n  - Kid'],
    ['- A\n- B\n  - Kid','ArrowRight',true,'- A\n  - B\n    - Kid'],
    ['- A\n  - B','ArrowLeft',false,'- A\n- B'],
    ['- A\n  - B\n    - Kid','ArrowLeft',true,'- A\n- B\n  - Kid']
  ]) {
    const f=harness(doc,doc.indexOf('B'));f.dispatch(event(key,{shiftKey}));
    assert.equal(f.view.state.doc.toString(),expected);assert.equal(f.calls,1);assert.equal(f.fallback,0);
  }
  const plain=harness('ordinary text',4);plain.dispatch(event('ArrowLeft'));
  assert.equal(plain.calls,0);assert.equal(plain.fallback,1);
  const edge=harness('# H1',2);edge.dispatch(event('ArrowLeft'));
  assert.equal(edge.calls,1);assert.equal(edge.fallback,0);assert.equal(edge.view.state.doc.toString(),'# H1');
});

test('Alt allein: nur fokussierter linker Alt-Down/Up; AltGr, fremde Chords und Fokuswechsel bleiben frei',()=>{
  const f=harness('## A',3);
  assert.equal(f.dispatch(event('Alt',{code:'AltLeft',location:1})).defaultPrevented,true);
  assert.equal(f.dispatch(event('Alt',{type:'keyup',code:'AltLeft',location:1,altKey:false})).defaultPrevented,true);
  assert.equal(f.calls,0);
  assert.equal(f.dispatch(event('Alt',{type:'keyup',code:'AltLeft'})).defaultPrevented,undefined);
  for(const patch of [{code:'AltRight',location:2},{ctrlKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{getModifierState:()=>true}]) {
    assert.equal(f.dispatch(event('Alt',patch)).defaultPrevented,undefined);
  }
  f.view.hasFocus=false;assert.equal(f.dispatch(event('Alt',{code:'AltLeft'})).defaultPrevented,undefined);f.view.hasFocus=true;
  f.dispatch(event('Alt',{code:'AltLeft'}));f.dispatch(event('d',{keyCode:68}));
  assert.equal(f.dispatch(event('Alt',{type:'keyup',code:'AltLeft'})).defaultPrevented,undefined);
  f.dispatch(event('Alt',{code:'AltLeft'}));f.dispatch(event('blur',{type:'blur'}));
  assert.equal(f.dispatch(event('Alt',{type:'keyup',code:'AltLeft'})).defaultPrevented,undefined);
  f.dispatch(event('Alt',{code:'AltLeft'}));f.dispatch(event('ArrowRight'));
  assert.equal(f.dispatch(event('Alt',{type:'keyup',code:'AltLeft'})).defaultPrevented,true);
  assert.equal(f.calls,1);
  f.dispatch(event('Alt',{code:'AltLeft'}));
  f.dispatch(event('Shift',{keyCode:16,shiftKey:true}));f.dispatch(event('ArrowLeft',{shiftKey:true}));
  f.dispatch(event('Shift',{type:'keyup',keyCode:16}));
  assert.equal(f.dispatch(event('Alt',{type:'keyup',code:'AltLeft'})).defaultPrevented,true);
  assert.equal(f.calls,2);assert.equal(f.fallback,0);
});

test('Struktur-Alt: alle physischen Zeilenpositionen einschliesslich EOL/EOF erreichen denselben Kontext',()=>{
  const cases=[
    ['- A\n- Beta\n- C',2,'ArrowRight',false,'- A\n  - Beta\n- C'],
    ['- A\n- Beta',2,'ArrowRight',true,'- A\n  - Beta'],
    ['1. A\n2. Beta\n3. C',2,'ArrowRight',false,'1. A\n   2. Beta\n2. C'],
    ['- Root\n  - A\n  - Beta\n  - C',3,'ArrowLeft',false,'- Root\n  - A\n- Beta\n  - C'],
    ['- A\n- Beta\n  continuation\n- C',2,'ArrowRight',true,'- A\n  - Beta\n    continuation\n- C'],
    ['- A\n- Beta\n- C',2,'ArrowUp',false,'- Beta\n- A\n- C'],
    ['## Beta\nText',1,'ArrowRight',false,'### Beta\nText'],
    ['## Beta',1,'ArrowLeft',true,'# Beta']
  ];
  for(const [doc,lineNo,key,shiftKey,expected] of cases) {
    const source=EditorState.create({doc}).doc.line(lineNo);
    for(let col=0;col<=source.length;col++) {
      const f=harness(doc,source.from+col),e=f.dispatch(event(key,{shiftKey}));
      assert.equal(f.view.state.doc.toString(),expected,`${JSON.stringify(doc)} column ${col}`);
      assert.equal(f.calls,1);assert.equal(f.fallback,0);assert.equal(e.defaultPrevented,true);
      assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),doc);
      assert.equal(f.view.state.selection.main.head,source.from+col);
      assert.equal(redo(f.view),true);assert.equal(f.view.state.doc.toString(),expected);
    }
  }
});

test('Struktur-Alt am EOL: Code, Frontmatter, Fortsetzung und leere Folgezeile erhalten Schutz',()=>{
  for(const [doc,lineNo] of [
    ['```\n- Fake\n```',2],['    - Fake\nText',1],['---\n- Fake\n---\n- Real',2],
    ['- Real\n  continuation\n- Next',2],['- Real\n\nPlain',2]
  ]) {
    const line=EditorState.create({doc}).doc.line(lineNo),f=harness(doc,line.to);
    f.dispatch(event('ArrowRight'));assert.equal(f.calls,0);assert.equal(f.view.state.doc.toString(),doc);
  }
});

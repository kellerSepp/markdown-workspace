import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {history,undo,redo,undoDepth,redoDepth} from '@codemirror/commands';
import {createLineWrapping} from './line-wrapping.mjs';

const wrapped=state=>state.facet(EditorView.contentAttributes).some(value=>value.class==='cm-lineWrapping');
test('Wrapping preserves exact text, selection and undo/redo across repeated toggles and state rebuilds',()=>{
  const wrapping=createLineWrapping();
  const view={state:EditorState.create({doc:'# Heading\nLong text ä 👋\n',selection:{anchor:2,head:6},extensions:[history(),wrapping.extension()]}),dispatch(spec){this.state=this.state.update(spec).state;}};
  assert.equal(wrapped(view.state),true);
  view.dispatch({changes:{from:view.state.doc.length,insert:'edit'}});
  const doc=view.state.doc,selection=view.state.selection;
  for(let i=0;i<100;i++){
    const enabled=wrapping.toggle(view);
    assert.equal(wrapped(view.state),enabled);
    assert.equal(view.state.doc,doc);
    assert.ok(view.state.selection.eq(selection));
    assert.equal(undoDepth(view.state),1);
  }
  assert.equal(undo({state:view.state,dispatch:spec=>view.dispatch(spec)}),true);
  assert.equal(redoDepth(view.state),1);
  wrapping.toggle(view);
  assert.equal(redoDepth(view.state),1);
  assert.equal(redo({state:view.state,dispatch:spec=>view.dispatch(spec)}),true);
  assert.equal(view.state.doc.toString(),doc.toString());
  view.state=EditorState.create({doc:'Other file',extensions:[wrapping.extension()]});
  assert.equal(wrapped(view.state),false);
  assert.equal(wrapping.toggle(view),true);
  assert.equal(wrapped(view.state),true);
});

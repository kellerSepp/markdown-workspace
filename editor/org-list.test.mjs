import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {runOrgStructure,planOrgStructure,orgShortcutCommand} from './org-structure.mjs';
const view=(doc,needle)=>{let state=EditorState.create({doc,selection:{anchor:doc.indexOf(needle)},extensions:[markdown(),history()]});return {get state(){return state;},dispatch(spec){state=state.update(spec).state;}};};
function change(doc,needle,id,expected){const v=view(doc,needle),pos=v.state.selection.main.head;assert.equal(runOrgStructure(v,id),true);assert.equal(v.state.doc.toString(),expected);assert.equal(v.state.doc.sliceString(v.state.selection.main.head,v.state.selection.main.head+needle.length),needle);assert.equal(undoDepth(v.state),1);assert.equal(undo(v),true);assert.equal(v.state.doc.toString(),doc);assert.equal(v.state.selection.main.head,pos);assert.equal(redo(v),true);assert.equal(v.state.doc.toString(),expected);return v;}
test('Org lists: ordinary markers, multiline subtree swaps preserve cursor and atomic history',()=>{
 for(const m of ['-','+','*','1.']){const pad=' '.repeat(m.length+1),doc=`${m} Alpha\n${pad}continued\n${pad}- Child\n${m==='1.'?'2.':m} Beta`;change(doc,'Alpha','list-down-subtree',`${m} Beta\n${m==='1.'?'2.':m} Alpha\n${pad}continued\n${pad}- Child`);}
});
test('Org lists: five levels and mixed markers move together',()=>{const doc='- A\n- B\n  + C\n    * D\n      1. E\n         - F';change(doc,'B','list-indent-subtree','- A\n  - B\n    + C\n      * D\n        1. E\n           - F');});
test('Org lists: first nested item shifts whole sibling list, following text unchanged',()=>{change('- A\n  - B\n  - C\n\nAfter','B','list-outdent-subtree','- A\n- B\n- C\n\nAfter');});
test('Org lists: later outdent retains following siblings in place',()=>{change('- A\n  - B\n  - C\n  - D','C','list-outdent-subtree','- A\n  - B\n- C\n  - D');});
test('Org lists: repeat uses initial region, planning is pure, cursor motion resets',()=>{const v=view('- A\n  - B\n    - C\n    - D','C');assert.equal(runOrgStructure(v,'list-outdent-subtree'),true);assert.equal(v.state.doc.toString(),'- A\n  - B\n  - C\n  - D');for(let i=0;i<5;i++)assert.ok(planOrgStructure(v.state,'list-outdent-subtree').spec);assert.equal(runOrgStructure(v,'list-outdent-subtree'),true);assert.equal(v.state.doc.toString(),'- A\n  - B\n- C\n- D');});
test('Org lists: number digit transition realigns multiline content and nested markers',()=>{change('9. Alpha\n   continued\n   - Child\n10. Beta','Beta','list-up-subtree','9. Beta\n10. Alpha\n    continued\n    - Child');});
test('Org lists: code, selections, continuation context and global Markdown boundary refuse',()=>{for(const [doc,needle] of [['    - A','A'],['- A\n  ```\n  code\n  ```','A'],['- A\n  continuation','continuation']])assert.ok(planOrgStructure(view(doc,needle).state,'list-indent-subtree').message);const v=view('  - A\n  - B','A');assert.equal(runOrgStructure(v,'list-indent-subtree'),false);assert.equal(v.state.doc.toString(),'  - A\n  - B');});
test('Org lists: shift-alt vertical remains physical line mapping',()=>{const v=view('- A\n  continued\n- B','continued');for(const key of ['ArrowUp','ArrowDown'])assert.equal(orgShortcutCommand(v.state,{key,altKey:true,shiftKey:true}),key==='ArrowUp'?'edit.line-up':'edit.line-down');});

test('Org lists: explicit cursor transaction breaks repeat region',()=>{const v=view('- A\n  - B\n    - C\n    - D','C');assert.equal(runOrgStructure(v,'list-outdent-subtree'),true);v.dispatch({selection:{anchor:v.state.selection.main.head}});assert.equal(runOrgStructure(v,'list-outdent-subtree'),true);assert.equal(v.state.doc.toString(),'- A\n  - B\n- C\n  - D');});
test('Org lists: shrinking number with lazy unindented continuation refuses atomically',()=>{const doc='9. Alpha\n10. Beta\nlazy continuation',v=view(doc,'Beta');assert.equal(runOrgStructure(v,'list-up-subtree'),false);assert.equal(v.state.doc.toString(),doc);assert.equal(undoDepth(v.state),0);});


test('Org subtree outdent stops before physically shallower parser sibling after line move',()=>{
  change('- test\n- test1\n    - test3\n  - test2\n- test','test3','list-outdent-subtree','- test\n- test1\n  - test3\n  - test2\n- test');
  change('- A\n    - B\n      - Child\n  - C\n- D','B','list-outdent-subtree','- A\n  - B\n    - Child\n  - C\n- D');
});

test('Org subtree outdent treats empty following markers as physical boundaries across parser lists',()=>{
  for(const marker of ['-','+','*','1.'])for(const suffix of ['', ' ', ' Following']){
    const doc='- Root\n    - Active\n  '+marker+suffix+'\n- Tail';
    change(doc,'Active','list-outdent-subtree','- Root\n  - Active\n  '+marker+suffix+'\n- Tail');
  }
});

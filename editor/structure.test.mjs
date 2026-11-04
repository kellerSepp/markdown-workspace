import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {codeFolding,foldEffect,foldedRanges} from '@codemirror/language';
import {planStructure,runStructure} from './structure.mjs';
import {TextCodec} from './text-codec.mjs';
import {THEMES} from './themes.mjs';
import {editorTheme} from './theme-editor.mjs';
function harness(doc,pos=0,theme=THEMES[0]) {
  let state=EditorState.create({doc,selection:{anchor:pos},extensions:[markdown(),codeFolding(),history(),editorTheme(theme)]});
  const view={get state(){return state;},dispatch(spec){state=state.update(spec).state;}};
  return view;
}
function check(doc,pos,cmd,expected,options) {
  const v=harness(doc,pos);let message;
  assert.equal(runStructure(v,cmd,options,m=>message=m),true,message);
  assert.equal(v.state.doc.toString(),expected);assert.equal(undoDepth(v.state),1);
  assert.equal(undo(v),true);assert.equal(v.state.doc.toString(),doc);
  assert.equal(redo(v),true);assert.equal(v.state.doc.toString(),expected);
  return v;
}
test('heading subtree movement from paragraph, including EOF, preserves unrelated YAML and Unicode',()=>{
  const before='---\nunknown: Ä😀\n---\n\n',a='# A\nAbsatz\n## Kind\nText\n',b='# B\nEnde';
  check(before+a+b,before.length+6,'heading-down',before+b+'\n'+a.slice(0,-1));
  check(before+a+b,before.length+a.length+3,'heading-up',before+b+'\n'+a.slice(0,-1));
});
test('heading levels current/subtree, atomic H1/H6 bounds and Setext',()=>{
  check('## A\n### B\n',3,'heading-promote','# A\n## B\n');
  check('## A\n### B\n',3,'heading-demote','### A\n### B\n',{children:false});
  check('Title\n-----\ntext',2,'heading-demote','### Title\ntext');
  check('Title\n=====\ntext',2,'heading-demote','Title\n-----\ntext');
  for(const [doc,cmd] of [['# A\n','heading-promote'],['## A\n###### B','heading-demote']]) assert.ok(planStructure(harness(doc).state,cmd).message);
});
test('list movement with children and single mode promotion',()=>{
  check('- A\n  - C\n- B\n',2,'list-down','- B\n- A\n  - C\n');
  check('- A\n  - C\n- B\n',2,'list-down','- C\n- B\n- A\n',{children:false});
  check('- A\n- B\n  - C\n',6,'list-up','- B\n- A\n- C\n',{children:false});
});
test('indent and outdent preserve children and following siblings',()=>{
  check('- A\n- B\n  - C\n',6,'list-indent','- A\n  - B\n    - C\n');
  check('- A\n- B\n  - C\n',6,'list-indent','- A\n  - B\n- C\n',{children:false});
  check('- A\n  - B\n    - C\n  - D\n- E\n',8,'list-outdent','- A\n  - D\n- B\n  - C\n- E\n');
  check('- A\n  - B\n    - C\n  - D\n- E\n',8,'list-outdent','- A\n  - C\n  - D\n- B\n- E\n',{children:false});
});
test('prefix variants, tasks, local ordered renumbering and continuation indentation',()=>{
  for(const prefix of ['-','+','*','1.','- [ ]']) check('- [x] Ä😀\n  Fortsetzung\n',7,'list-prefix',prefix+' Ä😀\n'+' '.repeat((prefix==='- [ ]'?1:prefix.length)+1)+'Fortsetzung\n',{prefix});
  check('1. A\n2. B\n3. C\n',3,'list-down','1. B\n2. A\n3. C\n');
});
test('code, mixed containers, selections, edges and unknown commands never edit',()=>{
  for(const [doc,pos,cmd] of [['# A\n```\n# fake\n```',10,'heading-demote'],['# A\n\n    code',11,'heading-demote'],['> - A',4,'list-indent'],['- A\n  ```\n  code\n  ```\n',2,'list-prefix'],['- A',2,'list-up'],['# A',2,'heading-down']]) {
    const v=harness(doc,pos);assert.ok(planStructure(v.state,cmd).message);assert.equal(v.state.doc.toString(),doc);assert.equal(undoDepth(v.state),0);
  }
  const v=harness('# A');v.dispatch({selection:{anchor:0,head:2}});assert.ok(planStructure(v.state,'heading-demote').message);
});
test('each command isolates history and unfolds affected folds, preserving other folds across themes',()=>{
  for(const theme of THEMES) {
    const v=harness('# A\na\n# B\nb\n# C\nc',2,theme);
    v.dispatch({effects:[foldEffect.of({from:3,to:5}),foldEffect.of({from:15,to:17})]});
    assert.ok(runStructure(v,'heading-down'));
    const folds=[];foldedRanges(v.state).between(0,v.state.doc.length,(a,b)=>folds.push([a,b]));assert.deepEqual(folds,[[15,17]]);
    assert.ok(runStructure(v,'heading-demote'));assert.equal(undoDepth(v.state),2);
  }
});
test('unchanged codec preserves exterior mixed EOL/BOM bytes; moved range uses first EOL and Undo restores originals',()=>{
  const raw='\ufeffoutside\r\n\r\n# A\nÄ😀\r# B\nB\r\n# C\nC';
  const codec=new TextCodec(new TextEncoder().encode(raw));
  let state=EditorState.create({doc:codec.text,selection:{anchor:codec.text.indexOf('# A')+2},extensions:[markdown(),codeFolding(),history()]});
  const v={get state(){return state;},dispatch(spec){const tr=state.update(spec);tr.changes.iterChanges((from,to,a,b,insert)=>codec.applyChanges([{from,to,insert:insert.toString()}]));state=tr.state;}};
  assert.ok(runStructure(v,'heading-down'));assert.ok(codec.raw.startsWith('outside\r\n\r\n'));assert.ok(codec.raw.endsWith('# C\nC'));
  undo(v);assert.deepEqual(codec.bytes(),new TextEncoder().encode(raw));
});

test('outer folds are removed in new coordinates while unrelated later folds map correctly',()=>{
  const doc='# Root\n## Child\nbody\n# Other\nother';
  const v=harness(doc,doc.indexOf('## Child')+3);
  const from=doc.indexOf('\n'),to=doc.indexOf('\n# Other'),otherFrom=doc.indexOf('\nother');
  v.dispatch({effects:[foldEffect.of({from,to}),foldEffect.of({from:otherFrom,to:doc.length})]});
  assert.ok(runStructure(v,'heading-demote'));
  const ranges=[];foldedRanges(v.state).between(0,v.state.doc.length,(a,b)=>ranges.push([a,b]));
  assert.deepEqual(ranges,[[otherFrom+1,doc.length+1]]);
});
test('frontmatter pseudo-Setext never edits or participates in heading movement',()=>{
  const doc='---\ncustom: Ä😀\nunknown: keep\n---\n\n# A\ntext\n# B\ntext';
  for(const pos of [0,5,20,31]) for(const cmd of ['heading-up','heading-down','heading-demote','list-prefix']) assert.ok(planStructure(harness(doc,pos).state,cmd).message);
  assert.ok(planStructure(harness(doc,doc.indexOf('# A')+2).state,'heading-up').message);
  assert.ok(planStructure(harness('# A').state,'heading-anything').message);
});
test('level marker multichanges preserve mixed EOL prose bytes',()=>{
  const raw='# A\r\nprose\n## B\rmore\r\n# C\nend';
  const codec=new TextCodec(new TextEncoder().encode(raw));
  const state=harness(codec.text,2).state,result=planStructure(state,'heading-demote');
  const tr=state.update(result.spec),changes=[];tr.changes.iterChanges((from,to,a,b,insert)=>changes.push({from,to,insert:insert.toString()}));codec.applyChanges(changes);
  assert.equal(codec.raw,'## A\r\nprose\n### B\rmore\r\n# C\nend');
});
test('indent honors native marker spacing and leaves unrelated ordered sublists unchanged',()=>{
  check('-    a\n- b',10,'list-indent','-    a\n     - b');
  check('1.    a\n2. b',12,'list-indent','1.    a\n      2. b');
  check('- A\n  4. Keep\n  9. Irregular\n- B\n',2,'list-prefix','+ A\n  4. Keep\n  9. Irregular\n- B\n',{prefix:'+'});
});
test('prefix cannot reinterpret list contents as thematic breaks or code',()=>{
  for(const [doc,prefix] of [['- * *','*'],['* - -','-']]) {
    const v=harness(doc);assert.ok(planStructure(v.state,'list-prefix',{prefix}).message);assert.equal(v.state.doc.toString(),doc);
  }
});

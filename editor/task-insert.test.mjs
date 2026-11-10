import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {ensureSyntaxTree} from '@codemirror/language';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {todoRules} from './todo.mjs';
import {planTaskInsert,runTaskInsert} from './task-insert.mjs';
import {checklistNormalization,runChecklist} from './checklists.mjs';
import {handleOrgShortcut} from './structure-keymap.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';

function view(doc,anchor=doc.length,extra=[]){const v={hasFocus:true,state:EditorState.create({doc,selection:{anchor},extensions:[markdown({base:markdownLanguage}),todoRules,history(),checklistNormalization(),...extra]})};ensureSyntaxTree(v.state,v.state.doc.length,100);v.dispatch=spec=>{v.state=spec.state??v.state.update(spec).state;ensureSyntaxTree(v.state,v.state.doc.length,100);};return v;}
const text=v=>v.state.doc.toString();
test('Shift+Alt+Enter converts the current dash item at every column, without new lines',()=>{
  for(const line of ['-','- ','- Hallo ä😀','  - Kind'])for(const anchor of [0,line.length]){
    const v=view(line,anchor);assert.equal(runTaskInsert(v),true,line);assert.equal(text(v),line==='-'?'- [ ] ':line.replace(/(- *)(.*)/,'$1[ ] $2'));assert.equal(v.state.doc.lines,1);assert.equal(undoDepth(v.state),1);undo(v);assert.equal(text(v),line);
  }
  const doc='# A [0/0] [0%]\n- Hallo',v=view(doc);runTaskInsert(v);assert.equal(text(v),'# A [0/1] [0%]\n- [ ] Hallo');undo(v);assert.equal(text(v),doc);redo(v);assert.match(text(v),/- \[ \] Hallo/);
});
test('Already marked item inserts an open checkbox sibling and updates both counters atomically',()=>{
  const doc='# A [1/1] [100%]\n- [x] A',v=view(doc);runTaskInsert(v);assert.equal(text(v),'# A [1/2] [50%]\n- [x] A\n- [ ] ');undo(v);assert.equal(text(v),doc);
});
test('Blank line gets first loaded open TODO at last heading level H1–H6, with H1 fallback',()=>{
  const empty=view('');assert.equal(runTaskInsert(empty),true);assert.equal(text(empty),'# TODO ');
  for(let level=1;level<=6;level++){
    const doc='#+SEQ_TODO: NEXT(n) WAIT(w) | DONE(d)\n'+'#'.repeat(level)+' Previous\n\n',v=view(doc);
    assert.equal(runTaskInsert(v),true);const expected=doc+'#'.repeat(level)+' NEXT ';assert.equal(text(v),expected);assert.equal(v.state.selection.main.head,expected.length);assert.equal(undoDepth(v.state),1);undo(v);assert.equal(text(v),doc);redo(v);assert.equal(text(v),expected);
  }
  const doc='# One\n### Three\n## Two\n   ',v=view(doc,doc.length-2);runTaskInsert(v);assert.equal(text(v),'# One\n### Three\n## Two\n## TODO ');
});
test('Blank TODO respects code, metadata, containers, read-only and selection protections',()=>{
  for(const [doc,pos] of [['```\n\n```',4],['---\n\n---',4],['# A\n:LOGBOOK:\n\n:END:',14],['> A\n> \n',6],['- A\n  \n  continuation',6],['    ',4]]){
    const v=view(doc,pos);assert.ok(planTaskInsert(v.state).message,doc);assert.equal(runTaskInsert(v),false);assert.equal(text(v),doc);
  }
  const ro=view('',0,[EditorState.readOnly.of(true)]);assert.ok(planTaskInsert(ro.state).message);
  const v=view('- A');v.dispatch({selection:{anchor:0,head:2}});assert.ok(planTaskInsert(v.state).message);
});
test('Actual Shift+Alt+Enter router and registry allow blank TODO and in-place conversion, isolate modifiers/repeats',()=>{
  for(const doc of ['','- A']){
    const v=view(doc),registry=createCommandRegistry(commandDefinitions({'list.insert-checkbox':()=>runTaskInsert(v)}),()=>({state:v.state,hasDocument:true}));
    const event={key:'Enter',altKey:true,shiftKey:true,preventDefault(){this.prevented=true;}};
    assert.equal(registry.availability('list.insert-checkbox').enabled,true);assert.equal(handleOrgShortcut(event,v,id=>registry.execute(id)),true);assert.equal(event.prevented,true);assert.equal(text(v),doc?' - [ ] A'.trimStart():'# TODO ');
    for(const patch of [{ctrlKey:true},{metaKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true},{repeat:true}])handleOrgShortcut({...event,...patch},v,()=>assert.fail('Unexpected command'));
  }
});
test('Fraction and percentage cookies coexist on headings and items, in either order, with one undo',()=>{
  for(const cookies of ['[/] [%]','[%] [/]']){
    const doc='# A '+cookies+'\n- [ ] Parent '+cookies+'\n  - [x] One\n  - [ ] Two',v=view(doc);assert.equal(runChecklist(v,'refresh'),true);
    assert.ok(text(v).includes('# A '+(cookies.startsWith('[/]')?'[0/1] [0%]':'[0%] [0/1]')));assert.ok(text(v).includes('Parent '+(cookies.startsWith('[/]')?'[1/2] [50%]':'[50%] [1/2]')));
    runChecklist(v,'toggle');assert.ok(text(v).includes('Parent '+(cookies.startsWith('[/]')?'[2/2] [100%]':'[100%] [2/2]')));assert.match(text(v),/^# A (\[1\/1\] \[100%\]|\[100%\] \[1\/1\])/);
    undo(v);assert.match(text(v),/- \[-\] Parent/);redo(v);assert.match(text(v),/- \[x\] Parent/);
  }
  const v=view('# A [/] [%]');assert.equal(runChecklist(v,'confirm'),true);assert.equal(text(v),'# A [0/0] [0%]');
});
test('Duplicate kinds, unseparated cookies and inline-code cookies remain protected',()=>{
  for(const cookies of ['[/] [/]','[%] [%]','[/] [%] [/]','[/][%]','[/] `[%]`']){
    const doc='# A '+cookies+'\n- [ ] A',v=view(doc);assert.equal(runChecklist(v,'refresh'),false,cookies);assert.equal(text(v),doc);
  }
});
test('Task heading continues with TODO at the same level and indentation, cursor after status, atomic undo/redo',()=>{
  for(let level=1;level<=6;level++){
    const doc='  '+'#'.repeat(level)+' TODO irgendwas',v=view(doc);
    const expected=doc+'\n  '+'#'.repeat(level)+' TODO ';
    assert.equal(runTaskInsert(v),true);assert.equal(text(v),expected);assert.equal(v.state.selection.main.head,expected.length);assert.equal(undoDepth(v.state),1);
    undo(v);assert.equal(text(v),doc);assert.equal(v.state.selection.main.head,doc.length);redo(v);assert.equal(text(v),expected);assert.equal(v.state.selection.main.head,expected.length);
  }
});
test('Heading continuation uses loaded first open state, preserves original title and existing following text',()=>{
  const doc='#+SEQ_TODO: NEXT(n) WAIT(w) | DONE(d)\n### WAIT Titel\nFolgetext',at=doc.indexOf('Titel'),v=view(doc,at);
  const registry=createCommandRegistry(commandDefinitions({'list.insert-checkbox':()=>runTaskInsert(v)}),()=>({state:v.state,hasDocument:true}));
  assert.equal(registry.availability('list.insert-checkbox').enabled,true);
  handleOrgShortcut({key:'Enter',altKey:true,shiftKey:true,preventDefault(){}},v,id=>registry.execute(id));
  assert.equal(text(v),doc.replace('### WAIT Titel','### WAIT Titel\n### NEXT '));assert.equal(v.state.doc.sliceString(v.state.selection.main.head-9,v.state.selection.main.head),'### NEXT ');
});
test('Checkbox conversion snaps marker cursors after checkbox, keeps logical title position and maps growing counters',()=>{
  for(const line of ['-','- ','  - ','- Titel'])for(let pos=0;pos<=(line.indexOf('Titel')>=0?2:line.length);pos++){
    const v=view(line,pos);runTaskInsert(v);const expected=text(v).indexOf('[ ]')+4;
    assert.equal(v.state.selection.main.head,expected,line+' @'+pos);undo(v);assert.equal(v.state.selection.main.head,pos);redo(v);assert.equal(v.state.selection.main.head,expected);
  }
  const doc='# A [9/9] [100%]\n'+Array.from({length:9},(_,i)=>'- [x] '+i).join('\n')+'\n- Titel',v=view(doc,doc.lastIndexOf('-')+2);
  runTaskInsert(v);assert.match(text(v),/^# A \[9\/10\] \[90%\]/);assert.equal(v.state.doc.sliceString(v.state.selection.main.head,v.state.selection.main.head+5),'Titel');
  const middle=view('- Titel',5);runTaskInsert(middle);assert.equal(middle.state.doc.sliceString(middle.state.selection.main.head),'el');
});

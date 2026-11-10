import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {ensureSyntaxTree} from '@codemirror/language';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {readChecklists,planChecklist,runChecklist,checklistNormalization} from './checklists.mjs';
import {checklistDecorations,handleChecklistMarker} from './checklist-view.mjs';
import {runListInteraction} from './list-interaction.mjs';
import {runOrgStructure} from './org-structure.mjs';
import {runLineMove} from './line-move.mjs';
import {planTodo,todoRules} from './todo.mjs';
import {COMMAND_METADATA,commandDefinitions} from './commands.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {createPrefixRouter} from './prefix-router.mjs';
import {createTodoController,todoDefinitionLine} from './todo.mjs';
import {parseAgendaFile} from './agenda-index.mjs';
import {readFile} from 'node:fs/promises';

const state=(doc,anchor=0,extensions=[])=>{const s=EditorState.create({doc,selection:{anchor},extensions:[markdown({base:markdownLanguage}),history(),todoRules,checklistNormalization(),...extensions]});ensureSyntaxTree(s,s.doc.length,100);return s;};
const view=(doc,needle,extensions=[])=>{const v={state:state(doc,typeof needle==='number'?needle:doc.indexOf(needle),extensions),focus(){}};v.dispatch=spec=>{v.state=spec.state??v.state.update(spec).state;ensureSyntaxTree(v.state,v.state.doc.length,100);};return v;};
const text=v=>v.state.doc.toString();
const sample='## TODO Reise [1/3]\n- [x] Unterkunft\n- [-] Gepäck [1/2]\n  - [x] Kleidung\n  - [ ] Ladegeräte\n- [ ] Tickets';

test('Leaf completion derives parent and explicit heading/item statistics in one undo step',()=>{
  const v=view(sample,'Ladegeräte');assert.equal(runChecklist(v,'toggle'),true);
  const done=sample.replace('[1/3]','[2/3]').replace('[-]','[x]').replace('[1/2]','[2/2]').replace('[ ] Ladegeräte','[x] Ladegeräte');
  assert.equal(text(v),done);assert.equal(undoDepth(v.state),1);assert.equal(undo(v),true);assert.equal(text(v),sample);assert.equal(redo(v),true);assert.equal(text(v),done);
  assert.match(text(v),/^## TODO/);assert.ok(!text(v).includes('LOGBOOK'));
});
test('Checkbox toggles from every cursor column, including physical line start/EOL/EOF',()=>{
  const doc='# Liste [0/1]\n- [ ] Test',from=doc.indexOf('-');
  for(let pos=from;pos<=doc.length;pos++){const v=view(doc,pos);assert.equal(runChecklist(v,'toggle'),true,String(pos));assert.equal(text(v),'# Liste [1/1]\n- [x] Test');}
});
test('Parent cannot mass-toggle children, partial leaf is explicitly checkable, uppercase survives refresh',()=>{
  assert.match(planChecklist(state(sample,sample.indexOf('Gepäck'))).message,/Unterpunkte/);
  const v=view('- [X] A\n- [-] B',11);runChecklist(v,'refresh');assert.equal(text(v),'- [X] A\n- [-] B');runChecklist(v,'toggle');assert.equal(text(v),'- [X] A\n- [x] B');runChecklist(v,'toggle');assert.equal(text(v),'- [X] A\n- [ ] B');
});
test('Five levels derive bottom-up, percentage floors and partial children do not count completed',()=>{
  const doc='# Baum [%]\n- [ ] A [/]\n  - [ ] B\n    - [ ] C\n      - [ ] D\n        - [ ] E\n- [x] F\n- [ ] G';
  const v=view(doc,'E');assert.equal(runChecklist(v,'toggle'),true);assert.match(text(v),/^# Baum \[66%\]/);assert.ok(!text(v).includes('[ ] A'));assert.ok(!text(v).includes('[ ] D'));assert.match(text(v),/A \[1\/1\]/);
  runChecklist(v,'toggle');assert.match(text(v),/^# Baum \[33%\]/);
});
test('Heading cookies count only own top-level checkboxes; normal parents are not traversed',()=>{
  const doc='# A [/]\n- [x] A\n- Normal [/]\n  - [x] Hidden\n\n+ [ ] Separate\n\n## B [/]\n- [x] B\n\n# C [%]';
  const v=view(doc,'# A');runChecklist(v,'confirm');assert.equal(text(v),doc.replace('# A [/]','# A [1/2]').replace('Normal [/]','Normal [1/1]'));
  runChecklist(v,'refresh');assert.match(text(v),/## B \[1\/1\]/);assert.match(text(v),/# C \[0%\]/);
});
test('Add/remove markers preserves title and indentation; refuses derived parents',()=>{
  const doc='# A [/]\n1. Hallo ä😀';const v=view(doc,'Hallo');runChecklist(v,'marker');assert.equal(text(v),'# A [0/1]\n1. [ ] Hallo ä😀');runChecklist(v,'marker');assert.equal(text(v),'# A [0/0]\n1. Hallo ä😀');
  const parent=state(sample,sample.indexOf('Gepäck'));assert.match(planChecklist(parent,'marker').message,/Elterncheckbox/);
});
test('Raw typing, deletion, paste, loading, TODO completion and undo/redo never recalculate',()=>{
  const doc='# TODO A [0/1]\n- [ ] A';const v=view(doc,'[ ]');
  v.dispatch({changes:{from:doc.indexOf('[ ]')+1,to:doc.indexOf('[ ]')+2,insert:'x'},userEvent:'input.type'});assert.equal(text(v),doc.replace('- [ ]','- [x]'));
  const p=planTodo(v.state,'DONE');assert.ok(p.spec);v.dispatch(p.spec);assert.match(text(v),/^# DONE A \[0\/1\]/);
  runChecklist(v,'refresh');assert.match(text(v),/\[1\/1\]/);undo(v);assert.match(text(v),/\[0\/1\]/);redo(v);assert.match(text(v),/\[1\/1\]/);
  const loaded=state('# A [99/99]\n- [ ] A');assert.match(loaded.doc.toString(),/99\/99/);
});
test('Structural insert updates existing counters atomically; Enter remains continuation',()=>{
  const doc='# A [1/1]\n- [x] A';const v=view(doc,doc.length);assert.equal(runListInteraction(v,'insert-checkbox'),true);assert.equal(text(v),'# A [1/2]\n- [x] A\n- [ ] ');assert.equal(undoDepth(v.state),1);undo(v);assert.equal(text(v),doc);redo(v);assert.equal(text(v),'# A [1/2]\n- [x] A\n- [ ] ');
  const c=view(doc,doc.length);runListInteraction(c,'newline');assert.equal(text(c),doc+'\n  ');
});
test('Indent/outdent and physical line move normalize new direct-child ownership',()=>{
  const doc='# A [1/2]\n- [ ] Parent [0/0]\n- [x] Child';const v=view(doc,'Child');assert.equal(runOrgStructure(v,'list-indent-subtree'),true);assert.equal(text(v),'# A [1/1]\n- [x] Parent [1/1]\n  - [x] Child');undo(v);assert.equal(text(v),doc);redo(v);assert.match(text(v),/Parent \[1\/1\]/);
  const moved=view('# A [1/1]\n- [x] A\n# B [0/1]\n- [ ] B','- [x]');assert.equal(runLineMove(moved,true),true);assert.equal(text(moved),'# A [0/0]\n# B [1/2]\n- [x] A\n- [ ] B');
});
test('Refresh is safe around frontmatter, fenced code, drawers and container lists',()=>{
  const doc='---\nnote: "[ ]"\n---\n# A [/]\n:LOGBOOK:\n- [ ] History\n:END:\n```\n- [ ] Code\n```\n> - [ ] Quote\n\n- [x] Real';const v=view(doc,'# A');runChecklist(v,'refresh');assert.equal(text(v),doc.replace('# A [/]','# A [1/1]'));
  for(const label of ['History','Code','Quote'])assert.ok(planChecklist(state(doc,doc.indexOf(label))).message,label);
});
test('Unsafe list prevents misleading count updates, unrelated section still works',()=>{
  const doc='# Unsafe [/]\n- [ ] A\n  ```\n  code\n  ```\n\n# Safe [/]\n- [ ] B';const v=view(doc,'# Safe');assert.equal(runChecklist(v,'confirm'),true);assert.match(text(v),/# Safe \[0\/1\]/);assert.match(text(v),/# Unsafe \[\/\]/);assert.match(planChecklist(v.state,'refresh').message,/geschützt/);
});
test('Ambiguous/inline cookies do not modify text; links/escaped markers are not checkboxes',()=>{
  for(const heading of ['# A [/] [1/2]','# A `[/]`','# A [/](/url)']){const doc=heading+'\n- [ ] A';assert.ok(planChecklist(state(doc,doc.length),'refresh').message,heading);}
  const doc='# A [/]\n- \\[ ] Escaped\n- `[ ]` Code\n- [x](url) Link';const v=view(doc,0);runChecklist(v,'refresh');assert.equal(text(v),doc.replace('# A [/]','# A [0/0]'));
});
test('Readonly and nonempty/multiple selections prevent edits; structural repairs stay opt-in',()=>{
  assert.match(planChecklist(state('- [ ] A',0,[EditorState.readOnly.of(true)])).message,/schreibgeschützt/);
  const s=state('- [ ] A');assert.match(planChecklist(s.update({selection:{anchor:0,head:2}}).state).message,/auswahl/);
  const multi=state('- [ ] A\n- [ ] B',0,[EditorState.allowMultipleSelections.of(true)]);assert.match(planChecklist(multi.update({selection:EditorSelection.create([EditorSelection.cursor(0),EditorSelection.cursor(8)])}).state).message,/Cursor/);
});
test('Decoration retains raw three characters, exposes mixed state and viewport bounds',()=>{
  const s=state(sample),decorations=checklistDecorations(s,[{from:0,to:s.doc.length}]),values=[];decorations.between(0,s.doc.length,(from,to,value)=>values.push({from,to,...value.spec}));
  assert.equal(values.length,5);assert.equal(values.find(v=>v.attributes['aria-checked']==='mixed').to-values.find(v=>v.attributes['aria-checked']==='mixed').from,3);assert.equal(checklistDecorations(s,[{from:0,to:10}]).size,0);
});
test('Mouse and marker Enter/Space use same command with modifier, repeat, selection and busy guards',()=>{
  const v=view('- [ ] A',0);v.contentDOM={contains:()=>true};const calls=[],target={closest(){return this;},getAttribute(){return '2';}};
  const event={type:'mousedown',button:0,target,preventDefault(){this.prevented=true;}};
  assert.equal(handleChecklistMarker(event,v,id=>calls.push(id)),true);assert.deepEqual(calls,['checklist.toggle']);assert.equal(v.state.selection.main.head,2);
  for(const patch of [{ctrlKey:true},{altKey:true},{shiftKey:true},{metaKey:true},{isComposing:true},{button:2},{getModifierState:()=>true}])assert.equal(handleChecklistMarker({...event,...patch},v,()=>assert.fail()),false);
  assert.equal(handleChecklistMarker(event,v,()=>assert.fail(),()=>({busy:true})),false);
  assert.equal(handleChecklistMarker({...event,type:'keydown',key:' ',repeat:true},v,()=>assert.fail()),true);
  assert.equal(handleChecklistMarker({...event,type:'keydown',key:'Enter'},v,id=>calls.push(id)),true);
});
test('Registry context action and checklist commands remain isolated by Busy, modal agenda and dialog guards',()=>{
  let context={state:state('- [ ] A'),busy:false,hasDocument:true};const calls=[];
  const registry=createCommandRegistry(commandDefinitions(Object.fromEntries(COMMAND_METADATA.map(c=>[c.id,()=>calls.push(c.id)]))),()=>context);
  assert.equal(registry.availability('editor.confirm').enabled,true);assert.equal(registry.availability('todo.reload').enabled,false);
  context={...context,agendaActive:true,agendaDocked:true,agendaFocused:false};assert.equal(registry.availability('checklist.toggle').enabled,true);
  for(const patch of [{busy:true},{filePickerActive:true},{agendaDocked:false},{agendaFocused:true}]){const saved=context;context={...saved,...patch};assert.equal(registry.execute('checklist.toggle'),false);context=saved;}
  assert.deepEqual(calls,[]);
});
test('Actual app confirmation handler routes prefix between checkbox, heading statistics and TODO declaration',async()=>{
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
  const source=app.match(/handlers\['editor.confirm'\]=\(\)=>[^\n]+/)[0];
  const doc='#+SEQ_TODO: NEXT(n) | DONE(d)\n# NEXT A [0/1]\n- [ ] A',v=view(doc,doc.length),handlers={},notices=[];
  const todo=createTodoController({view:v,notify:m=>notices.push(m)});
  new Function('handlers','view','todo','todoDefinitionLine','runChecklist','status',source)(handlers,v,todo,todoDefinitionLine,runChecklist,m=>notices.push(m));
  v.hasFocus=true;
  const registry=createCommandRegistry(commandDefinitions(handlers),()=>({state:v.state,hasDocument:true}));
  const prefix=createPrefixRouter({registry});const confirm=()=>{prefix.keyDown({key:'c',ctrlKey:true,preventDefault(){}},v);prefix.keyUp({key:'c'});prefix.keyDown({key:'c',ctrlKey:true,preventDefault(){}},v);};
  confirm();assert.equal(text(v),doc.replace('[0/1]','[1/1]').replace('- [ ]','- [x]'));assert.equal(prefix.active,false);
  v.dispatch({selection:{anchor:3},changes:{from:12,to:16,insert:'WAIT'}});confirm();assert.equal(v.state.field(todoRules).rules[0].name,'WAIT');
  const current=text(v);v.dispatch({selection:{anchor:current.indexOf('# NEXT')},changes:{from:current.indexOf('[1/1]'),to:current.indexOf('[1/1]')+5,insert:'[/]'}});confirm();assert.match(text(v),/# NEXT A \[1\/1\]/);assert.ok(!text(v).includes('DONE A'));
  assert.match(app,/checklistNormalization\(status\)/);assert.match(app,/checklistView\(id=>registry.execute\(id\),editingContext\)/);
});
test('Adding a checkbox to a bare empty marker keeps a valid Markdown list',()=>{
  for(const doc of ['-','+','*','1.']){const v=view(doc,doc.length);assert.equal(runChecklist(v,'marker'),true,doc);assert.equal(text(v),doc+' [ ] ');assert.equal(readChecklists(v.state).items[0].value,' ');undo(v);assert.equal(text(v),doc);}
});
test('Counter width changes preserve actual cursor and repeated subtree indentation region',()=>{
  const doc='# A [9/10]\n- [ ] Parent [0/0]\n'+Array.from({length:9},(_,i)=>'- [x] Child'+i).join('\n');
  const v=view(doc,'Child0');runOrgStructure(v,'list-indent-subtree');assert.equal(text(v),'# A [9/9]\n- [x] Parent [1/1]\n  - [x] Child0\n'+Array.from({length:8},(_,i)=>'- [x] Child'+(i+1)).join('\n'));
  assert.equal(v.state.doc.sliceString(v.state.selection.main.head,v.state.selection.main.head+6),'Child0');
  runOrgStructure(v,'list-outdent-subtree');assert.equal(text(v),doc.replace('- [ ] Parent','- [x] Parent').replace('[9/10]','[10/10]')); // Parent without children retains its last explicit value.
  const grow=view('# A [9/10]\n'+Array.from({length:10},(_,i)=>`- [${i<9?'x':' '}] Child${i}`).join('\n'),'Child9');runChecklist(grow,'toggle');assert.match(text(grow),/^# A \[10\/10\]/);assert.equal(grow.state.doc.sliceString(grow.state.selection.main.head,grow.state.selection.main.head+6),'Child9');
});
test('Removing last checkbox refreshes 0/0, raw cut requires refresh, rejected edits report failure',()=>{
  const doc='# A [1/1]\n- [x] A';const v=view(doc,doc.length);runChecklist(v,'marker');assert.equal(text(v),'# A [0/0]\n- A');
  const cut=view(doc,doc.length);cut.dispatch({changes:{from:doc.indexOf('-'),to:doc.length,insert:''},userEvent:'delete.cut'});assert.equal(text(cut),'# A [1/1]\n');runChecklist(cut,'refresh');assert.equal(text(cut),'# A [0/0]\n');
  const rejected=view(doc,doc.length,[EditorState.transactionFilter.of(tr=>tr.docChanged?[]:tr)]);assert.equal(runChecklist(rejected,'toggle'),false);assert.equal(runListInteraction(rejected,'insert-checkbox'),false);assert.equal(text(rejected),doc);
});
test('Unsupported tab/parenthesis list markers, reference links and ambiguous scopes are refused atomically',()=>{
  for(const item of ['-\t[ ] A','1) [ ] A']){const doc='# A [/]\n'+item,v=view(doc,doc.length);assert.equal(runChecklist(v,'refresh'),false);assert.equal(text(v),doc);}
  const doc='# A [/]\n- [x] A\n\n[x]: url',v=view(doc,doc.indexOf('-'));v.state=EditorState.create({doc,selection:{anchor:doc.indexOf('-')},extensions:[markdown(),history()]});assert.equal(runChecklist(v,'toggle'),false);assert.equal(text(v),doc);
  const ambiguous='# A [/] [1/1]\n- [x] A',m=view(ambiguous,ambiguous.length);assert.equal(runListInteraction(m,'insert-checkbox'),false);assert.equal(text(m),ambiguous);
});
test('Agenda continues to index heading TODOs only; recurring completion leaves checkbox text intact',async()=>{
  const doc='# TODO A [0/1]\nSCHEDULED: <2026-11-10 Di +1d>\n- [ ] A';const v=view(doc,doc.length);runChecklist(v,'toggle');
  let records=await parseAgendaFile(new TextEncoder().encode(text(v)),'synthetic.md');assert.equal(records.records.length,1);assert.equal(records.records[0].status,'TODO');
  const p=planTodo(v.state,'DONE',{now:new Date(2026,10,10,12)});assert.ok(p.spec);v.dispatch(p.spec);assert.match(text(v),/SCHEDULED: <2026-11-11 Mi \+1d>/);assert.match(text(v),/- \[x\] A/);assert.match(text(v),/LOGBOOK/);
});
test('Bounded synthetic lifecycle retains exact history through 100 checkbox cycles',()=>{
  const v=view(sample,'Ladegeräte');for(let n=0;n<100;n++){assert.equal(runChecklist(v,'toggle'),true);assert.equal(undo(v),true);assert.equal(text(v),sample);assert.equal(redo(v),true);assert.equal(runChecklist(v,'toggle'),true);assert.equal(text(v),sample);}
});

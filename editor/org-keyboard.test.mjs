import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldEffect,foldedRanges} from '@codemirror/language';
import {history,undo,redo,undoDepth,defaultKeymap} from '@codemirror/commands';
import {runScopeHandlers,keymap} from '@codemirror/view';
import {ORG_STRUCTURE,orgContext,orgShortcutCommand,planOrgStructure,runOrgStructure} from './org-structure.mjs';
import {cycleOrgVisibility,orgVisibilityPlans,orgFoldReason} from './org-folding.mjs';
import {planLineMove,runLineMove} from './line-move.mjs';
import {structureKeyboard,handleOrgShortcut,withoutOrgArrowConflicts} from './structure-keymap.mjs';
import {planStructure,runStructure} from './structure.mjs';
import {COMMAND_METADATA,commandDefinitions} from './commands.mjs';
import {createCommandRegistry} from './command-registry.mjs';
function harness(doc,pos=0,extensions=[]) {
  let state=EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),codeFolding(),history(),extensions]});
  return {get state(){return state;},dispatch(spec){state=state.update(spec).state;},setTabFocusMode(){},focus(){}};
}
const folds=state=>{const result=[];foldedRanges(state).between(0,state.doc.length,(from,to)=>result.push({from,to}));return result;};
const alt=(key,shiftKey=false,extra={})=>({key,altKey:true,shiftKey,ctrlKey:false,metaKey:false,isComposing:false,preventDefault(){this.prevented=true;},...extra});
function roundtrip(view,run,expected) {
  const before=view.state.doc.toString(),position=view.state.selection.main.head;
  assert.equal(run(),true);assert.equal(view.state.doc.toString(),expected);assert.equal(undoDepth(view.state),1);
  const after=view.state.selection.main.head;
  assert.equal(undo(view),true);assert.equal(view.state.doc.toString(),before);assert.equal(view.state.selection.main.head,position);
  assert.equal(redo(view),true);assert.equal(view.state.doc.toString(),expected);assert.equal(view.state.selection.main.head,after);
}
test('Org-Einzelheading und Unterbaum ändern getrennte Marker, H1/H6 atomar',()=>{
  const text='## A\nBody\n### B\n#### C\n# Z';
  for(const [id,expected] of [['heading-promote-single','# A\nBody\n### B\n#### C\n# Z'],['heading-demote-single','### A\nBody\n### B\n#### C\n# Z'],['heading-promote-subtree','# A\nBody\n## B\n### C\n# Z'],['heading-demote-subtree','### A\nBody\n#### B\n##### C\n# Z']]) {
    const v=harness(text,3);roundtrip(v,()=>runOrgStructure(v,id),expected);
  }
  for(const [doc,id] of [['# A','heading-promote-single'],['###### A','heading-demote-single'],['## A\n###### B','heading-demote-subtree']]) {
    const v=harness(doc);assert.ok(planOrgStructure(v.state,id).message);assert.equal(runOrgStructure(v,id),false);assert.equal(v.state.doc.toString(),doc);
  }
});
test('Org-Meta-Up/Down tauscht ganze gleichrangige Unterbäume, überschreitet keine Eltern',()=>{
  const doc='# Root\n## Parent\n### A\nBody\n#### Child\nText\n### B\nEnd\n## Next\n### C';
  const v=harness(doc,doc.indexOf('A'));
  roundtrip(v,()=>runStructure(v,'heading-down',{children:false}),doc.replace('### A\nBody\n#### Child\nText\n### B\nEnd\n','### B\nEnd\n### A\nBody\n#### Child\nText\n'));
  const first=harness(doc,doc.indexOf('A'));assert.ok(planStructure(first.state,'heading-up').message);
  const last=harness(doc,doc.indexOf('### B')+4);assert.ok(planStructure(last.state,'heading-down').message);
  const skip=harness('# A\n### Child\n## Peer',15);assert.ok(planStructure(skip.state,'heading-up').message);
});
test('Org-Listen: Einzel-Einrücken lässt Children absolut, Einzel-Ausrücken mit Children gesperrt',()=>{
  const doc='- A\n- B\n  - Child\n- C',v=harness(doc,doc.indexOf('B'));
  roundtrip(v,()=>runOrgStructure(v,'list-indent-single'),'- A\n  - B\n  - Child\n- C');
  const nested='- A\n  - B\n    - Child\n- C',w=harness(nested,nested.indexOf('B'));
  assert.match(planOrgStructure(w.state,'list-outdent-single').message,/Unterpunkten/);
  assert.equal(w.state.doc.toString(),nested);
});
test('Org-Listen: Unterbaumverschieben, Einrücken, Cursor und konservative Sonderfallgrenzen',()=>{
  const doc='- A\n  - Child\n- B\n  - Kid\n- C',v=harness(doc,doc.indexOf('B'));
  roundtrip(v,()=>runOrgStructure(v,'list-up-subtree'),'- B\n  - Kid\n- A\n  - Child\n- C');
  assert.equal(v.state.doc.sliceString(v.state.selection.main.head,v.state.selection.main.head+1),'B');
  const w=harness('- A\n- B\n  - Kid',6);
  assert.equal(runOrgStructure(w,'list-indent-subtree'),true);
  assert.equal(w.state.doc.toString(),'- A\n  - B\n    - Kid');
  assert.match(planOrgStructure(w.state,'list-indent-subtree').message,/Cursor bewegen/);
  w.dispatch({selection:{anchor:w.state.selection.main.head}});
  assert.doesNotMatch(planOrgStructure(w.state,'list-indent-subtree').message??'',/Cursor bewegen/);
  const first=harness('- A\n- B',2);assert.match(planOrgStructure(first.state,'list-indent-subtree').message,/vorherigen/);
  const siblings=harness('- A\n  - B\n  - C',8);assert.match(planOrgStructure(siblings.state,'list-outdent-subtree').message,/folgenden Geschwister/);
});
test('Alt-Pfeile: vier getrennte Fälle, AltGr/IME/Plaintext/Selection und CM-Konflikte',()=>{
  const heading=harness('## A\n### B',3).state;
  for(const [key,shift,id] of [['ArrowLeft',false,'structure.heading-promote-single'],['ArrowRight',true,'structure.heading-demote-subtree'],['ArrowUp',false,'structure.heading-up'],['ArrowDown',true,'edit.line-down']]) assert.equal(orgShortcutCommand(heading,alt(key,shift)),id);
  for(const patch of [{ctrlKey:true},{metaKey:true},{altKey:false},{isComposing:true},{getModifierState:()=>true}]) assert.equal(orgShortcutCommand(heading,alt('ArrowLeft',false,patch)),null);
  assert.equal(orgShortcutCommand(harness('Text').state,alt('ArrowUp')),null);
  assert.equal(orgShortcutCommand(harness('# A\nBody',6).state,alt('ArrowUp')),null);
  assert.equal(orgContext(harness('```\n# Fake\n```',6).state),null);
  const selected=harness('# A');selected.dispatch({selection:{anchor:0,head:3}});assert.equal(orgShortcutCommand(selected.state,alt('ArrowRight')),null);
  const event=alt('ArrowLeft');let executed;
  assert.equal(handleOrgShortcut(event,{state:heading},id=>executed=id),true);assert.equal(executed,'structure.heading-promote-single');assert.equal(event.prevented,true);
  const ordinary=alt('ArrowLeft');assert.equal(handleOrgShortcut(ordinary,harness('plain'),()=>assert.fail()),false);assert.equal(ordinary.prevented,undefined);
  assert.ok(withoutOrgArrowConflicts(defaultKeymap).every(binding=>!['Alt-ArrowUp','Alt-ArrowDown','Shift-Alt-ArrowUp','Shift-Alt-ArrowDown'].includes(binding.key)));
});
test('Org-lokal: FOLDED → CHILDREN (Elternbody sichtbar) → SUBTREE; fremde Falten bleiben',()=>{
  const doc='# A\nElternbody\n## B\nChildbody\n### C\nDeep\n# Z\nEnd',v=harness(doc,2);
  const unrelated={from:doc.indexOf('# Z')+3,to:doc.length};v.dispatch({effects:foldEffect.of(unrelated)});
  const plans=orgVisibilityPlans(v.state);
  for(const plan of [...plans,plans[0]]) {
    assert.equal(cycleOrgVisibility(v,false),true);
    assert.deepEqual(folds(v.state),[...plan.ranges,unrelated]);
    assert.equal(v.state.doc.toString(),doc);assert.equal(undoDepth(v.state),0);
  }
  const childPlan=plans.find(plan=>plan.name==='CHILDREN');assert.ok(childPlan.ranges.every(range=>range.from>doc.indexOf('Elternbody')));
});
test('Org-global: OVERVIEW/CONTENTS/SHOW ALL mit Setext, Sprungebenen, Frontmatter und Cursor',()=>{
  const doc='---\nkey: value\n---\n\nTitle\n=====\nBody\n### B\nDeep\n# Z\nEnd',v=harness(doc,doc.indexOf('Deep'));
  const plans=orgVisibilityPlans(v.state,true);
  for(const plan of plans) {
    assert.equal(cycleOrgVisibility(v,true),true);assert.deepEqual(folds(v.state),plan.ranges);assert.equal(v.state.doc.toString(),doc);
    assert.ok(folds(v.state).every(r=>!(v.state.selection.main.head>r.from&&v.state.selection.main.head<r.to)));
  }
  assert.match(orgFoldReason(harness('no headings').state,true),/Keine/);
  assert.match(orgFoldReason(harness('# A\nBody',6).state),/Überschriftenzeile/);
});
test('Identische Org-Sichtbarkeitsstufen werden übersprungen statt den Zyklus festzuhalten',()=>{
  for(const [doc,global] of [['# A\nBody\n# B\nEnd',true],['# A\n## B',false],['# A\nBody',false]]) {
    const v=harness(doc,2),plans=orgVisibilityPlans(v.state,global);assert.equal(plans.length,2);
    for(const expected of [plans[0],plans[1],plans[0]]) {assert.equal(cycleOrgVisibility(v,global),true);assert.deepEqual(folds(v.state),expected.ranges);}
  }
});
test('Org-Tab ist explizite Option; Listen/Code und Escape-Fokusausstieg bleiben',()=>{
  let enabled=false;const commands=[];
  const v=harness('# A\nText\n## B\nBody',2,structureKeyboard(()=>true,()=>{},id=>commands.push(id),()=>enabled));
  const tab=shiftKey=>({key:'Tab',keyCode:9,shiftKey,ctrlKey:false,altKey:false,metaKey:false});
  assert.equal(runScopeHandlers(v,tab(false),'editor'),true);assert.equal(commands.pop(),'structure.heading-demote');
  enabled=true;assert.equal(runScopeHandlers(v,tab(false),'editor'),true);assert.equal(commands.pop(),'fold.org-local-cycle');
  assert.equal(runScopeHandlers(v,tab(true),'editor'),true);assert.equal(commands.pop(),'fold.org-global-cycle');
  runScopeHandlers(v,{key:'Escape',keyCode:27},'editor');assert.equal(runScopeHandlers(v,tab(false),'editor'),false);
  const list=harness('- A\n- B',6,structureKeyboard(()=>false,()=>{},id=>commands.push(id),()=>true));runScopeHandlers(list,tab(true),'editor');assert.equal(commands.pop(),'structure.list-outdent');
  const code=harness('```\ncode\n```',6,structureKeyboard(()=>true,()=>{},id=>commands.push(id),()=>true));runScopeHandlers(code,tab(false),'editor');assert.match(code.state.doc.toString(),/  code/);
});
test('Zeilenverschieben ist levelunabhängig, erhält Marker/Unicode/EOF/Cursor und atomare Historie',()=>{
  for(const [doc,word,down,expected] of [['# A\n### B\nText','B',false,'### B\n# A\nText'],['# A\n### B\nText','B',true,'# A\nText\n### B'],['ä😀\n終','ä',true,'終\nä😀'],['A\nB\n','B',true,'A\n\nB']]) {
    const v=harness(doc,doc.indexOf(word));roundtrip(v,()=>runLineMove(v,down),expected);
    assert.equal(v.state.doc.sliceString(v.state.selection.main.head,v.state.selection.main.head+word.length),word);
  }
  const v=harness('A\nB\nC',2);runLineMove(v,false);runLineMove(v,true);assert.equal(undoDepth(v.state),2);assert.equal(undo(v),true);assert.equal(v.state.doc.toString(),'B\nA\nC');
});
test('Zeilenverschieben schützt Code/Fences, Frontmatter, Auswahl und Dokumentränder',()=>{
  for(const [doc,pos,down] of [['---\nkey: x\n---\n# A',17,false],['A\n```\ncode\n```\nB',0,true],['A\n```\ncode\n```\nB',8,true],['A\n```\ncode\n```\nB',17,false],['A',0,false],['A',0,true]]) {
    const v=harness(doc,Math.min(pos,doc.length));assert.ok(planLineMove(v.state,down).message);assert.equal(runLineMove(v,down),false);assert.equal(v.state.doc.toString(),doc);
  }
  const v=harness('A\nB');v.dispatch({selection:{anchor:0,head:2}});assert.match(planLineMove(v.state,true).message,/Cursorstelle/);
});
test('Registry führt explizite Scopes unabhängig von Legacy-Children aus und liefert Kürzelmetadaten',()=>{
  for(const children of [false,true]) {
    const v=harness('## A\n### B',3),handlers=Object.fromEntries(COMMAND_METADATA.map(c=>[c.id,()=>true]));
    for(const [id] of ORG_STRUCTURE) handlers['structure.'+id]=()=>runOrgStructure(v,id);
    const registry=createCommandRegistry(commandDefinitions(handlers),()=>({state:v.state,hasDocument:true,busy:false,structure:{children}}));
    assert.equal(registry.execute('structure.heading-demote-single'),true);assert.equal(v.state.doc.toString(),'### A\n### B');
    assert.match(registry.get('structure.heading-demote-single').orgShortcut,/M-RIGHT/);
    assert.ok(registry.list('M-S-UP').some(c=>c.id==='edit.line-up'));
    assert.equal(registry.get('edit.line-up').shortcut,'Alt+Umschalt+Oben');
  }
});

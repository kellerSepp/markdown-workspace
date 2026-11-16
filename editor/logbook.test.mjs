import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges} from '@codemirror/language';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {planLogbookNote,createLogbookController,logbookContext,toggleLogbook} from './logbook.mjs';
import {applyStartupVisibility} from './startup-visibility.mjs';
import {cycleOrgVisibility} from './org-folding.mjs';
import {createLogbookForm} from './logbook-form.mjs';
const now=new Date(2026,10,16,9,50);
function fixture(doc,pos=0){const view={state:EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),codeFolding(),history()]})};view.dispatch=spec=>{view.state=view.state.update(spec).state;};return view;}
test('H1-H6 notes preserve tags, planning, properties and children; newest first and atomic history',()=>{
 for(let level=1;level<=6;level++){
  const doc='#'.repeat(level)+' ONHOLD Parent :PHONE:\nSCHEDULED: <2026-11-16 Mo>\n:PROPERTIES:\n:CUSTOM: keep\n:END:\nBody\n'+(level<6?'#'.repeat(level+1)+' Child\n:LOGBOOK:\nOld child\n:END:\n':'');
  const view=fixture(doc,3);let options;
  const ctl=createLogbookController({view,panel:{openNote:o=>{options=o;return true;}},now:()=>now});
  assert.equal(ctl.open(),true);assert.equal(options.choose('First\n# heading\n:END:',{state:view.state}),true);
  const first=view.state.doc.toString();assert.match(first,/- Note taken on \[2026-11-16 Mo 09:50\] \\\\/);assert.ok(first.includes('    # heading\n    :END:'));assert.ok(first.includes(':CUSTOM: keep'));
  assert.ok(first.indexOf(':CUSTOM: keep')<first.indexOf('- Note taken'));assert.equal(undoDepth(view.state),1);assert.ok(foldedRanges(view.state).size);
  undo(view);assert.equal(view.state.doc.toString(),doc);redo(view);assert.equal(view.state.doc.toString(),first);
  assert.equal(ctl.open(),true);assert.equal(options.choose('Second',{state:view.state}),true);
  assert.ok(view.state.doc.toString().indexOf('Second')<view.state.doc.toString().indexOf('First'));
  if(level<6)assert.ok(view.state.doc.toString().endsWith('Old child\n:END:\n'));
 }
});
test('Malformed/duplicate logs, protected contexts and empty notes are refused',()=>{
 for(const doc of ['# H\n:LOGBOOK:\nMissing','# H\n:LOGBOOK:\n:END:\n:LOGBOOK:\n:END:'])assert.ok(planLogbookNote(fixture(doc,2).state,'Note',now).message);
 const view=fixture('# H\nText',2);assert.ok(planLogbookNote(view.state,'  ',now).message);
 for(const doc of ['No heading','```\n# Fake\n```','> # Quote'])assert.ok(logbookContext(fixture(doc,Math.min(4,doc.length)).state).message);
});
test('Note callback rejects stale/busy documents and opening alone changes nothing',()=>{
 const view=fixture('# H\nText',2);let options,context={};const ctl=createLogbookController({view,panel:{openNote:o=>{options=o;return true;}},getContext:()=>context});
 ctl.open();const saved={state:view.state};assert.equal(undoDepth(view.state),0);view.dispatch({changes:{from:0,insert:'x'}});assert.equal(options.choose('No',saved),false);
 ctl.open();context.busy=true;assert.equal(options.choose('No',{state:view.state}),false);
});
test('LOGBOOK folds at load, Tab toggles and opening headings keeps it folded',()=>{
 const doc='# H\n:LOGBOOK:\n- Note taken on [2026-11-16 Mo 09:50] \\\\\n    text\n:END:\nBody';const view=fixture(doc);
 applyStartupVisibility(view);assert.ok(foldedRanges(view.state).size);
 view.dispatch({selection:{anchor:doc.indexOf(':LOGBOOK:')}});assert.equal(toggleLogbook(view),true);assert.equal(foldedRanges(view.state).size,0);assert.equal(toggleLogbook(view),true);
 view.dispatch({selection:{anchor:2}});cycleOrgVisibility(view);cycleOrgVisibility(view);assert.ok(foldedRanges(view.state).size);
 assert.equal(view.state.doc.toString(),doc);
});
test('Multiline form C-c c commits, C-c k/Escape cancel and IME is ignored',()=>{
 class El{constructor(){this.handlers={};this.style={};this.children=[];}setAttribute(){}append(...els){this.children.push(...els);}addEventListener(k,f){this.handlers[k]=f;}focus(){}remove(){}}
 const doc={createElement:()=>new El()};let commits=[],cancelled=0;const form=createLogbookForm({document:doc,commit:t=>commits.push(t),cancel:()=>cancelled++});const input=form.root.children[1];input.value='One\nTwo';
 const key=(key,ctrlKey=false,extra={})=>form.root.handlers.keydown({key,ctrlKey,preventDefault(){},stopPropagation(){},...extra});
 key('Enter');assert.equal(commits.length,0);key('c',true);key('c');assert.deepEqual(commits,['One\nTwo']);key('c',true);key('k');key('Escape');assert.equal(cancelled,2);key('c',true,{isComposing:true});key('c');assert.equal(commits.length,1);
});

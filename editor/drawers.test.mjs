import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges} from '@codemirror/language';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {readDrawers,readPlanningDrawers,drawerFoldRanges} from './planning-drawers.mjs';
import {drawerContext,planDrawer,toggleDrawer,createDrawerController} from './drawers.mjs';
import {applyStartupVisibility,readStartupVisibility} from './startup-visibility.mjs';
import {cycleOrgVisibility} from './org-folding.mjs';
import {cycleContext,headingSections} from './section-folding.mjs';
import {revealFoldAt,cycleFoldAt} from './folding.mjs';
import {readTodoRules} from './todo.mjs';
import {readTagRules} from './tag-rules.mjs';
import {readChecklists} from './checklist-model.mjs';
import {planningContext} from './planning-context.mjs';
import {createDrawerForm} from './drawer-form.mjs';
const state=(doc,selection)=>EditorState.create({doc,selection,extensions:[markdown({base:markdownLanguage}),codeFolding(),history()]});
function fixture(doc,selection){const view={state:state(doc,selection)};view.dispatch=spec=>{view.state=view.state.update(spec).state;};return view;}

test('Generic scanner recognizes positional pairs, preserves reserved property values and ignores protected examples',()=>{
 const doc='# H :TAG:\n:PEOPLE:\nPerson\n:END:\n:PEOPLE:\nSecond\n:END:\n:PROPERTIES:\n:EMPTY:\n:REPEAT_TO_STATE: TODO\n:END:\n:LOGBOOK:\n- Note\n    :FOO:\n    :END:\n:END:';
 const s=state(doc);assert.deepEqual(readDrawers(s).drawers.map(d=>d.kind),['PEOPLE','PEOPLE','PROPERTIES','LOGBOOK']);assert.equal(readDrawers(s).errors.length,0);
 assert.deepEqual(readPlanningDrawers(s).drawers.map(d=>d.kind),['PROPERTIES','LOGBOOK']);assert.equal(drawerFoldRanges(s).length,3);
 for(const sample of ['```\n:PEOPLE:\nText\n:END:\n```','> :PEOPLE:\n> Text\n> :END:','<!--\n:PEOPLE:\nText\n:END:\n-->','- Example\n  :PEOPLE:\n  Text\n  :END:','    :PEOPLE:\n    Text\n    :END:']){
  assert.equal(drawerFoldRanges(state('# H\n\n'+sample)).length,0,sample);
 }
 for(const sample of [':PEOPLE:\nMissing',':PEOPLE:\n:INNER:\nText\n:END:\n:END:',':PEOPLE:\n# Other\n:END:'])assert.equal(drawerFoldRanges(state('# H\n'+sample)).length,0,sample);
});

test('Each H1-H6 supports empty insertion and full forward/reverse selection with atomic undo/redo',()=>{
 for(let level=1;level<=6;level++)for(const reverse of [false,true]){
  const doc='#'.repeat(level)+' Heading :TAG:\nAlpha\nBeta\nTail',from=doc.indexOf('Alpha'),to=doc.indexOf('\nTail');
  const view=fixture(doc,{anchor:reverse?to:from,head:reverse?from:to}),before=view.state.selection,p=planDrawer(view.state,'people_2');
  assert.ok(p.spec);view.dispatch(p.spec);view.dispatch({selection:view.state.selection,userEvent:'select.drawer'});
  const after=view.state.doc.toString(),sel=view.state.selection;assert.ok(after.includes(':PEOPLE_2:\nAlpha\nBeta\n:END:\nTail'));assert.equal(view.state.sliceDoc(sel.main.from,sel.main.to),'Alpha\nBeta');assert.equal(sel.main.anchor>sel.main.head,reverse);
  assert.equal(undoDepth(view.state),1);undo(view);assert.equal(view.state.doc.toString(),doc);assert.ok(view.state.selection.eq(before));redo(view);assert.equal(view.state.doc.toString(),after);assert.ok(view.state.selection.eq(sel));
  const empty=fixture(doc,{anchor:from+2}),q=planDrawer(empty.state,'notes');empty.dispatch(q.spec);
  assert.ok(empty.state.doc.toString().includes(':NOTES:\n\n:END:\nAlpha'));assert.equal(empty.state.doc.lineAt(empty.state.selection.main.head).text,'');
 }
});

test('Wrapping reuses line endings at line.to, next.from and EOF without changing outside text',()=>{
 for(const tail of ['\nTail',''])for(const includeNewline of [false,true]){
  const doc='# H\nAlpha\nBeta'+tail,from=doc.indexOf('Alpha'),to=doc.indexOf('Beta')+4+(includeNewline&&tail?1:0);
  const view=fixture(doc,{anchor:from,head:to}),p=planDrawer(view.state,'notes');assert.ok(p.spec);view.dispatch(p.spec);
  assert.equal(view.state.doc.toString(),'# H\n:NOTES:\nAlpha\nBeta\n:END:'+tail);
 }
});

test('Drawer refuses reserved/invalid names, partial selections and unsafe source regions',()=>{
 const doc='# H\nAlpha\nBeta',s=state(doc,{anchor:4});
 for(const name of ['END','logbook','PROPERTIES','Bad name','1bad','Äpfel','A-B',''])assert.ok(planDrawer(s,name).message,name);
 assert.ok(planDrawer(state(doc,{anchor:5,head:8}),'OK').message);
 for(const [doc,needle] of [['# H\n:LOGBOOK:\nOld\n:END:','Old'],['# H\nSCHEDULED: <2026-11-16 Mo>','SCHEDULED'],['# H\n```\nCode\n```','Code'],['# H\n:BAD:\nUnclosed','Unclosed'],['# H\n- Item','Item']])assert.ok(drawerContext(state(doc,{anchor:doc.indexOf(needle)})).message,doc);
 assert.ok(drawerContext(state('# H\nText',{anchor:2})).message);
 const ro=EditorState.create({doc,extensions:[markdown(),EditorState.readOnly.of(true)]});assert.ok(planDrawer(ro,'OK').message);
});

test('Free drawers fold at load and heading reopen, Tab targets only marker; properties remain unfurled',()=>{
 const doc='# H\n:PEOPLE:\nAlice\n:END:\n:PROPERTIES:\n:X: Y\n:END:\nBody';const v=fixture(doc);
 applyStartupVisibility(v);assert.equal(foldedRanges(v.state).size,1);
 v.dispatch({selection:{anchor:doc.indexOf(':PEOPLE:')}});assert.equal(toggleDrawer(v),true);assert.equal(foldedRanges(v.state).size,0);toggleDrawer(v);
 v.dispatch({selection:{anchor:doc.indexOf(':PROPERTIES:')}});assert.equal(toggleDrawer(v),false);
 v.dispatch({selection:{anchor:2}});cycleOrgVisibility(v);cycleOrgVisibility(v);assert.ok(foldedRanges(v.state).size);
});

test('Heading gutter cycle ignores independent drawer folds but preserves them when reopening',()=>{
 const v=fixture('# H\nIntro\n:PEOPLE:\nAlice\n:END:\nTail');applyStartupVisibility(v);
 const heading=headingSections(v.state)[0],drawer=drawerFoldRanges(v.state)[0];
 const has=r=>{let found=false;foldedRanges(v.state).between(r.from,r.to,(from,to)=>{if(from===r.from&&to===r.to)found=true;});return found;};
 assert.equal(has(heading.range),false);assert.equal(has(drawer),true);
 cycleContext(v,()=>{},0);assert.equal(has(heading.range),true);
 cycleContext(v,()=>{},0);assert.equal(has(heading.range),false);assert.equal(has(drawer),true);
});

test('Drawer placeholder and gutter position adapters target drawer while editor cursor is elsewhere',()=>{
 const doc='# H\nIntro\n:PEOPLE:\nAlice\n:END:\nTail',v=fixture(doc,{anchor:2});applyStartupVisibility(v);
 const pos=doc.indexOf(':PEOPLE:'),heading=headingSections(v.state)[0];
 revealFoldAt(v,()=>{},pos);assert.equal(foldedRanges(v.state).size,0);assert.equal(v.state.selection.main.head,2);
 cycleFoldAt(v,()=>{},pos);assert.equal(foldedRanges(v.state).size,1);
 let closedHeading=false;foldedRanges(v.state).between(heading.range.from,heading.range.to,(from,to)=>{if(from===heading.range.from&&to===heading.range.to)closedHeading=true;});assert.equal(closedHeading,false);
 v.dispatch({selection:{anchor:doc.indexOf('Alice')}});revealFoldAt(v,()=>{},pos);cycleFoldAt(v,()=>{},pos);assert.equal(v.state.selection.main.head,pos);
});

test('Definitions, planning and checklists inside free drawer are inert',()=>{
 const doc='# H\n:REFERENCE:\n#+SEQ_TODO: BROKEN\n#+TAGS: BROKEN(1)\n#+STARTUP: overview\nSCHEDULED: <2026-11-16 Mo>\n- [ ] Example\n:END:\nBody';const s=state(doc,{anchor:2});
 assert.equal(readTodoRules(s).message,undefined);assert.equal(readTagRules(s).message,undefined);assert.equal(readStartupVisibility(s).mode,null);
 assert.equal(Object.keys(planningContext(s).entries??{}).length,0);assert.equal(readChecklists(s).items.length,0);
});

test('Controller opening/cancel is inert; stale state refused and valid commit uses uppercase name',()=>{
 const v=fixture('# H\nBody',{anchor:4});let options,context={hasDocument:true};const ctl=createDrawerController({view:v,panel:{openDrawer:o=>{options=o;return true;}},getContext:()=>context});
 ctl.open();const before=v.state;assert.equal(undoDepth(before),0);v.dispatch({selection:{anchor:5}});assert.equal(options.choose('People',{state:before}),false);
 ctl.open();assert.equal(options.choose('People',{state:v.state}),true);assert.match(v.state.doc.toString(),/:PEOPLE:/);
 context.busy=true;assert.equal(ctl.open(),false);
});

test('Name form Enter/mouse commits and Escape cancels; IME does not commit',()=>{
 class El{constructor(){this.children=[];this.handlers={};}append(...els){this.children.push(...els);}setAttribute(){}addEventListener(t,f){this.handlers[t]=f;}focus(){}remove(){}}
 const doc={createElement:()=>new El()};let commits=[],cancel=0;const f=createDrawerForm({document:doc,commit:v=>commits.push(v),cancel:()=>cancel++});f.root.children[0].children[0].value='People';
 const key=(key,extra={})=>f.root.handlers.keydown({key,target:f.root,stopPropagation(){},preventDefault(){},...extra});key('Enter',{isComposing:true});assert.equal(commits.length,0);key('Enter');key('Escape');assert.deepEqual(commits,['People']);assert.equal(cancel,1);
});

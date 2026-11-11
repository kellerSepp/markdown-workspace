import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges} from '@codemirror/language';
import {history,undoDepth} from '@codemirror/commands';
import {runScopeHandlers} from '@codemirror/view';
import {structureKeyboard} from './structure-keymap.mjs';
import {runListInteraction} from './list-interaction.mjs';
import {cycleOrgVisibility} from './org-folding.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
function fixture(doc,pos){
 let registry;const view={state:EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),codeFolding(),history(),structureKeyboard(()=>true,()=>{},id=>registry.execute(id),()=>true)]}),setTabFocusMode(){}};
 view.dispatch=spec=>{view.state=view.state.update(spec).state;};
 registry=createCommandRegistry(commandDefinitions({'list.fold':()=>runListInteraction(view,'fold'),'fold.org-local-cycle':()=>cycleOrgVisibility(view)}),()=>({state:view.state,hasDocument:true,busy:false}));
 return view;
}
const ranges=view=>{const found=[];foldedRanges(view.state).between(0,view.state.doc.length,(from,to)=>found.push({from,to}));return found;};
const tab=view=>runScopeHandlers(view,{key:'Tab',keyCode:9,shiftKey:false,ctrlKey:false,altKey:false,metaKey:false},'editor');
test('Default HTML enables Org Tab; real registry routes heading folding without changing text/history',async()=>{
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8');assert.match(html,/id="orgTab"[^>]*checked/);
 for(let level=1;level<=6;level++){
  const doc='#'.repeat(level)+' Heading\nBody',view=fixture(doc,level+1),selection=view.state.selection;
  assert.equal(tab(view),true);assert.equal(ranges(view).length,1);
  assert.equal(tab(view),true);assert.equal(ranges(view).length,0);
  assert.equal(view.state.doc.toString(),doc);assert.ok(view.state.selection.eq(selection));assert.equal(undoDepth(view.state),0);
 }
});
test('List Tab toggles entire actual item content including paragraphs and children, excluding siblings',()=>{
 for(const marker of ['-','1.','- [ ]']){
  const pad=marker==='1.'?'   ':'  ';
  const doc=marker+' Parent\n\n'+pad+'Own paragraph\n\n'+pad+'- Child\n'+pad+'  - Grandchild\n\n'+pad+'Tail\n\n- Sibling';
  const view=fixture(doc,marker.length+1),selection=view.state.selection;
  assert.equal(tab(view),true);const [range]=ranges(view);assert.ok(range);assert.equal(range.from,view.state.doc.line(1).to);assert.ok(range.to<doc.indexOf('- Sibling'));
  const hidden=doc.slice(range.from,range.to);assert.match(hidden,/Own paragraph/);assert.match(hidden,/Grandchild/);assert.match(hidden,/Tail/);
  assert.equal(tab(view),true);assert.equal(ranges(view).length,0);assert.equal(view.state.doc.toString(),doc);assert.ok(view.state.selection.eq(selection));assert.equal(undoDepth(view.state),0);
 }
});
test('Empty and leaf list points consume Tab without indentation or undo; selection and focus escape remain protected',()=>{
 for(const doc of ['-','- ','- [ ] ','- Leaf','- Earlier\n- ']){
  const view=fixture(doc,doc.length);assert.equal(tab(view),true);assert.equal(view.state.doc.toString(),doc);assert.equal(undoDepth(view.state),0);
 }
 const view=fixture('- Parent\n  - Child',3);view.dispatch({selection:{anchor:2,head:4}});assert.equal(tab(view),false);
 view.dispatch({selection:{anchor:3}});runScopeHandlers(view,{key:'Escape',keyCode:27},'editor');assert.equal(tab(view),false);assert.equal(ranges(view).length,0);
});

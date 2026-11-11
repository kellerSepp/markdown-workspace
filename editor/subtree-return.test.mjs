import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {codeFolding,foldEffect,foldedRanges} from '@codemirror/language';
import {planSubtreeReturn,runSubtreeReturn} from './subtree-return.mjs';
import {handleOrgShortcut} from './structure-keymap.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
const make=(doc,pos,extra=[])=>EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),history(),codeFolding(),...extra]});
function check(input,expected){
 const pos=input.indexOf('|'),doc=input.replace('|',''),anchor=expected.indexOf('|'),view={state:make(doc,pos)};
 view.dispatch=spec=>{view.state=spec.startState?spec.state:view.state.update(spec).state;};
 assert.equal(runSubtreeReturn(view),true,input);assert.equal(view.state.doc.toString(),expected.replace('|',''));
 assert.equal(view.state.selection.main.head,anchor);assert.equal(undoDepth(view.state),1);
 assert.equal(undo(view),true);assert.equal(view.state.doc.toString(),doc);assert.equal(view.state.selection.main.head,pos);
 assert.equal(redo(view),true);assert.equal(view.state.selection.main.head,anchor);
 view.dispatch({changes:{from:anchor,insert:'New title'}});assert.equal(view.state.doc.toString(),expected.replace('|','New title'));
 return view;
}
test('Ctrl Enter preserves entire H1–H6 subtree and inserts sibling before same/higher heading with correct cursor/history',()=>{
 for(let level=1;level<=6;level++){
  const m='#'.repeat(level),children=level<6?'\n'+m+'# Child\nChild body':'';
  const body='\nText\n- Item\n  - Nested'+children;
  check(m+' |Parent'+body+'\n\n'+m+' Next',m+' Parent'+body+'\n\n'+m+' |\n\n'+m+' Next');
  check(m+' Parent\nBo|dy',m+' Parent\nBody\n\n'+m+' |');
  check(m+' Parent\n- It|em',m+' Parent\n- Item\n\n'+m+' |');
  check(m+' Parent|\n',m+' Parent\n\n'+m+' |');
 }
 check('## Parent\n### Chi|ld\nText\n## Next','## Parent\n### Child\nText\n\n### |\n\n## Next');
 check('  ## Pa|rent\nText\n\n  ## Next','  ## Parent\nText\n\n  ## |\n\n  ## Next');
 check('# TODO Pa|rent\nText','# TODO Parent\nText\n\n# |');
});
test('Ctrl Enter guards unsupported contexts and actual Registry protects busy/missing document',()=>{
 for(const input of ['Te|xt','Title|\n===','# A\n```\nco|de\n```','# A\n\n    co|de','# A\n> qu|ote','---\nx: |1\n---\n# A']){
  assert.ok(planSubtreeReturn(make(input.replace('|',''),input.indexOf('|'))).message,input);
 }
 const state=make('# A',2);assert.ok(planSubtreeReturn(make('# A',2,[EditorState.readOnly.of(true)])).message);
 assert.ok(planSubtreeReturn(state.update({selection:{anchor:0,head:2}}).state).message);
 const context={busy:true,hasDocument:true,state},calls=[];
 const registry=createCommandRegistry(commandDefinitions({'structure.subtree-return':()=>calls.push('run')}),()=>context);
 assert.equal(registry.execute('structure.subtree-return'),false);context.busy=false;context.hasDocument=false;assert.equal(registry.execute('structure.subtree-return'),false);assert.deepEqual(calls,[]);
});
test('Ctrl Enter router executes once only inside focused editor with exact modifiers',()=>{
 const view={hasFocus:true,state:make('# A',2)},calls=[];
 const send=patch=>{const e={key:'Enter',ctrlKey:true,preventDefault(){this.prevented=true;},...patch};handleOrgShortcut(e,view,id=>calls.push(id));return e;};
 assert.equal(send({}).prevented,true);assert.deepEqual(calls,['structure.subtree-return']);send({repeat:true});assert.equal(calls.length,1);
 for(const patch of [{shiftKey:true},{altKey:true},{metaKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}])assert.equal(send(patch).prevented,undefined);
 view.hasFocus=false;assert.equal(send({}).prevented,undefined);
});
test('Ctrl Enter from collapsed heading makes new title visible without inserting into hidden subtree',()=>{
 const view={state:make('## Parent\nBody\n### Child\nMore',3)};view.dispatch=spec=>{view.state=view.state.update(spec).state;};
 view.dispatch({effects:foldEffect.of({from:9,to:view.state.doc.length})});
 assert.equal(runSubtreeReturn(view),true);const pos=view.state.selection.main.head;
 assert.equal(view.state.doc.sliceString(pos-3,pos),'## ');
 foldedRanges(view.state).between(0,view.state.doc.length,(from,to)=>assert.ok(!(from<pos&&pos<to)));
});

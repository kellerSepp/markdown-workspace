import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {todoRules} from './todo.mjs';
import {planMetaReturn,runMetaReturn} from './meta-return.mjs';
import {handleOrgShortcut} from './structure-keymap.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
const make=(doc,pos,extra=[])=>EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),history(),todoRules,...extra]});
function check(input,expected){
 const pos=input.indexOf('|'),doc=input.replace('|',''),anchor=expected.indexOf('|');
 const view={state:make(doc,pos)};view.dispatch=spec=>{view.state=spec.startState?spec.state:view.state.update(spec).state;};
 assert.equal(runMetaReturn(view),true,input);
 assert.equal(view.state.doc.toString(),expected.replace('|',''),input);
 assert.equal(view.state.selection.main.head,anchor,input);
 assert.equal(undoDepth(view.state),1);assert.equal(undo(view),true);assert.equal(view.state.doc.toString(),doc);
 assert.equal(redo(view),true);assert.equal(view.state.doc.toString(),expected.replace('|',''));
}
test('Meta Return splits H1–H6, preserves TODO and inserts before headings with atomic history',()=>{
 for(let level=1;level<=6;level++){
  const m='#'.repeat(level);
  check(m+' TODO Brot |essen',m+' TODO Brot\n'+m+' |essen');
  check('|'+m+' Title',m+' |\n'+m+' Title');
  check(m+' Title|',m+' Title\n'+m+' |');
  check(m+' |',m+'\n'+m+' |');
  check(m+' Title\nhallo text|',m+' Title\nhallo text\n'+m+' |');
 }
 check('hallo text|','hallo text\n# |');check('|hallo text','# |hallo text');
 check('hallo |text','hallo\n# |text');check('|','# |');
 check('- Brot|','- Brot\n- |');
 check('## Äpfel 👋 |essen','## Äpfel 👋\n## |essen');
});
test('Real registry rechecks busy, missing document, readonly and selection before dispatch',()=>{
 const view={state:make('hello',5)};view.dispatch=spec=>{view.state=view.state.update(spec).state;};
 const context={busy:false,hasDocument:true};
 const registry=createCommandRegistry(commandDefinitions({'structure.meta-return':()=>runMetaReturn(view)}),()=>({...context,state:view.state}));
 for(const key of ['busy','hasDocument']){
  context[key]=key==='busy';const before=view.state;
  assert.equal(registry.execute('structure.meta-return'),false);assert.equal(view.state,before);
  context[key]=key!=='busy';
 }
 view.state=make('hello',5,[EditorState.readOnly.of(true)]);assert.equal(registry.execute('structure.meta-return'),false);
 view.state=make('hello',5).update({selection:{anchor:1,head:3}}).state;assert.equal(registry.execute('structure.meta-return'),false);
 view.state=make('hello',5);assert.equal(registry.execute('structure.meta-return'),true);assert.equal(view.state.doc.toString(),'hello\n# ');
 const unicode=make('a👋b',2);assert.ok(planMetaReturn(unicode).message);
});
test('Meta Return refuses unsafe syntax, readonly, selections and preserves exact input',()=>{
 for(const input of ['## TO|DO Brot','## [Br|ot](url)','## **Br|ot**','```\n# A|\n```','    co|de','> # A|','Title|\n====','## A| ##','---\nname: x|\n---','| A | B |\n| --- | --- |']){
  const pos=input.indexOf('|'),doc=input.replace('|',''),state=make(doc,pos);
  assert.ok(planMetaReturn(state).message,input);
 }
 assert.ok(planMetaReturn(make('# Title',4,[EditorState.readOnly.of(true)])).message);
 assert.ok(planMetaReturn(make('# Title',4).update({selection:{anchor:2,head:5}}).state).message);
});
test('Editor Alt Enter routes once and guards modifiers, IME, repeat and focus',()=>{
 const view={hasFocus:true,state:make('# Title',7)},calls=[];
 const send=patch=>{const e={key:'Enter',altKey:true,preventDefault(){this.prevented=true;},...patch};handleOrgShortcut(e,view,id=>calls.push(id));return e;};
 assert.equal(send({}).prevented,true);assert.deepEqual(calls,['structure.meta-return']);
 send({repeat:true});assert.equal(calls.length,1);
 for(const patch of [{ctrlKey:true},{metaKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}])assert.equal(send(patch).prevented,undefined);
 view.hasFocus=false;assert.equal(send({}).prevented,undefined);
});

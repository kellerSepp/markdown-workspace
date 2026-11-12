import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges,foldEffect} from '@codemirror/language';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {ViewPlugin,runScopeHandlers} from '@codemirror/view';
import {planListInteraction,runListInteraction,listGlobalContinuation} from './list-interaction.mjs';
import {structureKeyboard} from './structure-keymap.mjs';
const pluginFacet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
function fixture(doc,pos=doc.length){let state;const view={calls:0,hasFocus:true,get state(){return state;},dispatch(spec){state=state.update(spec).state;},setTabFocusMode(){}};state=EditorState.create({doc,selection:{anchor:pos},extensions:[markdown(),codeFolding(),history(),structureKeyboard(()=>true,()=>{},id=>{view.calls++;return runListInteraction(view,id.slice(5));})]});return view;}
const ranges=v=>{const result=[];foldedRanges(v.state).between(0,v.state.doc.length,(from,to)=>result.push({from,to}));return result;};

test('List insertion uses the editor dialect with unrelated trailing tables',()=>{
  const tail='\n\nText danach\n\n| A | B |\n| --- | --- |\n# cell | value\n\n# Heading\n\n```\ncode\n```';
  for(const id of ['newline','insert','insert-checkbox']){
    const doc='- '+tail;
    let state=EditorState.create({doc,selection:{anchor:2},extensions:[markdown({base:markdownLanguage}),history()]});
    const view={get state(){return state;},dispatch(spec){state=state.update(spec).state;}};
    roundtrip(view,id,'- \n'+(id==='newline'?'  ':id==='insert'?'- ':'- [ ] ')+tail);
  }
});
function key(v,key,shiftKey=false,extra={}){const e={type:'keydown',key,keyCode:{Tab:9,Enter:13}[key],altKey:key==='Enter',shiftKey,ctrlKey:false,metaKey:false,preventDefault(){this.defaultPrevented=true;},...extra};if(key==='Tab'||key==='Escape')return runScopeHandlers(v,e,'editor');for(const {plugin} of v.state.facet(pluginFacet))if(plugin.domEventHandlers?.keydown?.call({},e,v)){e.preventDefault();break;}return e.defaultPrevented;}
function roundtrip(v,id,expected){const doc=v.state.doc.toString(),pos=v.state.selection.main.head;assert.equal(runListInteraction(v,id),true);assert.equal(v.state.doc.toString(),expected);const after=v.state.selection.main.head;assert.equal(undoDepth(v.state),1);assert.equal(undo(v),true);assert.equal(v.state.doc.toString(),doc);assert.equal(v.state.selection.main.head,pos);assert.equal(redo(v),true);assert.equal(v.state.doc.toString(),expected);assert.equal(v.state.selection.main.head,after);}

test('List Tab: filled leaf is no-op at every column, with keyboard consuming Tab',()=>{for(const doc of ['- Alpha','- Alpha\n- Next','  1. Alpha\n  2. Next']){const line=EditorState.create({doc}).doc.line(1);for(let p=line.from;p<=line.to;p++){const v=fixture(doc,p);assert.equal(key(v,'Tab'),true);assert.equal(v.state.doc.toString(),doc);assert.equal(v.state.selection.main.head,p);assert.equal(undoDepth(v.state),0);}}});
test('List Tab: folds only descendants with effects, keeps text/caret/history',()=>{const doc='- Alpha\n  continuation\n  - Child\n    - Deep\n- Next',v=fixture(doc,4);assert.equal(key(v,'Tab'),true);assert.equal(ranges(v).length,1);assert.equal(v.state.doc.toString(),doc);assert.equal(v.state.selection.main.head,4);assert.equal(undoDepth(v.state),0);assert.equal(key(v,'Tab'),true);assert.deepEqual(ranges(v),[]);});
test('Empty list Tab: initial indent, outdent and return, reverse, five levels, cursor/history',()=>{for(let depth=0;depth<5;depth++){const indent='  '.repeat(depth),doc=Array.from({length:depth},(_,i)=>'  '.repeat(i)+'- Parent'+i+'\n').join('')+indent+'- Previous\n'+indent+'- ',v=fixture(doc);const initial=v.state.selection.main.head;assert.equal(key(v,'Tab'),true);assert.equal(v.state.doc.toString(),doc.slice(0,-indent.length-2)+indent+'  - ');assert.equal(v.state.selection.main.head,initial+2);assert.equal(key(v,'Tab',true),true);assert.equal(v.state.doc.toString(),doc);assert.equal(undo(v),true);assert.equal(undo(v),true);assert.equal(v.state.doc.toString(),doc);}});
test('Empty list indentation is directed, planning pure, boundaries safe',()=>{const doc='- P\n  - Previous\n  - ',v=fixture(doc);for(let n=0;n<4;n++)assert.ok(planListInteraction(v.state,'tab').spec);assert.equal(key(v,'Tab'),true);assert.ok(v.state.doc.toString().endsWith('    - '));const after=v.state.doc.toString();assert.equal(key(v,'Tab'),true);assert.equal(v.state.doc.toString(),after);assert.equal(key(v,'Tab',true),true);assert.equal(v.state.doc.toString(),doc);});
test('Shift Tab list global visibility closes then opens stages with and without headings',()=>{for(const doc of ['- A\n  - B\n    - C\n- D','# Heading\n- A\n  - B\n    - C\n# Next\nText']){const v=fixture(doc,doc.indexOf('- A')+2);assert.equal(key(v,'Tab',true),true);assert.ok(ranges(v).length);let opened=false;for(let i=0;i<5;i++){assert.equal(key(v,'Tab',true),true);if(!ranges(v).length){opened=true;break;}}assert.equal(opened,true);assert.equal(v.state.doc.toString(),doc);assert.equal(undoDepth(v.state),0);}});
test('Alt Enter: before body, middle, EOL/EOF all columns preserve text and atomic history',()=>{for(const tail of ['', '\n- Next']){const doc='- Alpha'+tail;for(let p=0;p<=7;p++){const v=fixture(doc,p);const before=p<=2,expected=before?'- \n- Alpha'+tail:p===7?'- Alpha\n- '+tail:doc.slice(0,p)+'\n- '+doc.slice(p);roundtrip(v,'insert',expected);}}});
test('Insert nested/multiline at EOL retains subtree and continuation',()=>{const doc='- Root\n  - Alpha\n    continuation\n    - Child\n  - Next',v=fixture(doc,doc.indexOf('Alpha')+5);roundtrip(v,'insert','- Root\n  - Alpha\n    continuation\n    - Child\n  - \n  - Next');});
test('Ordered insert renumbers including 9/10 width continuations',()=>{roundtrip(fixture('9. Alpha\n10. Beta\n    continuation',8),'insert','9. Alpha\n10. \n11. Beta\n    continuation');roundtrip(fixture('9. Alpha\n   continuation',0),'insert','9. \n10. Alpha\n    continuation');});
test('Checkbox insert is unchecked dash item, existing checkbox content preserved',()=>{for(const doc of ['- [x] Alpha','+ Alpha','1. Alpha']){const v=fixture(doc);assert.equal(key(v,'Enter',true),true);assert.equal(v.state.doc.toString(),doc+'\n- [ ] ');assert.equal(undo(v),true);assert.equal(v.state.doc.toString(),doc);}});
test('Alt Enter DOM routing guards and unsafe contexts refuse without data/history loss',()=>{for(const patch of [{ctrlKey:true},{metaKey:true},{isComposing:true},{getModifierState:()=>true}]){const v=fixture('- Alpha');key(v,'Enter',false,patch);assert.equal(v.calls,0);}for(const [doc,pos] of [['Text',2],['```\n- Fake\n```',8],['---\n- Fake\n---',8],['- Alpha\n  continuation',4],['- **Bold**',5]]){const v=fixture(doc,pos);assert.equal(runListInteraction(v,'insert'),false);assert.equal(v.state.doc.toString(),doc);assert.equal(undoDepth(v.state),0);}});
test('Empty item: marker styles, number widths, whitespace caret and hierarchy refusal',()=>{for(const marker of ['-','+','*','9.','10.']){const doc=marker+' Previous\n'+marker+' ',v=fixture(doc);roundtrip(v,'tab',marker+' Previous\n'+' '.repeat(marker.length+1)+marker+' ');}const doc='- Root\n  - Previous\n  - ',v=fixture(doc,doc.lastIndexOf('  - ')+1);assert.equal(key(v,'Tab'),true);assert.equal(v.state.selection.main.head,doc.lastIndexOf('  - ')+1);const unsafe='- Root\n  - \n  - Next',u=fixture(unsafe,unsafe.indexOf('  - ')+4);assert.equal(runListInteraction(u,'shift-tab'),false);assert.equal(u.state.doc.toString(),unsafe);});
test('Global list continuation survives folding cursor relocation and expires on selection/edit/Escape/blur',()=>{const doc='# H\n- A\n  - B\n## Child\nText';for(const action of ['selection','edit','Escape','blur']){const v=fixture(doc,doc.indexOf('- A')+2);assert.equal(key(v,'Tab',true),true);assert.equal(listGlobalContinuation(v.state),true);if(action==='selection')v.dispatch({selection:{anchor:v.state.selection.main.head}});if(action==='edit')v.dispatch({changes:{from:v.state.doc.length,insert:'!'}});if(action==='Escape')key(v,'Escape');if(action==='blur')for(const {plugin} of v.state.facet(pluginFacet))plugin.domEventHandlers?.blur?.call({}, {},v);assert.equal(listGlobalContinuation(v.state),false);}});
test('Insert empty points and Unicode split are safe and atomic',()=>{for(const pos of [0,1,2])roundtrip(fixture('- ',pos),'insert','- \n- ');for(const pos of [2,4,5]){const doc='- \u{1f600}x',v=fixture(doc,pos);roundtrip(v,'insert',pos===2?'- \n'+doc:doc.slice(0,pos)+'\n- '+doc.slice(pos));}const v=fixture('- \u{1f600}x',3);assert.equal(runListInteraction(v,'insert'),false);assert.equal(v.state.doc.toString(),'- \u{1f600}x');});

test('Local children folding excludes parent trailing paragraphs, global list ranges too',()=>{
  const doc='- Parent\n  - Child\n\n  own tail\n- Next',to=doc.indexOf('Child')+5,from=doc.indexOf('  - Child')-1;
  for(const global of [false,true]){
    const v=fixture(doc,3);assert.equal(key(v,'Tab',global),true);
    assert.deepEqual(ranges(v),[{from,to}]);assert.equal(v.state.doc.toString(),doc);assert.equal(undoDepth(v.state),0);
    assert.equal(key(v,'Tab',global),true);assert.deepEqual(ranges(v),[]);
  }
});
test('Local children folding preserves parent own code folds and multiple separate child lists',()=>{
  const doc='- Parent\n  ```\n  own code\n  ```\n  - Child\n\n  own tail\n\n  1. Other\n- Next',v=fixture(doc,3);
  const code={from:doc.indexOf('```')+3,to:doc.indexOf('  ```',doc.indexOf('own code'))+5};
  v.dispatch({effects:foldEffect.of(code)});
  const children=[{from:doc.indexOf('  - Child')-1,to:doc.indexOf('Child')+5},{from:doc.indexOf('  1. Other')-1,to:doc.indexOf('Other')+5}];
  assert.deepEqual(ranges(v),[code]);assert.equal(key(v,'Tab'),true);
  assert.deepEqual(ranges(v),[code,...children]);assert.equal(key(v,'Tab'),true);assert.deepEqual(ranges(v),[code]);
  assert.equal(v.state.doc.toString(),doc);assert.equal(undoDepth(v.state),0);
});


test('Return continues a list item, Alt Return creates sibling; repeated blank continuation works',()=>{
  for(const marker of ['-', '+', '*', '9.', '10.', '- [x]']){
    const doc=marker+' Alpha',v=fixture(doc),pad=' '.repeat(/^\d/.test(marker)?marker.length+1:2);
    assert.equal(key(v,'Enter',false,{altKey:false}),true);
    assert.equal(v.state.doc.toString(),doc+'\n'+pad);
    assert.equal(key(v,'Enter',false,{altKey:false}),true);
    assert.equal(v.state.doc.toString(),doc+'\n'+pad+'\n'+pad);
    assert.equal(key(v,'Enter'),true);
    assert.equal(v.state.doc.toString(),doc+'\n'+pad+'\n'+pad+'\n'+(/^\d/.test(marker)?(Number(marker.slice(0,-1))+1)+'. ':marker==='- [x]'?'- ':' '+marker+' ').trimStart());
  }
});
test('Return continuation split is atomic and stays in item, nested and Unicode safe',()=>{
  roundtrip(fixture('- Alpha',4),'newline','- Al\n  pha');
  roundtrip(fixture('- Root\n  - Alpha'),'newline','- Root\n  - Alpha\n    ');
  for(const [doc,pos] of [['- Alpha',0],['- Alpha',1],['- \u{1f600}x',3],['```\n- A\n```',7],['---\n- A\n---',7]]){
    const v=fixture(doc,pos);assert.equal(runListInteraction(v,'newline'),false);assert.equal(v.state.doc.toString(),doc);
  }
});

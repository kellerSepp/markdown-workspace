import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {EditorView,ViewPlugin,keymap} from '@codemirror/view';
import {history,historyKeymap,defaultKeymap,undo,redo,undoDepth} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {createPrefixRouter} from '../editor/prefix-router.mjs';
import {createEmacsEditing} from '../editor/emacs-editing.mjs';
import {withoutYankRedo} from '../editor/emacs-policy.mjs';
import {structureKeyboard,withoutOrgArrowConflicts} from '../editor/structure-keymap.mjs';
import {markdownFolding,guardedFold,stagedUnfold} from '../editor/folding.mjs';
import {createCommandRegistry} from '../editor/command-registry.mjs';
import {commandDefinitions} from '../editor/commands.mjs';
const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
let checks=0;
for(const doc of ['# Heading\nbody\n## Child\ntext','- item\n  - child'])for(const org of [false,true]){
 let state,copies=0;const calls=[],listeners=new Set();
 const view={hasFocus:true,focus(){},setTabFocusMode(value){this.tabFocus=value;},get state(){return state;},dom:{ownerDocument:{defaultView:{addEventListener(type,fn){listeners.add(fn);},removeEventListener(type,fn){listeners.delete(fn);}}}},dispatch(spec){const tr=state.update(spec);state=tr.state;for(const fn of state.facet(EditorView.updateListener))fn({state,docChanged:tr.docChanged,selectionSet:tr.selection!==undefined,transactions:[tr]});}};
 const actions={'fold.collapse':()=>guardedFold(view),'fold.reveal':()=>stagedUnfold(view),'fold.open':()=>stagedUnfold(view,undefined,true)};
 const registry=createCommandRegistry(commandDefinitions(Object.fromEntries(Object.entries(actions).map(([id,fn])=>[id,()=>{calls.push(id);return fn();}]))),()=>({state,busy:false,hasDocument:true}));
 const prefix=createPrefixRouter({registry}),emacs=createEmacsEditing();
 state=EditorState.create({doc,selection:{anchor:2},extensions:[prefix.extension(),emacs.extension(()=>assert.fail('unexpected edit command')),history(),markdown(),markdownFolding(),structureKeyboard(()=>true,()=>{},()=>assert.fail('unexpected structure'),()=>org),keymap.of(withoutYankRedo([...withoutOrgArrowConflicts(defaultKeymap),...historyKeymap])),EditorView.domEventHandlers({keydown:e=>{if(e.ctrlKey&&e.key==='c'){copies++;return true;}return false;}})]});
 const send=(key,patch={})=>{const e={key,type:'keydown',ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,preventDefault(){this.defaultPrevented=true;},...patch};for(const {plugin} of state.facet(facet)){if(plugin.domEventHandlers?.[e.type]?.call({},e,view)||e.defaultPrevented)break;}return e;};
 for(const key of ['1','2','3']){send('c',{ctrlKey:true});send('c',{type:'keyup'});send(key);}
 assert.deepEqual(calls,['fold.collapse','fold.reveal','fold.open']);assert.equal(copies,0);assert.equal(state.doc.toString(),doc);assert.equal(undoDepth(state),0);checks+=4;
 send('c',{ctrlKey:true});send('Escape');for(const shiftKey of [true,false])assert.equal(send('Tab',{shiftKey}).defaultPrevented,undefined);checks+=2;
 view.dispatch({changes:{from:state.doc.length,insert:'QA'}});const edited=state.doc.toString();send('c',{ctrlKey:true});send('g',{ctrlKey:true});assert.equal(undo(view),true);assert.equal(state.doc.toString(),doc);assert.equal(redo(view),true);assert.equal(state.doc.toString(),edited);checks+=4;
 const lifecycle=state.facet(facet).find(p=>!p.plugin.domEventHandlers);
 for(let i=0;i<1000;i++){const instance=lifecycle.plugin.create(view);assert.equal(listeners.size,1);send('c',{ctrlKey:true});for(const fn of listeners)fn();assert.equal(prefix.active,false);instance.destroy();assert.equal(listeners.size,0);}checks+=3000;
}
console.log(JSON.stringify({checks,windowListenerLifecycleCycles:4000,modeCombinations:4}));

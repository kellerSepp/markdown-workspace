import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {codeFolding,foldedRanges,foldEffect} from '@codemirror/language';
import {history,undoDepth} from '@codemirror/commands';
import {prepareArchiveFocus} from './archive-focus.mjs';

class TrackedTarget extends EventTarget{
  constructor(){super();this.listeners=new Map();}
  addEventListener(type,fn){super.addEventListener(type,fn);if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn){super.removeEventListener(type,fn);this.listeners.get(type)?.delete(fn);}
  get count(){return [...this.listeners.values()].reduce((n,s)=>n+s.size,0);}
}
function fixture(text){
  const doc=new TrackedTarget(),win=new TrackedTarget(),editor={},outside={},vault={};
  Object.assign(doc,{body:{},documentElement:{},defaultView:win,hasFocus:()=>true});doc.activeElement=doc.body;
  const state=()=>EditorState.create({doc:text,extensions:[history(),codeFolding()]});
  let focus=0;const view={state:state(),dom:{contains:e=>e===editor},dispatch(spec){this.state=this.state.update(spec).state;},focus(){assert.equal(this.state.readOnly,false);focus++;doc.activeElement=editor;}};
  const context={vault,session:{vault,path:'synthetic.md',hasDocument:true}};
  const start=()=>prepareArchiveFocus(view,{getContext:()=>context,vault,path:'synthetic.md',document:doc});
  const move=target=>{doc.activeElement=target;const event=new Event('focusin');Object.defineProperty(event,'target',{value:target});doc.dispatchEvent(event);};
  return {doc,win,view,context,start,move,editor,outside,get focus(){return focus;}};
}

test('QA archive completion reveals nested target folds, clamps EOF/empty and leaves history unchanged',()=>{
  for(const [text,anchor] of [['# Parent\n## Next\nText',14],['Short',100],['',99],['Body',-10]]){
    const f=fixture(text),h=f.start();
    if(text.length>15)f.view.dispatch({effects:[foldEffect.of({from:3,to:text.length}),foldEffect.of({from:10,to:text.length})]});
    const original=f.view.state.doc;h.complete(original,anchor);assert.equal(f.focus,0);h.finish();
    const position=Math.max(0,Math.min(anchor,text.length));assert.equal(f.view.state.selection.main.head,position);assert.equal(f.focus,1);
    foldedRanges(f.view.state).between(0,text.length,(from,to)=>assert.ok(!(position>from&&position<to)));
    assert.equal(f.view.state.doc,original);assert.equal(undoDepth(f.view.state),0);
    assert.equal(f.doc.count+f.win.count,0);
  }
});

test('QA pending/error, foreign focus/window and source changes cannot install success cursor; listeners always detach',()=>{
  for(const kind of ['unfinished','outside-initial','outside-active','away-back','window','missing-window','vault','path','doc','readonly','missing']){
    const f=fixture('Synthetic source');if(kind==='outside-initial')f.doc.activeElement=f.outside;
    const h=f.start();assert.equal(f.doc.count+f.win.count,2);
    if(kind!=='unfinished')h.complete(f.view.state.doc,9);
    if(kind==='outside-active')f.doc.activeElement=f.outside;
    if(kind==='away-back'){f.move(f.outside);f.move(f.editor);}
    if(kind==='window')f.win.dispatchEvent(new Event('blur'));
    if(kind==='missing-window')f.doc.hasFocus=()=>false;
    if(kind==='vault')f.context.vault={};
    if(kind==='path')f.context.session.path='other.md';
    if(kind==='doc')f.view.dispatch({changes:{from:0,insert:'x'}});
    if(kind==='readonly')f.view.state=EditorState.create({doc:'Synthetic source',extensions:[codeFolding(),EditorState.readOnly.of(true)]});
    if(kind==='missing')f.context.session.hasDocument=false;
    const before=f.view.state.selection;h.finish();assert.equal(f.focus,0,kind);assert.ok(f.view.state.selection.eq(before),kind);assert.equal(f.doc.count+f.win.count,0,kind);
  }
});

test('QA 100 short success/cancel model cycles release every temporary focus listener',()=>{
 const f=fixture('Synthetic source');const start=performance.now();
 for(let n=0;n<100;n++){
   const h=f.start();if(n%2===0)h.complete(f.view.state.doc,n%f.view.state.doc.length);h.finish();
   assert.equal(f.doc.count+f.win.count,0);
 }
 assert.equal(f.focus,50);assert.equal(f.view.state.doc.toString(),'Synthetic source');
 assert.equal(undoDepth(f.view.state),0);
 // Deliberately bounded model probe; no hour-scale or memory-leak guarantee.
 assert.ok(performance.now()-start<10000);
});

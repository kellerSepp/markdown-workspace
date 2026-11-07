import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState,Transaction} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {createWorkPanel,ringPreview,completeRingSearch} from '../editor/work-panel.mjs';
import {createEmacsEditing,emacsMark} from '../editor/emacs-editing.mjs';
import {createKillRing} from '../editor/kill-ring.mjs';
import {createClipboardAdapter} from '../editor/clipboard-adapter.mjs';
import {THEMES} from '../editor/themes.mjs';
import {createPrefixRouter} from '../editor/prefix-router.mjs';
import {createCommandRegistry} from '../editor/command-registry.mjs';
import {commandDefinitions} from '../editor/commands.mjs';
const pluginFacet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
class Element{
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.value='';this.scrollTop=0;this.scrollLeft=0;this.clientHeight=90;this.offsetHeight=30;this.classList={toggle:()=>{}};}
  get offsetTop(){return Math.max(0,this.parent?.children.indexOf(this)??0)*30;}get scrollHeight(){return this.children.length*30;}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(key,value){this.attributes[key]=value;}removeAttribute(key){delete this.attributes[key];}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}removeEventListener(type,fn){this.listeners[type]=this.listeners[type]?.filter(x=>x!==fn);}
  emit(type,values={}){const event={key:'',target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...values};for(const fn of this.listeners[type]??[])fn(event);return event;}
  focus(options){this.focusOptions=options;this.ownerDocument.activeElement=this;this.ownerDocument.onFocus?.(this);}click(){this.emit('click');}scrollIntoView(){assert.fail('Panel must not scroll ancestor chain');}remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
}
function fixture({selection={anchor:1,head:0},extra=[],docText='AB'}={}){
  const doc={createElement(tag){return new Element(tag,this);},defaultView:{scrollX:40,scrollY:500,scrollTo({left,top}){this.scrollX=left;this.scrollY=top;}}},host=new Element('host',doc),editor=new Element('editor',doc),ring=createKillRing(),notices=[],context={busy:false,hasDocument:true};
  let state,panel;const controller=createEmacsEditing({ring,clipboard:createClipboardAdapter({clipboard:()=>null}),getContext:()=>context,notify:s=>notices.push(s),openChooser:()=>panel.openRing()});
  const view={hasFocus:true,scrollDOM:{scrollTop:2400,scrollLeft:130,scrollHeight:10000,clientHeight:600,scrollWidth:3000,clientWidth:700},get state(){return state;},focus(){this.hasFocus=true;doc.activeElement=editor;}};
  view.dispatch=spec=>{const previous=state,transactions=[];for(const input of Array.isArray(spec)?spec:[spec]){const tr=input instanceof Transaction?input:state.update(input);assert.equal(tr.startState,state);transactions.push(tr);state=tr.state;}for(const fn of state.facet(EditorView.updateListener))fn({state,startState:previous,docChanged:transactions.some(tr=>tr.docChanged),selectionSet:transactions.some(tr=>!!tr.selection),transactions});};
  state=EditorState.create({doc:docText,selection,extensions:[history(),controller.extension(id=>controller.run(view,id.replace('edit.emacs-',''))),extra]});
  doc.onFocus=element=>{if(element!==editor&&view.hasFocus){view.hasFocus=false;for(const {plugin} of state.facet(pluginFacet))plugin.domEventHandlers?.blur?.call({}, {},view);}};
  panel=createWorkPanel({host,view,ring,getContext:()=>context,insert:(id,target)=>controller.insertRingEntry(view,id,target),notify:s=>notices.push(s),document:doc});
  const root=host.children[0],search=root.children[1],results=root.children[3],message=root.children[4],close=root.children[0].children[1];
  return {doc,view,controller,ring,panel,host,root,search,results,message,close,notices,context};
}

// Independent checks appended to the existing DOM-model fixture (no native browser).
const {markdown,markdownLanguage}=await import('@codemirror/lang-markdown');
const {createRefileController}=await import('../editor/refile.mjs');
const {refileHistory,undoRefile,redoRefile}=await import('../editor/refile-history.mjs');
let passed=0;const latencies=[];global.gc?.();const heaps=[process.memoryUsage().heapUsed],started=performance.now();
const f=fixture({docText:'# Source\nbody Ü\n# Duplicate\none\n# Duplicate\ntwo',selection:{anchor:3},extra:[markdown({base:markdownLanguage}),refileHistory(),EditorView.updateListener.of(()=>f.panel.invalidateStale())]});
f.results.clientHeight=30;
const refile=createRefileController({view:f.view,panel:f.panel,getContext:()=>f.context});
const registry=createCommandRegistry(commandDefinitions({'structure.refile-h1':()=>refile.open(),'edit.undo':()=>{undoRefile(f.view);f.view.focus();},'edit.redo':()=>{redoRefile(f.view);f.view.focus();}}),()=>({...f.context,state:f.view.state}));
const prefix=createPrefixRouter({registry,getContext:()=>f.context,showHelp:(...a)=>f.panel.showPrefix(...a),hideHelp:()=>f.panel.close({restore:false}),moveHelp:d=>f.panel.moveSelection(d),activateHelp:()=>f.panel.activateSelection()});
// Resolve actual CodeMirror extension ordering, including existing Emacs handlers.
const resolved=EditorState.create({extensions:[prefix.extension(),refileHistory(),f.controller.extension(()=>assert.fail('Unexpected ring command'))]}).facet(pluginFacet);
const send=(type,key,patch={})=>{const e={type,key,ctrlKey:false,preventDefault(){this.defaultPrevented=true;},...patch};for(const {plugin} of resolved){if(plugin.domEventHandlers?.[type]?.call({},e,f.view)){e.preventDefault();break;}}return e;};
const start=()=>{f.view.focus();assert.ok(send('keydown','c',{ctrlKey:true}).defaultPrevented);send('keyup','c',{ctrlKey:true});assert.ok(send('keydown','w',{ctrlKey:true}).defaultPrevented);assert.ok(f.panel.isOpen);assert.equal(f.search.hidden,false);passed++;};
start();const original=f.view.state;
f.search.value='Du';f.root.emit('keydown',{key:'Tab',target:f.search});assert.ok(f.search.value.startsWith('Duplicate'));passed++;
f.search.value='';f.search.emit('input');f.root.emit('keydown',{key:'ArrowDown',target:f.search});assert.equal(f.results.children[1].attributes['aria-selected'],'true');assert.equal(f.results.scrollTop,30);passed++;
f.root.emit('keydown',{key:'ArrowUp',altKey:true,target:f.search});assert.equal(f.results.children[0].attributes['aria-selected'],'true');passed++;
f.root.emit('keydown',{key:'Enter',repeat:true,target:f.search});assert.equal(f.view.state,original);passed++;
f.root.emit('keydown',{key:'Escape',target:f.search});assert.equal(f.panel.isOpen,false);assert.equal(f.view.state,original);passed++;
f.controller.run(f.view,'mark');start();assert.equal(f.view.state.field(emacsMark).active,false);f.root.emit('keydown',{key:'g',ctrlKey:true,target:f.search});assert.equal(f.panel.isOpen,false);passed++;
for(let i=0;i<200;i++){const t=performance.now();start();const old=[...f.results.children];
 if(i%4===0){f.panel.openRing();f.panel.showPrefix([{key:'1',name:'synthetic',enabled:true}],()=>{},()=>{});f.panel.close();}
 else if(i%4===1)f.root.emit('focusout',{relatedTarget:null});
 else if(i%4===2)f.root.emit('compositionstart');
 else f.root.emit('keydown',{key:'Escape',target:f.search});
 assert.equal(f.panel.isOpen,false);assert.ok(old.every(r=>r.listeners.click.length===0&&r.listeners.mouseenter.length===0));assert.equal(f.results.children.length,0);assert.equal(undoDepth(f.view.state),0);latencies.push(performance.now()-t);passed++;
 if(i===99||i===199){global.gc?.();heaps.push(process.memoryUsage().heapUsed);}
}
start();f.root.emit('keydown',{key:'Enter',target:f.search});assert.equal(f.panel.isOpen,false);assert.equal(undoDepth(f.view.state),1);assert.match(f.view.state.doc.toString(),/# Duplicate\none\n\n## Source/);passed++;
const moved=f.view.state;
for(let i=0;i<5;i++){
 f.view.dispatch({selection:{anchor:0}});registry.execute('edit.undo');assert.ok(f.view.state.doc.eq(original.doc));assert.ok(f.view.state.selection.eq(original.selection));
 assert.equal(send('beforeinput','',{inputType:'historyRedo'}).defaultPrevented,true);assert.ok(f.view.state.doc.eq(moved.doc));assert.ok(f.view.state.selection.eq(moved.selection));
 assert.equal(send('beforeinput','',{inputType:'historyUndo'}).defaultPrevented,true);assert.ok(f.view.state.doc.eq(original.doc));assert.ok(f.view.state.selection.eq(original.selection));
 registry.execute('edit.redo');assert.ok(f.view.state.doc.eq(moved.doc));assert.ok(f.view.state.selection.eq(moved.selection));passed++;
}
f.panel.destroy();prefix.cancel();assert.ok(Object.values(f.root.listeners).every(a=>a.length===0));passed++;
latencies.sort((a,b)=>a-b);console.log(JSON.stringify({passed,cycles:200,durationMs:performance.now()-started,heapBytes:heaps,cycleMs:{median:latencies[99],p95sample:latencies[189],max:latencies.at(-1)}}));


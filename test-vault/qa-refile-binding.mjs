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
  const view={hasFocus:true,scrollDOM:{scrollTop:2400,scrollLeft:130,scrollHeight:10000,clientHeight:600,scrollWidth:3000,clientWidth:700},get state(){return state;},set state(value){state=value;},focus(){this.hasFocus=true;doc.activeElement=editor;}};
  view.dispatch=spec=>{const previous=state,transactions=[];for(const input of Array.isArray(spec)?spec:[spec]){const tr=input instanceof Transaction?input:state.update(input);assert.equal(tr.startState,state);transactions.push(tr);state=tr.state;}for(const fn of state.facet(EditorView.updateListener))fn({state,startState:previous,docChanged:transactions.some(tr=>tr.docChanged),selectionSet:transactions.some(tr=>!!tr.selection),transactions});};
  state=EditorState.create({doc:docText,selection,extensions:[history(),extra]});
  doc.onFocus=element=>{if(element!==editor&&view.hasFocus){view.hasFocus=false;for(const {plugin} of state.facet(pluginFacet))plugin.domEventHandlers?.blur?.call({}, {},view);}};
  panel=createWorkPanel({host,view,ring,getContext:()=>context,insert:(id,target)=>controller.insertRingEntry(view,id,target),notify:s=>notices.push(s),document:doc});
  const root=host.children[0],search=root.children[1],results=root.children[3],message=root.children[4],close=root.children[0].children[1];
  return {doc,view,controller,ring,panel,host,root,search,results,message,close,notices,context};
}

const {markdown}=await import('@codemirror/lang-markdown');
const {createRefileController}=await import('../editor/refile.mjs');
const {keymap}=await import('@codemirror/view');
const {StateEffect}=await import('@codemirror/state');
let cases=0;
function setup(){
 const f=fixture({docText:'# Source\nbody\n# Target',selection:{anchor:3},extra:markdown()});
 let opened=0,typed=0;const edits=[];
 const refile=createRefileController({view:f.view,panel:f.panel,getContext:()=>f.context});
 const registry=createCommandRegistry(commandDefinitions({'structure.refile-h1':()=>{opened++;return refile.open();}}),()=>({...f.context,state:f.view.state}));
 assert.equal(registry.get('structure.refile-h1').shortcut,'C-c w (Editor)');
 const prefix=createPrefixRouter({registry,getContext:()=>f.context,showHelp:(...args)=>f.panel.showPrefix(...args),hideHelp:()=>f.panel.close({restore:false})});
 f.view.dispatch({effects:StateEffect.appendConfig.of([prefix.extension(),f.controller.extension(id=>{edits.push(id);return true;}),keymap.of([{key:'w',run:view=>{typed++;view.dispatch({changes:{from:view.state.selection.main.head,insert:'w'}});return false;}}])])});
 const resolved=f.view.state.facet(pluginFacet);
 const send=(key,patch={})=>{const e={type:'keydown',key,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,preventDefault(){this.defaultPrevented=true;},...patch};for(const {plugin} of resolved)if(plugin.domEventHandlers?.[e.type]?.call({},e,f.view)){e.preventDefault();break;}return e;};
 const start=()=>send('c',{ctrlKey:true});
 const release=()=>{send('c',{type:'keyup',ctrlKey:true});send('Control',{type:'keyup'});};
 return {f,prefix,send,start,release,edits,get opened(){return opened;},get typed(){return typed;},done(){prefix.cancel();f.panel.destroy();cases++;}};
}
{
 const t=setup(),before=t.f.view.state;t.start();
 assert.match(t.f.root.children[2].textContent,/C und Strg loslassen.*1 \/ 2 \/ 3 \/ w.*Alt\+W kopiert/);
 assert.equal(t.f.search.hidden,true);t.release();assert.ok(t.send('w').defaultPrevented);
 assert.equal(t.opened,1);assert.equal(t.f.panel.isOpen,true);assert.equal(t.f.search.hidden,false);
 assert.equal(t.f.results.children.length,1);assert.match(t.f.results.children[0].textContent,/Target/);
 assert.equal(t.f.view.state,before);t.done();
}
for(const patch of [{ctrlKey:true},{altKey:true},{shiftKey:true},{metaKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true},{repeat:true}]){
 const t=setup();t.start();t.release();t.send('w',patch);assert.equal(t.opened,0);assert.equal(t.f.search.hidden,true);t.done();
}
{
 const t=setup();t.start();t.send('w');assert.equal(t.opened,0);t.done();
}
{
 const t=setup();t.send('c',{ctrlKey:true,repeat:true});t.release();t.send('w');assert.equal(t.opened,0);t.done();
}
for(const mode of ['busy','readonly','state','selection','document','missing','focus']){
 const t=setup();t.start();t.release();
 if(mode==='busy')t.f.context.busy=true;
 if(mode==='missing')t.f.context.hasDocument=false;
 if(mode==='focus')t.f.view.hasFocus=false;
 if(mode==='readonly')t.f.view.state=EditorState.create({doc:t.f.view.state.doc,extensions:[markdown(),EditorState.readOnly.of(true)]});
 if(mode==='state')t.f.view.state=EditorState.create({doc:t.f.view.state.doc,selection:{anchor:3},extensions:markdown()});
 if(mode==='selection')t.f.view.dispatch({selection:{anchor:0}});
 if(mode==='document')t.f.view.dispatch({changes:{from:0,insert:'x'}});
 t.send('w');assert.equal(t.opened,0,mode);t.done();
}
{
 const t=setup(),before=t.f.view.state.doc.toString();assert.equal(t.send('w').defaultPrevented,undefined);
 assert.equal(t.typed,1);assert.equal(t.f.view.state.doc.toString(),before.slice(0,3)+'w'+before.slice(3));assert.equal(t.opened,0);t.done();
}
{
 const t=setup();assert.ok(t.send('w',{altKey:true}).defaultPrevented);assert.deepEqual(t.edits,['edit.emacs-copy']);assert.equal(t.opened,0);t.done();
}
console.log(JSON.stringify({independentCases:cases,result:'passed',evidence:'Resolved CM handler order + real Registry/RefileController/WorkPanel, synthetic DOM; no browser'}));




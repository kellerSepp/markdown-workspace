import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {createWorkPanel} from './work-panel.mjs';
import {createKillRing} from './kill-ring.mjs';
import {todoRules} from './todo.mjs';
import {tagRules} from './tag-rules.mjs';
import {createTagsController} from './tags.mjs';
class Element{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.style={getPropertyValue:()=>'',setProperty(){}};this.value='';this.scrollTop=0;this.scrollLeft=0;this.clientHeight=100;this.scrollHeight=1000;this.offsetHeight=20;this.offsetTop=0;this.names=new Set();this.classList={add:n=>this.names.add(n),toggle:(n,on)=>on?this.names.add(n):this.names.delete(n)};}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const node of this.children)node.parent=null;this.children=[];this._text='';this.append(...nodes);}
 set textContent(text){this.replaceChildren();this._text=text;}get textContent(){return (this._text??'')+this.children.map(n=>n.textContent).join('');}
 setAttribute(k,v){this.attributes[k]=String(v);}removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}removeEventListener(k,fn){this.listeners[k]=this.listeners[k]?.filter(f=>f!==fn);}
 emit(type,patch={}){const e={target:this,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...patch};for(let node=this;node;node=node.parent){for(const fn of [...node.listeners[type]??[]])fn(e);if(e.stopped)break;}return e;}
 focus(){this.ownerDocument.activeElement=this;}click(){if(!this.disabled)this.emit('click');}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
}
const walk=(root,fn)=>[root,...root.children.flatMap(n=>walk(n,fn))].filter(fn);
function fixture(){
 const doc={createElement(tag){return new Element(tag,this);}};doc.defaultView=doc.createElement('window');doc.body=doc.createElement('body');
 const host=doc.createElement('div'),workspace=doc.createElement('div'),editor=doc.createElement('div');doc.body.append(editor,workspace);workspace.append(host);doc.activeElement=editor;
 const text='#+TAGS: HOME(h) WORK(w) URGENT(u)\n# Parent :ROOT:\n## TODO Title :HOME:\nBody';
 const view={state:EditorState.create({doc:text,selection:{anchor:text.indexOf('Title')+2},extensions:[markdown({base:markdownLanguage}),history(),todoRules,tagRules]}),focus:()=>editor.focus(),scrollDOM:{scrollTop:20,scrollLeft:0,scrollHeight:1000,clientHeight:400,scrollWidth:700,clientWidth:700}};
 const context={hasDocument:true,busy:false},notices=[];
 const panel=createWorkPanel({host,workspace,view,ring:createKillRing(),getContext:()=>context,document:doc,notify:m=>notices.push(m)});
 view.dispatch=spec=>{view.state=spec.startState?spec.state:view.state.update(spec).state;panel.invalidateStale();};
 const controller=createTagsController({view,panel,getContext:()=>context,notify:m=>notices.push(m)});
 const form=()=>walk(host,e=>e.className==='tag-form')[0],input=()=>walk(form(),e=>e.tagName==='input')[0];
 const key=(key,patch={})=>(doc.activeElement??form()).emit('keydown',{key,...patch});
 return {doc,view,context,panel,controller,host,editor,text,form,input,key,notices};
}
test('Real shared tag panel supports repeated Tab/input/Enter, completion, fast keys and one final atomic commit',()=>{
 const f=fixture(),before=f.view.state;assert.equal(f.controller.open(),true);assert.match(f.form().textContent,/Inherited · geerbt: ROOT/);assert.match(f.form().textContent,/Current · eigene: HOME/);
 f.key('w');assert.equal(f.view.state,before);f.key('Tab');f.input().value='Novel';f.key('Enter');assert.equal(f.doc.activeElement,f.form());assert.match(f.form().textContent,/Novel/);assert.equal(f.view.state,before);
 f.key('Tab');f.input().value='URG';f.key('Tab');assert.equal(f.input().value,'URGENT');f.key('Enter');
 f.key('Tab');f.input().value='HOME, Another';f.key('Enter');f.key('Enter');
 assert.equal(f.panel.isOpen,false);assert.equal(f.doc.activeElement,f.editor);assert.equal(f.view.state.doc.toString(),f.text.replace(':HOME:',':HOME:WORK:Novel:URGENT:Another:'));assert.equal(undoDepth(f.view.state),1);
 const after=f.view.state.selection.main.head;assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),f.text);assert.equal(redo(f.view),true);assert.equal(f.view.state.selection.main.head,after);f.panel.destroy();
});
test('Cancel, clear, stale target, invalid input and modifiers never mutate editor; inherited tags remain untouched',()=>{
 for(const cancel of ['Escape','g']){
  const f=fixture();f.controller.open();f.key(' ');f.key('Tab');f.input().value='WORK';f.key('Enter');f.key(cancel,cancel==='g'?{ctrlKey:true}:{});assert.equal(f.view.state.doc.toString(),f.text);assert.equal(undoDepth(f.view.state),0);f.panel.destroy();
 }
 const f=fixture();f.controller.open();const original=f.view.state;
 for(const patch of [{ctrlKey:true},{altKey:true},{metaKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}])f.key('w',patch);
 assert.match(f.form().textContent,/Current · eigene: HOME/);f.key('Tab');f.input().value='bad tag';f.key('Enter');assert.equal(f.doc.activeElement,f.input());assert.equal(f.view.state,original);
 // Composition inside free input is allowed; it must not close the panel.
 f.input().emit('compositionstart');assert.equal(f.panel.isOpen,true);
 const old=f.form();f.view.dispatch({selection:{anchor:0}});assert.equal(f.panel.isOpen,false);old.emit('keydown',{key:'Enter'});assert.equal(f.view.state.doc.toString(),f.text);f.panel.destroy();
});
test('Mouse toggles, unkeyed tags via arrows and clear affect only own draft; no-op commit adds no history',()=>{
 const f=fixture();f.controller.open();let work=walk(f.form(),e=>e.tagName==='button'&&e.textContent.endsWith('WORK'))[0];work.click();assert.match(f.form().textContent,/Current · eigene: HOME · WORK/);f.key(' ');assert.match(f.form().textContent,/Current · eigene: keine/);assert.match(f.form().textContent,/Inherited · geerbt: ROOT/);
 f.key('h');f.key('Enter');assert.equal(f.view.state.doc.toString(),f.text);assert.equal(undoDepth(f.view.state),0);f.panel.destroy();
});
test('Repeated tag panel lifecycle disposes old buttons and stale draft listeners',()=>{
 const f=fixture();for(let i=0;i<60;i++){f.controller.open();const form=f.form(),buttons=walk(form,e=>e.tagName==='button');f.key('w');f.panel.close();for(const button of buttons)assert.equal(button.listeners.click?.length??0,0);form.emit('keydown',{key:'Enter'});assert.equal(f.view.state.doc.toString(),f.text);}f.panel.destroy();
});

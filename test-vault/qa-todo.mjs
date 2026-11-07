import assert from 'node:assert/strict';
import {EditorState, EditorSelection} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {todoRules,readTodoRules,reloadTodo,todoContext,planTodo,createTodoController,todoKeyboard,todoDecorations} from '../editor/todo.mjs';
import {createEmacsEditing,setEmacsMark} from '../editor/emacs-editing.mjs';
let count=0;
const check=(f)=>{f();count++;};
const mk=(text,pos=0,extra=[])=>EditorState.create({doc:text,selection:{anchor:pos},extensions:[markdown(),history(),todoRules,extra]});
const def='#+SEQ_TODO: NEXT(n) TODO(t) WAITING(w) | DONE(d) CANCELLED(c)\n';
for(let level=1;level<=6;level++)for(const status of ['NEXT','TODO','WAITING','DONE','CANCELLED']){
 const heading='#'.repeat(level)+' '+status+' Titel 😀 ###';const text=def+'# TODO Parent\n'+heading+'\nBody\n###### NEXT child';const start=text.indexOf(heading,text.indexOf('# TODO Parent')+1);const s=mk(text,start+heading.length);
 check(()=>{const p=planTodo(s,'CANCELLED');const n=p.noop?s:s.update(p.spec).state;assert.equal(n.doc.toString(),text.slice(0,start)+'#'.repeat(level)+' CANCELLED Titel 😀 ###'+text.slice(start+heading.length));});
}
for(const x of ['A(a) A(b) | B(c)','A(a) | B(A)','A(a) || B(b)','A(a)','A(a) |','| B(b)','A(a) | B(b)\n#+SEQ_TODO: C(c) | D(d)','A(aa) | B(b)','A(ä) | B(b)'])check(()=>assert.ok(readTodoRules(mk('#+SEQ_TODO: '+x)).message));
for(const wrap of [x=>'```md\n'+x+'\n```',x=>'~~~\n'+x+'\n~~~',x=>'---\n'+x+'\n---',x=>'    '+x,x=>'> '+x,x=>'- item\n  '+x,x=>'<pre>\n'+x+'\n</pre>'])check(()=>assert.deepEqual(mk(wrap('#+SEQ_TODO: A(a) | B(b)')).field(todoRules).rules.map(x=>x.name),['TODO','DONE']));
for(const heading of ['## UNKNOWN Title','## TODOIST Title','## todo Title','## **TODO** Title','## Title ###'])check(()=>{const s=mk(def+heading,def.length+4),p=planTodo(s,'NEXT');assert.equal(s.update(p.spec).state.doc.toString(),def+'## NEXT '+heading.slice(3));});
for(const name of ['NEXT','TODO','WAITING','DONE','CANCELLED',null])check(()=>{
 let s=mk(def+'## TODO Titel\n### NEXT Kind',def.length+13);const initial=s;const p=planTodo(s,name);if(p.noop){assert.equal(undoDepth(s),0);return;}const view={get state(){return s;},dispatch(t){s=t.startState?t.state:s.update(t).state;}};view.dispatch(p.spec);const changed=s.doc.toString(),pos=s.selection.main.head;for(let i=0;i<25;i++){assert.equal(undo(view),true);assert.equal(s.doc.toString(),initial.doc.toString());assert.ok(s.selection.eq(initial.selection));assert.equal(redo(view),true);assert.equal(s.doc.toString(),changed);assert.equal(s.selection.main.head,pos);}
});
for(const text of ['> ## TODO Quote','- ## TODO List','TODO Setext\n===========','```\n## TODO Fake\n```','---\n## TODO Fake\n---'])check(()=>assert.ok(todoContext(mk(text,Math.min(5,text.length))).message));
check(()=>{let s=mk(def+'# TODO Parent\n## Plain\n```\n# DONE Fake\n```',def.length+36);assert.equal(todoContext(s).status,null);});
check(()=>{let s=mk(def+'# NEXT Task',3),view={get state(){return s;},dispatch(t){s=s.update(t).state;}};const c=createTodoController({view,panel:{},getContext:()=>({hasDocument:true})});view.dispatch({changes:{from:0,to:s.doc.line(1).to,insert:'#+SEQ_TODO: broken'}});assert.equal(c.reload(),false);assert.equal(s.field(todoRules).rules[0].name,'NEXT');view.dispatch({changes:{from:0,to:s.doc.line(1).to,insert:'#+SEQ_TODO: A(a) | Z(z)'}});assert.equal(s.field(todoRules).rules[0].name,'NEXT');assert.equal(c.reload(),true);assert.equal(s.field(todoRules).rules[0].name,'A');});
const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
let todoCalls=0;const emacs=createEmacsEditing();let st=mk('# TODO Title',10,[todoKeyboard(()=>{todoCalls++;}),emacs.extension(()=>{})]);st=st.update({effects:setEmacsMark.of(true)}).state;
const view={state:st,hasFocus:true,textDirectionAt:()=>0,moveByChar(range,forward){return EditorSelection.cursor(range.head+(forward?1:-1));},dispatch(t){this.state=this.state.update(t).state;}};const ev={key:'ArrowRight',shiftKey:true,preventDefault(){this.prevented=true;}};let first='';for(const p of st.facet(facet)){const h=p.plugin.domEventHandlers?.keydown;if(h&&h(ev,view)){first=p.plugin.domEventHandlers===st.facet(facet).find(q=>q.plugin.domEventHandlers?.copy)?.plugin.domEventHandlers?'emacs':'other';break;}}
assert.equal(todoCalls,1);assert.equal(view.state.selection.main.empty,true);console.log(JSON.stringify({checks:count,activeEmptyMarkTodoCalls:todoCalls,activeEmptyMarkSelection:view.state.selection.main.toJSON()}));

import {createWorkPanel} from '../editor/work-panel.mjs';
import {createKillRing} from '../editor/kill-ring.mjs';
class Box {
 constructor(doc){this.ownerDocument=doc;this.children=[];this.attrs={};this.listeners={};this.value='';this.scrollTop=0;this.scrollLeft=0;this.clientHeight=35;this.offsetHeight=30;this.classList={toggle(){}};}
 append(...cs){for(const c of cs){c.parentNode=this;this.children.push(c);}}replaceChildren(...cs){for(const c of this.children)c.parentNode=null;this.children=[];this.append(...cs);}remove(){this.parentNode.children=this.parentNode.children.filter(c=>c!==this);}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}removeEventListener(k,f){this.listeners[k]=this.listeners[k].filter(x=>x!==f);}emit(k,v={}){const e={key:'',target:this,preventDefault(){this.prevented=true;},stopPropagation(){},...v};for(const f of [...this.listeners[k]??[]])f(e);return e;}click(){this.emit('click');}focus(){this.ownerDocument.activeElement=this;}get offsetTop(){return this.parentNode.children.indexOf(this)*30;}get scrollHeight(){return this.children.length*30;}
}
const win=new Box(null);win.scrollX=win.scrollY=0;const dom={defaultView:win,createElement(){return new Box(this);}},host=new Box(dom),ctx={hasDocument:true,busy:false};let panel,notices=[];const pv={state:mk(def+'# NEXT Parent\n## WAITING Child',def.length+10),hasFocus:true,focus(){this.hasFocus=true;},scrollDOM:{scrollTop:20,scrollLeft:10,scrollHeight:1000,clientHeight:200,scrollWidth:600,clientWidth:300},dispatch(spec){this.state=this.state.update(spec).state;panel?.invalidateStale();}};
panel=createWorkPanel({host,view:pv,ring:createKillRing(),getContext:()=>ctx,document:dom,insert(){throw Error('ring insert');},notify:m=>notices.push(m)});const tc=createTodoController({view:pv,panel,getContext:()=>ctx});const root=host.children[0],search=root.children[1],rows=root.children[3];
for(let i=0;i<100;i++)check(()=>{const before=pv.state;assert.equal(tc.open(),true);const held=[...rows.children];root.emit('keydown',{key:'Escape'});assert.equal(panel.isOpen,false);assert.equal(pv.state,before);for(const r of held)assert.equal(r.listeners.click.length,0);});
for(const mod of [{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}])check(()=>{tc.open();const before=pv.state;root.emit('keydown',{key:'d',...mod});assert.equal(pv.state,before);panel.close();});
check(()=>{tc.open();const before=pv.state;root.emit('keydown',{key:'d',repeat:true});assert.equal(pv.state,before);root.emit('keydown',{key:'d'});assert.equal(todoContext(pv.state).status.name,'DONE');assert.equal(panel.isOpen,false);});
check(()=>{tc.open();root.emit('keydown',{key:' '});assert.equal(todoContext(pv.state).status,null);assert.match(pv.state.doc.toString(),/# Parent\n## WAITING Child$/);});
check(()=>{tc.open();const held=[...rows.children],before=pv.state;pv.dispatch({selection:{anchor:before.selection.main.head+1}});for(const r of held)r.click();assert.equal(pv.state.doc.toString(),before.doc.toString());assert.equal(panel.isOpen,false);});
check(()=>{tc.open();root.emit('keydown',{key:'ArrowDown'});root.emit('keydown',{key:'ArrowDown'});root.emit('keydown',{key:'ArrowDown'});assert.ok(rows.scrollTop>0);root.emit('keydown',{key:'Enter'});assert.equal(todoContext(pv.state).status.name,'WAITING');});
check(()=>{tc.open();ctx.busy=true;root.emit('keydown',{key:'c'});assert.equal(todoContext(pv.state).status.name,'WAITING');panel.close();ctx.busy=false;});
check(()=>{tc.open();root.emit('compositionstart');assert.equal(panel.isOpen,false);tc.open();win.emit('blur');assert.equal(panel.isOpen,false);});
check(()=>{tc.open();root.emit('focusout',{relatedTarget:search});assert.equal(panel.isOpen,true);root.emit('focusout',{relatedTarget:new Box(dom)});assert.equal(panel.isOpen,false);});
panel.destroy();console.log(JSON.stringify({totalIndependentChecks:count,windowBlurListeners:win.listeners.blur.length}));
import {syntaxTreeAvailable} from '@codemirror/language';
import {todoDefinitionLine} from '../editor/todo.mjs';
{
const huge=def+Array.from({length:6000},(_,i)=>'## Plain '+i+'\nbody').join('\n')+'\n```\n#+SEQ_TODO: FAKE(f) | END(e)\n```';
const pos=huge.indexOf('#+SEQ_TODO: FAKE');const s=mk(huge,pos);assert.equal(todoDefinitionLine(s),false);console.log(JSON.stringify({farFencedDefinitionEnabled:todoDefinitionLine(s),fullPublishedTree:syntaxTreeAvailable(s,s.doc.length),rules:s.field(todoRules).rules.map(x=>x.name)}));
}
import {syntaxTree} from '@codemirror/language';
for(const n of [0,100,1000,6000]){
const x=def+Array.from({length:n},(_,i)=>'## Plain '+i+'\nbody').join('\n')+'\n```\n#+SEQ_TODO: FAKE(f) | END(e)\n```';const pos=x.indexOf('#+SEQ_TODO: FAKE');const s=mk(x,pos);let nodes=[];for(let p=syntaxTree(s).resolveInner(pos,1);p;p=p.parent)nodes.push(p.name);assert.equal(todoDefinitionLine(s),false);console.log(JSON.stringify({n,nodes,enabled:todoDefinitionLine(s),treeLength:syntaxTree(s).length,doc:s.doc.length}));
}
import {createPrefixRouter} from '../editor/prefix-router.mjs';
for(const scenario of [
 {text:'# TODO Task',anchor:8,head:8,expectedStatus:'DONE'},
 {text:'# TODO Task',anchor:3,head:5,expectedStatus:'TODO'},
 {text:'# TODO Task\nbody',anchor:14,head:14,expectedStatus:'TODO'},
 {text:'# Plain Task',anchor:8,head:8,expectedStatus:null},
])check(()=>{
 const edit=createEmacsEditing();let controller;const router=createPrefixRouter({registry:{},getContext:()=>({hasDocument:true})});
 const opts=[markdown(),history(),todoRules,router.extension(),todoKeyboard(id=>controller.cycle(id==='todo.next'?1:-1)),edit.extension(()=>{})];
 let state=EditorState.create({doc:scenario.text,selection:{anchor:scenario.anchor,head:scenario.head},extensions:opts});state=state.update({effects:setEmacsMark.of(true)}).state;
 const v={hasFocus:true,get state(){return state;},textDirectionAt:()=>0,moveByChar(r,f){return EditorSelection.cursor(r.head+(f?1:-1));},dispatch(t){state=t.startState?t.state:state.update(t).state;}};controller=createTodoController({view:v,panel:{},getContext:()=>({hasDocument:true})});
 const e={key:'ArrowRight',shiftKey:true,preventDefault(){}};for(const p of state.facet(facet)){const fn=p.plugin.domEventHandlers?.keydown;if(fn&&fn(e,v))break;}
 assert.equal(todoContext(state.update({selection:{anchor:3}}).state).status?.name??null,scenario.expectedStatus);if(scenario.text==='# TODO Task'&&scenario.anchor===8)assert.equal(state.selection.main.empty,true);else assert.equal(state.doc.toString(),scenario.text);
});
console.log(JSON.stringify({afterActualAppOrderChecks:count}));
{
const x=def+Array.from({length:1000},(_,i)=>'## TODO Task '+i+'\nbody').join('\n');const s=mk(x,x.indexOf('Task 999'));const c=todoContext(s),p=planTodo(s,'DONE');assert.ok(c.message);assert.equal(!!p.spec,false);console.log(JSON.stringify({contextMessage:c.message,contextLine:c.line?.number,expectedLine:s.doc.lineAt(s.selection.main.head).number,treeLength:syntaxTree(s).length,doc:s.doc.length,plan:!!p.spec}));
}
import {ensureSyntaxTree} from '@codemirror/language';
for(const suffix of ['#+SEQ_TODO: A(a) | B(b)','```\n#+SEQ_TODO: FAKE(f) | END(e)\n```','- item\n  #+SEQ_TODO: FAKE(f) | END(e)','<pre>\n#+SEQ_TODO: FAKE(f) | END(e)\n</pre>'])check(()=>{
 const x=Array.from({length:1500},(_,i)=>'## TODO Task '+i+'\nbody').join('\n')+'\n'+suffix;const pos=x.indexOf('#+SEQ_TODO:');let s=mk(x,pos);
 assert.equal(todoDefinitionLine(s),false);assert.ok(ensureSyntaxTree(s,s.doc.length,1000));s=s.update({}).state;assert.equal(todoDefinitionLine(s),suffix.startsWith('#+SEQ_TODO:'));
 if(suffix.startsWith('#+SEQ_TODO:'))assert.deepEqual(s.field(todoRules).rules.map(x=>x.name),['A','B']);
});
console.log(JSON.stringify({finalIndependentChecks:count,largeGateProbes:6}));

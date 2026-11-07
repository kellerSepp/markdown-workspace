import assert from 'node:assert/strict';
import {EditorState,EditorSelection,StateEffect} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {todoRules,todoKeyboard,todoCycleContext,createTodoController,reloadTodo,todoCycleAbortCleanup,todoDecorations,todoContext} from '../editor/todo.mjs';
import {createEmacsEditing,setEmacsMark} from '../editor/emacs-editing.mjs';
import {createPrefixRouter} from '../editor/prefix-router.mjs';
import {createCommandRegistry} from '../editor/command-registry.mjs';
import {commandDefinitions} from '../editor/commands.mjs';
const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
let count=0;const check=f=>{f();count++;};
function make(text='# TODO Title\nBody\n## Plain Child',pos=5){
 let state,registry,options;const context={busy:false,hasDocument:true},emacs=createEmacsEditing();
 const win={listeners:[],addEventListener(k,f){this.listeners.push({k,f});},removeEventListener(k,f){this.listeners=this.listeners.filter(x=>x.k!==k||x.f!==f);}};
 const view={hasFocus:true,dom:{ownerDocument:{defaultView:win}},setTabFocusMode(){},textDirectionAt:()=>0,moveByChar(r,f){return EditorSelection.cursor(Math.min(this.state.doc.length,Math.max(0,r.head+(f?1:-1))));},get state(){return state;},dispatch(t){state=t.startState?t.state:state.update(t).state;}};
 const prefix=createPrefixRouter({registry:{get:id=>registry.get(id),availability:id=>registry.availability(id),execute:id=>registry.execute(id)},getContext:()=>context});
 const todo=createTodoController({view,panel:{openChoices(o){options=o;return true;}},getContext:()=>context});
 const ext=[markdown(),history(),todoRules,todoCycleAbortCleanup(),prefix.extension(),todoKeyboard(id=>registry.execute(id),()=>context),emacs.extension(()=>{}),EditorState.allowMultipleSelections.of(true)];
 state=EditorState.create({doc:text,selection:{anchor:pos},extensions:ext});registry=createCommandRegistry(commandDefinitions({'todo.next':()=>todo.cycle(1),'todo.previous':()=>todo.cycle(-1),'todo.status':()=>todo.open(),'todo.reload':()=>todo.reload()}),()=>({...context,state}));
 function send(key='ArrowLeft',patch={}){const e={key,shiftKey:true,preventDefault(){this.prevented=true;},...patch};for(const p of state.facet(facet)){const h=p.plugin.domEventHandlers?.keydown;if(h?.(e,view))break;}return e;}
 const emit=type=>{for(const p of state.facet(facet))p.plugin.domEventHandlers?.[type]?.({},view);};
 return {view,todo,registry,prefix,send,emit,context,win,get options(){return options;}};
}
for(const def of ['', '#+SEQ_TODO: NEXT(n) WAIT(w) TODO(t) | DONE(d) CANCELLED(c)\n'])for(let level=1;level<=6;level++)for(const title of ['', ' Title 😀', ' UNKNOWN Text'])check(()=>{
 const mark='#'.repeat(level),f=make(def+mark+' TODO'+title,def.length+mark.length+1),sequence=def?['NEXT','WAIT','TODO','DONE','CANCELLED',null]:['TODO','DONE',null];let index=sequence.indexOf('TODO');
 for(const delta of [1,-1,1,-1])for(let n=0;n<sequence.length*5;n++){index=(index+delta+sequence.length)%sequence.length;const before=f.view.state.doc.toString();f.send(delta>0?'ArrowRight':'ArrowLeft');const expected=sequence[index];assert.equal(f.view.state.doc.toString(),def+mark+' '+(expected?expected+title:title.trimStart()));assert.equal(f.registry.availability('todo.next').enabled,true);assert.notEqual(f.view.state.doc.toString(),before);}
});
for(const invalidate of [f=>f.view.dispatch({changes:{from:f.view.state.doc.length,insert:'x'}}),f=>f.view.dispatch({selection:{anchor:1,head:2}}),f=>f.view.dispatch({selection:{anchor:f.view.state.doc.line(2).from}}),f=>f.view.dispatch({selection:{anchor:f.view.state.doc.line(3).from}}),f=>f.view.dispatch({effects:reloadTodo.of({message:'bad'})}),f=>f.view.dispatch({effects:StateEffect.appendConfig.of([])}),f=>f.view.dispatch({selection:EditorSelection.create([EditorSelection.cursor(0),EditorSelection.cursor(2)])}),f=>f.emit('blur'),f=>f.emit('mousedown'),f=>f.emit('compositionstart'),f=>f.send('Escape',{shiftKey:false}),f=>f.send('g',{shiftKey:false,ctrlKey:true})])check(()=>{const f=make();f.send();assert.equal(f.registry.availability('todo.next').enabled,true);invalidate(f);assert.equal(f.registry.availability('todo.next').enabled,false);});
check(()=>{const f=make();f.send();f.view.dispatch({});assert.equal(f.registry.availability('todo.next').enabled,true);f.view.dispatch({selection:{anchor:0}});assert.equal(f.registry.availability('todo.next').enabled,true);f.send('ArrowRight');assert.match(f.view.state.doc.toString(),/^# TODO Title/);});
check(()=>{const f=make();f.todo.open();f.options.choose('',{state:f.view.state});assert.equal(f.registry.availability('todo.next').enabled,false);});
check(()=>{const f=make();f.send();f.todo.open();assert.equal(f.registry.availability('todo.next').enabled,false);});
check(()=>{const f=make();f.view.dispatch({effects:setEmacsMark.of(true)});f.send();f.send('ArrowRight');assert.match(f.view.state.doc.toString(),/^# TODO/);assert.equal(f.view.state.selection.main.empty,true);});
check(()=>{const f=make(),initial=f.view.state.doc.toString();f.send();const none=f.view.state.doc.toString();f.send('ArrowRight');for(let i=0;i<15;i++){assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),none);assert.equal(f.registry.availability('todo.next').enabled,false);assert.equal(redo(f.view),true);assert.equal(f.view.state.doc.toString(),initial);}assert.equal(undoDepth(f.view.state),2);});
for(const cancel of ['Escape','g']){
 const f=make();f.send();f.send('c',{shiftKey:false,ctrlKey:true});f.prefix.keyUp({key:'c'});f.send(cancel,{shiftKey:false,ctrlKey:cancel==='g'});assert.equal(f.registry.availability('todo.next').enabled,false);console.log(JSON.stringify({prefixAbort:cancel,continuation:f.registry.availability('todo.next').enabled,cycleFrom:f.view.state.field(todoRules).cycleFrom}));
}
console.log(JSON.stringify({checks:count}));
{
const f=make('# TODO DONE Title',10);f.send('ArrowLeft');const none=f.view.state.doc.toString();assert.equal(todoContext(f.view.state).status,null);let marks=0;todoDecorations(f.view.state,[{from:0,to:f.view.state.doc.length}]).between(0,f.view.state.doc.length,()=>marks++);assert.equal(marks,0);f.send('ArrowRight');assert.equal(f.view.state.doc.toString(),'# TODO DONE Title');console.log(JSON.stringify({knownTitleWordStart:'# TODO DONE Title',none,afterRight:f.view.state.doc.toString()}));
}
check(()=>{const f=make();const life=todoKeyboard(()=>{})[1].create(f.view);f.send();for(const {f:fn} of f.win.listeners)fn();assert.equal(f.registry.availability('todo.next').enabled,false);life.destroy();assert.equal(f.win.listeners.length,0);});
console.log(JSON.stringify({includingWindowLifecycle:count}));
function verifyKnownTitles(){
 for(const {def,names} of [{def:'',names:['TODO','DONE']},{def:'#+SEQ_TODO: NEXT(n) WAIT(w) TODO(t) | DONE(d) CANCELLED(c)\n',names:['NEXT','WAIT','TODO','DONE','CANCELLED']}])for(let level=1;level<=6;level++)for(const initial of names)for(const firstTitle of names)for(const delta of [-1,1])check(()=>{
  const mark='#'.repeat(level),title=firstTitle+' Title 😀',f=make(def+mark+' '+initial+' '+title,def.length+level+2),seq=[null,...names];let index=seq.indexOf(initial);
  for(let i=0;i<seq.length*4;i++){index=(index+delta+seq.length)%seq.length;f.send(delta>0?'ArrowRight':'ArrowLeft');assert.equal(f.view.state.doc.toString(),def+mark+' '+(seq[index]?seq[index]+' ':'')+title,`${level}/${initial}/${firstTitle}/${delta}/${i}`);if(seq[index]===null){assert.equal(todoContext(f.view.state).status,null);let m=0;todoDecorations(f.view.state,[{from:0,to:f.view.state.doc.length}]).between(0,f.view.state.doc.length,()=>m++);assert.equal(m,0);assert.equal(f.registry.availability('todo.next').enabled,true);}}
 });
}

verifyKnownTitles();console.log(JSON.stringify({finalIndependentGroups:count}));
import {readFile} from 'node:fs/promises';
check(()=>{const f=make();f.send();const fresh=make(f.view.state.doc.toString(),f.view.state.selection.main.head);assert.equal(fresh.registry.availability('todo.next').enabled,false);});
const src=await readFile(new URL('../editor/app.mjs',import.meta.url),'utf8'),ext=src.slice(src.indexOf('const extensions ='),src.indexOf('const view ='));assert.ok(ext.indexOf('todoCycleAbortCleanup()')<ext.indexOf('prefix.extension()'));assert.ok(ext.indexOf('prefix.extension()')<ext.indexOf('todoKeyboard('));assert.ok(ext.indexOf('todoKeyboard(')<ext.indexOf('emacs.extension('));
console.log(JSON.stringify({finalIndependentGroups:count,actualAppOrder:'cleanup->prefix->todo->emacs'}));

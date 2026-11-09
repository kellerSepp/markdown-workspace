import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection,StateEffect} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {todoRules,reloadTodo,todoContext,todoCycleContext,todoKeyboard,todoCycleAbortCleanup,todoDecorations,createTodoController} from './todo.mjs';
import {createEmacsEditing,setEmacsMark} from './emacs-editing.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {createPrefixRouter} from './prefix-router.mjs';
import {readFile} from 'node:fs/promises';
const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
function fixture(doc='# TODO Title\nBody\n## Plain Child',pos=5){
 let state,options,registry;const context={hasDocument:true,busy:false},emacs=createEmacsEditing();
 const view={hasFocus:true,textDirectionAt:()=>0,moveByChar(range,forward){return EditorSelection.cursor(range.head+(forward?1:-1));},get state(){return state;},dispatch:spec=>{state=spec.startState?spec.state:state.update(spec).state;}};
 const todo=createTodoController({view,panel:{openChoices(o){options=o;return true;}},getContext:()=>context});
 view.setTabFocusMode=()=>{};
 const prefix=createPrefixRouter({registry:{get:id=>registry.get(id),availability:id=>registry.availability(id),execute:id=>registry.execute(id)},getContext:()=>context});
 state=EditorState.create({doc,selection:{anchor:pos},extensions:[markdown(),history(),todoRules,todoCycleAbortCleanup(),prefix.extension(),todoKeyboard(id=>registry.execute(id),()=>context),emacs.extension(()=>{}),EditorState.allowMultipleSelections.of(true)]});
 registry=createCommandRegistry(commandDefinitions({'todo.previous':()=>todo.cycle(-1),'todo.next':()=>todo.cycle(1),'todo.status':()=>todo.open(),'fold.open':()=>true}),()=>({...context,state}));
 const send=(key='ArrowRight',patch={})=>{const event={key,shiftKey:true,preventDefault(){this.prevented=true;},...patch};for(const {plugin} of state.facet(facet))if(plugin.domEventHandlers?.keydown?.(event,view))break;return event;};
 const emit=type=>{for(const {plugin} of state.facet(facet))plugin.domEventHandlers?.[type]?.({},view);};
 return {view,todo,registry,prefix,send,emit,context,get options(){return options;}};
}
test('Cycle continues through none in both directions for H1–H6, short/empty titles and unknown words',()=>{
 for(let level=1;level<=6;level++)for(const title of ['', ' X', ' UNKNOWN Title']){
  const prefix='#'.repeat(level),f=fixture(prefix+' TODO'+title,prefix.length+1),initial=f.view.state.doc.toString();
  for(let i=0;i<12;i++){
   f.send('ArrowLeft');assert.equal(f.view.state.doc.toString(),prefix+' '+title.trimStart());assert.equal(f.registry.availability('todo.next').enabled,true);assert.equal(f.registry.availability('todo.previous').enabled,true);
   f.send('ArrowLeft');assert.equal(f.view.state.doc.toString(),prefix+' DONE'+title);
   f.send();assert.equal(f.view.state.doc.toString(),prefix+' '+title.trimStart());f.send();assert.equal(f.view.state.doc.toString(),initial);
  }
  assert.equal(undoDepth(f.view.state),48);
 }
});
test('Unmarked H1–H6 start either direction at every column; undo/redo preserves text',()=>{
 for(let level=1;level<=6;level++)for(const title of ['', ' ', ' Plain', ' UNKNOWN Title']){
  const text='#'.repeat(level)+title;
  for(let pos=0;pos<=text.length;pos++)for(const direction of [-1,1]){
   const f=fixture(text,pos);assert.equal(f.send(direction<0?'ArrowLeft':'ArrowRight').prevented,true);
   const expected='#'.repeat(level)+' '+(direction<0?'DONE':'TODO')+(title.trim()?' '+title.trim():'');
   assert.equal(f.view.state.doc.toString(),expected);assert.equal(undoDepth(f.view.state),1);
   assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),text);
   assert.equal(redo(f.view),true);assert.equal(f.view.state.doc.toString(),expected);
  }
 }
 const f=fixture();f.todo.open();f.options.choose('',{state:f.view.state});assert.equal(f.send().prevented,true);
});

test('New headings use file-local states and keep selection/body/code and busy guards',()=>{
 const definition='#+SEQ_TODO: NEXT(n) WAIT(w) | CLOSED(c)\n';
 for(let level=1;level<=6;level++)for(const direction of [-1,1]){
  const f=fixture(definition+'#'.repeat(level)+' Title',definition.length+level+1);
  f.send(direction<0?'ArrowLeft':'ArrowRight');
  assert.equal(f.view.state.doc.toString(),definition+'#'.repeat(level)+' '+(direction<0?'CLOSED':'NEXT')+' Title');
 }
 for(const [doc,pos] of [['# Plain\nBody',10],['```\n# Plain\n```',7],['> # Plain',6],['- # Plain',6],['---\nname: value\n---\n# Plain',8]]){
  const f=fixture(doc,pos),before=f.view.state.doc;
  assert.equal(f.send().prevented,undefined);assert.equal(f.view.state.doc,before);
 }
 for(const mode of ['selection','busy','readonly','missing']){
  const f=fixture('# Plain',4);
  if(mode==='selection')f.view.dispatch({selection:{anchor:2,head:5}});
  if(mode==='busy')f.context.busy=true;
  if(mode==='missing')f.context.hasDocument=false;
  if(mode==='readonly')f.view.dispatch({effects:StateEffect.appendConfig.of(EditorState.readOnly.of(true))});
  const before=f.view.state.doc;assert.equal(f.send().prevented,undefined);assert.equal(f.view.state.doc,before);
 }
});

test('Every cursor column on H1–H6 including titleless TODO/DONE survives own mapping and parser-only updates',()=>{
 for(let level=1;level<=6;level++)for(const status of ['TODO','DONE'])for(const title of ['', ' Title']){
  const text='#'.repeat(level)+' '+status+title;
  for(let pos=0;pos<=text.length;pos++){
   const f=fixture(text,pos),direction=status==='TODO'?'ArrowLeft':'ArrowRight';f.send(direction);
   assert.equal(f.view.state.doc.toString(),'#'.repeat(level)+' '+title.trimStart(),`${level}/${status}/${pos}`);
   assert.equal(f.registry.availability('todo.next').enabled,true);f.view.dispatch({});assert.equal(f.registry.availability('todo.next').enabled,true,'parser-only/no-op update');
   f.send(direction);assert.equal(f.view.state.doc.toString(),'#'.repeat(level)+' '+(status==='TODO'?'DONE':'TODO')+title);
  }
 }
});
test('Continuation keeps same-line empty cursor moves but invalidates foreign edit, region, other line/heading, reload, file and reconfiguration',()=>{
 const invalidations=[
  f=>f.view.dispatch({changes:{from:f.view.state.doc.length,insert:'x'}}),
  f=>f.view.dispatch({selection:{anchor:0,head:2}}),
  f=>f.view.dispatch({selection:{anchor:0,head:0}}),
  f=>f.view.dispatch({selection:{anchor:f.view.state.doc.line(2).from}}),
  f=>f.view.dispatch({selection:{anchor:f.view.state.doc.line(3).from}}),
  f=>f.view.dispatch({effects:reloadTodo.of({message:'Invalid definition'})}),
  f=>f.view.dispatch({selection:EditorSelection.create([EditorSelection.cursor(1),EditorSelection.cursor(3)])}),
 ];
 // A same-line cursor move remains valid, including marker column zero.
 const same=fixture();same.send('ArrowLeft');same.view.dispatch({selection:{anchor:0}});assert.equal(same.registry.availability('todo.next').enabled,true);same.send();assert.match(same.view.state.doc.toString(),/^# TODO/);
 // The third item intentionally tests a context exit followed by returning.
 invalidations[2]=f=>{f.view.dispatch({selection:{anchor:f.view.state.doc.line(2).from}});f.view.dispatch({selection:{anchor:0}});};
 for(const invalidate of invalidations){const f=fixture();f.send('ArrowLeft');invalidate(f);assert.equal(f.view.state.field(todoRules).cycleFrom,null);}
 const file=fixture();file.send('ArrowLeft');const fresh=fixture(file.view.state.doc.toString(),0);assert.equal(fresh.view.state.field(todoRules).cycleFrom,null);
 const reconfigured=fixture();reconfigured.send('ArrowLeft');reconfigured.view.dispatch({effects:StateEffect.appendConfig.of([])});assert.equal(reconfigured.view.state.field(todoRules).cycleFrom,null);
});

test('Blur/composition/mouse/Escape/C-g end continuation and never arm another heading',()=>{
 for(const type of ['blur','compositionstart','mousedown']){const f=fixture();f.send('ArrowLeft');f.emit(type);assert.equal(f.view.state.field(todoRules).cycleFrom,null,type);}
 for(const [key,patch] of [['Escape',{shiftKey:false}],['g',{ctrlKey:true,shiftKey:false}]]){const f=fixture();f.send('ArrowLeft');f.send(key,patch);assert.equal(f.view.state.field(todoRules).cycleFrom,null,key);}
 const f=fixture();f.send('ArrowLeft');f.view.dispatch({selection:{anchor:f.view.state.doc.line(3).from+4}});assert.equal(f.send().prevented,true);assert.match(f.view.state.doc.toString(),/## TODO Plain Child$/);
});

test('Every continuing step has atomic history; undo/redo does not restore an old continuation lease',()=>{
 const f=fixture(),initial=f.view.state.doc.toString();f.send('ArrowLeft');const none=f.view.state.doc.toString();assert.equal(undoDepth(f.view.state),1);f.send();assert.equal(f.view.state.doc.toString(),initial);assert.equal(undoDepth(f.view.state),2);
 assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),none);assert.equal(f.view.state.field(todoRules).cycleFrom,null);
 assert.equal(redo(f.view),true);assert.equal(f.view.state.doc.toString(),initial);assert.equal(undo(f.view),true);assert.equal(f.view.state.field(todoRules).cycleFrom,null);
});

test('Resolved handlers continue past none with empty mark; regions retain Emacs selection and native guards remain',()=>{
 const f=fixture();f.view.dispatch({effects:setEmacsMark.of(true)});f.send('ArrowLeft');assert.equal(f.view.state.selection.main.empty,true);assert.equal(f.registry.availability('todo.next').enabled,true);f.send();assert.match(f.view.state.doc.toString(),/^# TODO/);
 f.send('ArrowLeft');for(const patch of [{ctrlKey:true},{altKey:true},{metaKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}]){const before=f.view.state.doc;f.send('ArrowRight',patch);assert.ok(f.view.state.doc.eq(before));}
 const region=fixture();region.send('ArrowLeft');region.view.dispatch({selection:{anchor:2,head:4}});const before=region.view.state.doc;region.send();assert.ok(region.view.state.doc.eq(before));assert.equal(region.registry.availability('todo.next').enabled,false);
});

test('Early non-consuming cleanup expires continuation even when active prefix consumes Escape/C-g; starts and choices stay valid',async()=>{
 const source=await readFile(new URL('./app.mjs',import.meta.url),'utf8'),extensions=source.slice(source.indexOf('const extensions ='),source.indexOf('const view ='));
 assert.ok(extensions.indexOf('todoCycleAbortCleanup()')<extensions.indexOf('prefix.extension()'));
 for(const cancel of ['Escape','g']){
  const f=fixture();f.send('ArrowLeft');f.send('c',{shiftKey:false,ctrlKey:true});f.prefix.keyUp({key:'c'});assert.equal(f.prefix.active,true);assert.equal(f.registry.availability('todo.next').enabled,true);
  f.send(cancel,{shiftKey:false,ctrlKey:cancel==='g'});assert.equal(f.prefix.active,false);assert.equal(f.view.state.field(todoRules).cycleFrom,null,cancel);
 }
 const f=fixture();f.send('ArrowLeft');const state=f.view.state;f.send('c',{shiftKey:false,ctrlKey:true});assert.equal(f.view.state,state,'prefix start does not stale its own state');f.prefix.keyUp({key:'c'});f.send('t',{shiftKey:false});assert.equal(f.prefix.active,false);assert.ok(f.options,'status choice executes rather than being made stale by early cleanup');
});

test('Transient none preserves all loaded status names as leading title words across H1–H6 and both directions',()=>{
 for(const rules of [['TODO','DONE'],['NEXT','WAIT','DONE','CANCELLED']]){
  const definition=rules.length===2?'':'#+SEQ_TODO: NEXT(n) WAIT(w) | DONE(d) CANCELLED(c)\n';
  for(let level=1;level<=6;level++)for(const titleWord of rules)for(const direction of [-1,1]){
   const marker='#'.repeat(level),start=direction<0?rules[0]:rules.at(-1),text=definition+marker+' '+start+' '+titleWord+' Title';
   const f=fixture(text,definition.length+marker.length+1),none=definition+marker+' '+titleWord+' Title';
   f.send(direction<0?'ArrowLeft':'ArrowRight');assert.equal(f.view.state.doc.toString(),none);assert.equal(todoContext(f.view.state).status,null);
   let count=0;todoDecorations(f.view.state,[{from:0,to:f.view.state.doc.length}]).between(0,f.view.state.doc.length,()=>count++);assert.equal(count,0,'leading title word has no task decoration while transiently empty');
   f.send(direction<0?'ArrowRight':'ArrowLeft');assert.equal(f.view.state.doc.toString(),text,'exact full-text roundtrip including status-looking title');
  }
 }
 const f=fixture('# TODO DONE Title',10);f.send('ArrowLeft');f.send('Escape',{shiftKey:false});assert.equal(todoContext(f.view.state).status.name,'DONE','after explicit context expiry raw Markdown convention applies again');
});

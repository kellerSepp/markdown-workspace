import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState,Compartment} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {history,undo,redo} from '@codemirror/commands';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {usesSharedWorkPanel} from './agenda-command-policy.mjs';
import {markdown} from '@codemirror/lang-markdown';

test('Actual app keeps docked agenda visible while editor stays editable, with busy and empty session protections',async()=>{
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
  const start=app.indexOf('function setBusy(value) {'),end=app.indexOf('\nfunction syncEditor()',start);
  assert.ok(start>=0&&end>start);
  const editable=new Compartment(),agenda={active:false},session={hasDocument:true};let closes=0;
  const view={state:EditorState.create({doc:'# TODO Synthetic',extensions:editable.of([])}),dispatch(spec){this.state=this.state.update(spec).state;}};
  const context={agenda,session,view,editable,EditorState,EditorView,
    prefix:{cancel(){}},workPanel:{close(){closes++;}},emacs:{invalidate(){}},document:{querySelectorAll(){return [];}}};
  const setBusy=new Function(...Object.keys(context),'let busy=false;'+app.slice(start,end)+';return setBusy;')(...Object.values(context));
  setBusy(false);assert.equal(view.state.readOnly,false);assert.equal(view.state.facet(EditorView.editable),true);
  agenda.active=true;setBusy(false);assert.equal(view.state.readOnly,false);assert.equal(view.state.facet(EditorView.editable),true);
  setBusy(true);assert.equal(closes,0);assert.equal(view.state.readOnly,true);
  setBusy(false);assert.equal(view.state.readOnly,false);assert.equal(closes,0);
  agenda.active=false;setBusy(false);assert.equal(view.state.readOnly,false);assert.equal(view.state.facet(EditorView.editable),true);
  setBusy(true);assert.equal(closes,1);assert.equal(view.state.readOnly,true);
  session.hasDocument=false;setBusy(false);assert.equal(view.state.readOnly,true);assert.equal(view.state.facet(EditorView.editable),false);
  assert.equal(view.state.doc.toString(),'# TODO Synthetic');
});

test('Dock permits real history edits and actual app save without closing, but agenda focus and dispatcher isolate commands',async()=>{
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8'),start=app.indexOf('async function save() {'),end=app.indexOf("\nbind('save',save);",start);assert.ok(start>=0&&end>start);
  const view={state:EditorState.create({doc:'# TODO Source',extensions:history()}),dispatch(spec){this.state=this.state.update(spec).state;}};
  view.dispatch=view.dispatch.bind(view);
  const agenda={active:true,docked:true};let savedText='',updates=0,closed=0;
  const session={hasDocument:true,path:'synthetic.md',vault:{},save:async()=>{savedText=view.state.doc.toString();return {unchanged:false,backupName:'synthetic-backup'};}};
  const save=new Function('session','agendaIndex','sameVault','vault','requireSynthetic','status','let persistPending=false;'+app.slice(start,end)+';return save;')(session,{updateFile(){updates++;}},async()=>true,session.vault,()=>{},()=>{});
  const context={busy:false,agendaActive:true,agendaDocked:true,agendaFocused:false,hasDocument:true,synthetic:true,vault:session.vault};
  const registry=createCommandRegistry(commandDefinitions({'edit.undo':()=>undo(view),'edit.redo':()=>redo(view),'file.save':save,'view.line-wrap':()=>true},id=>{if(usesSharedWorkPanel(id)){closed++;agenda.active=false;}return true;}),()=>({...context,state:view.state}));
  view.dispatch({changes:{from:13,insert:' changed'}});assert.equal(view.state.doc.toString(),'# TODO Source changed');
  assert.equal(registry.execute('edit.undo'),true);assert.equal(view.state.doc.toString(),'# TODO Source');assert.equal(registry.execute('edit.redo'),true);
  await registry.execute('file.save');assert.equal(savedText,'# TODO Source changed');assert.equal(updates,1);assert.equal(agenda.active,true);assert.equal(closed,0);
  assert.equal(registry.availability('view.line-wrap').enabled,true);
  for(const id of ['workspace.choose','file.open','file.find','draft.recover'])assert.equal(registry.availability(id).enabled,false,id);
  context.agendaFocused=true;for(const id of ['edit.undo','file.save','view.line-wrap'])assert.equal(registry.availability(id).enabled,false,id);
  context.agendaFocused=false;context.agendaDocked=false;for(const id of ['edit.undo','file.save','view.line-wrap'])assert.equal(registry.availability(id).enabled,false,id);
});

test('Shared panel commands close dock before capturing editor targets; failed closure prevents overlap',async()=>{
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8'),start=app.indexOf('function prepareWorkPanel(){'),end=app.indexOf('\nconst prefix=',start);assert.ok(start>=0&&end>start);
  let closes=0,locked=false;const agenda={active:true,docked:true,close(options){assert.deepEqual(options,{restore:false});if(locked)return false;closes++;this.active=false;}};
  const prepare=new Function('agenda',app.slice(start,end)+';return prepareWorkPanel;')(agenda);const context={busy:false,agendaActive:true,agendaDocked:true,agendaFocused:false,hasDocument:true,synthetic:true,state:EditorState.create({doc:'# TODO Source',extensions:markdown()})};let targetCaptured=0;
  const registry=createCommandRegistry(commandDefinitions({'todo.status':()=>{assert.equal(agenda.active,false);targetCaptured++;return true;}},id=>!usesSharedWorkPanel(id)||prepare()),()=>context);
  assert.equal(registry.execute('todo.status'),true);assert.equal(closes,1);assert.equal(targetCaptured,1);
  agenda.active=true;locked=true;assert.equal(registry.execute('todo.status'),false);assert.equal(targetCaptured,1);
  agenda.docked=false;locked=false;assert.equal(prepare(),false);assert.equal(closes,1);
  assert.match(app,/showHelp:\(choices,\.\.\.args\)=>prepareWorkPanel\(\)&&workPanel\.showPrefix/);
  assert.match(app,/openChooser:\(\)=>prepareWorkPanel\(\)&&/);
  assert.match(app,/dialog\[open\]:not\(\.agenda-dialog\)/);
});

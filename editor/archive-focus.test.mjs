import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState,Compartment} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges,foldEffect} from '@codemirror/language';
import {prepareArchiveFocus} from './archive-focus.mjs';
import {planArchive} from './archive-model.mjs';

function fixture(text='# Keep\nBody\n## Next\nText'){
  const editable=new Compartment(),body={},editor={},control={},doc=new EventTarget(),win=new EventTarget();let focuses=0,locked=false;
  Object.assign(doc,{body,documentElement:{},activeElement:body,defaultView:win,hasFocus:()=>true});
  const make=text=>EditorState.create({doc:text,extensions:[markdown({base:markdownLanguage}),codeFolding(),editable.of(EditorState.readOnly.of(locked))]});
  const view={state:make(text),dom:{contains:el=>el===editor},dispatch:spec=>{view.state=view.state.update(spec).state;},focus(){assert.equal(locked,false);focuses++;doc.activeElement=editor;}};
  const vault={},session={vault,path:'source.md',hasDocument:true},context={vault,session};
  const move=target=>{doc.activeElement=target;const e=new Event('focusin');Object.defineProperty(e,'target',{value:target});doc.dispatchEvent(e);};
  return {doc,win,body,editor,control,view,vault,session,context,make,move,get focuses(){return focuses;},busy(value){locked=value;view.dispatch({effects:editable.reconfigure(EditorState.readOnly.of(value))});}};
}

test('Archive completion clamps removal position, unfolds enclosing startup fold and scrolls only after unlock',()=>{
  for(const anchor of [0,12,999]){
    const f=fixture(),helper=prepareArchiveFocus(f.view,{getContext:()=>f.context,vault:f.vault,path:f.session.path,document:f.doc});
    f.busy(true);f.view.dispatch({effects:foldEffect.of({from:6,to:f.view.state.doc.length})});
    helper.complete(f.view.state.doc,anchor);assert.equal(f.focuses,0);f.busy(false);helper.finish();
    assert.equal(f.focuses,1);assert.equal(f.view.state.selection.main.head,Math.min(anchor,f.view.state.doc.length));
    foldedRanges(f.view.state).between(0,f.view.state.doc.length,(from,to)=>assert.ok(!(f.view.state.selection.main.head>from&&f.view.state.selection.main.head<to)));
  }
  const f=fixture(''),h=prepareArchiveFocus(f.view,{getContext:()=>f.context,vault:f.vault,path:f.session.path,document:f.doc});h.complete(f.view.state.doc,999);h.finish();assert.equal(f.view.state.selection.main.head,0);
});

test('Archive focus refuses failed/uncompleted, stale, foreign control/window and changed source targets',()=>{
  for(const kind of ['failed','other-control','moved-away-back','window-blur','not-active-window','other-path','other-session-vault','other-vault','other-doc','readonly','missing']){
    const f=fixture(),h=prepareArchiveFocus(f.view,{getContext:()=>f.context,vault:f.vault,path:f.session.path,document:f.doc});
    if(kind!=='failed')h.complete(f.view.state.doc,12);
    if(kind==='other-control')f.move(f.control);
    if(kind==='moved-away-back'){f.move(f.control);f.move(f.body);}
    if(kind==='window-blur')f.win.dispatchEvent(new Event('blur'));
    if(kind==='not-active-window')f.doc.hasFocus=()=>false;
    if(kind==='other-path')f.session.path='other.md';
    if(kind==='other-session-vault')f.session.vault={};
    if(kind==='other-vault')f.context.vault={};
    if(kind==='other-doc')f.view.state=f.make('Changed');
    if(kind==='readonly')f.busy(true);
    if(kind==='missing')f.session.hasDocument=false;
    const selection=f.view.state.selection;h.finish();assert.equal(f.focuses,0,kind);assert.ok(f.view.state.selection.eq(selection));
  }
});

test('Actual archive handler and run return focus after unlock at removed first/middle/last subtree position',async()=>{
  const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
  const handler=app.slice(app.indexOf('async function archiveOne('),app.indexOf('\nasync function archiveRecovery('));
  const runner=app.slice(app.indexOf('async function run(action) {'),app.indexOf('\nconst actionIds='));
  for(const kind of ['first','middle','last','cancel','failure','control','vault-change']){
    const source='# First\nBody one\n# Middle\nBody two\n# Last\nBody three',f=fixture(source),handlers={},notices=[];
    const needle=kind==='first'?'First':kind==='last'?'Last':'Middle';f.view.dispatch({selection:{anchor:source.indexOf(needle)}});
    const planned=planArchive(f.view.state,{sourcePath:'source.md',now:new Date(2026,10,19,12)});assert.ok(planned.sourceChange);
    let saved=source,executions=0;
    f.session.save=async()=>{};f.session.open=async()=>{f.session.text=saved;};
    const archiveStorage={saveSettings:async()=>{},list:async()=>[],execute:async()=>{executions++;if(kind==='failure')throw Error('Synthetic write failure');saved=planned.sourceText;return {id:'synthetic'};}};
    const context={handlers,view:f.view,session:f.session,vault:f.vault,document:f.doc,save:()=>{},
      requireSynthetic(){},forceParsing:()=>true,planArchive:()=>planned,
      archiveDialog:async()=>kind==='cancel'?null:{path:'archive.md',standard:true,quickConfirm:true},
      prepareArchiveFocus:(view,opts)=>prepareArchiveFocus(view,{...opts,document:f.doc}),
      permission:async()=>{},normalizeVaultFilePath:p=>p,inspectVaultPath:async()=>({kind:'file',handle:{}}),archiveStorage,
      agendaIndex:{rebuild:async()=>{}},read:async()=>new TextEncoder().encode(source),TextCodec:class{constructor(bytes){this.text=new TextDecoder().decode(bytes);}},
      syncEditor:async()=>{f.view.state=f.make(f.session.text);if(kind==='last')f.view.dispatch({effects:foldEffect.of({from:7,to:f.view.state.doc.length})});},
      scan:async()=>{if(kind==='control')f.move(f.control);if(kind==='vault-change')f.session.vault={};},syncAgendaFileSelection(){},
      clearTimeout(){},setTimeout(){throw Error('Unexpected draft timer');},setBusy:value=>f.busy(value),render(){},status:m=>notices.push(m)};
    const create=new Function(...Object.keys(context),`let busy=false,timer,persistPending=false,archiveSettings={paths:[]};${runner}\n${handler};return handlers['archive.subtree'];`);
    const archive=create(...Object.values(context));await archive();
    if(['first','middle','last'].includes(kind)){
      assert.equal(f.focuses,1,kind);assert.equal(f.view.state.selection.main.head,Math.min(planned.sourceChange.from,planned.sourceText.length));assert.equal(f.view.state.doc.toString(),planned.sourceText);assert.equal(f.view.state.readOnly,false);
      foldedRanges(f.view.state).between(0,f.view.state.doc.length,(from,to)=>assert.ok(!(f.view.state.selection.main.head>from&&f.view.state.selection.main.head<to)));
    }else assert.equal(f.focuses,0,kind);
    if(kind==='cancel')assert.equal(executions,0);
    if(kind==='failure')assert.ok(notices.some(m=>m.includes('Synthetic write failure')));
  }
});

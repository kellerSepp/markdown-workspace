import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {EditorView,ViewPlugin,runScopeHandlers,keymap} from '@codemirror/view';
import {history,undo,redo,undoDepth,defaultKeymap,historyKeymap} from '@codemirror/commands';
import {createEmacsEditing,emacsMark} from './emacs-editing.mjs';
import {createKillRing} from './kill-ring.mjs';
import {createClipboardAdapter} from './clipboard-adapter.mjs';
import {emacsShortcut,withoutYankRedo} from './emacs-policy.mjs';
import {structureKeyboard} from './structure-keymap.mjs';
const pluginFacet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture({doc='Alpha Beta',selection={anchor:0},ring=createKillRing(),api,extra=[]}={}){
  let context={busy:false,hasDocument:true},state;const notices=[],writes=[];
  const clipboard=api??{readText:async()=>{throw {name:'NotAllowedError'};},writeText:async text=>{writes.push(text);}};
  const controller=createEmacsEditing({ring,clipboard:createClipboardAdapter({clipboard:()=>clipboard}),getContext:()=>context,notify:text=>notices.push(text)});
  const view={hasFocus:true,get state(){return state;},setTabFocusMode(value){this.tabFocus=value;},textDirectionAt:()=>0,
    moveByChar(range,forward){return EditorSelection.cursor(Math.max(0,Math.min(state.doc.length,range.head+(forward?1:-1))));},
    moveByGroup(range,forward){return EditorSelection.cursor(forward?state.doc.length:0);},
    moveToLineBoundary(range,forward){const line=state.doc.lineAt(range.head);return EditorSelection.cursor(forward?line.to:line.from);},
    moveVertically(range,forward){const line=state.doc.lineAt(range.head),next=state.doc.line(Math.max(1,Math.min(state.doc.lines,line.number+(forward?1:-1))));return EditorSelection.cursor(Math.min(next.to,next.from+range.head-line.from));}
  };
  view.dispatch=spec=>{const tr=spec.startState?spec:state.update(spec);state=tr.state;
    for(const listener of state.facet(EditorView.updateListener))listener({state,startState:tr.startState,docChanged:tr.docChanged,selectionSet:!!tr.selection,transactions:[tr]});};
  let lastExecution;
  const execute=id=>lastExecution=controller.run(view,id.replace('edit.emacs-',''));
  state=EditorState.create({doc,selection,extensions:[history(),controller.extension(execute),structureKeyboard(()=>true,()=>{},()=>{}),keymap.of(withoutYankRedo([...defaultKeymap,...historyKeymap])),extra]});
  function event(type,values={}){const e={key:'',type,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,repeat:false,isComposing:false,preventDefault(){this.defaultPrevented=true;},...values};
    for(const {plugin} of state.facet(pluginFacet))if(plugin.domEventHandlers?.[type]?.call({},e,view))break;return e;
  }
  return {view,controller,ring,writes,notices,event,run:id=>controller.run(view,id),context,get lastExecution(){return lastExecution;}};
}

test('Emacs mark extends ordinary and control arrows in both directions, cancels on Escape while preserving focus escape',()=>{
  const f=fixture({selection:{anchor:5}});assert.equal(f.run('mark'),true);
  f.event('keydown',{key:'ArrowLeft'});assert.equal(f.view.state.selection.main.anchor,5);assert.equal(f.view.state.selection.main.head,4);
  f.event('keydown',{key:'ArrowRight',ctrlKey:true});assert.equal(f.view.state.selection.main.anchor,5);assert.equal(f.view.state.selection.main.head,10);
  f.event('keydown',{key:'ArrowLeft',ctrlKey:true});assert.equal(f.view.state.selection.main.head,0);
  const e=f.event('keydown',{key:'Escape'});runScopeHandlers(f.view,e,'editor');assert.equal(f.view.state.field(emacsMark).active,false);assert.equal(f.view.tabFocus,true);
  assert.equal(undoDepth(f.view.state),0);
});
test('Emacs mark ends on blur, composition and mouse; other selections retain ordinary editor behavior',()=>{
  for(const kind of ['blur','compositionstart','mousedown']){const f=fixture();f.run('mark');f.event('keydown',{key:'ArrowRight'});f.event(kind);assert.equal(f.view.state.field(emacsMark).active,false);assert.equal(undoDepth(f.view.state),0);}
  const f=fixture({doc:'AB\nCD',selection:{anchor:1}});f.run('mark');f.event('keydown',{key:'ArrowDown'});assert.equal(f.view.state.selection.main.anchor,1);assert.equal(f.view.state.selection.main.head,4);
  f.run('cancel-mark');assert.equal(f.view.state.selection.main.empty,true);
});
test('Copy and cut secure exact reversed/multiline/Unicode selection before mutation and atomically restore history',async()=>{
  const doc='A😀\nBetaZ',f=fixture({doc,selection:{anchor:8,head:1}});const original=f.view.state.selection;
  assert.equal(await f.run('copy'),true);assert.equal(f.view.state.doc.toString(),doc);assert.equal(f.ring.current().text,doc.slice(1,8));assert.equal(f.writes.length,1);
  assert.equal(await f.run('cut'),true);assert.equal(f.view.state.doc.toString(),'AZ');assert.equal(undoDepth(f.view.state),1);
  assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),doc);assert.ok(f.view.state.selection.eq(original));assert.equal(redo(f.view),true);assert.equal(f.view.state.doc.toString(),'AZ');
});
test('Empty/oversized/ill-formed cut refuses without deletion; transaction filters cannot create a false success',async()=>{
  for(const selection of [{anchor:1},{anchor:0,head:10}]){
    const f=fixture({selection,ring:createKillRing({maxBytes:3})});assert.equal(await f.run('cut'),false);assert.equal(f.view.state.doc.toString(),'Alpha Beta');assert.equal(undoDepth(f.view.state),0);
  }
  const filtered=fixture({selection:{anchor:0,head:5},extra:EditorState.transactionFilter.of(tr=>tr.docChanged?[]:tr)});
  assert.equal(await filtered.run('cut'),false);assert.equal(filtered.view.state.doc.toString(),'Alpha Beta');assert.equal(filtered.ring.current().text,'Alpha');assert.equal(filtered.writes.length,0);
  const surrogate=fixture({doc:'😀',selection:{anchor:0,head:1}});assert.equal(await surrogate.run('cut'),false);assert.equal(surrogate.view.state.doc.toString(),'😀');
});
test('Yank inserts at head without deleting selection; each older replacement is a separate Undo unit',async()=>{
  const f=fixture({doc:'[]',selection:{anchor:0,head:1}});f.ring.add('old');f.ring.add('new');
  assert.equal(await f.run('yank'),true);assert.equal(f.view.state.doc.toString(),'[new]');assert.match(f.notices.at(-1),/internem/);
  assert.equal(f.run('yank-pop'),true);assert.equal(f.view.state.doc.toString(),'[old]');assert.equal(undoDepth(f.view.state),2);
  assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),'[new]');assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),'[]');
  assert.equal(redo(f.view),true);assert.equal(redo(f.view),true);assert.equal(f.view.state.doc.toString(),'[old]');assert.equal(f.run('yank-pop'),false);
});
test('Unchanged own clipboard preserves selected older Yank pointer, external changes import once, failures fall back explicitly',async()=>{
  let os='';const api={readText:async()=>os,writeText:async text=>{os=text;}};
  const f=fixture({doc:'AB',selection:{anchor:0,head:1},api});await f.run('copy');f.view.dispatch({selection:{anchor:1,head:2}});await f.run('copy');
  f.view.dispatch({selection:{anchor:2}});await f.run('yank');assert.equal(f.view.state.doc.toString(),'ABB');
  f.run('yank-pop');assert.equal(f.view.state.doc.toString(),'ABA');await f.run('yank');assert.equal(f.view.state.doc.toString(),'ABAA');assert.equal(os,'B');
  os='external';await f.run('yank');assert.equal(f.ring.current().text,'external');const size=f.ring.size;await f.run('yank');assert.equal(f.ring.size,size);
  api.readText=async()=>{throw Error('denied');};await f.run('yank');assert.match(f.notices.at(-1),/internem/);assert.equal(f.ring.current().text,'external');
});
test('Empty external clipboard is not a read failure; explicit external failure never inserts internal text',async()=>{
  const f=fixture({api:{readText:async()=>'',writeText:async()=>{}}});f.ring.add('old');assert.equal(await f.run('yank'),false);assert.equal(f.view.state.doc.toString(),'Alpha Beta');assert.match(f.notices.at(-1),/keinen Text/);
  const denied=fixture();denied.ring.add('internal');assert.equal(await denied.run('paste-external'),false);assert.equal(denied.view.state.doc.toString(),'Alpha Beta');
});
test('Async reads are discarded on selection/document/focus/busy/vault changes and newer requests',async()=>{
  for(const mutation of ['selection','document','focus','busy','vault','newrequest']){
    const d=deferred(),f=fixture({api:{readText:()=>d.promise}});const pending=f.run('yank');
    if(mutation==='selection')f.view.dispatch({selection:{anchor:2}});
    if(mutation==='document')f.view.dispatch({changes:{from:0,insert:'X'}});
    if(mutation==='focus'){f.view.hasFocus=false;f.event('blur');}
    if(mutation==='busy')f.context.busy=true;
    if(mutation==='vault')f.controller.invalidate({clearRing:true});
    if(mutation==='newrequest')f.run('mark');
    const expected=f.view.state.doc.toString();d.resolve('STALE');assert.equal(await pending,false,mutation);assert.equal(f.view.state.doc.toString(),expected,mutation);assert.equal(f.ring.size,0,mutation);
  }
});
test('Yank-chain refuses after cursor/reset/ordinary command and clear-ring clears memory without touching OS',async()=>{
  const f=fixture();f.ring.add('A');f.ring.add('B');await f.run('yank');f.view.dispatch({selection:f.view.state.selection});assert.equal(f.run('yank-pop'),false);
  await f.run('yank');f.event('keydown',{key:'F2'});assert.equal(f.run('yank-pop'),false);
  const before=f.writes.length;f.run('clear-ring');assert.equal(f.ring.size,0);assert.equal(f.writes.length,before);
  f.ring.add('keep');f.controller.invalidate();assert.equal(f.ring.size,1);f.controller.invalidate({clearRing:true});assert.equal(f.ring.size,0);
});
test('Editing shortcut guards preserve AltGr/IME/plain typing; repeated Cut and unavailable Yank do not fall into native handlers',()=>{
  for(const patch of [{isComposing:true},{keyCode:229},{getModifierState:()=>true},{altKey:true},{metaKey:true},{shiftKey:true}])assert.equal(emacsShortcut({key:'y',ctrlKey:true,...patch}),null);
  for(const patch of [{repeat:true},{busy:true},{readOnly:true}]){const f=fixture({extra:EditorState.readOnly.of(!!patch.readOnly)});
    if(patch.busy)f.context.busy=true;
    const e=f.event('keydown',{key:'x',ctrlKey:true,repeat:patch.repeat});assert.equal(e.defaultPrevented,true);assert.equal(f.view.state.doc.toString(),'Alpha Beta');
  }
  const f=fixture();
  f.view.hasFocus=false;assert.equal(f.event('keydown',{key:'y',ctrlKey:true}).defaultPrevented,undefined);
  assert.equal(withoutYankRedo([...defaultKeymap,...historyKeymap]).some(b=>b.key==='Mod-y'),false);
});

test('Resolved CM handler pipeline routes synthetic C-y to Yank rather than Redo; C-c remains untouched',async()=>{
  const f=fixture({selection:{anchor:0,head:5}});await f.run('cut');undo(f.view);assert.equal(f.view.state.doc.toString(),'Alpha Beta');
  const event=f.event('keydown',{key:'y',code:'KeyY',keyCode:89,ctrlKey:true,isTrusted:false});
  assert.equal(event.defaultPrevented,true);await f.lastExecution;
  assert.equal(f.view.state.doc.toString(),'AlphaAlpha Beta');assert.equal(undoDepth(f.view.state),1);
  assert.equal(f.event('keydown',{key:'c',code:'KeyC',keyCode:67,ctrlKey:true}).defaultPrevented,undefined);
  assert.equal(f.event('keydown',{key:'y',code:'KeyY',keyCode:89,ctrlKey:true,getModifierState:()=>true}).defaultPrevented,undefined);
});
test('Concurrent copy writes retain ordering, stale completion does not mutate newer state or ring',async()=>{
  const first=deferred(),writes=[],api={writeText:async text=>{writes.push(text);if(text==='Alpha')await first.promise;}};
  const f=fixture({selection:{anchor:0,head:5},api});const old=f.run('copy');await Promise.resolve();
  f.view.dispatch({selection:{anchor:6,head:10}});const latest=f.run('copy');first.resolve();await Promise.all([old,latest]);
  assert.deepEqual(writes,['Alpha','Beta']);assert.equal(f.view.state.doc.toString(),'Alpha Beta');assert.equal(f.ring.current().text,'Beta');assert.equal(f.ring.size,2);
});
test('Filtered Yank never becomes a replaceable Yank range; oversize external paste never truncates document',async()=>{
  const f=fixture({api:{readText:async()=> 'incoming'},extra:EditorState.transactionFilter.of(tr=>tr.docChanged?[]:tr)});
  assert.equal(await f.run('yank'),false);assert.equal(f.run('yank-pop'),false);assert.equal(f.view.state.doc.toString(),'Alpha Beta');assert.equal(undoDepth(f.view.state),0);
  const limited=fixture({api:{readText:async()=> 'oversize'},ring:createKillRing({maxBytes:3})});
  assert.equal(await limited.run('paste-external'),false);assert.equal(limited.ring.size,0);assert.equal(limited.view.state.doc.toString(),'Alpha Beta');
});

test('Native copy observes exact selected text without suppressing Copy or writing OS twice; native Cut secures before deleting',()=>{
  const f=fixture({selection:{anchor:5,head:0}});const copy=f.event('copy');assert.equal(copy.defaultPrevented,undefined);assert.equal(f.ring.current().text,'Alpha');assert.equal(f.writes.length,0);
  f.event('copy');assert.equal(f.ring.size,1);let copied;
  const cut=f.event('cut',{clipboardData:{setData(type,text){assert.equal(type,'text/plain');copied=text;assert.equal(f.view.state.doc.toString(),'Alpha Beta');assert.equal(f.ring.current().text,'Alpha');}}});
  assert.equal(cut.defaultPrevented,true);assert.equal(copied,'Alpha');assert.equal(f.view.state.doc.toString(),' Beta');assert.equal(f.ring.size,1);assert.equal(f.writes.length,0);undo(f.view);assert.equal(f.view.state.doc.toString(),'Alpha Beta');
});
test('Native Cut never deletes an empty line/oversize or on missing event clipboard; filter refusal leaves original intact',()=>{
  for(const args of [{selection:{anchor:0}},{selection:{anchor:0,head:5},ring:createKillRing({maxBytes:3})}]){
    const f=fixture(args),e=f.event('cut',{clipboardData:{setData(){assert.fail('Must not copy refused cut');}}});assert.equal(e.defaultPrevented,true);assert.equal(f.view.state.doc.toString(),'Alpha Beta');assert.equal(undoDepth(f.view.state),0);
  }
  const missing=fixture({selection:{anchor:0,head:5}});missing.event('cut');assert.equal(missing.view.state.doc.toString(),'Alpha Beta');assert.equal(missing.ring.current().text,'Alpha');
  const filtered=fixture({selection:{anchor:0,head:5},extra:EditorState.transactionFilter.of(tr=>tr.docChanged?[]:tr)});filtered.event('cut',{clipboardData:{setData(){}}});assert.equal(filtered.view.state.doc.toString(),'Alpha Beta');assert.equal(filtered.ring.current().text,'Alpha');assert.match(filtered.notices.at(-1),/verworfen/);
});
test('Native Paste replaces ordinary selection, imports once only after accepted change, and normalizes CRLF/CR/LF safely',()=>{
  for(const newline of ['\r\n','\r','\n']){
    const f=fixture({doc:'ABCDE',selection:{anchor:4,head:1}}),text='X'+newline+'Y';
    const e=f.event('paste',{clipboardData:{getData(type){assert.equal(type,'text/plain');return text;}}});assert.equal(e.defaultPrevented,true);assert.equal(f.view.state.doc.toString(),'AX\nYE');assert.equal(f.view.state.selection.main.head,4);assert.equal(f.ring.current().text,text);assert.equal(f.ring.size,1);
    undo(f.view);assert.equal(f.view.state.doc.toString(),'ABCDE');redo(f.view);assert.equal(f.view.state.doc.toString(),'AX\nYE');
    f.event('paste',{clipboardData:{getData:()=>text}});assert.equal(f.ring.size,1);
  }
  const rejected=fixture({extra:EditorState.transactionFilter.of(tr=>tr.docChanged?[]:tr)});rejected.event('paste',{clipboardData:{getData:()=> 'blocked'}});assert.equal(rejected.ring.size,0);assert.equal(rejected.view.state.doc.toString(),'Alpha Beta');assert.match(rejected.notices.at(-1),/kein Ringimport/);
});
test('Native Paste refuses overbudget/invalid/empty payload without truncation or importing, no event-data fallback to stale text',()=>{
  for(const text of ['oversize','\ud800','']){const f=fixture({ring:createKillRing({maxBytes:3})});f.ring.add('old');f.event('paste',{clipboardData:{getData:()=>text}});assert.equal(f.view.state.doc.toString(),'Alpha Beta');assert.equal(f.ring.size,1);assert.equal(f.ring.current().text,'old');assert.equal(undoDepth(f.view.state),0);}
  const missing=fixture();assert.equal(missing.event('paste').defaultPrevented,true);assert.equal(missing.ring.size,0);
  const throwing=fixture();assert.equal(throwing.event('paste',{clipboardData:{getData(){throw Error('denied');}}}).defaultPrevented,true);assert.equal(throwing.ring.size,0);assert.equal(throwing.view.state.doc.toString(),'Alpha Beta');
});
test('Yank and Pop ranges follow actual CM text length for CRLF/CR, protecting surrounding text and Undo/Redo',async()=>{
  for(const newline of ['\r\n','\r','\n']){
    const f=fixture({doc:'[]',selection:{anchor:1}});f.ring.add('old'+newline+'text');f.ring.add('new'+newline+'text');await f.run('yank');assert.equal(f.view.state.doc.toString(),'[new\ntext]');assert.equal(f.view.state.selection.main.head,9);
    f.run('yank-pop');assert.equal(f.view.state.doc.toString(),'[old\ntext]');assert.equal(f.view.state.selection.main.head,9);undo(f.view);assert.equal(f.view.state.doc.toString(),'[new\ntext]');redo(f.view);assert.equal(f.view.state.doc.toString(),'[old\ntext]');
  }
});
test('Native clipboard events invalidate pending async Yank, busy/readonly cut and paste cannot mutate or import',async()=>{
  const d=deferred(),f=fixture({selection:{anchor:0,head:5},api:{readText:()=>d.promise}}),pending=f.run('yank');f.event('copy');d.resolve('STALE');assert.equal(await pending,false);assert.equal(f.view.state.doc.toString(),'Alpha Beta');assert.equal(f.ring.current().text,'Alpha');
  for(const restricted of ['busy','readonly']){
    const g=fixture({selection:{anchor:0,head:5},extra:EditorState.readOnly.of(restricted==='readonly')});g.context.busy=restricted==='busy';g.event('cut',{clipboardData:{setData(){assert.fail();}}});g.event('paste',{clipboardData:{getData:()=> 'bad'}});assert.equal(g.view.state.doc.toString(),'Alpha Beta');assert.equal(g.ring.size,0);
  }
});

test('Repeated copy moves stable deduplicated entry to front; subsequent M-y chooses previous copy without reordering',async()=>{
  let os='';const f=fixture({doc:'ABC',api:{writeText:async text=>{os=text;},readText:async()=>os}});
  for(const n of [0,1,2]){f.view.dispatch({selection:{anchor:n,head:n+1}});await f.run('copy');}
  const b=f.ring.list().find(e=>e.text==='B');f.view.dispatch({selection:{anchor:1,head:2}});await f.run('copy');
  assert.deepEqual(f.ring.list().map(e=>e.text),['B','C','A']);assert.equal(f.ring.current().id,b.id);assert.equal(f.ring.size,3);
  f.view.dispatch({selection:{anchor:3}});await f.run('yank');assert.equal(f.view.state.doc.toString(),'ABCB');f.run('yank-pop');assert.equal(f.view.state.doc.toString(),'ABCC');assert.deepEqual(f.ring.list().map(e=>e.text),['B','C','A']);
});

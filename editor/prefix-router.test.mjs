import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {EditorView,ViewPlugin,keymap} from '@codemirror/view';
import {history,undoDepth} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {createPrefixRouter,PREFIX_BINDINGS} from './prefix-router.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {structuralTab,resetFocusNavigation,orgTab,structureKeyboard} from './structure-keymap.mjs';
import {createEmacsEditing} from './emacs-editing.mjs';
import {markdownFolding,guardedFold,stagedUnfold} from './folding.mjs';
import {foldedRanges} from '@codemirror/language';

function fixture(){
  const context={busy:false,hasDocument:true,synthetic:true,vault:{}},calls=[],notices=[];let shown=null,hidden=0;
  const view={hasFocus:true,state:EditorState.create({doc:'# Title\nBody\n## Child\nMore',selection:{anchor:8,head:10},extensions:[history(),markdown()]}),setTabFocusMode(value){this.tabFocus=value;}};
  const registry=createCommandRegistry(commandDefinitions(Object.fromEntries(PREFIX_BINDINGS.map(b=>[b.id,()=>{calls.push(b.id);return true;}]))),()=>({...context,state:view.state}),s=>notices.push(s));
  const router=createPrefixRouter({registry,getContext:()=>context,showHelp:(choices,choose,cancel)=>{shown={choices,choose,cancel};},hideHelp:()=>hidden++,notify:s=>notices.push(s)});
  const down=(key,patch={})=>{const event={key,preventDefault(){this.defaultPrevented=true;},...patch};const handled=router.keyDown(event,view);return {...event,handled};};
  const start=()=>down('c',{ctrlKey:true});const release=()=>router.keyUp({key:'c'});
  return {view,router,context,calls,notices,down,start,release,get shown(){return shown;},get hidden(){return hidden;}};
}

test('Approved plain and modifier sequences route to existing Registry IDs after keyup; start preserves exact state/history',()=>{
  for(const binding of PREFIX_BINDINGS){const f=fixture();if(binding.id==='structure.refile-h1'||binding.id==='todo.status')f.view.state=EditorState.create({doc:'# Source\nBody\n# Target',selection:{anchor:3},extensions:[history(),markdown()]});if(binding.id==='todo.reload')f.view.state=EditorState.create({doc:'#+SEQ_TODO: TODO(t) | DONE(d)\n# TODO Task',selection:{anchor:3},extensions:[history(),markdown()]});const before=f.view.state;
    if(binding.id.startsWith('planning.'))f.view.state=EditorState.create({doc:'# Heading',extensions:[history(),markdown()]});
    const expectedState=f.view.state;
    assert.equal(f.start().defaultPrevented,true);assert.equal(f.view.state,expectedState);assert.equal(undoDepth(f.view.state),0);
    assert.deepEqual(f.shown.choices.map(c=>c.id),PREFIX_BINDINGS.map(c=>c.id));
    f.release();assert.equal(f.down(binding.key,{ctrlKey:!!binding.ctrl}).handled,true);assert.deepEqual(f.calls,[binding.id]);assert.equal(f.router.active,false);assert.equal(f.hidden,1);
  }
});
test('Plain typing and outside-editor Copy stay native; modifiers/IME/AltGr never start a prefix',()=>{
  for(const patch of [{ctrlKey:false},{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}]){
    const f=fixture();assert.equal(f.down('c',{ctrlKey:true,...patch}).handled,false);assert.equal(f.router.active,false);
  }
  const f=fixture();f.view.hasFocus=false;assert.equal(f.start().defaultPrevented,undefined);
  for(const key of ['1','2','3','g','j','a','w'])assert.equal(f.down(key).handled,false);
});
test('Repeat cannot start/complete; key release is mandatory; second C-c is invalid and never copies',()=>{
  const f=fixture();assert.equal(f.down('c',{ctrlKey:true,repeat:true}).handled,true);assert.equal(f.router.active,false);
  f.start();f.down('c',{ctrlKey:true,repeat:true});assert.equal(f.router.active,true);
  f.down('1');assert.equal(f.router.active,false);assert.deepEqual(f.calls,[]);
  f.start();f.release();f.down('1',{repeat:true});assert.equal(f.router.active,true);f.down('1');assert.deepEqual(f.calls,['fold.collapse']);
  f.start();f.release();assert.equal(f.start().defaultPrevented,true);assert.equal(f.router.active,false);assert.equal(f.calls.length,1);
});
test('Invalid sequence consumed once without text insertion or replay; Escape/C-g and modifiers cancel',()=>{
  for(const [key,patch] of [['z',{}],['4',{}],['1',{ctrlKey:true}],['1',{shiftKey:true}],['Escape',{}],['g',{ctrlKey:true}],['Shift',{}],['Meta',{metaKey:true}],['a',{getModifierState:()=>true}],['Process',{isComposing:true}],['Process',{keyCode:229}]]){
    const f=fixture(),state=f.view.state;f.start();f.release();f.down(key,patch);
    assert.equal(f.router.active,false,key);assert.deepEqual(f.calls,[],key);assert.equal(f.view.state,state,key);
    if(key==='Escape')assert.equal(f.view.tabFocus,true);
    assert.equal(f.down('1').handled,false);
  }
});
test('Busy/read-only/missing document/focus and changed state refuse stale keyboard and mouse targets',()=>{
  for(const mode of ['busy','readonly','file','selection','document','focus','missing']){
    for(const mouse of [false,true]){const f=fixture();f.start();f.release();
      if(mode==='busy')f.context.busy=true;
      if(mode==='missing')f.context.hasDocument=false;
      if(mode==='readonly')f.view.state=EditorState.create({doc:f.view.state.doc,extensions:EditorState.readOnly.of(true)});
      if(mode==='file')f.view.state=EditorState.create({doc:f.view.state.doc});
      if(mode==='selection')f.view.state=f.view.state.update({selection:{anchor:0}}).state;
      if(mode==='document')f.view.state=f.view.state.update({changes:{from:0,insert:'X'}}).state;
      if(mode==='focus')f.view.hasFocus=false;
      if(mouse&&mode==='focus'){f.router.cancel();} // Actual blur cancels before pointer callback.
      if(mouse)f.shown.choose('1');else f.down('1');assert.deepEqual(f.calls,[],mode);
    }
  }
});
test('Registry availability is checked again, including blocked folding context; help reports reasons',()=>{
  const f=fixture();f.view.state=EditorState.create({doc:'plain',extensions:markdown()});f.start();
  assert.ok(f.shown.choices.filter(c=>c.id!=='agenda.dispatch').every(c=>!c.enabled&&c.reason));assert.equal(f.shown.choices.find(c=>c.id==='agenda.dispatch').enabled,true);f.release();f.down('1');assert.deepEqual(f.calls,[]);assert.ok(f.notices.length);
  for(const mode of ['busy','missing','readonly']){const g=fixture();if(mode==='busy')g.context.busy=true;if(mode==='missing')g.context.hasDocument=false;if(mode==='readonly')g.view.state=EditorState.create({extensions:EditorState.readOnly.of(true)});g.start();assert.equal(g.router.active,false);}
});
test('Extension hooks cancel on blur, composition, mouse, selection/update and destruction; repeated lifecycle is bounded',()=>{
  const f=fixture(),state=EditorState.create({extensions:f.router.extension()});
  const pluginFacet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
  const handlers=state.facet(pluginFacet).map(p=>p.plugin.domEventHandlers).find(h=>h?.keydown);
  for(let i=0;i<100;i++)for(const hook of ['blur','compositionstart','mousedown']){f.start();handlers[hook]({},f.view);assert.equal(f.router.active,false);}
  f.start();for(const listener of state.facet(EditorView.updateListener))listener({state:state.update({selection:{anchor:0}}).state});assert.equal(f.router.active,false);
  f.start();const lifecycle=state.facet(pluginFacet).find(p=>!p.plugin.domEventHandlers);lifecycle.plugin.create(f.view).destroy();assert.equal(f.router.active,false);
});

test('Prefix Escape enables shared structural/Org Tab focus escape; refocus resets it',()=>{
  const f=fixture();f.view.state=EditorState.create({doc:'# Heading\nBody',selection:{anchor:2},extensions:markdown()});
  const original=f.view.state;
  f.start();f.release();f.down('Escape');
  assert.equal(structuralTab(f.view,false,()=>true,()=>{},()=>assert.fail('Tab must escape')),false);
  assert.equal(structuralTab(f.view,true,()=>true,()=>{},()=>assert.fail('Shift-Tab must escape')),false);
  assert.equal(orgTab(f.view,false,()=>true,()=>assert.fail('Org Tab must escape')),null);
  assert.equal(f.view.state,original);
  resetFocusNavigation(f.view);assert.equal(f.view.tabFocus,false);
  let invoked='';assert.equal(structuralTab(f.view,false,()=>true,()=>{},id=>invoked=id),true);assert.equal(invoked,'structure.heading-demote');
});

test('Resolved CodeMirror pipeline routes Prefix before Copy/mark handlers and runs existing folding; Escape then Tab escapes heading/list in both modes',()=>{
  const pluginFacet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
  for(const doc of ['# Heading\nBody\n## Child\nText','- First\n- Second'])for(const orgMode of [false,true]){
    let state,nativeCopy=0;const calls=[],view={hasFocus:true,get state(){return state;},focus(){},setTabFocusMode(value){this.tabFocus=value;},dispatch(spec){
      const tr=state.update(spec);state=tr.state;for(const fn of state.facet(EditorView.updateListener))fn({state,docChanged:tr.docChanged,selectionSet:!!tr.selection});
    }};
    const registry=createCommandRegistry(commandDefinitions(Object.fromEntries([
      ['fold.collapse',()=>guardedFold(view)],['fold.reveal',()=>stagedUnfold(view)],['fold.open',()=>stagedUnfold(view,undefined,true)]
    ].map(([id,run])=>[id,()=>{calls.push(id);return run();}]))),()=>({state,busy:false,hasDocument:true}));
    const prefix=createPrefixRouter({registry}),emacs=createEmacsEditing();
    state=EditorState.create({doc,selection:{anchor:2},extensions:[prefix.extension(),emacs.extension(()=>assert.fail('No mark command expected')),
      markdown(),history(),markdownFolding(),structureKeyboard(()=>true,()=>{},()=>assert.fail('No structure command expected'),()=>orgMode),
      keymap.of([{key:'Ctrl-c',run:()=>{nativeCopy++;return true;}}])]});
    const dispatch=(key,patch={})=>{
      const event={type:'keydown',key,keyCode:key==='Tab'?9:0,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,preventDefault(){this.defaultPrevented=true;},...patch};
      for(const {plugin} of state.facet(pluginFacet)){if(event.defaultPrevented)break;if(plugin.domEventHandlers?.[event.type]?.call({},event,view)){event.preventDefault();break;}}
      return event;
    };
    const before=state;assert.equal(dispatch('c',{ctrlKey:true}).defaultPrevented,true);assert.equal(state,before);
    dispatch('c',{type:'keyup'});dispatch('1');assert.equal(nativeCopy,0);assert.deepEqual(calls,['fold.collapse']);
    assert.equal(state.doc.toString(),doc);assert.equal(undoDepth(state),0);
    if(doc.startsWith('#')){assert.ok(foldedRanges(state).size>0);dispatch('c',{ctrlKey:true});dispatch('c',{type:'keyup'});dispatch('3');assert.equal(foldedRanges(state).size,0);}
    dispatch('c',{ctrlKey:true});assert.equal(dispatch('Escape').defaultPrevented,true);
    assert.equal(dispatch('Tab').defaultPrevented,undefined);assert.equal(dispatch('Tab',{shiftKey:true}).defaultPrevented,undefined);
    assert.equal(view.tabFocus,true);assert.equal(state.doc.toString(),doc);assert.equal(undoDepth(state),0);
  }
});

test('Real Alt then repeated arrows navigate only active released prefix; Enter executes once',()=>{
  const f=fixture(),moves=[];let activate=0;
  const router=createPrefixRouter({registry:{get:id=>({name:id}),availability:()=>({enabled:true}),execute:id=>{f.calls.push(id);return true;}},
    moveHelp:d=>moves.push(d),activateHelp:()=>{activate++;router.choose(f.view,'2');}});
  const down=(key,patch={})=>{const e={type:'keydown',key,preventDefault(){this.defaultPrevented=true;},...patch};return router.keyDown(e,f.view);};
  down('c',{ctrlKey:true});down('Alt',{altKey:true,code:'AltLeft'});assert.equal(router.active,true);
  down('ArrowDown',{altKey:true});assert.deepEqual(moves,[]);
  router.keyUp({key:'c'});down('Alt',{altKey:true,code:'AltLeft'});
  down('ArrowDown',{altKey:true});down('ArrowDown',{altKey:true,repeat:true});down('ArrowUp',{altKey:true});
  assert.deepEqual(moves,[1,1,-1]);down('Enter',{repeat:true});assert.equal(activate,0);
  down('Enter');down('Enter',{repeat:true});assert.equal(activate,1);assert.deepEqual(f.calls,['fold.reveal']);
  for(const patch of [{altKey:true,ctrlKey:true},{altKey:true,shiftKey:true},{altKey:true,metaKey:true},{altKey:true,getModifierState:()=>true},{altKey:true,isComposing:true}]){
    down('c',{ctrlKey:true});router.keyUp({key:'c'});assert.equal(down('ArrowDown',patch),false);assert.equal(router.active,false);
  }
  down('c',{ctrlKey:true});assert.equal(down('x',{altKey:true}),false);assert.equal(router.active,false);
});

test('Mouse selection also respects release gate; fresh Registry availability rejects disabled command',()=>{
  const f=fixture();f.start();f.shown.choose('1');assert.deepEqual(f.calls,[]);assert.equal(f.router.active,false);
  f.start();f.release();f.context.busy=true;f.shown.choose('1');assert.deepEqual(f.calls,[]);
});

test('Resolved precedence preserves left Alt keyup, protects right Alt and keeps Org arrows outside prefix',()=>{
  const pluginFacet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
  const f=fixture(),moves=[],commands=[];
  const router=createPrefixRouter({registry:{get:id=>({name:id}),availability:()=>({enabled:true}),execute:()=>true},moveHelp:d=>moves.push(d)});
  const state=EditorState.create({doc:'# Heading\nBody',selection:{anchor:2},extensions:[markdown(),router.extension(),structureKeyboard(()=>true,()=>{},id=>commands.push(id))]});
  f.view.state=state;
  const dispatch=(type,key,patch={})=>{
    const event={type,key,preventDefault(){this.defaultPrevented=true;},...patch};
    for(const {plugin} of state.facet(pluginFacet))if(plugin.domEventHandlers?.[type]?.(event,f.view)){event.preventDefault();break;}
    return event;
  };
  dispatch('keydown','c',{ctrlKey:true});dispatch('keyup','c');
  assert.equal(dispatch('keydown','Alt',{altKey:true,code:'AltLeft',location:1}).defaultPrevented,true);
  assert.equal(router.active,true);dispatch('keydown','ArrowDown',{altKey:true,repeat:true});
  assert.deepEqual(moves,[1]);assert.deepEqual(commands,[]);
  assert.equal(dispatch('keyup','Alt',{code:'AltLeft',location:1}).defaultPrevented,true);assert.equal(router.active,true);
  router.cancel();dispatch('keydown','ArrowDown',{altKey:true});assert.equal(commands.length,1);
  for(const patch of [{code:'AltRight'},{location:2}]){
    dispatch('keydown','c',{ctrlKey:true});dispatch('keyup','c');
    assert.equal(dispatch('keydown','Alt',{altKey:true,...patch}).defaultPrevented,undefined);assert.equal(router.active,false);
  }
});

test('C-c w requires unmodified w after release; Ctrl+w, modifiers, early/repeated follow key refuse Refile',()=>{
 for(const patch of [{ctrlKey:true},{shiftKey:true},{altKey:true},{metaKey:true},{getModifierState:()=>true},{isComposing:true},{keyCode:229},{repeat:true}]){
  const f=fixture();f.view.state=EditorState.create({doc:'# Source\nbody\n# Target',selection:{anchor:3},extensions:markdown()});f.start();f.release();f.down('w',patch);assert.deepEqual(f.calls,[]);
 }
 const f=fixture();f.view.state=EditorState.create({doc:'# Source\nbody\n# Target',selection:{anchor:3},extensions:markdown()});
 f.start();f.down('w');assert.deepEqual(f.calls,[]);
 f.start();f.release();f.down('Control',{ctrlKey:true});assert.equal(f.router.active,true);f.router.keyUp({key:'Control'});f.down('w');assert.deepEqual(f.calls,['structure.refile-h1']);
});

test('Resolved CodeMirror prefix pipeline consumes unmodified w; outside prefix w types and Alt+w remains Copy',()=>{
 const pluginFacet=ViewPlugin.define(()=>({})).extension.at(-1).facet,calls=[],edits=[];let state,typed=0;
 const view={hasFocus:true,get state(){return state;}};
 const registry=createCommandRegistry(commandDefinitions({'structure.refile-h1':()=>{calls.push('refile');return true;}}),()=>({state,hasDocument:true}));
 const router=createPrefixRouter({registry}),emacs=createEmacsEditing();
 state=EditorState.create({doc:'# Source\nbody\n# Target',selection:{anchor:3},extensions:[markdown(),router.extension(),emacs.extension(id=>{edits.push(id);return true;}),keymap.of([{key:'w',run:()=>{typed++;return false;}}])]});
 const send=(key,patch={})=>{const e={key,type:'keydown',ctrlKey:true,preventDefault(){this.defaultPrevented=true;},...patch};for(const {plugin} of state.facet(pluginFacet)){if(plugin.domEventHandlers?.[e.type]?.call({},e,view)){e.preventDefault();break;}}return e;};
 assert.equal(send('w',{ctrlKey:false}).defaultPrevented,undefined);assert.equal(typed,1);
 send('w',{ctrlKey:false,altKey:true});assert.deepEqual(edits,['edit.emacs-copy']);assert.deepEqual(calls,[]);
 send('c');send('c',{type:'keyup'});send('Control',{type:'keyup',ctrlKey:false});assert.equal(send('w',{ctrlKey:false}).defaultPrevented,true);assert.deepEqual(calls,['refile']);assert.equal(typed,1);
});

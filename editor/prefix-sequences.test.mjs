import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {createPrefixRouter} from './prefix-router.mjs';

function fixture(bindings){
 const view={hasFocus:true,state:EditorState.create({doc:'# H\nBody',extensions:markdown()}),setTabFocusMode(){}},calls=[],notices=[];let shown;
 const router=createPrefixRouter({bindings,registry:{get:id=>({name:id}),availability:()=>({enabled:true}),execute:(id,args)=>{calls.push({id,args});return true;}},showHelp:(choices,choose,cancel,meta)=>{shown={choices,choose,cancel,meta};},notify:m=>notices.push(m)});
 const down=(key,patch={})=>{const e={key,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...patch};router.keyDown(e,view);return e;};
 const prefix=()=>{down('c',{ctrlKey:true});router.keyUp({key:'c'});};
 const arg=()=>{prefix();down('u');};
 return {view,calls,notices,router,down,prefix,arg,get shown(){return shown;}};
}

test('Archive sequence tree descends into local next-key help and s/a execute same full subtree action',()=>{
 for(const key of ['s','a']){const f=fixture();f.prefix();assert.ok(f.shown.choices.some(c=>c.key==='x'&&c.children));f.down('x');assert.equal(f.router.active,true);assert.equal(f.calls.length,0);assert.equal(f.shown.meta.sequence,'C-c x');assert.deepEqual(f.shown.choices.map(c=>c.key),['s','a']);f.down(key);assert.deepEqual(f.calls,[{id:'archive.subtree',args:undefined}]);assert.equal(f.router.active,false);}
});

test('C-c u activates one-shot modifier node and both archive aliases pass it exactly once',()=>{
 for(const key of ['s','a']){const f=fixture();f.arg();assert.equal(f.shown.meta.argument,true);assert.equal(f.shown.meta.sequence,'C-c u');f.down('x');assert.equal(f.shown.meta.sequence,'C-c u x');f.down(key);assert.deepEqual(f.calls,[{id:'archive.subtree',args:{universal:true}}]);f.prefix();f.down('x');f.down('s');assert.equal(f.calls[1].args,undefined);}
});

test('Unsupported argument commands are consumed, cannot bubble to global save, and never execute normal command',()=>{
 for(const key of ['s','x','y']){const f=fixture();f.arg();const e=f.down(key,{ctrlKey:true});assert.equal(e.prevented,true);assert.equal(e.stopped,true);assert.equal(f.calls.length,0);assert.equal(f.router.active,false);}
 const f=fixture();f.arg();assert.deepEqual(f.shown.choices.map(c=>c.key),['x']);f.down('1');assert.equal(f.calls.length,0);f.prefix();f.down('1');assert.equal(f.calls.length,1);assert.equal(f.calls[0].args,undefined);
 for(const modifier of ['altKey','metaKey']){const f=fixture();f.arg();const e=f.down('y',{[modifier]:true});assert.equal(e.prevented,true);assert.equal(e.stopped,true);assert.equal(f.calls.length,0);assert.equal(f.router.active,false);}
});

test('Argument/sequence cancellation clears on Escape, C-g, stale state, foreign focus, IME and unsupported repetition',()=>{
 for(const kind of ['escape','quit','focus','stale','ime','repeated-u']){const f=fixture();f.arg();
  if(kind==='escape')f.down('Escape');if(kind==='quit')f.down('g',{ctrlKey:true});if(kind==='focus'){f.view.hasFocus=false;f.down('c',{ctrlKey:true});f.view.hasFocus=true;}if(kind==='stale'){f.view.state=f.view.state.update({changes:{from:0,insert:'x'}}).state;f.prefix();}if(kind==='ime')f.down('Process',{isComposing:true});if(kind==='repeated-u')f.down('u',{ctrlKey:true});
  assert.equal(f.router.active,false,kind);assert.equal(f.calls.length,0,kind);f.prefix();f.down('x');f.down('s');assert.equal(f.calls[0].args,undefined,kind);
 }
});

test('Custom deeper trees use same router rather than archive-specific key conditions',()=>{
 const f=fixture([{key:'j',name:'One',children:[{key:'k',name:'Two',children:[{key:'l',id:'test.deep'}]}]}]);f.prefix();f.down('j');f.shown.choose('k');assert.equal(f.shown.meta.sequence,'C-c j k');f.shown.choose('l');assert.equal(f.calls[0].id,'test.deep');
});

test('Standalone Ctrl+U stays native and never starts archive routing or argument state',()=>{
 for(const patch of [{},{repeat:true},{shiftKey:true}]){const f=fixture();const event=f.down('u',{ctrlKey:true,...patch});assert.equal(event.prevented,undefined);assert.equal(event.stopped,undefined);assert.equal(f.router.active,false);assert.equal(f.calls.length,0);f.prefix();f.down('x');f.down('s');assert.equal(f.calls[0].args,undefined);}
});

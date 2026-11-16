import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {createAgendaIndex} from './agenda-index.mjs';
import {archiveDialog} from './archive-dialog.mjs';
import {readFile} from 'node:fs/promises';

function root(entries){return {name:'synthetic',kind:'directory',async *entries(){yield* Object.entries(entries);},async getFileHandle(name){return entries[name];}};}
function file(text,counter){return {kind:'file',async getFile(){counter.reads++;return {async arrayBuffer(){return new TextEncoder().encode(text).buffer;}};}};}
test('QA: all configured archives are unread on scan/update/open/refresh; ordinary same basename stays indexed',async()=>{
  const excluded={reads:0},normal={reads:0};
  const vault=root({'private.md':file('# TODO Hidden',excluded),'work.md':file('# TODO Hidden2',excluded),'archive.md':file('# TODO Visible',normal)});
  const index=createAgendaIndex({yieldTask:async()=>{},isArchive:path=>['private.md','work.md'].includes(path)});
  await index.selectVault(vault);assert.equal(excluded.reads,0);assert.equal(index.snapshot().records.length,1);
  await index.updateFile('private.md',vault);await index.setEditor(EditorState.create({doc:'# TODO Open archive',extensions:markdown()}),'private.md',vault);
  await index.rebuild();assert.equal(excluded.reads,0);assert.deepEqual(index.query({type:'todo'}).map(r=>r.path),['archive.md']);
  await index.selectVault(null);assert.equal(index.snapshot().records.length,0);
});
function dom(){const all=[];class Node{constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';}append(...nodes){this.children.push(...nodes);}setAttribute(){}addEventListener(type,fn){this.listeners[type]=fn;}close(){this.closed=true;}remove(){this.removed=true;}showModal(){}focus(){this.focused=true;}emit(key,extra={}){let prevented=false;this.listeners.keydown?.({key,...extra,preventDefault(){prevented=true;},stopPropagation(){}});return prevented;}}
  return {all,body:new Node('body'),createElement(tag){const node=new Node(tag);all.push(node);return node;},createTextNode(text){return {text};}};
}
test('QA: y/n is confined to explicit warning, modifiers/IME ignored, n cancels without a path result',async()=>{
  const doc=dom(),promise=archiveDialog({settings:{paths:['a.md'],defaultPath:'a.md',quickConfirm:true},openTasks:2,document:doc});
  const dialog=doc.all.find(n=>n.tag==='dialog'),yes=doc.all.find(n=>n.tag==='button');
  assert.equal(dialog.emit('y'),false);assert.equal(dialog.closed,undefined);
  yes.onclick();assert.equal(dialog.emit('y',{isComposing:true}),false);assert.equal(dialog.emit('y',{altKey:true}),false);
  assert.equal(dialog.emit('n'),true);assert.equal(await promise,null);assert.equal(dialog.removed,true);
});
test('QA: confirmed y retains configured target and preference; disabled quick mode uses explicit button',async()=>{
  for(const quickConfirm of [true,false]){const doc=dom(),promise=archiveDialog({settings:{paths:['a.md'],defaultPath:'a.md',quickConfirm},openTasks:1,document:doc});
    const dialog=doc.all.find(n=>n.tag==='dialog'),yes=doc.all.find(n=>n.tag==='button');yes.onclick();if(quickConfirm)dialog.emit('y');
    assert.deepEqual(await promise,{path:'a.md',standard:true,quickConfirm});}
});
test('QA: recovery error path synchronizes source and vault settings are loaded before adopting selected vault',async()=>{
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
  const recovery=app.slice(app.indexOf('async function archiveRecovery'),app.indexOf("handlers['archive.resume']"));
  assert.match(recovery,/failure/);assert.match(recovery,/session\.open/);assert.match(recovery,/syncEditor/);
  const choose=app.slice(app.indexOf("bind('choose'"),app.indexOf("bind('grant'"));
  assert.ok(choose.indexOf('loadSettings(selected)')<choose.indexOf('vault = selected'));
});

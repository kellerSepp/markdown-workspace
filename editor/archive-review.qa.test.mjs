import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {todoRules} from './todo.mjs';
import {planArchiveBatch,runArchiveBatch} from './archive-batch.mjs';
import {planArchive} from './archive-model.mjs';
import {createPrefixRouter} from './prefix-router.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {archiveCandidateDialog} from './archive-candidate-dialog.mjs';
const make=(doc,anchor=0)=>EditorState.create({doc,selection:{anchor},extensions:[markdown({base:markdownLanguage}),todoRules]});

test('QA batch ignores protected example headings at preamble/example positions and still offers real safe H1',()=>{
 for(const example of ['> # Example\n> text','- # Example\n  text','```text\n# Example\n```','Example\n=======']){
  const doc='Preamble\n\n'+example+'\n\n# DONE Safe\nBody';
  for(const anchor of [0,doc.indexOf(example),doc.indexOf('Example')]){
   const plan=planArchiveBatch(make(doc,anchor),{sourcePath:'qa.md'});
   assert.equal(plan.message,undefined,example);assert.deepEqual(plan.candidates.map(c=>c.title),['DONE Safe']);
  }
 }
});

test('QA direct candidates honor custom rules and open descendants without extracting closed grandchildren',()=>{
 const doc='#+SEQ_TODO: ACTIVE(a) ONHOLD(h) | FINISHED(f)\n# Parent\n## FINISHED X\n### ONHOLD Wait\n#### FINISHED Grandchild\nText\n## Info\n### More info\nText\n## FINISHED X\nText';
 const plan=planArchiveBatch(make(doc,doc.indexOf('# Parent')+2),{sourcePath:'qa.md'});
 assert.deepEqual(plan.candidates.map(c=>c.title),['Info','FINISHED X']);
 assert.match(plan.candidates[0].original,/### More info/);
});

test('QA identical titles retain skipped bytes and stop on second partial/failed completion',async()=>{
 for(const failure of ['throw','partial','undefined']){
  const doc='# P\n## DONE Same\nOne\n## DONE Same\nTwo\n## DONE Same\nThree\n## DONE Same\nFour';let state=make(doc,2),calls=0,prompts=0;
  const plan=planArchiveBatch(state,{sourcePath:'qa.md'});
  const result=await runArchiveBatch({plan,getState:()=>state,current:()=>true,confirm:async()=>++prompts===2?'n':'y',archive:async c=>{
   calls++;if(calls===2){if(failure==='throw')throw Error('QA failure');if(failure==='partial')state=make(state.doc.sliceString(0,c.from)+state.doc.sliceString(c.to));return undefined;}
   const p=planArchive(state.update({selection:{anchor:c.from}}).state,{sourcePath:'qa.md'});assert.equal(p.original,c.original);state=make(p.sourceText);return true;
  }});
  assert.deepEqual(result,{archived:1,skipped:1,stopped:true});assert.equal(calls,2);assert.equal(prompts,3);assert.match(state.doc.toString(),/Two/);assert.match(state.doc.toString(),/Four/);
 }
});

test('QA actual app refuses source/session races during target choice before candidate prompts or writes',async()=>{
 const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
 const code=app.slice(app.indexOf('async function archiveBatch(){'),app.indexOf('\nasync function archiveOne('));
 for(const kind of ['source','session']){
  const vault={},session={vault,path:'qa.md',hasDocument:true},view={state:make('# P\n## DONE A\nText',2)};let prompts=0,writes=0,finishes=0;
  const ctx={view,vault,session,requireSynthetic(){},forceParsing:()=>true,planArchiveBatch,runArchiveBatch,planArchive,
   archiveDialog:async()=>{if(kind==='source')view.state=make(view.state.doc.toString()+'\nChanged',2);else session.path='other.md';return {path:'archive.md'};},
   prepareArchiveFocus:()=>({complete:()=>assert.fail('no success'),finish:()=>finishes++}),status(){},
   revealArchivePosition:()=>prompts++,archiveCandidateDialog:async()=>assert.fail('race must stop before prompt'),archiveOne:async()=>{writes++;return true;}};
  const run=new Function(...Object.keys(ctx),'let busy=false,archiveSettings={};'+code+';return archiveBatch;')(...Object.values(ctx));
  assert.equal(await run(),false);assert.equal(writes,0);assert.equal(prompts,0);assert.equal(finishes,1);
 }
});

test('QA real registry/router preserve old scheduling and one-shot archive arguments across cancellation',()=>{
 const state=make('# TODO H\nText',3),view={state,hasFocus:true,setTabFocusMode(){}},calls=[];let shown;
 const context=()=>({state:view.state,hasDocument:true,busy:false,synthetic:true,vault:{}});
 const registry=createCommandRegistry(commandDefinitions({'archive.subtree':args=>{calls.push(['archive',args]);return true;},'planning.scheduled':()=>{calls.push(['schedule']);return true;}}),context);
 const router=createPrefixRouter({registry,getContext:context,showHelp:(choices,choose,cancel,meta)=>{shown={choices,choose,meta};}});
 const down=(key,patch={})=>{const e={key,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...patch};router.keyDown(e,view);return e;};
 const prefix=()=>{down('c',{ctrlKey:true});router.keyUp({key:'c'});};
 const arg=()=>{prefix();down('u');};
 prefix();down('s');assert.deepEqual(calls.pop(),['schedule']);
 for(const leaf of ['s','a']){arg();assert.equal(shown.meta.sequence,'C-c u');assert.equal(shown.meta.argument,true);assert.deepEqual(shown.choices.map(c=>c.key),['x']);down('x');assert.equal(shown.meta.sequence,'C-c u x');assert.deepEqual(shown.choices.map(c=>c.key),['s','a']);down(leaf);assert.deepEqual(calls.pop(),['archive',{universal:true}]);prefix();down('x');down(leaf);assert.deepEqual(calls.pop(),['archive',undefined]);}
 for(const patch of [{ctrlKey:true},{altKey:true},{metaKey:true}]){arg();const e=down('s',patch);assert.equal(e.prevented,true);assert.equal(e.stopped,true);assert.equal(calls.length,0);}
 for(let n=0;n<100;n++){arg();down('x');down('Escape');assert.equal(router.active,false);}
 for(const kind of ['focus','state','ime','quit']){arg();
  if(kind==='focus'){view.hasFocus=false;down('x');view.hasFocus=true;}
  if(kind==='state'){view.state=view.state.update({selection:{anchor:4}}).state;down('x');}
  if(kind==='ime')down('Process',{isComposing:true});
  if(kind==='quit')down('g',{ctrlKey:true});
  assert.equal(router.active,false);prefix();down('x');down('s');assert.deepEqual(calls.pop(),['archive',undefined]);
 }
 prefix();down('x');down('s');assert.deepEqual(calls,[['archive',undefined]]);
});

test('QA standalone Ctrl+U stays unhandled/native and cannot arm the archive modifier',()=>{
 for(const extra of [{},{repeat:true},{shiftKey:true}]){
  const view={state:make('# H\nText',2),hasFocus:true,setTabFocusMode(){}},calls=[];
  const router=createPrefixRouter({registry:{get:id=>({name:id}),availability:()=>({enabled:true}),execute:(id,args)=>calls.push([id,args])}});
  const event={key:'u',ctrlKey:true,...extra,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};
  assert.equal(router.keyDown(event,view),false);assert.equal(event.prevented,undefined);assert.equal(event.stopped,undefined);assert.equal(router.active,false);
  router.keyDown({key:'c',ctrlKey:true,preventDefault(){}},view);router.keyUp({key:'c'});
  for(const key of ['x','s'])router.keyDown({key,preventDefault(){}},view);
  assert.deepEqual(calls,[['archive.subtree',undefined]]);
 }
});

test('QA actual shared-panel prefix renderer shows modifier path and mouse-selects current subgroup',async()=>{
 const source=(await readFile(new URL('./work-panel.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
 const code=source.slice(source.indexOf('  function showPrefix('),source.indexOf('\n  const unsubscribe='));
 class El{constructor(){this.children=[];this.handlers={};}append(...children){this.children.push(...children);}setAttribute(){}addEventListener(k,f){this.handlers[k]=f;}removeEventListener(){}click(){this.handlers.click();}}
 const root=new El(),results=new El(),hint={},search={},message={},headings=[],view={state:make('# H\nText',2),hasFocus:true,setTabFocusMode(){}},calls=[];
 const factory=new Function('layout','shell','root','search','hint','message','results','doc',`let destroyed=false,prefixCancel=null,rows=[],rowDisposers=[];function close(){rows=[];results.children=[];for(const fn of rowDisposers.splice(0))fn();}function select(){}${code};return showPrefix;`);
 const show=factory({setOpen:(_open,fn)=>fn()},{show:title=>headings.push(title)},root,search,hint,message,results,{createElement:()=>new El()});
 const router=createPrefixRouter({registry:{get:id=>({name:id}),availability:()=>({enabled:true}),execute:(id,args)=>calls.push([id,args])},showHelp:show});
 router.keyDown({key:'c',ctrlKey:true,preventDefault(){}},view);router.keyUp({key:'c'});
 results.children.find(row=>row.textContent.startsWith('u ·')).click();
 assert.match(headings.at(-1),/Prefixargument.*C-c u/);assert.equal(results.children.length,1);assert.match(hint.textContent,/x \(Archivieren\)/);
 results.children[0].click();assert.match(headings.at(-1),/C-c u x/);assert.deepEqual(results.children.map(row=>row.textContent.slice(0,1)),['s','a']);
 results.children[1].click();assert.deepEqual(calls,[['archive.subtree',{universal:true}]]);assert.equal(router.active,false);
});

test('QA candidate preview remains text and native repeat activation cannot select multiple candidates',async()=>{
 class El{constructor(tag){this.tag=tag;this.children=[];this.listeners={};}append(...children){this.children.push(...children);}setAttribute(){}addEventListener(k,f){this.listeners[k]=f;}showModal(){}focus(){}close(){}remove(){}}
 const doc={body:new El('body'),createElement:tag=>new El(tag)};let settled=false;
 const promise=archiveCandidateDialog({title:'Same',original:'## DONE Same\n<script>example</script>',index:2,total:4,document:doc}).then(v=>{settled=true;return v;});
 const dialog=doc.body.children[0];assert.equal(dialog.children[2].textContent,'## DONE Same\n<script>example</script>');
 for(const key of ['Enter',' ','y','n']){const e={key,repeat:true,preventDefault(){this.prevented=true;},stopPropagation(){}};dialog.listeners.keydown(e);assert.equal(e.prevented,true);}
 await Promise.resolve();assert.equal(settled,false);dialog.listeners.cancel({preventDefault(){}});assert.equal(await promise,null);
});

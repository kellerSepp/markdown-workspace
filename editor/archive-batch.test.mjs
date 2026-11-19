import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {todoRules} from './todo.mjs';
import {planArchiveBatch,runArchiveBatch} from './archive-batch.mjs';
import {planArchive} from './archive-model.mjs';
import {archiveCandidateDialog} from './archive-candidate-dialog.mjs';
const source='Preamble\n\n# Project\nIntro\n## DONE Same\nFirst\n### DONE Child\nText\n## No status\nNotes\n## DONE Hidden open\n### TODO Still open\nText\n## TODO Open\nText\n## CANCELED Closed\nText\n## DONE Same\nSecond\n# DONE Other root\nRoot body';
const make=(doc=source,anchor=source.indexOf('Project'))=>EditorState.create({doc,selection:{anchor},extensions:[markdown({base:markdownLanguage}),todoRules]});

test('Header offers direct complete subtrees with no open tasks; outside header offers all H1 including preamble',()=>{
 const p=planArchiveBatch(make(),{sourcePath:'work.md'});assert.equal(p.message,undefined);assert.deepEqual(p.candidates.map(c=>c.title),['DONE Same','No status','CANCELED Closed','DONE Same']);assert.match(p.candidates[0].original,/### DONE Child/);
 for(const pos of [0,source.indexOf('Intro'),source.indexOf('Notes'),source.indexOf('Root body')]){
  const q=planArchiveBatch(make(source,pos),{sourcePath:'work.md'});assert.deepEqual(q.candidates.map(c=>c.title),['DONE Other root']);
 }
 const h3=make('# P\n## Parent\n### DONE A\nText\n### B\nNotes',8);assert.equal(planArchiveBatch(h3,{sourcePath:'work.md'}).candidates.length,2);
});

test('Configured TODO keywords govern entire candidates, statusless child is eligible and unknown words are preserved',()=>{
 const doc='#+SEQ_TODO: NEXT(n) HOLD(h) | COMPLETE(c)\n# P\n## COMPLETE Parent\n### HOLD Child\nText\n## COMPLETE Closed\nText\n## TODO Unknown\nText';
 const p=planArchiveBatch(make(doc,doc.indexOf('# P')+2),{sourcePath:'work.md'});assert.deepEqual(p.candidates.map(c=>c.title),['COMPLETE Closed','TODO Unknown']);
});

test('Only real Document ATX headings become scopes/candidates, protected preamble examples stay inert',()=>{
 for(const example of ['> # Example\n> text','- # Example\n  text','```md\n# Example\n```','    # Example\n    text','<!--\n# Example\n-->']){
  const doc='Preamble\n\n'+example+'\n\n# DONE Safe\nBody';
  for(const pos of [0,doc.indexOf('Example')]){
   const p=planArchiveBatch(make(doc,pos),{sourcePath:'synthetic.md'});
   assert.equal(p.message,undefined,example);assert.deepEqual(p.candidates.map(c=>c.title),['DONE Safe']);
  }
 }
 const front='---\ntitle: Test\n# Fake frontmatter\n---\nPreamble\n\n# DONE Safe\nBody';
 assert.deepEqual(planArchiveBatch(make(front,front.indexOf('Preamble')),{sourcePath:'synthetic.md'}).candidates.map(c=>c.title),['DONE Safe']);
 const setext='Example\n=======\nPreamble\n\n# DONE Safe\nBody';
 assert.deepEqual(planArchiveBatch(make(setext,0),{sourcePath:'synthetic.md'}).candidates.map(c=>c.title),['DONE Safe']);
});

test('Review y/n/Escape advances only exact confirmed removals and retains skipped duplicates',async()=>{
 let state=make(),offered=[],archived=[];const plan=planArchiveBatch(state,{sourcePath:'work.md'}),choices=['y','n','y',null];
 const result=await runArchiveBatch({plan,getState:()=>state,current:()=>true,confirm:async c=>{offered.push(c);return choices.shift();},archive:async candidate=>{
  state=state.update({selection:{anchor:candidate.from}}).state;const p=planArchive(state,{sourcePath:'work.md'});archived.push(p.original);state=make(p.sourceText,0);return true;
 }});
 assert.deepEqual(result,{archived:2,skipped:1,cancelled:true});assert.equal(offered.length,4);assert.equal(archived.length,2);assert.ok(state.doc.toString().includes('## No status'));assert.ok(state.doc.toString().includes('Second'));assert.ok(!state.doc.toString().includes('First'));
 assert.equal(offered[3].original,plan.candidates[3].original);assert.ok(offered[3].from<plan.candidates[3].from);
});

test('Errors, swallowed undefined and mismatched reload stop without advancing offsets or retrying',async()=>{
 for(const kind of ['throw','undefined','partial-written','wrong-text']){
  let state=make(),calls=0,prompts=0,notices=[];const plan=planArchiveBatch(state,{sourcePath:'work.md'});
  const result=await runArchiveBatch({plan,getState:()=>state,current:()=>true,confirm:async()=>{prompts++;return 'y';},notify:m=>notices.push(m),archive:async c=>{
   calls++;if(kind==='throw')throw Error('synthetic failure');if(kind==='partial-written')state=make(state.doc.sliceString(0,c.from)+state.doc.sliceString(c.to),0);if(kind==='wrong-text')state=make('Unrelated',0);return kind==='wrong-text'?true:undefined;
  }});
  assert.equal(result.stopped,true);assert.equal(result.archived,0);assert.equal(calls,1);assert.equal(prompts,1);assert.match(notices.at(-1),/gespeichert/);
 }
});

test('Source or session changes during prompt refuse writes; unsupported selection and readonly refused',async()=>{
 for(const kind of ['doc','session']){
  let state=make(),current=true,calls=0;const plan=planArchiveBatch(state,{sourcePath:'work.md'});
  const result=await runArchiveBatch({plan,getState:()=>state,current:()=>current,confirm:async()=>{if(kind==='doc')state=make(source+'\nChanged');else current=false;return 'y';},archive:async()=>{calls++;return true;}});assert.equal(result.stopped,true);assert.equal(calls,0);
 }
 assert.ok(planArchiveBatch(make().update({selection:{anchor:0,head:3}}).state,{sourcePath:'work.md'}).message);
 const ro=EditorState.create({doc:'# P',extensions:[markdown(),EditorState.readOnly.of(true)]});assert.ok(planArchiveBatch(ro,{sourcePath:'work.md'}).message);
});

test('Review completion returns to original header scope or existing body position without source edits',async()=>{
 for(const fileMode of [false,true]){
  const doc=fileMode?'# DONE A\nFirst\n# DONE B\nSecond':'# P\n## DONE A\nFirst\n## DONE B\nSecond';
  let state=make(doc,fileMode?doc.indexOf('First'):2),position;const plan=planArchiveBatch(state,{sourcePath:'work.md'}),choices=['y',null];
  await runArchiveBatch({plan,getState:()=>state,current:()=>true,returnTo:p=>{position=p;},confirm:async c=>{state=state.update({selection:{anchor:c.from}}).state;return choices.shift();},archive:async c=>{state=make(state.doc.sliceString(0,c.from)+state.doc.sliceString(c.to),0);return true;}});
  assert.equal(position.scopeAvailable,true);
  const line=state.doc.lineAt(position.anchor).text;assert.equal(fileMode?line.startsWith('#'):line==='# P',fileMode?false:true);
  const repeated=planArchiveBatch(state.update({selection:{anchor:position.anchor}}).state,{sourcePath:'work.md'});assert.deepEqual(repeated.candidates.map(c=>c.title),['DONE B']);
 }
 const doc='# DONE A\nFirst\n# TODO Open';let state=make(doc,doc.indexOf('First')),position;
 await runArchiveBatch({plan:planArchiveBatch(state,{sourcePath:'work.md'}),getState:()=>state,current:()=>true,returnTo:p=>{position=p;},confirm:async()=> 'y',archive:async c=>{state=make(state.doc.sliceString(0,c.from)+state.doc.sliceString(c.to),0);return true;}});
 assert.equal(position.scopeAvailable,false);assert.equal(state.doc.toString(),'# TODO Open');
});

test('Candidate dialog shows full source and confines y/n to local unmodified nonrepeat keys',async()=>{
 class El{constructor(tag){this.tag=tag;this.children=[];this.listeners={};}append(...els){this.children.push(...els);}setAttribute(){}addEventListener(k,f){this.listeners[k]=f;}showModal(){}focus(){}close(){}remove(){}}
 const all=[],doc={createElement:tag=>{const el=new El(tag);all.push(el);return el;},body:new El('body')};
 const promise=archiveCandidateDialog({title:'DONE Same',original:'## DONE Same\nFirst',index:1,total:2,document:doc});assert.equal(all.find(e=>e.tag==='pre').textContent,'## DONE Same\nFirst');
 const dialog=all[0],key=(key,patch={})=>{const event={key,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...patch};dialog.listeners.keydown(event);return event;};
 for(const k of ['Enter',' ','y','n']){const event=key(k,{repeat:true});assert.equal(event.prevented,true);assert.equal(event.stopped,true);}
 assert.equal(key('Enter').prevented,undefined,'first native button activation remains available');
 key('y',{isComposing:true});key('y',{ctrlKey:true});key('n');assert.equal(await promise,'n');
});

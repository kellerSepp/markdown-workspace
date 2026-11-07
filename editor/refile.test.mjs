import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undoDepth} from '@codemirror/commands';
import {ensureSyntaxTree} from '@codemirror/language';
import {refileHistory,undoRefile as undo,redoRefile as redo} from './refile-history.mjs';
import {refileContext,planRefile,createRefileController} from './refile.mjs';
const state=(doc,pos=0,extra=[])=>EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),history(),refileHistory(),extra]});
const plan=(s,title)=>planRefile(s,refileContext(s).targets?.find(t=>t.text===title)?.id);
const apply=(s,p)=>{assert.ok(p.spec,p.message);return s.update(p.spec).state;};

test('H1-H6 sources become H2, children retain relative levels, source and target can be before/after',()=>{
 for(let level=1;level<=6;level++)for(const reverse of [false,true]){
   const source='#'.repeat(level)+' Source\nBody 😀\n'+(level<6?'#'.repeat(level+1)+' Child\nchild body\n':''),target='# Target\nTarget body\n';
   const doc=reverse?target+source+'# End\n':source+target,s=state(doc,doc.indexOf('Body')+3),p=plan(s,'Target');if(reverse&&level===2){assert.equal(p.noop,true);continue;}const next=apply(s,p);
   assert.match(next.doc.toString(),/# Target\nTarget body\n\n## Source\nBody 😀/);
   if(level<6)assert.match(next.doc.toString(),/### Child\nchild body/);
   assert.equal(next.doc.sliceString(next.selection.main.head-3,next.selection.main.head),'Bod');
   const ranges=[];p.spec.changes.iterChanges((a,b)=>ranges.push([a,b]));assert.ok(ranges.length<=2);assert.ok(ranges.every(([a,b])=>b-a<doc.length));
 }
});

test('Current body/list/code uses closest heading, never parent or fenced pseudoheading',()=>{
 const doc='# Parent\n## Current\n- list Ü\n\n```md\n# Fake\ncode\n```\n\n# Target\nbody';
 for(const text of ['Current','list','Fake','code','```md']){
  const s=state(doc,doc.indexOf(text)+1),c=refileContext(s);assert.equal(c.source.level,2);assert.deepEqual(c.targets.map(t=>t.text),['Parent','Target']);
  const next=apply(s,plan(s,'Target'));assert.match(next.doc.toString(),/# Target\nbody\n\n## Current/);assert.ok(next.doc.toString().includes('```md\n# Fake\ncode\n```'));
 }
});

test('Targets exclude source/descendants; H1 ancestor allowed and last-child identical position is no-op',()=>{
 const s=state('# Root\n## Source\nbody\n## Sibling\ntext\n# Other',12),c=refileContext(s);
 assert.deepEqual(c.targets.map(t=>t.text),['Root','Other']);const next=apply(s,plan(s,'Root'));
 assert.ok(next.doc.toString().indexOf('Sibling')<next.doc.toString().indexOf('Source'));
 assert.equal(plan(next,'Root').noop,true);
 const h1=state('# Source\n## Child\nbody\n# Other',3);assert.deepEqual(refileContext(h1).targets.map(t=>t.text),['Other']);
 assert.match(planRefile(h1,0).message,/zulässiges H1/);
});

test('Overflow, regions, multi-cursor, frontmatter, no heading, setext and containers fail closed',()=>{
 const cases=[state('# Source\n###### Deep\n# Target',3),state('Intro\n# Target',0),state('---\n# YAML\n---\n# Real',6),state('Title\n=====\nbody\n# Target',2),state('> # Quote\n> body\n# Target',5),state('# Root\n> ## Nested\n# Target',3)];
 for(const s of cases)assert.ok(refileContext(s).message,s.doc.toString());
 let s=state('# Source\n# Target',3);assert.match(refileContext(s.update({selection:{anchor:2,head:4}}).state).message,/Region/);
 s=state('# Source\n# Target',3,[EditorState.allowMultipleSelections.of(true)]);s=s.update({selection:EditorSelection.create([EditorSelection.cursor(2),EditorSelection.cursor(4)])}).state;assert.match(refileContext(s).message,/Cursor/);
 assert.match(refileContext(state('# Source\n# Target',3,EditorState.readOnly.of(true))).message,/schreibgeschützt/);
});

test('Atomic history, duplicate targets, Unicode and EOF variants',()=>{
 for(const eof of ['', '\n']){
  const doc='# A\n## Source\nÜ 😀\n# Duplicate\none\n# Duplicate\ntwo'+eof;let s=state(doc,doc.indexOf('😀'));
  const c=refileContext(s);assert.equal(c.targets.filter(t=>t.text==='Duplicate').length,2);assert.notEqual(c.targets[1].line,c.targets[2].line);
  const originalSelection=s.selection;const p=planRefile(s,c.targets.at(-1).id),view={get state(){return s;},dispatch:spec=>{for(const input of Array.isArray(spec)?spec:[spec])s=input.startState?input.state:s.update(input).state;}};view.dispatch(p.spec);const moved=s.doc.toString(),movedSelection=s.selection;assert.equal(undoDepth(s),1);
  assert.equal(undo(view),true);assert.equal(s.doc.toString(),doc);assert.ok(s.selection.eq(originalSelection));assert.equal(redo(view),true);assert.equal(s.doc.toString(),moved);assert.ok(s.selection.eq(movedSelection));
 }
});

test('Unclosed fences or HTML that would consume moved headings are rejected',()=>{
 for(const body of ['```\nopen','<script>\nopen']){
  const s=state('# Source\nbody\n# Target\n'+body,3);assert.ok(plan(s,'Target').message);
 }
});

test('Controller opens without mutation and rechecks busy/state/read-only; no-op does not dispatch',()=>{
 let s=state('# Source\nbody\n# Target',3),options,context={hasDocument:true},calls=0;const notices=[];
 const view={get state(){return s;},dispatch:spec=>{calls++;s=s.update(spec).state;}};
 const controller=createRefileController({view,panel:{openChoices:o=>{options=o;return true;}},getContext:()=>context,notify:m=>notices.push(m)});
 assert.equal(controller.open(),true);assert.equal(calls,0);const saved={state:s},id=options.entries[0].id;
 context.busy=true;assert.equal(options.choose(id,saved),false);context.busy=false;s=s.update({selection:{anchor:4}}).state;assert.equal(options.choose(id,saved),false);
 controller.open();assert.equal(options.choose(id,{state:s}),true);assert.equal(calls,1);
});

test('Two local changes retain mixed EOL and BOM in untouched middle ranges through existing codec',async()=>{
 const {TextCodec}=await import('./text-codec.mjs');
 const raw='\ufeff# Source\r\nbody\n# Middle\rkeep\r\nÜ\n# Target\r\nend';
 const codec=new TextCodec(new TextEncoder().encode(raw)),s=state(codec.text,3),p=plan(s,'Target'),changes=[];
 assert.ok(p.spec,p.message);p.spec.changes.iterChanges((from,to,_a,_b,insert)=>changes.push({from,to,insert:insert.toString()}));
 assert.equal(changes.length,2);codec.applyChanges(changes);
 const bytes=new TextDecoder('utf-8',{ignoreBOM:true}).decode(codec.bytes());assert.ok(bytes.startsWith('\ufeff'));assert.ok(bytes.includes('# Middle\rkeep\r\nÜ\n# Target\r\nend'));
 assert.equal(codec.text,p.spec.changes.apply(s.doc).toString());
});

test('Setext, H2 and stale arbitrary offsets cannot be selected as H1 target',()=>{
 const doc='# Source\nbody\nSetext\n======\n## Child\n# Target',s=state(doc,3);
 for(const id of [doc.indexOf('Setext'),doc.indexOf('## Child'),999])assert.match(planRefile(s,id).message,/zulässiges H1/);
});

test('Completed validation tree permits 500/1000 plain sections while unsafe large targets remain rejected',()=>{
 for(const count of [500,1000]){
  const text=Array.from({length:count},(_,i)=>`# T${i}\nbody ${i} Ü\n## C${i}\nchild\n`).join('');
  let s=state(text,3);assert.ok(ensureSyntaxTree(s,s.doc.length,1000));s=s.update({}).state;
  const target=refileContext(s).targets.at(-1).id,p=planRefile(s,target);assert.ok(p.spec,p.message);
  const next=apply(s,p);assert.match(next.doc.toString(),new RegExp('# T'+(count-1)+'\\nbody '+(count-1)+' Ü\\n## C'+(count-1)+'\\nchild\\n\\n## T0\\nbody 0 Ü\\n### C0\\nchild\\n$'));
  const unsafe=state(text+'```\nopen',3);assert.ok(ensureSyntaxTree(unsafe,unsafe.doc.length,1000));const ready=unsafe.update({}).state;
  assert.match(planRefile(ready,refileContext(ready).targets.at(-1).id).message,/Blockstruktur/);
 }
});


import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {headingSuffix,validTag} from './heading-suffix.mjs';
import {readTags,tagContext} from './tag-model.mjs';
import {tagRules,readTagRules,reloadTags,tagDefinitionLine} from './tag-rules.mjs';
import {planTags,createTagsController} from './tags.mjs';
import {todoRules,planTodo} from './todo.mjs';
import {planChecklist} from './checklists.mjs';
import {planMetaReturn,runMetaReturn} from './meta-return.mjs';
import {planSubtreeReturn} from './subtree-return.mjs';
import {planTaskInsert} from './task-insert.mjs';
import {parseAgendaFile,createAgendaIndex} from './agenda-index.mjs';
import {createAgendaSource} from './agenda-source.mjs';
import {confirmAction} from './context-confirm.mjs';
import {runStructure} from './structure.mjs';
import {planRefile} from './refile.mjs';
const bytes=text=>new TextEncoder().encode(text);
const make=(text,pos=0,extra=[])=>EditorState.create({doc:text,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),history(),todoRules,tagRules,...extra]});
function view(text,pos=0){const v={state:make(text,pos)};v.dispatch=spec=>{v.state=spec.startState?spec.state:v.state.update(spec).state;};return v;}
test('Tag suffix grammar distinguishes title, counters, tags and closing ATX hashes; Unicode/case exact',()=>{
 for(let level=1;level<=6;level++){
  const text='#'.repeat(level)+' TODO Title: example [1/3] [33%] :@Work:Äpfel:WORK:work: ##',suffix=headingSuffix(text,10);
  assert.equal(suffix.content,'TODO Title: example [1/3] [33%]');assert.deepEqual(suffix.tags,['@Work','Äpfel','WORK','work']);
  assert.equal(text.slice(suffix.tagFrom-10,suffix.end-10),':@Work:Äpfel:WORK:work:');
 }
 for(const name of ['Öl','A_1','@home','#project','50%'])assert.equal(validTag(name),true);
 for(const name of ['','a-b','two words','a:b','<x>'])assert.equal(validTag(name),false);
 for(const text of ['# URL https://example.com','# Title `:CODE:`','# Title [link](url)', '# Title: text'])assert.deepEqual(headingSuffix(text).tags,[]);
 assert.ok(headingSuffix('# Title :bad-tag:').error);assert.ok(headingSuffix('# Title :partial').error);
});
test('File TAGS rules combine lines, preserve names, reject ambiguous shortcuts and keep last valid rules on reload',()=>{
 const text='#+TAGS: HOME(h) WORK(w)\n#+TAGS: OTHER HOME(h)\n```\n#+TAGS: BAD(h)\n```\n# Title',v=view(text);
 assert.deepEqual(v.state.field(tagRules).entries,[{name:'HOME',key:'h'},{name:'WORK',key:'w'},{name:'OTHER',key:undefined}]);
 for(const definition of ['#+TAGS: HOME(h) WORK(h)','#+TAGS: HOME(h) HOME(x)','#+TAGS: bad-tag','#+TAGS: { HOME(h) WORK(w) }'])assert.ok(readTagRules(make(definition)).message);
 const old=v.state.field(tagRules).entries;v.dispatch({changes:{from:0,to:7,insert:'#+TAGS: BAD('}});
 const result=readTagRules(v.state);v.dispatch({effects:reloadTags.of(result)});assert.equal(v.state.field(tagRules).entries,old);assert.ok(v.state.field(tagRules).error);
 assert.equal(tagDefinitionLine(make('---\n#+TAGS: BAD(b)\n---\n# Real',5)),false);
 assert.deepEqual(readTagRules(make('---\n#+TAGS: BAD(b)\n---\n# Real')).entries,[]);
});
test('Tags inherit across all heading levels without copying; sibling and changed parent contexts are correct',()=>{
 let text='# Root :ROOT:\n';for(let i=2;i<=6;i++)text+='#'.repeat(i)+' Level '+i+' :T'+i+':\n';text+='# Sibling :OTHER:';
 const model=readTags(make(text));assert.deepEqual(model.headings[5].effectiveTags,['ROOT','T2','T3','T4','T5','T6']);assert.deepEqual(model.headings.at(-1).inherited,[]);
 const v=view('# Root :ROOT:\n## Child :LOCAL:\n# Other :OTHER:',20);assert.equal(runStructure(v,'heading-promote',{children:false}),true);
 assert.deepEqual(readTags(v.state).headings.find(h=>h.tags.includes('LOCAL')).inherited,[]);
 assert.ok(v.state.doc.toString().includes('Child :LOCAL:'));assert.equal(v.state.doc.toString().includes('Child :ROOT:'),false);
 const source='# A :A:\n## TODO Moving :LOCAL:\n# B :B:',move=make(source,source.indexOf('Moving')),plan=planRefile(move,source.indexOf('# B'));
 assert.ok(plan.spec);const moved=move.update(plan.spec).state;assert.deepEqual(readTags(moved).headings.find(h=>h.tags.includes('LOCAL')).effectiveTags,['B','LOCAL']);
});
test('Tag edits preserve exact title/cookies/closing hashes/body, scope cursor and undo/redo; no-op and stale targets safe',()=>{
 for(let level=1;level<=6;level++)for(const bodyCursor of [false,true]){
  const text='#'.repeat(level)+' TODO Title [1/3] :OLD: ##\nBody',pos=bodyCursor?text.length:level+7,v=view(text,pos);let options;
  const controller=createTagsController({view:v,panel:{openTags(o){options=o;return true;}}});assert.equal(controller.open(),true);
  assert.equal(options.choose(['NEW','NEW','@work'],{state:v.state}),true);
  const expected=text.replace(':OLD:',':NEW:@work:');assert.equal(v.state.doc.toString(),expected);assert.equal(undoDepth(v.state),1);
  if(bodyCursor)assert.equal(v.state.selection.main.head,v.state.doc.length);
  const after=v.state.selection.main.head;assert.equal(undo(v),true);assert.equal(v.state.doc.toString(),text);assert.equal(v.state.selection.main.head,pos);assert.equal(redo(v),true);assert.equal(v.state.selection.main.head,after);
  assert.equal(planTags(v.state,['NEW','@work']).noop,true);
  const saved=v.state;v.dispatch({selection:{anchor:1}});assert.equal(options.choose(['BAD'],{state:saved}),false);
 }
 const v=view('# Title :TAG:',4);v.dispatch(planTags(v.state,[]).spec);assert.equal(v.state.doc.toString(),'# Title');
 const blank=view('# ',2);blank.dispatch(planTags(blank.state,['NEW']).spec);assert.equal(blank.state.doc.toString(),'# :NEW:');
 assert.ok(headingSuffix('# Title :ONE: :TWO:').error);
 for(const text of ['```\n# Title\n```','> # Title','---\nx: y\n---','# Title :bad-tag:'])assert.ok(tagContext(make(text,Math.min(5,text.length))).message);
 assert.ok(planTags(make('# Title'),['bad-tag']).message);
});
test('Context confirmation prioritizes definitions/checkboxes and always opens heading tags including cookies',()=>{
 for(const [text,action] of [['#+TAGS: HOME(h)','tags.reload'],['#+SEQ_TODO: TODO(t) | DONE(d)','todo.reload'],['# Title [0/2]','tags.edit'],['# Title','tags.edit'],['- [ ] Item','checklist.confirm']])assert.equal(confirmAction(make(text,text.length)),action);
});
test('Checklist repairs and TODO transitions preserve tags and closing hashes',()=>{
 const text='# TODO Parent [0/1] [0%] :WORK: ##\n- [ ] Child',v=view(text,text.length);
 const toggle=planChecklist(v.state,'toggle');assert.ok(toggle.spec);v.dispatch(toggle.spec);assert.equal(v.state.doc.toString(),'# TODO Parent [1/1] [100%] :WORK: ##\n- [x] Child');
 v.dispatch({selection:{anchor:4}});v.dispatch(planTodo(v.state,'DONE').spec);assert.match(v.state.doc.toString(),/^# DONE Parent \[1\/1\] \[100%\] :WORK: ##/);
 const repeat=make('# TODO Repeat :WORK:\nSCHEDULED: <2026-11-10 Di +1d>',4),done=planTodo(repeat,'DONE',{now:new Date(2026,10,11,12)});
 assert.ok(done.spec);const result=repeat.update(done.spec).state.doc.toString();assert.match(result,/^# TODO Repeat :WORK:/);assert.match(result,/2026-11-11/);assert.match(result,/:LOGBOOK:/);
});
test('Alt Enter retains original tags; new headings from other insertion commands have no own tags',()=>{
 for(let level=1;level<=6;level++){
  const m='#'.repeat(level),text=m+' TODO Brot essen :WORK:',pos=text.indexOf('essen'),state=make(text,pos),plan=planMetaReturn(state);
  assert.ok(plan.spec);const next=state.update(plan.spec).state;assert.equal(next.doc.toString(),m+' TODO Brot :WORK:\n'+m+' essen');
  assert.equal(next.selection.main.head,next.doc.toString().indexOf('essen'));
  const end=make(text,text.length),atEnd=planMetaReturn(end);assert.equal(end.update(atEnd.spec).state.doc.toString(),text+'\n'+m+' ');
  assert.ok(planMetaReturn(make(text,text.indexOf('WORK')+1)).message);
  for(const insert of [planSubtreeReturn,planTaskInsert]){const changed=state.update(insert(state).spec).state;assert.equal(readTags(changed).headings.at(-1).tags.length,0);}
  const v=view(text,pos);assert.equal(runMetaReturn(v),true);const anchor=v.state.selection.main.head;
  assert.equal(undo(v),true);assert.equal(v.state.doc.toString(),text);assert.equal(redo(v),true);assert.equal(v.state.selection.main.head,anchor);
 }
});
test('Agenda shares tag extraction and inheritance across saved files and editor overlay; pure tags are not tasks',async()=>{
 const text='# Parent :WORK:\n## TODO Task :LOCAL:\n# Plain :ONLY:',parsed=await parseAgendaFile(bytes(text),'a.md');
 assert.equal(parsed.records.length,1);assert.equal(parsed.records[0].title,'Task');assert.deepEqual(parsed.records[0].tags,['LOCAL']);assert.deepEqual(parsed.records[0].effectiveTags,['WORK','LOCAL']);
 const root={name:'synthetic',async *entries(){yield ['a.md',{kind:'file'}];},async getFileHandle(){return {async getFile(){return {async arrayBuffer(){return bytes(text).buffer;}};}};}};
 const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(root);const state=make(text.replace(':LOCAL:',':DRAFT:'));
 await index.setEditor(state,'a.md',root);assert.deepEqual(index.query()[0].tags,['DRAFT']);assert.equal(index.query()[0].title,'Task');
});
test('Cross-file source validation rejects tag-only changes even with identical title/offset',async()=>{
 let text='# TODO Task :ONE:',jumps=0,opens=0;const root={name:'synthetic',async *entries(){yield ['a.md',{kind:'file'}];},async getFileHandle(){return {async getFile(){return {async arrayBuffer(){return bytes(text).buffer;}};}};}};
 const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(root);const record=index.query()[0];text='# TODO Task :TWO:';
 const session={dirty:false},notices=[];
 const source=createAgendaSource({index,getVault:()=>root,getSession:()=>session,getState:()=>null,open:()=>opens++,jump:()=>jumps++,notify:m=>notices.push(m)});
 assert.equal(await source.navigate(record.id),false);assert.equal(jumps,0);assert.equal(opens,0);assert.match(notices.at(-1),/geändert/);
});

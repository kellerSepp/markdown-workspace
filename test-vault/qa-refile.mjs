import assert from 'node:assert/strict';
import {EditorState,Transaction,StateEffect} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undo as nativeUndo,redo as nativeRedo,undoDepth,redoDepth,isolateHistory} from '@codemirror/commands';
import {refileHistory,undoRefile as undo,redoRefile as redo} from '../editor/refile-history.mjs';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {createCommandRegistry} from '../editor/command-registry.mjs';
import {commandDefinitions} from '../editor/commands.mjs';
import {ensureSyntaxTree,foldEffect,foldedRanges,codeFolding} from '@codemirror/language';
import {refileContext,planRefile,createRefileController} from '../editor/refile.mjs';
import {TextCodec} from '../editor/text-codec.mjs';
const failures=[];let passed=0;
function check(name,fn){try{fn();passed++;}catch(e){failures.push({name,error:e.message,stack:e.stack});}}
const state=(doc,pos=0,extra=[])=>{const s=EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),history(),refileHistory(),extra]});ensureSyntaxTree(s,s.doc.length,1000);return s.update({}).state;};
// Public EditorView accepts Transaction[] and emits one update for the batch.
function dispatchInto(s,spec,visit=()=>{}){for(const item of Array.isArray(spec)?spec:[spec]){const tr=item instanceof Transaction?item:s.update(item);assert.equal(tr.startState,s);visit(tr);s=tr.state;}return s;}
function move(s,title='Target'){const c=refileContext(s);return planRefile(s,c.targets?.find(t=>t.text===title)?.id);}
for(let level=1;level<=6;level++)for(const reverse of [false,true])for(const eof of ['','\n','\n\n'])for(const sep of ['\n','\n\n','\n\n\n']){
 const source='#'.repeat(level)+' Source\ntext Ü 😀\n'+(level<6?'#'.repeat(level+1)+' Child\nchild\n':''),target='# Target\ntarget'+sep;
 const doc=reverse?target+source+'# End'+eof:source+'# Middle\nuntouched\n'+target.slice(0,-sep.length)+eof;
 for(const pos of [doc.indexOf('Source')-level-1,doc.indexOf('Source')+6,doc.indexOf('text')+3])check(`move ${level}/${reverse}/${JSON.stringify(eof)}/${sep.length}/${pos}`,()=>{
  let s=state(doc,pos);const p=move(s);if(reverse&&level===2){assert.equal(p.noop,true);return;}assert.ok(p.spec,p.message);
  const origSel=s.selection;const view={get state(){return s;},dispatch(spec){s=dispatchInto(s,spec);}};
  view.dispatch(p.spec);const moved=s.doc.toString(),sel=s.selection;assert.match(moved,/## Source\ntext Ü 😀/);assert.equal(undoDepth(s),1);
  for(let cycle=0;cycle<5;cycle++){view.dispatch({selection:{anchor:0}});assert.equal(undo(view),true);assert.equal(s.doc.toString(),doc);assert.ok(s.selection.eq(origSel));assert.equal(redo(view),true);assert.equal(s.doc.toString(),moved);assert.ok(s.selection.eq(sel));assert.equal(undoDepth(s),1);}
 });
}
for(const [body,allowed] of [['- item\n  continuation\n',true],['```md\n# Pseudo\n```\n',true],['~~~\n# Pseudo\n~~~\n',true],['    # Indented pseudo\n',true],['Title\n-----\n',false],['> ## Nested\n',false],['- x\n  ## Nested\n',false],['<script>\n# Pseudo\n</script>\n',true],['[id]: /synthetic\n\n[id]\n',true]])check('body '+body,()=>{const doc='# Source\n'+body+'\n# Target\nend',s=state(doc,doc.indexOf(body)+1),p=move(s);assert.equal(!!p.spec,allowed,p.message);});
for(const body of ['```\nopen','~~~\nopen','<script>\nopen','<!-- open'])check('unsafe target '+body,()=>assert.ok(move(state('# Source\nbody\n# Target\n'+body,3)).message));
for(const doc of ['---\n# yaml\n---\n# Source\nbody\n# Target'])check('frontmatter '+doc.slice(0,3),()=>assert.ok(refileContext(state(doc,5)).message));
check('ancestor reordered and noop',()=>{let s=state('# Target\n### Source\nbody\n## Sibling\nrest\n# End',15);const p=move(s);assert.ok(p.spec,p.message);s=s.update(p.spec).state;assert.ok(s.doc.toString().indexOf('Sibling')<s.doc.toString().indexOf('Source'));assert.equal(move(s).noop,true);});
check('deep overflow',()=>assert.match(refileContext(state('# Source\n###### Deep\n# Target',3)).message,/H6/));
check('duplicate blank unicode targets',()=>{const s=state('# Source\nbody\n# \n# Ü😀\n# Ü😀',3),c=refileContext(s);assert.equal(c.targets.length,3);assert.equal(new Set(c.targets.map(t=>t.id)).size,3);for(const t of c.targets)assert.ok(planRefile(s,t.id).spec);});
check('folded source/target remains valid',()=>{let s=state('# Source\nbody\n## Child\nchild\n# Target\nbody\n## Existing\ntext',3,codeFolding());s=s.update({effects:[foldEffect.of({from:8,to:26}),foldEffect.of({from:35,to:s.doc.length})]}).state;const p=move(s);assert.ok(p.spec,p.message);s=s.update(p.spec).state;foldedRanges(s).between(0,s.doc.length,(a,b)=>{assert.ok(a<b&&b<=s.doc.length);});});
check('filtered transaction rejects without mutation/history',()=>{let s=state('# Source\nbody\n# Target',3,EditorState.transactionFilter.of(tr=>tr.docChanged?[]:tr)),opts;const original=s;const ctl=createRefileController({view:{get state(){return s;},dispatch(spec){s=s.update(spec).state;}},panel:{openChoices(o){opts=o;return true;}}});assert.ok(ctl.open());assert.equal(opts.choose(opts.entries[0].id,{state:s}),false);assert.equal(s.doc.toString(),original.doc.toString());assert.equal(undoDepth(s),0);});
for(const eof of ['', '\n'])check('source EOF '+JSON.stringify(eof),()=>{const f=fixture('# Target\ntarget\n# Source\nbody'+eof,23),original=f.view.state,p=move(original);assert.ok(p.spec,p.message);f.view.dispatch(p.spec);const moved=f.view.state;assert.match(moved.doc.toString(),/# Target\ntarget\n\n## Source\nbody/);for(let i=0;i<3;i++){assert.ok(undo(f.view));same(f.view.state,original);assert.ok(redo(f.view));same(f.view.state,moved);}});
check('codec untouched bytes through refile undo redo',()=>{const raw='\ufeff# Source\r\nbody\n# Middle\rkeep Ü\r\n# Target\nend';const codec=new TextCodec(new TextEncoder().encode(raw));let s=state(codec.text,3);const view={get state(){return s;},dispatch(spec){s=dispatchInto(s,spec,tr=>{const changes=[];tr.changes.iterChanges((a,b,c,d,insert)=>changes.push({from:a,to:b,insert:insert.toString()}));codec.applyChanges(changes);});assert.equal(codec.text,s.doc.toString());const bytes=new TextDecoder('utf-8',{ignoreBOM:true}).decode(codec.bytes());assert.ok(bytes.startsWith('\ufeff'));assert.ok(bytes.includes('# Middle\rkeep Ü\r\n# Target\nend'));}};const original=s;view.dispatch(move(s).spec);const moved=s;for(let i=0;i<5;i++){assert.ok(undo(view));assert.ok(s.selection.eq(original.selection));assert.equal(new TextDecoder('utf-8',{ignoreBOM:true}).decode(codec.bytes()),raw);assert.ok(redo(view));assert.ok(s.selection.eq(moved.selection));}});
function fixture(doc='# Source\nbody\n# Target',pos=3,extra=[]){let s=state(doc,pos,extra);const inputs=[];return {view:{hasFocus:true,get state(){return s;},dispatch(spec){inputs.push(spec);s=dispatchInto(s,spec);},focus(){}},inputs};}
function same(s,expected){assert.ok(s.doc.eq(expected.doc));assert.ok(s.selection.eq(expected.selection));}
check('original P2 3 to 14 through Registry and beforeinput with later edits',()=>{
 const {view}=fixture(),original=view.state;view.dispatch(move(view.state).spec);const moved=view.state;assert.equal(moved.selection.main.head,14);
 const registry=createCommandRegistry(commandDefinitions({'edit.undo':()=>undo(view),'edit.redo':()=>redo(view)}),()=>({state:view.state,hasDocument:true}));
 const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
 const beforeinput=(inputType)=>{const event={inputType,preventDefault(){this.prevented=true;}};let handled=false;for(const {plugin} of view.state.facet(facet)){if(plugin.domEventHandlers?.beforeinput?.(event,view)){handled=true;break;}}assert.equal(handled,true);assert.equal(event.prevented,true);};
 for(let i=0;i<5;i++){view.dispatch({selection:{anchor:0}});registry.execute('edit.undo');same(view.state,original);beforeinput('historyRedo');same(view.state,moved);beforeinput('historyUndo');same(view.state,original);registry.execute('edit.redo');same(view.state,moved);}
 view.dispatch({changes:{from:moved.selection.main.head,insert:'Ü'},selection:{anchor:moved.selection.main.head+1},annotations:isolateHistory.of('full'),userEvent:'input.type'});const edited=view.state;assert.equal(undoDepth(edited),2);
 beforeinput('historyUndo');assert.ok(view.state.doc.eq(moved.doc));registry.execute('edit.undo');same(view.state,original);registry.execute('edit.redo');same(view.state,moved);beforeinput('historyRedo');same(view.state,edited);
 beforeinput('historyUndo');view.dispatch({changes:{from:0,insert:'new\n'},userEvent:'input.type'});assert.equal(redoDepth(view.state),0);assert.equal(redo(view),false);
});
check('successive refiles original target endpoints after cursor moves and typing',()=>{
 const {view}=fixture('# Source\nbody\n# Target\ntext\n# Other'),original=view.state;
 view.dispatch({changes:{from:8,insert:'Ü'},selection:{anchor:3},annotations:isolateHistory.of('full')});const typed=view.state;
 view.dispatch(move(view.state).spec);const first=view.state;view.dispatch({selection:{anchor:first.selection.main.head+1}});const secondStart=view.state;view.dispatch(move(view.state,'Other').spec);const second=view.state;
 for(let i=0;i<5;i++){view.dispatch({selection:{anchor:0}});assert.ok(undo(view));same(view.state,secondStart);assert.ok(undo(view));same(view.state,typed);assert.ok(undo(view));same(view.state,original);assert.ok(redo(view));same(view.state,typed);assert.ok(redo(view));same(view.state,first);assert.ok(redo(view));same(view.state,second);}
});
check('ordinary history preserves Transaction dispatch and native behavior',()=>{
 const a=fixture('abcÜdef',2),b=fixture('abcÜdef',2);for(const f of [a,b])f.view.dispatch({changes:{from:2,to:4,insert:'😀'},selection:{anchor:4},userEvent:'input.type'});
 for(let i=0;i<5;i++)for(const [wrapped,native] of [[undo,nativeUndo],[redo,nativeRedo]]){assert.equal(wrapped(a.view),native(b.view));const tr=a.inputs.at(-1);assert.ok(tr instanceof Transaction);assert.equal(tr.state,a.view.state);same(a.view.state,b.view.state);}
});
check('readonly prevents existing history and unrelated beforeinput remains native',()=>{
 const f=fixture();f.view.dispatch(move(f.view.state).spec);const locked=EditorState.readOnly.of(true);f.view.dispatch({effects:StateEffect.appendConfig.of(locked)});
 const original=f.view.state;assert.equal(undo(f.view),false);assert.equal(redo(f.view),false);same(f.view.state,original);
 const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;const h=f.view.state.facet(facet).map(p=>p.plugin.domEventHandlers?.beforeinput).find(Boolean);
 assert.equal(h({inputType:'insertText',preventDefault(){assert.fail('unexpected prevention');}},f.view),false);
 assert.equal(h({inputType:'historyUndo',preventDefault(){}},f.view),true);same(f.view.state,original);
 const g=fixture();g.view.dispatch(move(g.view.state).spec);assert.ok(undo(g.view));assert.equal(redoDepth(g.view.state),1);g.view.dispatch({effects:StateEffect.appendConfig.of(locked)});const redoLocked=g.view.state;assert.equal(redo(g.view),false);same(g.view.state,redoLocked);
});
// Bounded synthetic large-document planning: no filesystem vault scan or native UI claim.
const doc=Array.from({length:1000},(_,i)=>`# T${i}\nbody ${i} Ü\n## C${i}\nchild\n`).join('');const s=state(doc,3),target=refileContext(s).targets.at(-1).id;
const memory=[],latencies=[];const start=performance.now();global.gc?.();memory.push(process.memoryUsage().heapUsed);
let refused=0,reason='';for(let i=0;i<100;i++){const t=performance.now();const p=planRefile(s,target);if(!p.spec){refused++;reason=p.message;}latencies.push(performance.now()-t);if(i===49||i===99){global.gc?.();memory.push(process.memoryUsage().heapUsed);}}
const loadDurationMs=performance.now()-start;
check('original large parser P2 now allows exact movement and history',()=>{assert.equal(refused,0,reason);let current=s;const view={get state(){return current;},dispatch(spec){current=dispatchInto(current,spec);}};view.dispatch(planRefile(s,target).spec);const moved=current;assert.ok(moved.doc.toString().endsWith('## T0\nbody 0 Ü\n### C0\nchild\n'));assert.equal(undoDepth(current),1);for(let i=0;i<3;i++){assert.ok(undo(view));same(current,s);assert.ok(redo(view));same(current,moved);}});
check('large unsafe fence still refused',()=>{const unsafe=state(doc+'```\nopen',3);assert.ok(move(unsafe,'T999').message);});
latencies.sort((a,b)=>a-b);console.log(JSON.stringify({passed,failureCount:failures.length,failureGroups:Object.fromEntries([...new Set(failures.map(f=>f.error))].map(e=>[e,{count:failures.filter(f=>f.error===e).length,example:failures.find(f=>f.error===e).name}])),load:{headings:2000,characters:doc.length,iterations:100,refused,reason,durationMs:loadDurationMs,heapBytes:memory,latencyMs:{min:latencies[0],median:latencies[49],p95sample:latencies[94],max:latencies.at(-1)}}},null,2));
if(failures.length)process.exitCode=1;


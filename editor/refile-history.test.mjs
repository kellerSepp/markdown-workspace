import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {history,undo,redo,undoDepth,redoDepth,isolateHistory} from '@codemirror/commands';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {refileHistory,refileSelection,undoRefile,redoRefile} from './refile-history.mjs';
import {planRefile,refileContext,createRefileController} from './refile.mjs';
import {createEmacsEditing,emacsMark} from './emacs-editing.mjs';
import {TextCodec} from './text-codec.mjs';
function fixture(doc='# Source\nbody\n# Target',pos=3,extra=[]){
 let state=EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),history(),refileHistory(),extra]}),transactions=[];
 const view={hasFocus:true,get state(){return state;},dispatch(spec){for(const input of Array.isArray(spec)?spec:[spec]){const tr=input instanceof Transaction?input:state.update(input);transactions.push(tr);state=tr.state;}},focus(){this.hasFocus=true;}};
 return {view,transactions};
}
function move(view,title='Target'){
 const target=refileContext(view.state).targets?.find(t=>t.text===title);const p=planRefile(view.state,target?.id);assert.ok(p.spec||p.noop,p.message);if(p.spec)view.dispatch(p.spec);return p;
}

test('324 heading/body/EOF variants retain selections through five atomic Undo/Redo cycles',()=>{
 for(let level=1;level<=6;level++)for(const reverse of [false,true])for(const eof of ['', '\n', '\n\n'])for(const sep of ['\n','\n\n','\n\n\n'])for(const point of ['heading','eol','body']){
  const source='#'.repeat(level)+' Source\ntext Ü 😀\n'+(level<6?'#'.repeat(level+1)+' Child\nchild\n':''),target='# Target\ntarget'+sep;
  const doc=reverse?target+source+'# End'+eof:source+'# Middle\nuntouched\n'+target.trimEnd()+eof;
  const pos=point==='heading'?doc.indexOf('Source')-level-1:point==='eol'?doc.indexOf('Source')+6:doc.indexOf('text')+3;
  const {view,transactions}=fixture(doc,pos),original=view.state,plan=move(view);if(plan.noop){assert.equal(transactions.length,0);continue;}
  const moved=view.state;assert.equal(transactions.length,1);assert.equal(undoDepth(moved),1);
  for(let cycle=0;cycle<5;cycle++){
   assert.equal(undoRefile(view),true);assert.ok(view.state.doc.eq(original.doc));assert.ok(view.state.selection.eq(original.selection));assert.equal(undoDepth(view.state),0);
   assert.equal(redoRefile(view),true);assert.ok(view.state.doc.eq(moved.doc));assert.ok(view.state.selection.eq(moved.selection));assert.equal(undoDepth(view.state),1);
  }
 }
});

test('Normal typing before/after Refile remains separate and clears redo normally on a new edit',()=>{
 const {view}=fixture();view.dispatch({changes:{from:8,insert:'x'},selection:{anchor:3},userEvent:'input.type',annotations:isolateHistory.of('full')});const before=view.state;
 move(view);const moved=view.state;
 view.dispatch({changes:{from:moved.selection.main.head,insert:'Ü'},userEvent:'input.type',annotations:isolateHistory.of('full')});const edited=view.state;
 assert.equal(undoDepth(edited),3);undoRefile(view);assert.ok(view.state.doc.eq(moved.doc));undoRefile(view);assert.ok(view.state.doc.eq(before.doc));assert.ok(view.state.selection.eq(before.selection));
 undoRefile(view);assert.equal(view.state.doc.toString(),'# Source\nbody\n# Target');
 redoRefile(view);redoRefile(view);assert.ok(view.state.doc.eq(moved.doc));assert.ok(view.state.selection.eq(moved.selection));redoRefile(view);assert.ok(view.state.doc.eq(edited.doc));
 undoRefile(view);undoRefile(view);view.dispatch({changes:{from:0,insert:'new\n'},userEvent:'input.type'});assert.equal(redoDepth(view.state),0);assert.equal(redoRefile(view),false);
});

test('Ordinary history delegates the original transaction unchanged and equals native CM history',()=>{
 const a=fixture('abcdef',2),b=fixture('abcdef',2);
 for(const f of [a,b])f.view.dispatch({changes:{from:2,to:4,insert:'Ü'},selection:{anchor:3},userEvent:'input.type'});
 for(let cycle=0;cycle<4;cycle++){
  for(const [wrapped,native] of [[undoRefile,undo],[redoRefile,redo]]){
   let actual;const {view}=a;
   assert.equal(wrapped({state:view.state,dispatch:tr=>{actual=tr;view.dispatch(tr);}}),native(b.view));
   assert.ok(actual instanceof Transaction);assert.equal(actual.effects.some(e=>e.is(refileSelection)),false);assert.ok(a.view.state.doc.eq(b.view.state.doc));assert.ok(a.view.state.selection.eq(b.view.state.selection));
  }
 }
 assert.equal(undoRefile(fixture('',0,EditorState.readOnly.of(true)).view),false);
});

test('Native CM beforeinput routes history through scoped wrappers; unrelated input passes through',()=>{
 const {view}=fixture();const original=view.state;move(view);const moved=view.state;
 const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
 const handler=view.state.facet(facet).map(p=>p.plugin.domEventHandlers?.beforeinput).find(Boolean);assert.ok(handler);
 for(let i=0;i<4;i++)for(const [inputType,expected] of [['historyUndo',original],['historyRedo',moved]]){
  let prevented=false;assert.equal(handler({inputType,preventDefault(){prevented=true;}},view),true);assert.equal(prevented,true);assert.ok(view.state.doc.eq(expected.doc));assert.ok(view.state.selection.eq(expected.selection));
 }
 assert.equal(handler({inputType:'insertText',preventDefault(){assert.fail();}},view),false);
});

test('Controller mark/panel lifecycle retains atomic history and exact QA cursor 3/14',()=>{
 const emacs=createEmacsEditing(),{view}=fixture(undefined,3,emacs.extension(()=>false));let choice,opened=0;
 const controller=createRefileController({view,panel:{openChoices(options){opened++;choice={...options,state:view.state};view.hasFocus=false;return true;}}});
 emacs.run(view,'mark');assert.equal(view.state.field(emacsMark).active,true);const original=view.state;
 assert.equal(controller.open(),true);assert.equal(opened,1);assert.equal(view.state.field(emacsMark).active,false);assert.equal(undoDepth(view.state),0);
 assert.equal(choice.choose(choice.entries[0].id,{state:choice.state}),true);const moved=view.state;assert.equal(moved.selection.main.head,14);
 for(let i=0;i<5;i++){undoRefile(view);assert.ok(view.state.doc.eq(original.doc));assert.equal(view.state.selection.main.head,3);redoRefile(view);assert.ok(view.state.doc.eq(moved.doc));assert.equal(view.state.selection.main.head,14);}
 view.hasFocus=true;controller.open();const stale=choice;view.dispatch({selection:{anchor:0}});assert.equal(stale.choose(stale.entries[0].id,{state:stale.state}),false);
});

test('Local codec changes preserve BOM/mixed untouched EOL through repeated history',()=>{
 const raw='\ufeff# Source\r\nbody\n# Middle\rkeep Ü\r\n# Target\nend',codec=new TextCodec(new TextEncoder().encode(raw)),{view,transactions}=fixture(codec.text);
 const dispatch=view.dispatch;view.dispatch=spec=>{const start=transactions.length;dispatch(spec);for(const tr of transactions.slice(start)){const changes=[];tr.changes.iterChanges((from,to,_a,_b,insert)=>changes.push({from,to,insert:insert.toString()}));codec.applyChanges(changes);}assert.equal(codec.text,view.state.doc.toString());assert.ok(new TextDecoder('utf-8',{ignoreBOM:true}).decode(codec.bytes()).includes('# Middle\rkeep Ü\r\n# Target\nend'));};
 move(view);for(let i=0;i<4;i++){undoRefile(view);assert.equal(new TextDecoder('utf-8',{ignoreBOM:true}).decode(codec.bytes()),raw);redoRefile(view);}
});

test('Successive Refiles and intervening cursor changes retain each original move endpoint',()=>{
 const {view}=fixture('# Source\nbody\n# Target\ntext\n# Other',3);const original=view.state;move(view);const first=view.state;
 view.dispatch({selection:{anchor:first.selection.main.head+1}});const secondStart=view.state;move(view,'Other');const second=view.state;
 view.dispatch({selection:{anchor:0}});
 for(let i=0;i<4;i++){
  undoRefile(view);assert.ok(view.state.doc.eq(secondStart.doc));assert.ok(view.state.selection.eq(secondStart.selection));
  undoRefile(view);assert.ok(view.state.doc.eq(original.doc));assert.ok(view.state.selection.eq(original.selection));
  redoRefile(view);assert.ok(view.state.doc.eq(first.doc));assert.ok(view.state.selection.eq(first.selection));
  redoRefile(view);assert.ok(view.state.doc.eq(second.doc));assert.ok(view.state.selection.eq(second.selection));
 }
});

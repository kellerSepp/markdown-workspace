import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldEffect,foldedRanges} from '@codemirror/language';
import {todoRules} from './todo.mjs';
import {planArchiveBatch,runArchiveBatch} from './archive-batch.mjs';
import {planArchive} from './archive-model.mjs';
import {prepareArchiveFocus,revealArchivePosition} from './archive-focus.mjs';

class Target extends EventTarget{
 constructor(){super();this.count=0;}
 addEventListener(k,f){super.addEventListener(k,f);this.count++;}removeEventListener(k,f){super.removeEventListener(k,f);this.count--;}
}
test('Actual batch app chooses target once, reveals each offered source candidate and reuses archiveOne per y',async()=>{
 const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
 const code=app.slice(app.indexOf('async function archiveBatch(){'),app.indexOf('\nasync function archiveOne('));
 for(const kind of ['review','failed-reload','window-blur','own-dialog-focus']){
  const source='# Project\n## DONE A\nFirst\n## DONE Same\nSecond\n## DONE Same\nThird',make=(doc,anchor=2)=>EditorState.create({doc,selection:{anchor},extensions:[markdown({base:markdownLanguage}),todoRules,codeFolding()]});
  const doc=new Target(),win=new Target(),editor={},own={closest:selector=>selector==='.archive-candidate-dialog'?{}:null};Object.assign(doc,{body:{},documentElement:{},defaultView:win,hasFocus:()=>true});doc.activeElement=doc.body;
  const vault={},session={hasDocument:true,vault,path:'synthetic.md'},view={state:make(source),dom:{contains:e=>e===editor},dispatch(spec){this.state=this.state.update(spec).state;},focus(){focuses++;doc.activeElement=editor;}};
  view.dispatch({effects:foldEffect.of({from:9,to:source.length})});
  let targets=0,prompts=0,writes=0,focuses=0;const notices=[],choices=['y','n',null];
  const context={view,vault,session,requireSynthetic(){},forceParsing:()=>true,planArchiveBatch,runArchiveBatch,planArchive,revealArchivePosition,
   archiveDialog:async()=>{targets++;return {path:'archive.md'};},
   archiveCandidateDialog:async candidate=>{
    prompts++;assert.equal(view.state.selection.main.head,candidate.from);
    foldedRanges(view.state).between(0,view.state.doc.length,(from,to)=>assert.ok(!(candidate.from>from&&candidate.from<to)));
    if(kind==='window-blur')win.dispatchEvent(new Event('blur'));
    if(kind==='own-dialog-focus'){const event=new Event('focusin');Object.defineProperty(event,'target',{value:own});doc.dispatchEvent(event);}
    return choices.shift();
   },
   archiveOne:async({plan,selected})=>{writes++;assert.equal(selected.path,'archive.md');view.state=make(plan.sourceText,0);return kind==='failed-reload'?undefined:true;},
   prepareArchiveFocus:(view,options)=>prepareArchiveFocus(view,{...options,document:doc}),status:m=>notices.push(m)
  };
  const execute=new Function(...Object.keys(context),'let busy=false,archiveSettings={paths:[]};'+code+';return archiveBatch;')(...Object.values(context));
  const result=await execute();assert.equal(targets,1);assert.equal(writes,1);
  assert.equal(prompts,kind==='failed-reload'?1:3);assert.equal(result,kind!=='failed-reload');
  assert.equal(focuses,['review','own-dialog-focus'].includes(kind)?1:0);assert.equal(doc.count+win.count,0);
  if(kind==='failed-reload')assert.match(notices.at(-1),/gespeichert/);
  else assert.match(notices.at(-1),/1 archiviert, 1 übersprungen/);
 }
});

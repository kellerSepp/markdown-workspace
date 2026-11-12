import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Actual save runner restores editor focus after unlocking, including errors, without stealing focus',async()=>{
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
  const start=app.indexOf('async function run(action) {'),end=app.indexOf('\nconst actionIds=',start);
  assert.ok(start>=0&&end>start);
  for(const mode of ['success','error','other-control','other-window','not-editor','other-file','other-action','busy']){
    let finish,focuses=0,locked=false;
    const pending=new Promise(resolve=>{finish=resolve;});
    const body={},editor={},control={};
    const document={body,activeElement:editor,hasFocus:()=>mode!=='other-window'};
    const session={vault:{},path:'synthetic.md'};
    const view={hasFocus:mode!=='not-editor',dom:{contains:element=>element===editor},focus(){assert.equal(locked,false);focuses++;document.activeElement=editor;}};
    const save=async()=>{await pending;if(mode==='error')throw Error('Synthetic save failure');return 'saved';};
    const notices=[];
    const context={save,view,session,document,clearTimeout(){},setTimeout(){throw Error('Unexpected timer');},
      setBusy(value){locked=value;if(value&&document.activeElement===editor)document.activeElement=body;},render(){},status:message=>notices.push(message)};
    const run=new Function(...Object.keys(context),`let busy=${mode==='busy'},timer,persistPending=false;`+app.slice(start,end)+';return run;')(...Object.values(context));
    const result=run(mode==='other-action'?async()=>{await pending;}:save);
    if(mode==='other-control')document.activeElement=control;
    if(mode==='other-file')session.path='other.md';
    finish();await result;
    assert.equal(focuses,['success','error'].includes(mode)?1:0,mode);
    if(mode==='error')assert.match(notices[0],/Synthetic save failure/);
    if(mode==='other-control')assert.equal(document.activeElement,control);
  }
});

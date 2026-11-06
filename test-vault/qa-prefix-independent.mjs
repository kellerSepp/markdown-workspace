import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
// Reuse only the existing synthetic DOM fixture; all checks below are independent.
const source=await readFile(new URL('../editor/work-panel.test.mjs',import.meta.url),'utf8');
const harness=source.slice(0,source.indexOf("test('Prefix help"))
  .replaceAll("from './","from '../editor/");
const checks=String.raw`
import {writeFile} from 'node:fs/promises';
import {structuralTab,orgTab,structureKeyboard} from '../editor/structure-keymap.mjs';
import {StateEffect} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
function integrated(){
 const f=fixture({docText:'# Heading\nbody\n## Child\ntext',selection:{anchor:15,head:2},extra:markdown()});
 const calls=[];
 const router=createPrefixRouter({registry:{get:id=>({name:id}),availability:()=>({enabled:true}),execute:id=>{calls.push(id);return true;}},getContext:()=>f.context,showHelp:(...args)=>f.panel.showPrefix(...args),hideHelp:()=>f.panel.close({restore:false})});
 const down=(key,patch={})=>{const e={key,preventDefault(){this.defaultPrevented=true;},...patch};e.handled=router.keyDown(e,f.view);return e;};
 const start=()=>down('c',{ctrlKey:true});
 return {...f,router,calls,down,start};
}
for(const [key,patch] of [['4',{}],['1',{ctrlKey:true}],['1',{shiftKey:true}],['a',{isComposing:true}],['a',{keyCode:229}],['1',{altKey:true}],['1',{metaKey:true}],['1',{getModifierState:()=>true}],['Shift',{}],['g',{ctrlKey:true}]]){
 const f=integrated(),before=f.view.state;f.start();f.router.keyUp({key:'C'});f.down(key,patch);
 check(!f.router.active&&!f.panel.isOpen&&f.calls.length===0,'invalid cancels '+key);
 check(f.view.state===before&&undoDepth(before)===0,'no text/history transaction');f.panel.destroy();
}
for(const mode of ['busy','missing','focus','state','readonly'])for(const pointer of [false,true]){
 const f=integrated();f.start();f.router.keyUp({key:'c'});
 if(mode==='busy')f.context.busy=true;if(mode==='missing')f.context.hasDocument=false;if(mode==='focus')f.view.hasFocus=false;
 if(mode==='state')f.view.dispatch({selection:{anchor:0}});
 if(mode==='readonly')f.view.dispatch({effects:StateEffect.appendConfig.of(EditorState.readOnly.of(true))});
 if(pointer)f.results.children[0].click();else f.down('1');
 check(!f.calls.length&&!f.router.active&&!f.panel.isOpen,'stale pointer/key '+mode);f.panel.destroy();
}
{
 const f=integrated();f.view.setTabFocusMode=value=>f.view.tabFocus=value;
 f.start();f.down('1');check(!f.calls.length&&!f.router.active,'requires keyup');
 f.start();f.router.keyUp({key:'x'});f.down('2');check(!f.calls.length,'unrelated keyup insufficient');
 f.start();f.router.keyUp({key:'c'});f.down('3',{repeat:true});check(f.router.active&&!f.calls.length,'repeat ignored');f.down('3');check(f.calls[0]==='fold.open','fresh followup executes');
 f.start();f.down('Escape');check(f.view.tabFocus===true,'shared focus navigation');
 for(const shift of [true,false])check(structuralTab(f.view,shift,()=>true,()=>{},()=>assert.fail())===false,'Tab escapes');
 check(orgTab(f.view,false,()=>true,()=>assert.fail())===null,'Org Tab escapes');
 f.view.hasFocus=false;check(!f.start().defaultPrevented,'outside editor native Copy');f.panel.destroy();
}
{
 const f=integrated(),before=f.view.state;f.ring.add('SYNTHETIC');const ring=f.ring.list();
 f.start();const row=f.results.children[2];check(f.root.emit('mousedown').defaultPrevented,'pointer retains focus');row.click();
 check(f.calls[0]==='fold.open'&&f.view.state===before,'pointer action no text change');
 check(row.listeners.click.length===0&&row.textContent==='','removed row cleaned');
 row.click();check(f.calls.length===1,'old callback detached');assert.deepEqual(f.ring.list(),ring);checks++;
 f.panel.destroy();f.panel.destroy();check(f.host.children.length===0,'idempotent destruction');
}
const f=integrated();
for(let i=0;i<120;i++)f.ring.add(String(i).padStart(3,'0')+'x'.repeat(65000));
check(f.ring.size===120&&f.ring.bytes<=8*1024*1024,'maximum entry workload');
const initial=f.view.state,latencies=[],samples=[];let cycles=0;
const begin=performance.now();
const sample=()=>{global.gc();samples.push({seconds:+((performance.now()-begin)/1000).toFixed(3),...process.memoryUsage(),cycles});};
sample();let next=10000;
while(performance.now()-begin<65000){
 for(let i=0;i<100;i++){
  const t=performance.now();f.start();const old=[...f.results.children];f.router.cancel();
  assert.equal(f.panel.isOpen,false);assert.equal(f.results.children.length,0);
  for(const row of old){assert.equal(row.listeners.click.length,0);assert.equal(row.textContent,'');}
  assert.equal(f.view.state,initial);assert.equal(f.view.scrollDOM.scrollTop,2400);assert.equal(f.view.scrollDOM.scrollLeft,130);
  if(latencies.length===10000)latencies.shift();latencies.push(performance.now()-t);cycles++;
 }
 if(performance.now()-begin>=next){sample();next+=10000;}
 await new Promise(resolve=>setTimeout(resolve,5));
}
sample();f.panel.destroy();f.router.cancel();global.gc();
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
const result={latencySampleWindow:10000,checks,cycles,durationSeconds:(performance.now()-begin)/1000,ringBytes:f.ring.bytes,syntheticDocumentCharacters:initial.doc.length,samples,p50ms:percentile(latencies,.5),p95ms:percentile(latencies,.95),p99ms:percentile(latencies,.99),first1000p95ms:percentile(latencies.slice(0,1000),.95),last1000p95ms:percentile(latencies.slice(-1000),.95),afterDestroy:process.memoryUsage()};
console.log(JSON.stringify(result));
await writeFile(new URL('./qa-prefix-results.json',import.meta.url),JSON.stringify(result,null,2));
`;
await writeFile(new URL('./qa-prefix-run.mjs',import.meta.url),harness+checks);



import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPanelLayout,revealPanelRow} from './panel-layout.mjs';

function fixture(top,left=120){
  let currentTop=top,currentLeft=left,open=false;const css=new Map();
  const scroll={scrollHeight:10000,scrollWidth:3000,clientHeight:800,clientWidth:700,
    get scrollTop(){return currentTop;},set scrollTop(v){currentTop=Math.max(0,Math.min(v,this.scrollHeight-this.clientHeight));},
    get scrollLeft(){return currentLeft;},set scrollLeft(v){currentLeft=Math.max(0,Math.min(v,this.scrollWidth-this.clientWidth));}
  };
  const workspace={height:800,classList:{toggle(name,value){assert.equal(name,'panel-open');open=value;scroll.clientHeight=value?440:800;scroll.scrollTop=scroll.scrollTop;}},style:{getPropertyValue:key=>css.get(key)??'',setProperty:(key,value)=>css.set(key,value)}};
  const host={},win={scrollX:40,scrollY:500,scrollTo({left,top}){this.scrollX=left;this.scrollY=top;}},doc={defaultView:win};
  const view={state:{doc:'long text'},scrollDOM:scroll,dispatch(){assert.fail('Layout must not dispatch state');},requestMeasure(){assert.fail('No stale deferred restore');}};
  const layout=createPanelLayout({workspace,host,view,document:doc,policy:{panelShare:'45%'}});
  return {layout,workspace,host,view,scroll,win,css,get open(){return open;}};
}

test('Shared split changes editor viewport without changing total extent, state or top/middle/EOF horizontal offsets',()=>{
  for(const top of [0,4200,9200]){
    const f=fixture(top),state=f.view.state;
    f.layout.setOpen(true,()=>{f.scroll.scrollTop=0;f.scroll.scrollLeft=0;f.win.scrollY=0;});
    assert.equal(f.open,true);assert.equal(f.host.hidden,false);assert.equal(f.workspace.height,800);assert.equal(f.scroll.clientHeight,440);assert.equal(f.scroll.scrollTop,top);assert.equal(f.scroll.scrollLeft,120);assert.equal(f.win.scrollY,500);assert.equal(f.view.state,state);
    f.layout.setOpen(false);assert.equal(f.open,false);assert.equal(f.host.hidden,true);assert.equal(f.scroll.clientHeight,800);assert.equal(f.scroll.scrollTop,top);assert.equal(f.workspace.height,800);
  }
});
test('Closing larger viewport clamps EOF only when necessary, user scroll persists, no restoration into another state',()=>{
  const f=fixture(9200);f.layout.setOpen(true);f.scroll.scrollTop=9560;f.layout.setOpen(false);assert.equal(f.scroll.scrollTop,9200);
  f.layout.setOpen(true);f.scroll.scrollTop=2300;assert.equal(f.scroll.scrollTop,2300);
  f.layout.preserve(()=>{f.view.state={doc:'another file'};f.scroll.scrollTop=70;f.scroll.scrollLeft=30;});assert.equal(f.scroll.scrollTop,70);assert.equal(f.scroll.scrollLeft,30);
  f.layout.destroy();assert.equal(f.host.hidden,true);assert.equal(f.css.get('--work-panel-share'),'');f.layout.setOpen(true);assert.equal(f.host.hidden,true);
});
test('Candidate reveal scrolls only result container, handles both edges and leaves horizontal result offset untouched',()=>{
  const results={scrollTop:0,scrollLeft:55,clientHeight:100,scrollHeight:1000},row={offsetTop:700,offsetHeight:25};
  revealPanelRow(results,row);assert.equal(results.scrollTop,625);assert.equal(results.scrollLeft,55);
  revealPanelRow(results,{offsetTop:10,offsetHeight:20});assert.equal(results.scrollTop,10);
  revealPanelRow(results,{offsetTop:30,offsetHeight:20});assert.equal(results.scrollTop,10);
});
test('DOM/CSS split contract fixes shared height, bounds both tracks and reserves stable editor scrollbar width',async()=>{
  const html=await readFile(new URL('./index.html',import.meta.url),'utf8'),css=await readFile(new URL('./styles.css',import.meta.url),'utf8');
  assert.match(html,/<div id="editorWorkspace">\s*<div id="editor"[^>]*><\/div>\s*<div id="workPanel" hidden><\/div>\s*<\/div>/);
  assert.match(css,/#editorWorkspace\{[^}]*height:var\(--workspace-height\)[^}]*max-height:var\(--workspace-max-height\)/);
  assert.match(css,/#editorWorkspace\.panel-open\{grid-template-rows:minmax\(0,1fr\) minmax\(0,var\(--work-panel-share\)\)\}/);
  assert.match(css,/#editor \.cm-editor\{height:100%;min-height:0\}/);assert.match(css,/scrollbar-gutter:stable;overflow-anchor:none/);
});

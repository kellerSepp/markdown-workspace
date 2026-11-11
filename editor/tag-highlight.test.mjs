import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {ensureSyntaxTree} from '@codemirror/language';
import {tagDecorations,measureTagGaps} from './tag-highlight.mjs';
import {editorTheme} from './theme-editor.mjs';
import {THEMES} from './themes.mjs';

function marks(state,ranges=[{from:0,to:state.doc.length}]){
  assert.ok(ensureSyntaxTree(state,state.doc.length,1000));
  const result=[];
  tagDecorations(state,ranges).between(0,state.doc.length,(from,to,d)=>result.push({from,to,class:d.spec.class}));
  return result;
}
const make=doc=>EditorState.create({doc,extensions:[markdown()]});

test('Tag presentation follows H1–H6, keeps closing hashes with tags and never pads source text',()=>{
  const doc=Array.from({length:6},(_,i)=>`${'#'.repeat(i+1)} TODO Title [0/2] :WORK:@Home: ##`).join('\n');
  const state=make(doc),all=marks(state);
  assert.equal(all.length,12);
  for(let level=1;level<=6;level++){
    const line=state.doc.line(level),mark=all.find(m=>m.class===`cm-heading-tags cm-heading-tags-level${level}`);
    assert.equal(state.doc.sliceString(mark.from,mark.to),' :WORK:@Home: ##');
    assert.equal(mark.to,line.to);
    assert.ok(all.some(m=>m.from===mark.from&&m.to===mark.from&&!m.class));
  }
  assert.equal(state.doc.toString(),doc);
  const changed=state.update({changes:{from:0,to:1,insert:'###'}}).state;
  assert.ok(marks(changed).some(m=>m.class==='cm-heading-tags cm-heading-tags-level3'&&m.from===doc.indexOf(':WORK:')+1));
});

test('Only valid visible heading suffixes receive layout; protected and malformed text stays raw',()=>{
  for(const doc of ['# Title :bad-tag:','# Title :partial','# Title', '> # Title :TAG:','```\n# Title :TAG:\n```','---\nx: :TAG:\n---'])assert.deepEqual(marks(make(doc)),[]);
  const state=make('# First :ONE:\n## Second :TWO:');
  const second=state.doc.line(2);
  assert.equal(marks(state,[{from:second.from,to:second.to}]).length,2);
  assert.deepEqual(marks(state,[{from:0,to:5}]),[]);
  assert.equal(marks(make('# :TAG:')).length,2);
});

test('All theme variants keep editable tags in inline flow and use heading colors including nested syntax',()=>{
  for(const theme of THEMES){
    const state=EditorState.create({extensions:[editorTheme(theme)]});
    const css=state.facet(EditorView.styleModule).flatMap(m=>m.getRules().split('\n'));
    const layout=css.find(r=>r.includes('.cm-content .cm-heading-tags {'));
    assert.ok(layout.includes('display: inline-block'));
    assert.ok(!layout.includes('float:'));
    assert.ok(layout.includes('overflow-wrap: anywhere'));
    assert.ok(css.some(r=>r.includes('.cm-heading-tag-gap {')&&r.includes('min-width: 2ch')));
    for(let level=1;level<=6;level++){
      const rules=css.filter(r=>r.includes(`.cm-heading-tags-level${level}`)).join('\n');
      assert.ok(rules.includes(`.cm-heading-tags-level${level} *`));
      assert.ok(rules.includes(`color: var(--syntax-heading${level})`));
    }
  }
});

test('Typing at the visible title end retains the separator and aligned tag box without an extra Space',()=>{
  for(let level=1;level<=6;level++){
    let state=make('#'.repeat(level)+' Title :WORK: ##');
    for(const char of 'weiter schreiben'){
      const before=marks(state).find(m=>m.class);
      state=state.update({changes:{from:before.from,insert:char},selection:{anchor:before.from+1}}).state;
      const after=marks(state).find(m=>m.class);
      assert.equal(state.doc.sliceString(after.from,after.to),' :WORK: ##');
      assert.equal(state.selection.main.head,after.from);
    }
    assert.equal(state.doc.toString(),'#'.repeat(level)+' Titleweiter schreiben :WORK: ##');
  }
});

test('Alignment measures the title end independently of the old spacer position, and clamps narrow lines',()=>{
  let titleRight=120,lineRight=800,tagWidth=100;
  const tags={getBoundingClientRect:()=>({width:tagWidth})};
  const line={querySelector:()=>tags,getBoundingClientRect:()=>({left:0,right:lineRight})};
  const gap={closest:()=>line};
  const range={setStart(){},setEndBefore(){},getClientRects:()=>[{right:titleRight,width:100}]};
  const content={querySelectorAll:()=>[gap],ownerDocument:{createRange:()=>range,defaultView:{getComputedStyle:()=>({})}}};
  assert.equal(measureTagGaps(content)[0].width,579);
  titleRight=200;assert.equal(measureTagGaps(content)[0].width,499);
  lineRight=240;assert.equal(measureTagGaps(content)[0].width,0);
  titleRight=20;tagWidth=80;assert.equal(measureTagGaps(content)[0].width,139);
});

test('The spacer fits the line content box, excluding right padding and borders at each heading depth',()=>{
  const gap={closest:()=>line},tagWidth=120.5,titleRight=200.25,lineRight=800;
  const tags={getBoundingClientRect:()=>({width:tagWidth})};
  const line={querySelector:()=>tags,getBoundingClientRect:()=>({left:40,right:lineRight})};
  const range={setStart(){},setEndBefore(){},getClientRects:()=>[{right:titleRight,width:100}]};
  for(let level=1;level<=6;level++){
    const style={paddingLeft:String(6+level*8.25),paddingRight:'6px',borderLeftWidth:'0px',borderRightWidth:'1px'};
    const content={querySelectorAll:()=>[gap],ownerDocument:{createRange:()=>range,defaultView:{getComputedStyle:()=>style}}};
    const [{width}]=measureTagGaps(content),contentRight=lineRight-6-1;
    assert.equal(titleRight+width+tagWidth,contentRight-1);
    // Prior calculation spent the padding/border on the gap and overflowed.
    assert.ok(titleRight+(lineRight-titleRight-tagWidth-1)+tagWidth>contentRight);
  }
});

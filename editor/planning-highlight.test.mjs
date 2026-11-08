import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {history,undoDepth} from '@codemirror/commands';
import {todoRules} from './todo.mjs';
import {planningDecorations} from './planning-highlight.mjs';
import {THEMES,applyTheme} from './themes.mjs';
import {editorTheme} from './theme-editor.mjs';
import {PREFIX_BINDINGS,EMACS_BINDINGS} from './emacs-policy.mjs';
import {createPrefixRouter} from './prefix-router.mjs';
const make=(doc,theme=THEMES[0])=>EditorState.create({doc,extensions:[markdown(),history(),todoRules,editorTheme(theme)]});
const marks=s=>{const out=[];planningDecorations(s,[{from:0,to:s.doc.length}]).between(0,s.doc.length,(from,to,d)=>out.push({text:s.doc.sliceString(from,to),class:d.spec.class,spec:d.spec}));return out;};
test('Planning marks valid keyword and entire timestamp including time, excludes code/frontmatter/body/malformed',()=>{
 const text='# TODO Heading\nSCHEDULED: <2026-11-07 Sa 15:00-17:00> DEADLINE: <2026-11-30 Mo>\nBody\n```\nSCHEDULED: <2026-11-01 So>\n```';const s=make(text),before=s.selection;
 assert.deepEqual(marks(s).map(x=>x.text),['SCHEDULED:','<2026-11-07 Sa 15:00-17:00>','DEADLINE:','<2026-11-30 Mo>']);assert.equal(s.doc.toString(),text);assert.equal(s.selection,before);assert.equal(undoDepth(s),0);
 for(const doc of ['---\nSCHEDULED: <2026-11-07 Sa>\n---','```\n# Heading\nSCHEDULED: <2026-11-07 Sa>\n```','# Heading\n\nSCHEDULED: <2026-11-07 Sa>','# Heading\nSCHEDULED: <bad>','# Heading\nSCHEDULED: <2026-11-07 Sa> SCHEDULED: <2026-11-08 So>'])assert.deepEqual(marks(make(doc)),[],doc);
 assert.ok(marks(s).every(x=>!x.spec.attributes?.role&&!x.spec.attributes?.onclick),'future M7 navigation has no fake links');
});
test('Planning colors and descendant selectors use theme tokens and timestamp underline without affecting source',()=>{
 for(const theme of THEMES){const s=make('# H\nDEADLINE: <2026-11-30 Mo 09:00>',theme),css=s.facet(EditorView.styleModule).map(m=>m.getRules()).join('\n');assert.equal(marks(s).length,2);
  for(const [kind,token] of [['keyword','planning-keyword'],['timestamp','planning-timestamp']])for(const suffix of ['',' *'])assert.ok(css.includes(`.cm-content .cm-planning-${kind}${suffix} {color: var(--${token})`));
  assert.match(css,/cm-planning-timestamp[^\n]+text-decoration: underline/);const vars=new Map();applyTheme({style:{setProperty:(k,v)=>vars.set(k,v)},dataset:{}},theme.id);assert.equal(vars.get('--planning-timestamp'),theme.tokens.planningTimestamp);
 }
});
test('Planning bindings only use unmodified s/d, reject held Ctrl, retain other chords',()=>{
 assert.deepEqual(PREFIX_BINDINGS.filter(b=>b.id.startsWith('planning.')).map(b=>[b.key,!!b.ctrl]),[['s',false],['d',false]]);assert.ok(PREFIX_BINDINGS.some(b=>b.key==='c'&&b.ctrl));assert.ok(EMACS_BINDINGS.length);
 for(const key of ['s','d']){const calls=[],view={hasFocus:true,state:make('# H')};const router=createPrefixRouter({registry:{get:()=>({name:'test'}),availability:()=>({enabled:true}),execute:id=>{calls.push(id);return true;}}});const send=(key,patch={})=>router.keyDown({key,preventDefault(){},...patch},view);
  send('c',{ctrlKey:true});router.keyUp({key:'c'});send(key,{ctrlKey:true});assert.equal(calls.length,0);
  send('c',{ctrlKey:true});router.keyUp({key:'c'});send(key);assert.equal(calls.length,1);
 }
});
test('Compact calendar CSS uses bounded day cells and shared scroll without large expanding grids',async()=>{
 const css=await readFile(new URL('./styles.css',import.meta.url),'utf8');assert.match(css,/planning-grid[^}]+repeat\(7,3ch\)/);assert.match(css,/planning-form[^}]+overflow:auto/);assert.match(css,/planning-grid button[^}]+height:1\.35em/);assert.match(css,/planning-calendar-month\s*\{[^}]*width:21ch;[^}]*font-family:var\(--font-editor\)/);
});

test('Planning violet tokens retain readable contrast across all editor surfaces',()=>{
 const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
 for(const theme of THEMES)for(const key of ['planningKeyword','planningTimestamp']){const a=luminance(theme.tokens[key]),b=luminance(theme.tokens.surface);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,theme.id+key);}
});

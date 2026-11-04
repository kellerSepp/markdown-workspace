import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {ensureSyntaxTree,syntaxTree,highlightingFor} from '@codemirror/language';
import {highlightTree} from '@lezer/highlight';
import {THEMES} from './themes.mjs';
import {editorTheme} from './theme-editor.mjs';

function hue(hex) {
  const [r,g,b]=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  return ((max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360;
}
test('H1–H6 besitzen pro Theme sechs klar getrennte Farbrichtungen statt bloßer Helligkeitsstufen',()=>{
  for(const theme of THEMES) {
    const colors=Array.from({length:6},(_,n)=>theme.tokens['syntaxHeading'+(n+1)]),hues=colors.map(hue);
    for(let i=0;i<6;i++) for(let j=i+1;j<6;j++) {const distance=Math.abs(hues[i]-hues[j]);assert.ok(Math.min(distance,360-distance)>=30,`${theme.id}: H${i+1}/H${j+1}`);}
  }
});
test('Codeflächen unterscheiden sich rechnerisch von der Editorfläche in allen Themes',()=>{
  const luminance=hex=>{
    const rgb=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  for(const theme of THEMES) {
    const a=luminance(theme.tokens.surface),b=luminance(theme.tokens.codeBackground);
    // Internal surface-separation target, not a claim of accessibility conformance.
    assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=1.15,theme.id);
  }
});

function renderedStyles(doc,theme) {
  const state=EditorState.create({doc,extensions:[markdown(),editorTheme(theme)]});
  assert.ok(ensureSyntaxTree(state,doc.length,1000));
  const spans=[],rules=state.facet(EditorView.styleModule).flatMap(module=>module.getRules().split('\n'));
  highlightTree(syntaxTree(state),{style:tags=>highlightingFor(state,tags)},(from,to,classes)=>spans.push({from,to,classes}));
  return pos=>spans.filter(s=>s.from<=pos&&s.to>pos).flatMap(s=>s.classes.split(' ').flatMap(c=>rules.filter(rule=>rule.includes('.'+c+' {')))).join('\n');
}
test('Echter Markdown-Syntaxbaum weist H1–H6 sechs zentrale Heading-Tokens zu',()=>{
  const doc=Array.from({length:6},(_,n)=>'#'.repeat(n+1)+' Heading'+(n+1)+'\nText\n').join('\n');
  for(const theme of THEMES) {
    const styles=renderedStyles(doc,theme);
    assert.equal(new Set(Array.from({length:6},(_,n)=>theme.tokens['syntaxHeading'+(n+1)])).size,6);
    for(let level=1;level<=6;level++) assert.ok(styles(doc.indexOf('Heading'+level)+2).includes(`color: var(--syntax-heading${level})`));
  }
});
test('Links, Inlinecode und Codeblöcke erhalten eigene tokenbasierte Syntaxfarben',()=>{
  const doc='[Link](https://example.invalid)\n\n`Inline`\n\n```text\nBlock\n```';
  for(const theme of THEMES) {
    const styles=renderedStyles(doc,theme);
    assert.ok(styles(doc.indexOf('Link')+1).includes('var(--syntax-link)'));
    for(const word of ['Inline','Block']) assert.ok(styles(doc.indexOf(word)+1).includes('var(--syntax-code)'));
  }
});

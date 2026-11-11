import {StateField,StateEffect} from '@codemirror/state';
import {syntaxTree,syntaxTreeAvailable,ensureSyntaxTree} from '@codemirror/language';
import {frontmatterEnd} from './structure.mjs';
import {validTag} from './heading-suffix.mjs';

function definition(state,line){
  if(line.from<frontmatterEnd(state)||!/^ {0,3}#\+TAGS\b/i.test(line.text))return false;
  for(let n=syntaxTree(state).resolveInner(line.from,1);n;n=n.parent)if(/^(FencedCode|CodeBlock|HTMLBlock|Blockquote|ListItem)$/.test(n.name))return false;
  return true;
}
export function tagDefinitionLine(state){return syntaxTreeAvailable(state,state.doc.length)&&definition(state,state.doc.lineAt(state.selection.main.head));}
export function readTagRules(state){
  if(!ensureSyntaxTree(state,state.doc.length,100))return {message:'Tagvorlagen: Dokument noch nicht vollständig analysiert.'};
  const entries=new Map(),keys=new Map();
  for(let i=1;i<=state.doc.lines;i++){
    const line=state.doc.line(i);if(!definition(state,line))continue;
    const match=/^ {0,3}#\+TAGS:[ \t]*(.*)$/.exec(line.text);
    if(!match)return {message:'Tagvorlagen: #+TAGS: NAME(c) erwartet.'};
    for(const token of match[1].trim().split(/\s+/).filter(Boolean)){
      const m=/^([^()]+?)(?:\(([a-zA-Z])\))?$/.exec(token);
      if(!m||!validTag(m[1]))return {message:'Tagvorlagen: Ungültiger Name oder Schnelltaste; Gruppen sind noch nicht unterstützt.'};
      const name=m[1],key=m[2]?.toLowerCase(),old=entries.get(name);
      if(key&&(keys.has(key)&&keys.get(key)!==name||old?.key&&old.key!==key))return {message:'Tagvorlagen: Schnelltasten müssen eindeutig sein.'};
      if(key)keys.set(key,name);entries.set(name,Object.freeze({name,key:key??old?.key}));
    }
  }
  return {entries:Object.freeze([...entries.values()])};
}
export const reloadTags=StateEffect.define();
export const tagRules=StateField.define({
  create(state){const result=readTagRules(state);return {entries:result.entries??[],error:result.message??''};},
  update(value,tr){for(const e of tr.effects)if(e.is(reloadTags))value={entries:e.value.entries??value.entries,error:e.value.message??''};return value;}
});

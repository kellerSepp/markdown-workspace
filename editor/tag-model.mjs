import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {orgHeadings} from './org-folding.mjs';
import {frontmatterEnd} from './structure.mjs';
import {headingSuffix} from './heading-suffix.mjs';

const cache=new WeakMap();
export function readTags(state){
  if(!syntaxTreeAvailable(state,state.doc.length))return {message:'Tags: Dokument noch nicht vollständig analysiert.'};
  const tree=syntaxTree(state);let trees=cache.get(state.doc);if(!trees)cache.set(state.doc,trees=new WeakMap());
  if(trees.has(tree))return trees.get(tree);
  const headings=[],stack=[],diagnostics=[];
  for(const h of orgHeadings(state)){
    const line=state.doc.lineAt(h.from),suffix=headingSuffix(line.text,line.from);
    while(stack.length&&stack.at(-1).level>=h.level)stack.pop();
    // Setext remains a structural parent but never a writable tag target.
    const inherited=[...new Set(stack.flatMap(parent=>parent.tags))];
    const entry={...h,line,suffix,tags:suffix?.tags??[],inherited,effectiveTags:[...new Set([...inherited,...(suffix?.tags??[])])],origins:stack.filter(parent=>parent.tags.length).map(parent=>({line:parent.line.number,tags:parent.tags}))};
    headings.push(entry);stack.push(entry);
    if(suffix?.error)diagnostics.push({line:line.number,message:suffix.error});
  }
  const result={headings,diagnostics};trees.set(tree,result);return result;
}
export function tagContext(state,{headingOnly=false}={}){
  if(state.readOnly)return {message:'Editor ist schreibgeschützt.'};
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return {message:'Tags benötigen einen Cursor ohne Textauswahl.'};
  const pos=state.selection.main.head,line=state.doc.lineAt(pos);
  if(pos<frontmatterEnd(state))return {message:'Frontmatter bleibt geschützt.'};
  const model=readTags(state);if(model.message)return model;
  for(let n=syntaxTree(state).resolveInner(pos,pos===line.to?-1:1);n;n=n.parent)if(/^(FencedCode|CodeBlock|HTMLBlock|Table|Blockquote)$/.test(n.name))return {message:'Code und Container bleiben geschützt.'};
  const heading=model.headings.filter(h=>h.line.from<=pos&&(pos<h.limit||pos===state.doc.length&&pos===h.limit)).at(-1);
  if(!heading?.suffix||headingOnly&&heading.line.number!==line.number)return {message:'Keine normale aktuelle H1–H6-Überschrift.'};
  if(heading.suffix.error)return {message:heading.suffix.error};
  return {model,heading,...heading.suffix};
}

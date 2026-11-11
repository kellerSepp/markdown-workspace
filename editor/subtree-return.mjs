import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {frontmatterEnd} from './structure.mjs';
import {orgHeadings} from './org-folding.mjs';

export function planSubtreeReturn(state){
  const fail=message=>({message});
  if(state.readOnly)return fail('Editor ist schreibgeschützt.');
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return fail('Strg+Enter benötigt einen Cursor ohne Auswahl.');
  if(!syntaxTreeAvailable(state,state.doc.length))return fail('Dokument noch nicht vollständig analysiert.');
  const pos=state.selection.main.head,line=state.doc.lineAt(pos);
  if(pos<frontmatterEnd(state))return fail('Frontmatter bleibt geschützt.');
  for(const point of [line.from,pos,line.to])for(let n=syntaxTree(state).resolveInner(point,point===line.to?-1:1);n;n=n.parent){
    if(/^(FencedCode|CodeBlock|HTMLBlock|Table|Blockquote)$/.test(n.name))return fail('Code, Tabellen und Zitate bleiben geschützt.');
  }
  const heading=orgHeadings(state).filter(h=>h.lineFrom<=pos&&(pos<h.limit||pos===state.doc.length&&h.limit===pos)).at(-1);
  if(!heading)return fail('Strg+Enter benötigt einen aktuellen Überschriftenabschnitt.');
  const source=state.doc.lineAt(heading.from);
  if(!/^ {0,3}#{1,6}(?:[ \t]|$)/.test(source.text))return fail('Nur normale H1–H6-Überschriften unterstützt.');
  const from=heading.limit<state.doc.length?state.doc.lineAt(heading.limit).from:heading.limit,indent=/^ */.exec(source.text)[0],marker=indent+'#'.repeat(heading.level)+' ';
  // Insert only: all subtree text and the following heading remain byte-for-byte
  // unchanged in the editor. Blank separators make the new sibling unambiguous.
  const tail=state.doc.sliceString(Math.max(0,from-2),from);
  const prefix=tail.endsWith('\n\n')?'':tail.endsWith('\n')?'\n':'\n\n';
  const insert=prefix+marker+(from<state.doc.length?'\n\n':'');
  return {spec:{changes:{from,insert},selection:{anchor:from+prefix.length+marker.length},annotations:isolateHistory.of('full'),userEvent:'input.subtree-return',scrollIntoView:true}};
}

export function runSubtreeReturn(view,notify=()=>{}){
  const plan=planSubtreeReturn(view.state);
  if(!plan.spec){notify(plan.message);return false;}
  const previous=view.state.doc;view.dispatch(plan.spec);
  if(previous===view.state.doc)return false;
  // Capture the final cursor for Redo, matching the existing structural adapters.
  view.dispatch({selection:view.state.selection,userEvent:'select.subtree-return'});
  return true;
}

import {syntaxTree,syntaxTreeAvailable,foldedRanges,foldEffect,unfoldEffect} from '@codemirror/language';
import {headingSections,sectionAt} from './section-folding.mjs';
import {frontmatterEnd} from './structure.mjs';

const same=(a,b)=>a.length===b.length&&a.every((r,i)=>r.from===b[i].from&&r.to===b[i].to);
const canonical=ranges=>ranges.filter(r=>r&&r.to>r.from).sort((a,b)=>a.from-b.from||b.to-a.to);
export function orgHeadings(state) {
  const end=frontmatterEnd(state);
  return headingSections(state).filter(h=>{
    let node=syntaxTree(state).resolveInner(h.from,1);while(node&&!/^(ATX|Setext)Heading/.test(node.name))node=node.parent;
    return h.from>=end&&node?.parent?.name==='Document';
  });
}
export function orgFoldReason(state,global=false) {
  if(!syntaxTreeAvailable(state,state.doc.length)) return 'Dokument noch nicht vollständig analysiert.';
  if(!global) {
    const h=sectionAt(state,state.selection.main.head);
    if(!h||!orgHeadings(state).includes(h)||state.selection.main.head>h.headerEnd) return 'Lokales Org-Folding benötigt den Cursor auf einer Überschriftenzeile.';
    if(!h.range) return 'Diese Überschrift besitzt keinen faltbaren Inhalt.';
  } else if(!orgHeadings(state).some(h=>h.range)) return 'Keine faltbaren Überschriften im Dokument.';
  return '';
}
export function orgVisibilityPlans(state,global=false) {
  const all=orgHeadings(state);
  if(global) return [
    {name:'OVERVIEW',ranges:canonical(all.filter(h=>!all.includes(h.parent)).map(h=>h.range))},
    {name:'CONTENTS',ranges:canonical(all.map((h,i)=>({from:h.headerEnd,to:all[i+1]?all[i+1].lineFrom-1:state.doc.length})))},
    {name:'SHOW ALL',ranges:[]}
  ].filter((plan,index,plans)=>index!==1||!same(plan.ranges,plans[0].ranges)&&plan.ranges.length);
  const h=sectionAt(state,state.selection.main.head),children=all.filter(child=>child.parent===h);
  return [
    {name:'FOLDED',ranges:canonical([h.range])},
    ...(children.some(child=>child.range)?[{name:'CHILDREN',ranges:canonical(children.map(child=>child.range))}]:[]),
    {name:'SUBTREE',ranges:[]}
  ];
}
export function cycleOrgVisibility(view,global=false,notify=()=>{}) {
  const reason=orgFoldReason(view.state,global);if(reason){notify(reason);return false;}
  const state=view.state,h=global?null:sectionAt(state,state.selection.main.head),current=[];
  foldedRanges(state).between(0,state.doc.length,(from,to)=>{if(global||from>=h.headerEnd&&to<=h.limit)current.push({from,to});});
  const plans=orgVisibilityPlans(state,global),found=plans.findIndex(p=>same(canonical(current),p.ranges));
  const next=plans[(found+1)%plans.length];
  const effects=[...current.map(r=>unfoldEffect.of(r)),...next.ranges.map(r=>foldEffect.of(r))];
  let selection;
  const hidden=next.ranges.find(r=>state.selection.ranges.some(s=>s.from>r.from&&s.from<r.to||s.to>r.from&&s.to<r.to));
  if(hidden) selection={anchor:hidden.from};
  view.dispatch({effects,...(selection?{selection}:{} )});notify('Org-Sichtbarkeit: '+next.name+'.');return true;
}

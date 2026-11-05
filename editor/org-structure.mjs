import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {sectionAt} from './section-folding.mjs';
import {planStructure,frontmatterEnd} from './structure.mjs';

// Explicit scopes: the legacy children checkbox never changes an Org command.
export const ORG_STRUCTURE = Object.freeze([
  ['heading-promote-single','heading-promote',false,'Überschrift einzeln höherstufen','Alt+Links','M-LEFT'],
  ['heading-demote-single','heading-demote',false,'Überschrift einzeln tieferstufen','Alt+Rechts','M-RIGHT'],
  ['heading-promote-subtree','heading-promote',true,'Überschriften-Unterbaum höherstufen','Alt+Umschalt+Links','M-S-LEFT'],
  ['heading-demote-subtree','heading-demote',true,'Überschriften-Unterbaum tieferstufen','Alt+Umschalt+Rechts','M-S-RIGHT'],
  ['list-outdent-single','list-outdent',false,'Listenpunkt einzeln ausrücken','Alt+Links','M-LEFT'],
  ['list-indent-single','list-indent',false,'Listenpunkt einzeln einrücken','Alt+Rechts','M-RIGHT'],
  ['list-outdent-subtree','list-outdent',true,'Listen-Unterbaum ausrücken','Alt+Umschalt+Links','M-S-LEFT'],
  ['list-indent-subtree','list-indent',true,'Listen-Unterbaum einrücken','Alt+Umschalt+Rechts','M-S-RIGHT'],
  ['list-up-subtree','list-up',true,'Listen-Unterbaum nach oben','Alt+Oben','M-UP'],
  ['list-down-subtree','list-down',true,'Listen-Unterbaum nach unten','Alt+Unten','M-DOWN']
].map(Object.freeze));
const repeatRegions=new WeakMap();

export function orgContext(state) {
  if(state.readOnly||state.selection.ranges.length!==1||!state.selection.main.empty||state.selection.main.head<frontmatterEnd(state)||!syntaxTreeAvailable(state,state.doc.length)) return null;
  const pos=state.selection.main.head,line=state.doc.lineAt(pos),content=line.from+/^[ \t]*/.exec(line.text)[0].length;
  const nodes=[];
  for(let node=syntaxTree(state).resolveInner(Math.max(pos,content),pos===line.to?-1:1);node;node=node.parent) nodes.push(node);
  if(nodes.some(n=>/^(FencedCode|CodeBlock|HTMLBlock|Table|Blockquote)$/.test(n.name))) return null;
  const item=nodes.find(n=>n.name==='ListItem');
  if(item) return state.doc.lineAt(item.from).number===line.number?'list':null;
  const h=sectionAt(state,pos);
  return h&&pos<=h.headerEnd?'heading':null;
}
export function planOrgStructure(state,id) {
  const definition=ORG_STRUCTURE.find(c=>c[0]===id);
  if(!definition) return {message:'Unbekannter Org-Strukturbefehl.'};
  if(orgContext(state)!==(id.startsWith('heading')?'heading':'list')) return {message:'Org-Struktur: einzelne Cursorstelle auf einer Überschriftenzeile oder der ersten Listenpunktzeile verwenden; Code und Mischcontainer bleiben geschützt.'};
  return planStructure(state,definition[1],{children:definition[2],orgSemantics:true,orgRegion:repeatRegions.get(state)});
}
export function runOrgStructure(view,id,notify=()=>{}) {
  const result=planOrgStructure(view.state,id);
  if(!result.spec) {notify(result.message);return false;}
  view.dispatch(result.spec);
  view.dispatch({selection:view.state.selection,userEvent:'select.structure'});
  if(/^list-(indent|outdent)-subtree$/.test(id)) repeatRegions.set(view.state,result.orgRegion);
  notify('Org-Struktur geändert. Undo/Redo verfügbar.');return true;
}
export function orgShortcutCommand(state,event) {
  if(!event.altKey||event.ctrlKey||event.metaKey||event.isComposing||event.getModifierState?.('AltGraph')) return null;
  if(event.shiftKey&&(event.key==='ArrowUp'||event.key==='ArrowDown')) {
    if(state.readOnly||state.selection.ranges.length!==1||!state.selection.main.empty) return null;
    return event.key==='ArrowUp'?'edit.line-up':'edit.line-down';
  }
  const context=orgContext(state);if(!context) return null;
  const direction={ArrowLeft:context==='heading'?'heading-promote':'list-outdent',ArrowRight:context==='heading'?'heading-demote':'list-indent',ArrowUp:context==='heading'?'heading-up':'list-up',ArrowDown:context==='heading'?'heading-down':'list-down'}[event.key];
  if(!direction) return null;
  if(event.key==='ArrowUp'||event.key==='ArrowDown') return event.shiftKey?null:'structure.'+direction+(context==='list'?'-subtree':'');
  return 'structure.'+direction+(event.shiftKey?'-subtree':'-single');
}

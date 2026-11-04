import {syntaxTree,syntaxTreeAvailable,foldedRanges,unfoldEffect} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {frontmatterEnd} from './structure.mjs';

export function planLineMove(state,down=false) {
  if(state.readOnly) return {message:'Editor ist schreibgeschützt.'};
  if(state.selection.ranges.length!==1||!state.selection.main.empty) return {message:'Zeilenverschieben benötigt eine einzelne Cursorstelle ohne Textauswahl.'};
  if(!syntaxTreeAvailable(state,state.doc.length)) return {message:'Dokument noch nicht vollständig analysiert.'};
  const current=state.doc.lineAt(state.selection.main.head),otherNumber=current.number+(down?1:-1);
  if(otherNumber<1||otherNumber>state.doc.lines) return {message:'Am Dokumentrand: keine benachbarte Zeile.'};
  const other=state.doc.line(otherNumber),first=down?current:other,last=down?other:current;
  if(first.from<frontmatterEnd(state)) return {message:'Zeilen in oder über Frontmatter werden nicht verschoben.'};
  let protectedBlock=false;
  syntaxTree(state).iterate({from:first.from,to:last.to,enter(node){if(/^(FencedCode|CodeBlock)$/.test(node.name)&&node.from<=last.to&&node.to>=first.from) protectedBlock=true;}});
  if(protectedBlock) return {message:'Zeilen in oder über Codeblöcke/Fences werden nicht verschoben.'};
  const changes=state.changes({from:first.from,to:last.to,insert:last.text+'\n'+first.text});
  const column=state.selection.main.head-current.from;
  const anchor=down?first.from+last.length+1+column:first.from+column;
  const effects=[];
  foldedRanges(state).between(first.from,last.to,(from,to)=>effects.push(unfoldEffect.of({from,to})));
  return {spec:{changes,selection:{anchor},effects:effects.map(effect=>effect.map(changes)).filter(Boolean),annotations:isolateHistory.of('full'),scrollIntoView:true}};
}
export function runLineMove(view,down,notify=()=>{}) {
  const result=planLineMove(view.state,down);if(!result.spec){notify(result.message);return false;}
  view.dispatch(result.spec);
  view.dispatch({selection:view.state.selection,userEvent:'select.line-move'});
  notify('Zeile verschoben, Ebenenmarker unverändert. Undo/Redo verfügbar.');return true;
}

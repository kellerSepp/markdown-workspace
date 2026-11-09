import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {sectionAt} from './section-folding.mjs';
import {frontmatterEnd} from './structure.mjs';
import {parseTimestamp} from './planning-date.mjs';
import {planningDrawerRanges,inPlanningDrawer} from './planning-drawers.mjs';

const fail=message=>({message});
export function planningTreeComplete(state){return syntaxTree(state).length>=state.doc.length&&syntaxTreeAvailable(state,state.doc.length);}
export function plainPlanningPosition(state,pos){for(let n=syntaxTree(state).resolveInner(pos,1);n;n=n.parent)if(['FencedCode','CodeBlock','Blockquote','ListItem','HTMLBlock'].includes(n.name))return false;return true;}
export function planningContext(state,recordHeading=null,ownLimit=null){
  if(!recordHeading&&(state.readOnly||state.selection.ranges.length!==1||!state.selection.main.empty))return fail('Planung benötigt einen bearbeitbaren Einzelcursor ohne Auswahl.');
  if(!planningTreeComplete(state))return fail('Dokument noch nicht vollständig analysiert.');
  const heading=recordHeading??sectionAt(state,state.selection.main.head);if(!heading||heading.from<frontmatterEnd(state))return fail('Keine bearbeitbare Überschrift im Kontext.');
  let node=syntaxTree(state).resolveInner(heading.from,1);while(node&&!/^ATXHeading[1-6]$/.test(node.name))node=node.parent;
  if(!node||node.parent?.name!=='Document')return fail('Nur normale H1–H6-Überschriften unterstützt.');
  const header=state.doc.lineAt(heading.from),entries={},lines=[];
  // Only the contiguous planning block immediately following the heading belongs
  // to it. Prose, blank lines and child headings end the block.
  for(let number=header.number+1;number<=state.doc.lines;number++){
    const line=state.doc.line(number);if(line.from>=heading.limit||!/^ {0,3}(?:SCHEDULED|DEADLINE):/.test(line.text)||!plainPlanningPosition(state,line.from))break;
    const rx=/(SCHEDULED|DEADLINE):[ \t]*(<[^>]*>)/g;let match,cursor=0,found=false;
    while((match=rx.exec(line.text))){
      if(line.text.slice(cursor,match.index).trim())return fail('Mehrdeutige Planungszeile bleibt unverändert.');
      const parsed=parseTimestamp(match[2]);if(parsed.message)return parsed;
      if(entries[match[1]])return fail('Doppelter '+match[1]+'-Eintrag; bitte manuell bereinigen.');
      entries[match[1]]={...parsed.value,from:line.from+match.index,to:line.from+rx.lastIndex,line};cursor=rx.lastIndex;found=true;
    }
    if(!found||line.text.slice(cursor).trim())return fail('Ungültige oder fremde Metadaten in Planungszeile; keine Änderung.');
    lines.push(line);
  }
  const last=lines.at(-1)?.number??header.number,drawers=planningDrawerRanges(state);
  for(let number=last+1;number<=state.doc.lines;number++){
    const line=state.doc.line(number);if(line.from>=Math.min(heading.limit,ownLimit??heading.limit))break;
    if(ownLimit===null&&sectionAt(state,line.from)!==heading)break;
    if(/^ {0,3}(?:SCHEDULED|DEADLINE):/.test(line.text)&&plainPlanningPosition(state,line.from)&&!inPlanningDrawer(drawers,line.from))return fail('Planungsangabe außerhalb des direkten Metadatenblocks; bitte Position manuell klären.');
  }
  return {heading,header,entries,lines};
}
export function removePlanningEntry(state,old){
  let from=old.from,to=old.to;
  const before=state.doc.sliceString(old.line.from,from),after=state.doc.sliceString(to,old.line.to);
  if(!before.trim()&&!after.trim()){from=old.line.from;to=old.line.to<state.doc.length?old.line.to+1:old.line.to;}
  else if(!before.trim())to+=/^[ \t]*/.exec(after)[0].length;else from-=/[ \t]*$/.exec(before)[0].length;
  return {from,to,insert:''};
}

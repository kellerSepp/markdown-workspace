import {syntaxTree} from '@codemirror/language';
import {headingSections} from './section-folding.mjs';
import {readPlanningDrawers} from './planning-drawers.mjs';
import {WEEKDAYS} from './planning-date.mjs';

const fail=message=>({message});
export function readRepeatMetadata(state,context,rules){
  const header=context.header??context.line,heading=context.heading;
  // A child's properties/history are never inherited or written by its parent.
  const next=headingSections(state).find(h=>h.from>heading.from&&h.container===heading.container);
  const ownEnd=next?.lineFrom??state.doc.length;
  const result=readPlanningDrawers(state,{from:header.to,to:ownEnd});
  if(result.errors.length)return fail(result.errors[0]+' Wiederholung unverändert verweigert.');
  for(const kind of ['PROPERTIES','LOGBOOK'])if(result.drawers.filter(d=>d.kind===kind).length>1)return fail('Mehrere '+kind+'-Drawer; Wiederholung unverändert verweigert.');
  const properties=result.drawers.find(d=>d.kind==='PROPERTIES'),logbook=result.drawers.find(d=>d.kind==='LOGBOOK');
  if(properties&&properties.start.number!==(context.lines?.at(-1)?.number??header.number)+1)return fail('PROPERTIES muss unmittelbar nach Überschrift und Planungsblock stehen; Wiederholung unverändert verweigert.');
  const firstOpen=rules.find(rule=>!rule.closed)?.name;if(!firstOpen)return fail('Kein offener TODO-Zustand für die Wiederholung.');
  let resetState=firstOpen,warning='',repeatState=null;
  if(properties){
    for(let number=properties.start.number+1;number<properties.end.number;number++){
      const line=state.doc.line(number);if(!line.text.trim())continue;
      const property=/^ {0,3}:([^:\s]+):[ \t]*(.*?)[ \t]*$/.exec(line.text);
      if(!property)return fail('Ungültige Zeile im lokalen PROPERTIES-Drawer; Wiederholung unverändert verweigert.');
      if(property[1].toUpperCase()!=='REPEAT_TO_STATE')continue;
      if(repeatState!==null)return fail('Mehrere REPEAT_TO_STATE-Angaben; Wiederholung unverändert verweigert.');
      repeatState=property[2];
    }
    if(repeatState!==null){
      const target=rules.find(rule=>rule.name===repeatState&&!rule.closed);
      if(target)resetState=target.name;
      else warning=`REPEAT_TO_STATE „${repeatState}“ ist kein gültiger offener Zustand; ${firstOpen} verwendet.`;
    }
  }
  // A property outside its drawer is not silently repaired or inherited.
  for(let number=header.number+1;number<=state.doc.lines;number++){
    const line=state.doc.line(number);if(line.from>=ownEnd)break;
    if(!/^ {0,3}:REPEAT_TO_STATE:/i.test(line.text)||properties&&line.from>=properties.from&&line.from<=properties.to||logbook&&line.from>=logbook.from&&line.from<=logbook.to)continue;
    let excluded=false;for(let n=syntaxTree(state).resolveInner(line.from,1);n;n=n.parent)if(['FencedCode','CodeBlock','Blockquote','ListItem','HTMLBlock'].includes(n.name))excluded=true;
    if(!excluded)return fail('REPEAT_TO_STATE außerhalb des lokalen PROPERTIES-Drawers; Wiederholung unverändert verweigert.');
  }
  const insertAt=properties?properties.to:(context.lines?.at(-1)?.to??header.to);
  return {resetState,warning,logbook,properties,ownEnd,insertAt};
}
function inactive(now){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getFullYear()<1||now.getFullYear()>9999)return null;
  const pad=n=>String(n).padStart(2,'0');
  return `[${String(now.getFullYear()).padStart(4,'0')}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${WEEKDAYS[now.getDay()]} ${pad(now.getHours())}:${pad(now.getMinutes())}]`;
}
const quote=value=>String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
export function planRepeatLog(state,metadata,{fromState,toState,now}){
  const stamp=inactive(now);if(!stamp)return fail('Ungültiger Abschlusszeitpunkt.');
  const entry=`- State "${quote(toState)}" from "${quote(fromState)}" ${stamp}`;
  if(metadata.logbook)return {changes:[{from:metadata.logbook.contentFrom,insert:entry+'\n'}]};
  // Preserve all existing text; a new drawer is inserted beside own metadata.
  return {changes:[{from:metadata.insertAt,insert:`\n:LOGBOOK:\n${entry}\n:END:`}]};
}

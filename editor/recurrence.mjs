import {headingSections} from './section-folding.mjs';
import {planningContext,plainPlanningPosition,removePlanningEntry} from './planning-context.mjs';
import {planningDrawerRanges,inPlanningDrawer} from './planning-drawers.mjs';
import {timestamp} from './planning-date.mjs';
import {nextRepeatDate} from './recurrence-date.mjs';
import {readRepeatMetadata,planRepeatLog} from './recurrence-metadata.mjs';

function ownRepeatCandidate(state,task){
  const end=headingSections(state).find(h=>h.from>task.heading.from&&h.container===task.heading.container)?.lineFrom??state.doc.length,drawers=planningDrawerRanges(state);
  for(let number=task.line.number+1;number<=state.doc.lines;number++){
    const line=state.doc.line(number);if(line.from>=end)break;
    if(/^ {0,3}(?:SCHEDULED|DEADLINE):/.test(line.text)&&/[<\s](?:\+|\.\+)\S*/.test(line.text)&&plainPlanningPosition(state,line.from)&&!inPlanningDrawer(drawers,line.from))return true;
  }
  return false;
}
// Called only by an explicit genuine open -> closed TODO command. The returned
// edits share that command's single CodeMirror transaction and undo boundary.
export function planRecurringCompletion(state,task,closedState,now){
  const context=planningContext(state);
  if(context.message)return ownRepeatCandidate(state,task)?context:{recurring:false};
  const repeated=Object.values(context.entries).filter(entry=>entry.repeat);if(!repeated.length)return {recurring:false};
  const metadata=readRepeatMetadata(state,context,task.rules);if(metadata.message)return metadata;
  const changes=[];
  for(const entry of repeated){
    const next=nextRepeatDate(entry,now);if(next.message)return next;
    const formatted=timestamp({...entry,date:next.date});if(formatted.message)return formatted;
    const from=entry.from+state.doc.sliceString(entry.from,entry.to).indexOf('<');changes.push({from,to:entry.to,insert:formatted.text});
  }
  const scheduled=context.entries.SCHEDULED;
  if(scheduled&&!scheduled.repeat){
    const removal=removePlanningEntry(state,scheduled);changes.push(removal);
    if(removal.from===scheduled.line.from&&removal.to>=scheduled.line.to&&metadata.insertAt>=removal.from&&metadata.insertAt<=removal.to){
      metadata.insertAt=context.lines.filter(line=>line.from!==scheduled.line.from).at(-1)?.to??context.header.to;
    }
  }
  const log=planRepeatLog(state,metadata,{fromState:task.status.name,toState:closedState,now});if(log.message)return log;
  changes.push(...log.changes);changes.sort((a,b)=>a.from-b.from);
  return {recurring:true,status:metadata.resetState,warning:metadata.warning,changes};
}

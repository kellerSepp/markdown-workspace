import {isolateHistory} from '@codemirror/commands';
import {headingSuffix} from './heading-suffix.mjs';
import {readTags} from './tag-model.mjs';
import {headingSections} from './section-folding.mjs';
import {frontmatterEnd} from './structure.mjs';
import {todoRules,readTodoRules} from './todo.mjs';
import {emacsMark,setEmacsMark} from './emacs-editing.mjs';
import {timestamp} from './planning-date.mjs';
export {parseDate,timestamp,parseTimestamp,parseRepeater} from './planning-date.mjs';
import {planningContext,removePlanningEntry,planningTreeComplete as safeTree,plainPlanningPosition as plain} from './planning-context.mjs';
export {planningContext} from './planning-context.mjs';

const fail=message=>({message});
export function planPlanning(state,kind,value){
  if(!['SCHEDULED','DEADLINE'].includes(kind))return fail('Unbekannte Planungsart.');
  const c=planningContext(state);if(c.message)return c;const old=c.entries[kind];let change;
  if(value===null){
    if(!old)return {noop:true};change=removePlanningEntry(state,old);
  }else{
    const formatted=timestamp(!Object.hasOwn(value,'repeat')&&old?.repeat?{...value,repeat:old.repeat}:value);if(formatted.message)return formatted;const text=kind+': '+formatted.text;
    if(old){if(state.doc.sliceString(old.from,old.to)===text)return {noop:true};change={from:old.from,to:old.to,insert:text};}
    else change=c.header.to<state.doc.length?{from:c.header.to+1,insert:text+'\n'}:{from:c.header.to,insert:'\n'+text};
  }
  const changes=state.changes(change);return {spec:{changes,selection:state.selection.map(changes),annotations:isolateHistory.of('full'),userEvent:'input.planning'}};
}
export function planningRecords(state,file=''){
  if(!safeTree(state))return fail('Dokument noch nicht vollständig analysiert.');
  const loaded=state.field(todoRules,false)?.rules??readTodoRules(state).rules;if(!loaded)return fail('TODO-Regeln ungültig.');
  const headings=headingSections(state).filter(h=>h.from>=frontmatterEnd(state)&&plain(state,h.from));
  const tags=new Map((readTags(state).headings??[]).map(h=>[h.line.from,h]));
  return {records:headings.map((h,index)=>{
    const c=planningContext(state,h,headings[index+1]?.from??state.doc.length);
    const line=state.doc.lineAt(h.from),raw=headingSuffix(line.text,line.from)?.content??line.text.replace(/^ {0,3}#{1,6}[ \t]*/,'').replace(/[ \t]+#+[ \t]*$/,'');
    const firstWord=/^([^\s]+)(?=\s|$)/u.exec(raw)?.[1];
    const status=loaded.find(r=>r.name===firstWord)??null;
    const tagged=tags.get(line.from);
    return {file,from:h.from,to:h.limit,level:h.level,parentFrom:h.parent?.from??null,title:status?raw.slice(status.name.length).trimStart():raw,tags:tagged?.tags??[],inheritedTags:tagged?.inherited??[],effectiveTags:tagged?.effectiveTags??[],status:status?.name??null,closed:status?.closed??null,scheduled:c.entries?.SCHEDULED??null,deadline:c.entries?.DEADLINE??null,error:c.message??null};
  })};
}
export function createPlanningController({view,panel,getContext=()=>({}),notify=()=>{}}){
  return {open(kind){const ready=()=>{const c=getContext();return !c.busy&&c.hasDocument!==false&&!view.state.readOnly;};if(!ready())return false;
    const c=planningContext(view.state);if(c.message){notify(c.message);return false;}
    if(view.state.field(emacsMark,false)?.active)view.dispatch({effects:setEmacsMark.of(false)});
    return panel.openPlanning({kind,value:c.entries[kind]??null,choose:(value,saved)=>{
      if(!ready()||saved.state!==view.state){notify('Planung verworfen: Ziel geändert.');return false;}
      const p=planPlanning(view.state,kind,value);if(p.noop)return true;if(p.message){notify(p.message);return false;}
      const expected=p.spec.changes.apply(view.state.doc);view.dispatch(p.spec);return view.state.doc.eq(expected);
    }});
  }};
}

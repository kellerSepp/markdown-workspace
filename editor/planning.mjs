import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {sectionAt,headingSections} from './section-folding.mjs';
import {frontmatterEnd} from './structure.mjs';
import {todoRules,readTodoRules} from './todo.mjs';
import {emacsMark,setEmacsMark} from './emacs-editing.mjs';

const fail=message=>({message});
const days=['So','Mo','Di','Mi','Do','Fr','Sa'];
export function parseDate(text){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text??'');if(!m)return null;
  const [year,month,day]=m.slice(1).map(Number);if(year<1||year>9999||month<1||month>12||day<1)return null;
  const d=new Date(0);d.setUTCFullYear(year,month-1,day);d.setUTCHours(0,0,0,0);
  return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?{year,month,day,weekday:d.getUTCDay()}:null;
}
export function timestamp(value){
  const date=parseDate(value?.date);if(!date)return fail('Datum als gültiges YYYY-MM-DD eingeben.');
  const start=value.startTime??'',end=value.endTime??'';
  if([start,end].some(t=>t&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)))return fail('Uhrzeit als HH:MM zwischen 00:00 und 23:59 eingeben.');
  if(end&&(!start||end<start))return fail('Endzeit benötigt eine Startzeit und darf nicht davor liegen.');
  return {text:`<${value.date} ${days[date.weekday]}${start?' '+start:''}${end?'-'+end:''}>`,value:{date:value.date,startTime:start||null,endTime:end||null}};
}
export function parseTimestamp(text){
  const m=/^<(\d{4}-\d{2}-\d{2})(?:\s+[A-Za-zÄÖÜäöü]{2,3}\.?)?(?:\s+(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?)?>$/.exec(text);
  if(!m)return fail('Nicht unterstützter Zeitstempel; Wiederholungen und Datumsbereiche bleiben unverändert.');
  return timestamp({date:m[1],startTime:m[2],endTime:m[3]});
}
function safeTree(state){return syntaxTree(state).length>=state.doc.length&&syntaxTreeAvailable(state,state.doc.length);}
function plain(state,pos){for(let n=syntaxTree(state).resolveInner(pos,1);n;n=n.parent)if(['FencedCode','CodeBlock','Blockquote','ListItem','HTMLBlock'].includes(n.name))return false;return true;}
export function planningContext(state,recordHeading=null,ownLimit=null){
  if(!recordHeading&&(state.readOnly||state.selection.ranges.length!==1||!state.selection.main.empty))return fail('Planung benötigt einen bearbeitbaren Einzelcursor ohne Auswahl.');
  if(!safeTree(state))return fail('Dokument noch nicht vollständig analysiert.');
  const heading=recordHeading??sectionAt(state,state.selection.main.head);if(!heading||heading.from<frontmatterEnd(state))return fail('Keine bearbeitbare Überschrift im Kontext.');
  let node=syntaxTree(state).resolveInner(heading.from,1);while(node&&!/^ATXHeading[1-6]$/.test(node.name))node=node.parent;
  if(!node||node.parent?.name!=='Document')return fail('Nur normale H1–H6-Überschriften unterstützt.');
  const header=state.doc.lineAt(heading.from),entries={},lines=[];
  // Only the contiguous planning block immediately following the heading belongs
  // to it. Prose, blank lines and child headings end the block.
  for(let number=header.number+1;number<=state.doc.lines;number++){
    const line=state.doc.line(number);if(line.from>=heading.limit||!/^ {0,3}(?:SCHEDULED|DEADLINE):/.test(line.text)||!plain(state,line.from))break;
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
  const last=lines.at(-1)?.number??header.number;
  for(let number=last+1;number<=state.doc.lines;number++){
    const line=state.doc.line(number);if(line.from>=Math.min(heading.limit,ownLimit??heading.limit))break;
    if(ownLimit===null&&sectionAt(state,line.from)!==heading)break;
    if(/^ {0,3}(?:SCHEDULED|DEADLINE):/.test(line.text)&&plain(state,line.from))return fail('Planungsangabe außerhalb des direkten Metadatenblocks; bitte Position manuell klären.');
  }
  return {heading,header,entries,lines};
}
export function planPlanning(state,kind,value){
  if(!['SCHEDULED','DEADLINE'].includes(kind))return fail('Unbekannte Planungsart.');
  const c=planningContext(state);if(c.message)return c;const old=c.entries[kind];let change;
  if(value===null){
    if(!old)return {noop:true};let from=old.from,to=old.to;
    const before=state.doc.sliceString(old.line.from,from),after=state.doc.sliceString(to,old.line.to);
    if(!before.trim()&&!after.trim()){from=old.line.from;to=old.line.to<state.doc.length?old.line.to+1:old.line.to;}
    else if(!before.trim())to+=/^[ \t]*/.exec(after)[0].length;else from-=/[ \t]*$/.exec(before)[0].length;
    change={from,to,insert:''};
  }else{
    const formatted=timestamp(value);if(formatted.message)return formatted;const text=kind+': '+formatted.text;
    if(old){if(state.doc.sliceString(old.from,old.to)===text)return {noop:true};change={from:old.from,to:old.to,insert:text};}
    else change=c.header.to<state.doc.length?{from:c.header.to+1,insert:text+'\n'}:{from:c.header.to,insert:'\n'+text};
  }
  const changes=state.changes(change);return {spec:{changes,selection:state.selection.map(changes),annotations:isolateHistory.of('full'),userEvent:'input.planning'}};
}
export function planningRecords(state,file=''){
  if(!safeTree(state))return fail('Dokument noch nicht vollständig analysiert.');
  const loaded=state.field(todoRules,false)?.rules??readTodoRules(state).rules;if(!loaded)return fail('TODO-Regeln ungültig.');
  const headings=headingSections(state).filter(h=>h.from>=frontmatterEnd(state)&&plain(state,h.from));
  return {records:headings.map((h,index)=>{
    const c=planningContext(state,h,headings[index+1]?.from??state.doc.length);
    const raw=state.doc.lineAt(h.from).text.replace(/^ {0,3}#{1,6}[ \t]*/,'').replace(/[ \t]+#+[ \t]*$/,'');
    const firstWord=/^([^\s]+)(?=\s|$)/u.exec(raw)?.[1];
    const status=loaded.find(r=>r.name===firstWord)??null;
    return {file,from:h.from,to:h.limit,level:h.level,parentFrom:h.parent?.from??null,title:status?raw.slice(status.name.length).trimStart():raw,status:status?.name??null,closed:status?.closed??null,scheduled:c.entries?.SCHEDULED??null,deadline:c.entries?.DEADLINE??null,error:c.message??null};
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

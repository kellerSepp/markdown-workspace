import {parseDate} from './planning.mjs';

const names=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const months=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function utc(value){const p=parseDate(value);if(!p)throw Error('Ungültiges Agendadatum.');const d=new Date(0);d.setUTCFullYear(p.year,p.month-1,p.day);d.setUTCHours(0,0,0,0);return d;}
function key(d){const year=d.getUTCFullYear();return year<1||year>9999?null:`${String(year).padStart(4,'0')}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}
export function localToday(now=new Date()){return `${String(now.getFullYear()).padStart(4,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export function addAgendaDays(value,days){const d=utc(value);d.setUTCDate(d.getUTCDate()+days);return key(d);}
export function agendaWeek(value){
  const d=utc(value),weekday=(d.getUTCDay()+6)%7,monday=addAgendaDays(value,-weekday),thursday=new Date(d);
  thursday.setUTCDate(d.getUTCDate()+3-weekday);const year=thursday.getUTCFullYear(),first=utc(`${String(year).padStart(4,'0')}-01-04`);
  first.setUTCDate(first.getUTCDate()-(first.getUTCDay()+6)%7);
  return {monday,year,week:Math.floor((utc(monday)-first)/604800000)+1};
}
export function moveAgendaWeek(monday,delta){return addAgendaDays(monday,7*delta)??monday;}
export function agendaDateLabel(value,index){if(!value)return `${names[index]} · außerhalb 0001–9999`;const p=parseDate(value);return `${names[index]} ${p.day}. ${months[p.month-1]} ${p.year}`;}
export function agendaStampLabel(mark){
  const time=mark.startTime?` ${mark.startTime}${mark.endTime?'-'+mark.endTime:''}`:'';
  const label=mark.kind==='scheduled'?'SCHEDULED':'DEADLINE';
  return `${label}${time}${mark.late?` · ${mark.kind==='scheduled'?'geplant seit':'überfällig seit'} ${mark.date}`:''}`;
}
// View projections only. Source records and classification always come from M7a.
export function projectAgendaWeek(index,{date,today}){
  const week=agendaWeek(date),days=Array.from({length:7},(_,n)=>({date:addAgendaDays(week.monday,n),label:'',entries:[]}));
  days.forEach((day,n)=>day.label=agendaDateLabel(day.date,n));
  const until=days.findLast(day=>day.date)?.date,records=index.query({type:'week',from:week.monday,to:until});
  const todayVisible=days.some(day=>day.date===today);
  if(todayVisible)for(const r of index.query({type:'open'}))if((r.scheduled?.date<today||r.deadline?.date<today)&&!records.some(other=>other.id===r.id))records.push(r);
  for(const day of days){if(!day.date)continue;
    for(const record of records){const marks=[];
      for(const kind of ['scheduled','deadline']){const stamp=record[kind];if(!stamp)continue;
        const late=record.closed===false&&stamp.date<today;
        if(stamp.date===day.date||day.date===today&&late)marks.push({kind,...stamp,late});
      }
      if(marks.length)day.entries.push({record,marks,key:JSON.stringify([day.date,record.path,record.from])});
    }
    const start=entry=>entry.marks.filter(m=>m.date===day.date&&m.startTime).map(m=>m.startTime).sort()[0]??'99:99';
    day.entries.sort((a,b)=>start(a).localeCompare(start(b))||a.record.path.localeCompare(b.record.path)||a.record.from-b.record.from);
  }
  return {...week,days};
}
export function projectAgendaTodos(index,{includeClosed=false}={}){return index.query({type:includeClosed?'todo':'open'}).map(record=>({record,marks:[],key:JSON.stringify([record.path,record.from])}));}

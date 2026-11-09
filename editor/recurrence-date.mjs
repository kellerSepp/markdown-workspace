import {parseDate,parseRepeater} from './planning-date.mjs';

const fail=message=>({message});
const key=(year,month,day)=>`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
export function civilDay(value){
  const p=parseDate(value);if(!p)return null;
  const date=new Date(0);date.setUTCFullYear(p.year,p.month-1,p.day);date.setUTCHours(0,0,0,0);return date.getTime()/86400000;
}
export function completionDate(now){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))return null;
  const value=key(now.getFullYear(),now.getMonth()+1,now.getDate());return parseDate(value)?value:null;
}
export function addRepeatInterval(value,rule){
  const parsed=parseDate(value),repeat=typeof rule==='string'?parseRepeater(rule):rule;
  if(!parsed||!repeat||repeat.message||!Number.isSafeInteger(repeat.interval)||repeat.interval<1||!['d','w','m','y'].includes(repeat.unit))return fail('Ungültiges Wiederholungsdatum oder Intervall.');
  let year=parsed.year,month=parsed.month,day=parsed.day;
  if(repeat.unit==='d'||repeat.unit==='w'){
    const count=repeat.interval*(repeat.unit==='w'?7:1),limit=civilDay('9999-12-31'),target=civilDay(value)+count;
    if(!Number.isSafeInteger(count)||target>limit)return fail('Wiederholung überschreitet das unterstützte Jahr 9999.');
    const date=new Date(target*86400000);return {date:key(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate())};
  }
  const offset=repeat.interval*(repeat.unit==='y'?12:1),absolute=(year-1)*12+month-1+offset;
  if(!Number.isSafeInteger(offset)||absolute>9999*12-1)return fail('Wiederholung überschreitet das unterstützte Jahr 9999.');
  year=Math.floor(absolute/12)+1;month=absolute%12+1;
  // Clamp this interval only. The resulting day is the next interval's input.
  while(!parseDate(key(year,month,day)))day--;
  return {date:key(year,month,day)};
}
export function nextRepeatDate(value,now){
  const repeat=parseRepeater(value?.repeat),today=completionDate(now);if(repeat.message)return repeat;if(!today)return fail('Ungültiger Abschlusszeitpunkt.');
  let next=addRepeatInterval(value.date,repeat);
  // Completion-relative uses the local completion day, retaining timestamp times.
  if(repeat.mode==='.+')return addRepeatInterval(today,repeat);
  if(next.message||repeat.mode==='+')return next;
  const clock=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const future=date=>date>today||date===today&&!!value.startTime&&value.startTime>clock;
  if(repeat.unit==='d'||repeat.unit==='w'){
    const earliest=civilDay(today)+(value.startTime&&value.startTime>clock?0:1),step=repeat.interval*(repeat.unit==='w'?7:1),distance=earliest-civilDay(next.date);
    if(distance>0)next=addRepeatInterval(next.date,{...repeat,interval:repeat.interval*Math.ceil(distance/step)});
    return next;
  }
  while(!future(next.date)){
    const parsed=parseDate(next.date);
    if(parsed.day<=28){
      const target=parseDate(today),distance=(target.year-parsed.year)*12+target.month-parsed.month,step=repeat.interval*(repeat.unit==='y'?12:1),count=Math.floor(distance/step);
      if(count>0){next=addRepeatInterval(next.date,{...repeat,interval:repeat.interval*count});if(next.message)return next;if(future(next.date))return next;}
    }
    next=addRepeatInterval(next.date,repeat);if(next.message)return next;
  }
  return next;
}

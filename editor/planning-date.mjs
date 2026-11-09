// Civil date/time and timestamp grammar; no editor, storage or timezone state.
const fail=message=>({message});
export const WEEKDAYS=Object.freeze(['So','Mo','Di','Mi','Do','Fr','Sa']);
export function parseDate(text){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text??'');if(!m)return null;
  const [year,month,day]=m.slice(1).map(Number);if(year<1||year>9999||month<1||month>12||day<1)return null;
  const d=new Date(0);d.setUTCFullYear(year,month-1,day);d.setUTCHours(0,0,0,0);
  return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?{year,month,day,weekday:d.getUTCDay()}:null;
}
export function parseRepeater(text){
  const m=/^(\+\+|\.\+|\+)([1-9]\d*)([dwmy])$/.exec(text??'');
  if(!m||!Number.isSafeInteger(Number(m[2])))return fail('Wiederholung als +N, ++N oder .+N mit positiver Zahl und d/w/m/y eingeben (z. B. +1w).');
  return {mode:m[1],interval:Number(m[2]),unit:m[3],text:m[0]};
}
export function timestamp(value){
  const date=parseDate(value?.date);if(!date)return fail('Datum als gültiges YYYY-MM-DD eingeben.');
  const start=value.startTime??'',end=value.endTime??'';
  if([start,end].some(t=>t&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)))return fail('Uhrzeit als HH:MM zwischen 00:00 und 23:59 eingeben.');
  if(end&&(!start||end<start))return fail('Endzeit benötigt eine Startzeit und darf nicht davor liegen.');
  const repeat=value.repeat??'';
  if(typeof repeat!=='string')return fail('Wiederholung als Text angeben.');
  if(repeat&&parseRepeater(repeat).message)return parseRepeater(repeat);
  const normalized={date:value.date,startTime:start||null,endTime:end||null};if(repeat)normalized.repeat=repeat;
  return {text:`<${value.date} ${WEEKDAYS[date.weekday]}${start?' '+start:''}${end?'-'+end:''}${repeat?' '+repeat:''}>`,value:normalized};
}
export function parseTimestamp(text){
  const m=/^<(\d{4}-\d{2}-\d{2})(?:\s+[A-Za-zÄÖÜäöü]{2,3}\.?)?(?:\s+(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?)?(?:\s+((?:\+\+|\.\+|\+)\d+[dwmy]))?>$/.exec(text);
  if(!m)return fail('Nicht unterstützter Zeitstempel; nur Datum, Uhrzeit und +N/++N/.+N d/w/m/y erlaubt. Datumsbereiche bleiben unverändert.');
  return timestamp({date:m[1],startTime:m[2],endTime:m[3],...(m[4]?{repeat:m[4]}:{})});
}

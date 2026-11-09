import {parseDate,timestamp} from './planning-date.mjs';
const months=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const iso=(y,m,d)=>`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
export function monthCells(year,month){const first=parseDate(iso(year,month,1));if(!first)return [];const result=Array((first.weekday+6)%7).fill(null);for(let day=1;day<=31;day++){const value=iso(year,month,day);if(!parseDate(value))break;result.push(value);}return result;}
export function shiftDate(value,days){const p=parseDate(value);if(!p)return value;const date=new Date(0);date.setUTCFullYear(p.year,p.month-1,p.day+days);return iso(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate());}
export function adjacentMonth(year,month,delta){const absolute=year*12+month-1+delta,y=Math.floor(absolute/12),m=absolute-y*12+1;return y>=1&&y<=9999?{year:y,month:m}:null;}
export function createPlanningForm({document:doc,kind,value,commit,cancel}){
  const root=doc.createElement('div');root.className='planning-form';const disposers=[];
  const listen=(el,type,fn)=>{el.addEventListener(type,fn);disposers.push(()=>el.removeEventListener(type,fn));};
  const button=(label,fn)=>{const b=doc.createElement('button');b.type='button';b.textContent=label;listen(b,'click',fn);return b;};
  const field=(labelText,initial)=>{const label=doc.createElement('label'),input=doc.createElement('input');label.textContent=labelText;input.type='text';input.value=initial;input.setAttribute('aria-label',labelText);label.append(input);root.append(label);return input;};
  const now=new Date(),today=iso(now.getFullYear(),now.getMonth()+1,now.getDate());
  const date=field('Datum (YYYY-MM-DD)',value?.date??today);
  date.setAttribute('title','Datum eingeben und mit Enter übernehmen. Uhrzeiten direkt im Zeitstempel bearbeiten.');
  const repeat=field('Wiederholung (+1w / ++1m / .+1d)',value?.repeat??'');
  repeat.setAttribute('title','Wiederholung mit „Wiederholung setzen“ übernehmen. Tagwahl erhält die bisherige Regel.');
  const nav=doc.createElement('div');nav.className='planning-month';const title=doc.createElement('strong');title.setAttribute('aria-live','polite');
  const grid=doc.createElement('div');grid.className='planning-months';grid.setAttribute('role','group');grid.setAttribute('aria-label','Datum wählen: drei Monate');
  const preview=doc.createElement('p');preview.className='hint';preview.setAttribute('aria-live','polite');
  const actions=doc.createElement('div');actions.className='planning-actions';let shown=parseDate(date.value),rows=[],rowDisposers=[];
  function snapshot(rule=value?.repeat??''){return {date:date.value,startTime:value?.startTime??null,endTime:value?.endTime??null,...(rule?{repeat:rule}:{})};}
  function update(){const formatted=timestamp(snapshot(repeat.value));preview.textContent=formatted.message??kind+': '+formatted.text;}
  function accept(day=date.value,rule=value?.repeat??''){const parsed=timestamp({...snapshot(rule),date:day});if(parsed.message){preview.textContent=parsed.message;return;}commit({...parsed.value,...(!rule&&value?.repeat?{repeat:''}:{})});}
  function render(focusDate){for(const dispose of rowDisposers.splice(0))dispose();grid.replaceChildren();rows=[];title.textContent=months[shown.month-1]+' '+shown.year;
    for(const offset of [-1,0,1]){
      const month=adjacentMonth(shown.year,shown.month,offset),section=doc.createElement('section');section.className='planning-calendar-month';grid.append(section);
      if(!month){section.setAttribute('aria-hidden','true');continue;}
      const caption=doc.createElement('strong');caption.textContent=months[month.month-1]+' '+month.year;section.append(caption);section.setAttribute('aria-label',caption.textContent);
      const monthGrid=doc.createElement('div');monthGrid.className='planning-grid';section.append(monthGrid);
      for(const weekday of ['Mo','Di','Mi','Do','Fr','Sa','So']){const label=doc.createElement('span');label.textContent=weekday;monthGrid.append(label);}
      for(const day of monthCells(month.year,month.month)){const b=doc.createElement(day?'button':'span');if(day){b.type='button';b.textContent=String(parseDate(day).day);b.setAttribute('aria-label',day);b.setAttribute('aria-pressed',String(day===date.value));b.tabIndex=day===(focusDate??date.value)?0:-1;
      const click=event=>{if(event.isComposing||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.getModifierState?.('AltGraph')||event.button!==undefined&&event.button!==0)return;accept(day);};
      const key=event=>{if(event.isComposing||event.keyCode===229||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.getModifierState?.('AltGraph'))return;if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();if(!event.repeat)accept(day);return;}const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];if(delta){event.preventDefault();const next=shiftDate(day,delta),p=parseDate(next);if(p){date.value=next;shown=p;render(next);update();rows.find(x=>x.day===next)?.element.focus({preventScroll:true});}}};
      b.addEventListener('click',click);b.addEventListener('keydown',key);rowDisposers.push(()=>{b.removeEventListener('click',click);b.removeEventListener('keydown',key);});rows.push({day,element:b});}monthGrid.append(b);}
    }
    if(!rows.some(x=>x.element.tabIndex===0)&&rows.length)rows[0].element.tabIndex=0;
  }
  function move(delta){const month=adjacentMonth(shown.year,shown.month,delta);if(!month)return;shown=month;render();}
  nav.append(button('Voriger Monat',()=>move(-1)),title,button('Nächster Monat',()=>move(1)));root.replaceChildren(nav,actions,grid,...root.children,preview);
  const remove=button('Entfernen',()=>commit(null));remove.disabled=!value;
  const removeRepeat=button('Wiederholung entfernen',()=>accept(date.value,''));removeRepeat.disabled=!value?.repeat;
  actions.append(remove,button('Wiederholung setzen',()=>accept(date.value,repeat.value)),removeRepeat,button('Abbrechen',cancel));
  listen(date,'input',()=>{const p=parseDate(date.value);if(p){shown=p;render();}update();});
  listen(repeat,'input',update);
  listen(root,'keydown',event=>{if(event.isComposing||event.keyCode===229||event.getModifierState?.('AltGraph')||event.altKey||event.metaKey||event.shiftKey)return;if(event.repeat&&(event.key==='Enter'||event.key===' ')){event.preventDefault();return;}if(event.key==='Escape'&&!event.ctrlKey||event.ctrlKey&&event.key.toLowerCase()==='g'){event.preventDefault();event.stopPropagation();cancel();}else if(!event.ctrlKey&&event.key==='Enter'&&(event.target===date||event.target===repeat)){event.preventDefault();event.stopPropagation();accept(date.value,event.target===repeat?repeat.value:value?.repeat??'');}});
  render();update();return {root,focus:()=>date.focus({preventScroll:true}),destroy(){for(const dispose of rowDisposers.splice(0))dispose();for(const dispose of disposers.splice(0))dispose();root.remove();}};
}

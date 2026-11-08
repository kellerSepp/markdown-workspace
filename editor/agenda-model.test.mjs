import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgendaIndex} from './agenda-index.mjs';
import {agendaWeek,addAgendaDays,moveAgendaWeek,projectAgendaWeek,projectAgendaTodos,localToday,agendaStampLabel} from './agenda-model.mjs';
const encoder=new TextEncoder();
async function indexOf(text){const root={name:'synthetic',async *entries(){yield ['a.md',{kind:'file'}];},async getFileHandle(){return {async getFile(){return {async arrayBuffer(){return encoder.encode(text).buffer;}};}};}};const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(root);return index;}
test('Agenda ISO week arithmetic crosses year boundaries, leap years and supported extremes',()=>{
  for(const [date,monday,week,year] of [['2026-11-08','2026-11-02',45,2026],['2021-01-01','2020-12-28',53,2020],['2024-12-30','2024-12-30',1,2025],['0001-01-01','0001-01-01',1,1],['9999-12-31','9999-12-27',52,9999]])assert.deepEqual(agendaWeek(date),{monday,week,year});
  assert.equal(addAgendaDays('2028-02-28',1),'2028-02-29');assert.equal(addAgendaDays('2026-03-29',1),'2026-03-30');
  assert.equal(moveAgendaWeek('0001-01-01',-1),'0001-01-01');assert.equal(moveAgendaWeek('9999-12-27',1),'9999-12-27');
  assert.throws(()=>agendaWeek('2026-02-30'));assert.equal(localToday(new Date(2026,10,8,23,59)),'2026-11-08');
});
test('Agenda week combines same-day dates, displays both times, statusless appointments and preserves day boundaries',async()=>{
  const index=await indexOf('# TODO Both\nSCHEDULED: <2026-11-08 So 09:00-10:00> DEADLINE: <2026-11-08 So 17:00>\n# Appointment\nSCHEDULED: <2026-11-09 Mo 08:00>');
  const week=projectAgendaWeek(index,{date:'2026-11-08',today:'2026-11-08'});assert.equal(week.days.length,7);assert.equal(week.days[0].label,'Montag 2. November 2026');assert.equal(week.days[6].entries.length,1);
  assert.equal(week.days[6].entries[0].marks.length,2);assert.match(week.days[6].entries[0].marks.map(agendaStampLabel).join(' '),/09:00-10:00.*17:00/);
  const next=projectAgendaWeek(index,{date:'2026-11-09',today:'2026-11-08'});assert.equal(next.days[0].entries[0].record.status,null);assert.equal(next.days.flatMap(d=>d.entries).length,1);
});
test('Agenda overdue projections use today only, combine a record once and exclude done/cancelled from backlog',async()=>{
  const index=await indexOf('#+SEQ_TODO: TODO(t) WAITING(w) NEXT(n) | DONE(d) CANCELLED(c)\n# TODO Backlog\nSCHEDULED: <2026-11-01 So> DEADLINE: <2026-11-03 Di>\n# WAITING Same day\nSCHEDULED: <2026-11-01 So> DEADLINE: <2026-11-08 So>\n# DONE Closed\nDEADLINE: <2026-11-01 So>\n# CANCELLED Cancelled\nSCHEDULED: <2026-11-01 So>\n# Plain old\nDEADLINE: <2026-11-01 So>');
  const week=projectAgendaWeek(index,{date:'2026-11-08',today:'2026-11-08'}),today=week.days[6].entries;
  assert.equal(today.length,2);assert.equal(today[0].marks.length,2);assert.equal(today[1].marks.length,2);assert.ok(today.every(e=>e.record.closed===false));
  assert.equal(week.days[1].entries.length,1);assert.equal(week.days[1].entries[0].marks[0].late,true);
  assert.equal(projectAgendaWeek(index,{date:'2026-11-09',today:'2026-11-08'}).days.flatMap(d=>d.entries).length,0);
  assert.equal(projectAgendaTodos(index).length,2);assert.equal(projectAgendaTodos(index,{includeClosed:true}).length,4);
});
test('Agenda exact timestamps sort by local clock string then stable source position',async()=>{
  const index=await indexOf('# TODO Noon\nSCHEDULED: <2026-11-08 So 12:00>\n# TODO Early\nSCHEDULED: <2026-11-08 So 15:00> DEADLINE: <2026-11-08 So 08:00>\n# TODO Deadline time\nSCHEDULED: <2026-11-08 So> DEADLINE: <2026-11-08 So 09:00>\n# TODO Untimed\nDEADLINE: <2026-11-08 So>');
  assert.deepEqual(projectAgendaWeek(index,{date:'2026-11-08',today:'2026-11-08'}).days[6].entries.map(e=>e.record.title),['Early','Deadline time','Noon','Untimed']);
});

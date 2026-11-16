import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {todoRules} from './todo.mjs';
import {planArchive,appendArchiveBlock,planArchiveAppend} from './archive-model.mjs';
const now=new Date(2026,10,16,12,30);
const state=(doc,pos=0,extra=[])=>EditorState.create({doc,selection:{anchor:pos},extensions:[markdown({base:markdownLanguage}),todoRules,extra]});
const plan=s=>planArchive(s,{sourcePath:'arbeit/quelle.md',now});

test('H1–H6 roots become H1 and preserve relative children and contents',()=>{
  for(let level=1;level<=6;level++){
    const root='#'.repeat(level)+' DONE Wurzel',child=level<6?'\n'+'#'.repeat(level+1)+' TODO Kind\nNotiz 😀':'';
    const doc='# Vorher\nText\n'+root+'\nBody'+child+'\n# Danach\nEnde';
    const p=plan(state(doc,doc.indexOf('Wurzel')));assert.ok(p.archiveBlock,p.message);
    assert.match(p.archiveBlock,/^# DONE Wurzel\n:PROPERTIES:\n:ARCHIVE_TIME: 2026-11-16 12:30/);
    assert.ok(p.archiveBlock.includes('Body'));assert.ok(p.sourceText.endsWith('# Danach\nEnde'));
    if(level<6){assert.ok(p.archiveBlock.includes('## TODO Kind\nNotiz 😀'));assert.equal(p.openChildren,1);}
    assert.equal(p.originalStatus,'DONE');
  }
});

test('origin hierarchy and custom loaded rules are captured without changing statuses',()=>{
  const doc='#+SEQ_TODO: NEXT(n) HOLD(h) | FIN(f)\n# Projekt\n## Bereich\n### FIN Aufgabe\n#### HOLD Kind\nText';
  const p=plan(state(doc,doc.indexOf('Aufgabe')));assert.ok(p.archiveBlock,p.message);
  assert.match(p.archiveBlock,/:ARCHIVE_OLPATH: Projekt \/ Bereich/);assert.match(p.archiveBlock,/:ARCHIVE_TODO: FIN/);
  assert.equal(p.openTasks,1);assert.match(p.archiveBlock,/## HOLD Kind/);
});

test('last loaded rules survive an invalid raw definition',()=>{
  let s=state('#+SEQ_TODO: NEXT(n) | FIN(f)\n# NEXT Job');
  s=s.update({changes:{from:0,to:s.doc.line(1).to,insert:'#+SEQ_TODO: invalid'},selection:{anchor:30}}).state;
  const p=plan(s);assert.equal(p.openTasks,1);assert.equal(p.originalStatus,'NEXT');
});

test('existing properties, LOGBOOK, free drawers, checklists and fenced headings preserved',()=>{
  const doc='# DONE Job\n:PROPERTIES:\n:ID: abc\n:END:\n:LOGBOOK:\n- note\n:END:\n:NOTES:\nhello\n:END:\n- [ ] checkbox\n\n```md\n# Fake\n```\n';
  const p=plan(state(doc));assert.ok(p.archiveBlock,p.message);assert.equal((p.archiveBlock.match(/:PROPERTIES:/g)||[]).length,1);
  for(const text of [':ID: abc',':LOGBOOK:\n- note\n:END:',':NOTES:\nhello\n:END:','- [ ] checkbox','```md\n# Fake\n```'])assert.ok(p.archiveBlock.includes(text));
  assert.equal(p.openTasks,0);
});

test('unsafe selection, read-only, frontmatter, containers and malformed drawers refuse',()=>{
  const cases=[state('---\nx: y\n---\n# Job',3),state('> # Job',3),state('Title\n=====',1),state('# Job\n:NOTES:\n## Invalid\n:END:'),state('# Job\n:PROPERTIES:\n:ARCHIVE_FILE: old.md\n:END:'),state('# Job\n:PROPERTIES:\nbad\n:END:')];
  cases.push(state('# Job',0,EditorState.readOnly.of(true)));
  cases.push(state('# Job').update({selection:EditorSelection.single(0,3)}).state);
  for(const s of cases)assert.ok(plan(s).message,s.doc.toString());
});

test('body cursor uses current heading and source outside bytes remain identical',()=>{
  const doc='# Parent\ntext\n## Child\nbody\n# Next\nend';const p=plan(state(doc,doc.indexOf('body')+2));
  assert.equal(p.original,'## Child\nbody\n');assert.equal(p.sourceText,'# Parent\ntext\n# Next\nend');
  assert.deepEqual(p.sourceChange,{from:doc.indexOf('## Child'),to:doc.indexOf('# Next'),insert:''});
});

test('metadata inputs cannot inject lines; append boundaries are separated',()=>{
  const s=state('# Job');assert.ok(planArchive(s,{sourcePath:'x\n:END:',now}).message);assert.ok(planArchive(s,{sourcePath:'x',now:new Date(NaN)}).message);
  assert.equal(appendArchiveBlock('# Old','# New'),'# Old\n\n# New\n');assert.equal(appendArchiveBlock('','# New\n'),'# New\n');
});

test('new properties follow scheduled/deadline block so scheduling remains readable',()=>{
  const p=plan(state('# TODO Job\nSCHEDULED: <2026-11-16 Mo>\nbody'));
  assert.ok(p.archiveBlock,p.message);assert.match(p.archiveBlock,/SCHEDULED: <2026-11-16 Mo>\n:PROPERTIES:/);
});

test('append checks exact Markdown form and blocks open fences, HTML, frontmatter and drawers',()=>{
  const block=plan(state('# DONE Entry\nbody')).archiveBlock;
  for(const archive of ['```md\n# pseudo','<!-- open','<script>\nopen','---\nyaml: open', '# Old\n:NOTES:\nopen'])assert.ok(planArchiveAppend(archive,block).message,archive);
  for(const archive of ['', '# Old\ntext', '---\ntitle: archive\n---\n# Old\ntext', '# Old\n```md\n# literal\n```\n', '# Old\n:NOTES:\nnote\n:END:\n']){
    const result=planArchiveAppend(archive,block);assert.ok(result.text,result.message);assert.equal(result.text,appendArchiveBlock(archive,block));
  }
});

test('append requires complete syntactically valid archive properties',()=>{
  const block=plan(state('# DONE Entry')).archiveBlock;
  assert.ok(planArchiveAppend('',block.replace(':ARCHIVE_FILE: arbeit/quelle.md\n','')).message);
  assert.ok(planArchiveAppend('',block.replace(':ARCHIVE_FILE:',':ARCHIVE_FILE')).message);
  assert.ok(planArchiveAppend('',block.replace(':ARCHIVE_TODO: DONE',':ARCHIVE_TODO: DONE\n:ARCHIVE_TODO: DONE')).message);
  assert.ok(planArchiveAppend('', '# plain').message);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges} from '@codemirror/language';
import {history,undoDepth,redoDepth} from '@codemirror/commands';
import {readStartupVisibility,applyStartupVisibility} from './startup-visibility.mjs';

function fixture(doc){
  const view={state:EditorState.create({doc,extensions:[markdown({base:markdownLanguage}),codeFolding(),history()]})};
  view.dispatch=spec=>{view.state=view.state.update(spec).state;};
  return view;
}
const ranges=view=>{const out=[];foldedRanges(view.state).between(0,view.state.doc.length,(from,to)=>out.push({from,to}));return out;};
const hidden=(view,text)=>{const pos=view.state.doc.toString().indexOf(text);assert.ok(pos>=0);return ranges(view).some(r=>pos>r.from&&pos<r.to);};
const body='# One\nBody one\n\n## Two\nBody two\n\n### Three\nBody three\n\n# Other\nOther body\n';

test('STARTUP selects overview, content and open views without editing text/history',()=>{
  for(const mode of ['overview','content','showall','showeverything']){
    const doc=`#+STARTUP: ${mode}\n\n${body}`,view=fixture(doc);
    assert.equal(applyStartupVisibility(view),true);
    assert.equal(view.state.doc.toString(),doc);
    assert.equal(undoDepth(view.state),0);assert.equal(redoDepth(view.state),0);
    assert.equal(hidden(view,'## Two'),mode==='overview');
    assert.equal(hidden(view,'### Three'),mode==='overview');
    assert.equal(hidden(view,'Body one'),mode==='overview'||mode==='content');
    assert.equal(hidden(view,'Other body'),mode==='overview'||mode==='content');
    assert.equal(hidden(view,'# Other'),false);
  }
});

test('STARTUP show2levels through show5levels expose the selected heading depth',()=>{
  const tree=Array.from({length:6},(_,i)=>'#'.repeat(i+1)+` Level${i+1}\nText${i+1}\n`).join('\n')+'\n# Sibling\nTail\n';
  for(let depth=2;depth<=5;depth++){
    const view=fixture(`#+STARTUP: show${depth}levels\n\n${tree}`);applyStartupVisibility(view);
    for(let level=1;level<=6;level++)assert.equal(hidden(view,`Level${level}`),level>depth,`${depth}/${level}`);
    assert.equal(hidden(view,'Sibling'),false);assert.equal(hidden(view,'Text1'),true);
  }
});

test('STARTUP ignores examples in frontmatter, code, HTML, quotes, lists and drawers',()=>{
  const protectedText=[
    '---\n#+STARTUP: overview\n---',
    '```org\n#+STARTUP: overview\n```',
    '    #+STARTUP: overview',
    '<!--\n#+STARTUP: overview\n-->',
    '> #+STARTUP: overview',
    '- Example\n  #+STARTUP: overview',
    ':PROPERTIES:\n#+STARTUP: overview\n:END:',
    ':LOGBOOK:\n#+STARTUP: overview\n:END:'
  ];
  for(const example of protectedText){
    const view=fixture(example+'\n\n'+body);applyStartupVisibility(view);
    assert.equal(readStartupVisibility(view.state).mode,null,example);assert.deepEqual(ranges(view),[]);
  }
});

test('STARTUP absent, invalid or ambiguous stays open; spelling is case insensitive',()=>{
  for(const prefix of ['', '#+STARTUP: unknown', '#+STARTUP overview', '#+STARTUP: overview content', '#+STARTUP: overview\n#+STARTUP: content']){
    const view=fixture(prefix+'\n\n'+body),notices=[];applyStartupVisibility(view,m=>notices.push(m));
    assert.deepEqual(ranges(view),[]);assert.equal(notices.length,prefix?1:0);
  }
  const view=fixture('  #+startup: OVERVIEW\n\n'+body);applyStartupVisibility(view);assert.equal(hidden(view,'## Two'),true);
});

test('STARTUP finishes parsing long documents and handles leaves, Setext and missing H1',()=>{
  const view=fixture('#+STARTUP: overview\n\n'+body+'\n'+Array.from({length:1500},(_,i)=>`## Child ${i}\nText ${i}\n`).join('\n'));
  assert.equal(applyStartupVisibility(view),true);assert.equal(hidden(view,'Text 1499'),true);
  for(const doc of ['#+STARTUP: overview\n\n## Root\n### Child\nText\n', '#+STARTUP: overview\n\nRoot\n====\nText\n', '#+STARTUP: content\n\n# Leaf']){
    const v=fixture(doc);assert.equal(applyStartupVisibility(v),true);assert.equal(v.state.doc.toString(),doc);
  }
});

test('STARTUP keeps hidden cursor visible and preserves folding and ordinary history on typing',()=>{
  const view=fixture('#+STARTUP: overview\n\n'+body);
  view.dispatch({selection:{anchor:view.state.doc.toString().indexOf('Body two')+2}});
  applyStartupVisibility(view);
  assert.ok(!ranges(view).some(r=>view.state.selection.main.head>r.from&&view.state.selection.main.head<r.to));
  view.dispatch({changes:{from:view.state.doc.length,insert:'Extra'}});
  assert.equal(undoDepth(view.state),1);
  assert.equal(hidden(view,'## Two'),true);
});

test('Actual app sync applies STARTUP only on explicit loading, leaving rollback and save alone',async()=>{
  const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
  const start=app.indexOf('function syncEditor('),end=app.indexOf('\nfunction syncAgendaEditor()',start);
  assert.ok(start>=0&&end>start);
  const view=fixture(''),session={text:'#+STARTUP: overview\n\n'+body};let calls=0;
  view.setState=state=>{view.state=state;};
  const create=new Function('view','session','EditorState','extensions','todoRules','applyStartupVisibility',`let syncing=false,agenda=null;const prefix={cancel(){}},workPanel={close(){}},emacs={invalidate(){}};const render=()=>{},syncAgendaEditor=()=>{},status=()=>{};${app.slice(start,end)};return syncEditor;`);
  // A minimal optional field reproduces the app's TODO diagnostic lookup.
  const {StateField}=await import('@codemirror/state');const rules=StateField.define({create:()=>({}),update:v=>v});
  const sync=create(view,session,EditorState,()=>[markdown({base:markdownLanguage}),codeFolding(),rules],rules,(...args)=>{calls++;return applyStartupVisibility(...args);});
  sync({startup:true});assert.equal(calls,1);assert.equal(hidden(view,'## Two'),true);
  sync();assert.equal(calls,1);assert.deepEqual(ranges(view),[]);
  assert.match(app,/session\.open\(target\);syncAgendaFileSelection\(\);await useRingVault\(session\.vault\);await syncEditor\(\{startup:true\}\)/);
  const save=app.slice(app.indexOf('async function save('),app.indexOf("bind('save'"));
  assert.doesNotMatch(save,/applyStartupVisibility|startup:true/);
});

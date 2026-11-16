import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,foldedRanges} from '@codemirror/language';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {STARTUP_CHOICES,planStartupSetting,createStartupSettings} from './startup-settings.mjs';
import {applyStartupVisibility,readStartupVisibility} from './startup-visibility.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {usesSharedWorkPanel} from './agenda-command-policy.mjs';

function fixture(doc,selection){
  const view={state:EditorState.create({doc,selection,extensions:[markdown({base:markdownLanguage}),codeFolding(),history()]})};
  view.dispatch=spec=>{view.state=view.state.update(spec).state;};return view;
}
const text=view=>view.state.doc.toString();

test('STARTUP palette inserts/replaces each mode as one undoable text edit, preserving selection',()=>{
  for(const {id} of STARTUP_CHOICES)for(const doc of ['# Heading\nBody','  #+startup: broken\n\n# Heading\nBody','']){
    const pos=doc.indexOf('Body'),selection=pos>=0?{anchor:pos,head:pos+4}:{anchor:0};
    const view=fixture(doc,selection),before=view.state.selection;
    const plan=planStartupSetting(view.state,id);assert.ok(plan.spec);view.dispatch(plan.spec);
    view.dispatch({selection:view.state.selection,userEvent:'select.startup'});
    assert.equal(readStartupVisibility(view.state).mode,id);
    if(pos>=0)assert.equal(view.state.sliceDoc(view.state.selection.main.from,view.state.selection.main.to),'Body');
    const after=text(view),afterSelection=view.state.selection;
    assert.equal(undoDepth(view.state),1);assert.equal(undo(view),true);assert.equal(text(view),doc);assert.ok(view.state.selection.eq(before));
    assert.equal(redo(view),true);assert.equal(text(view),after);assert.ok(view.state.selection.eq(afterSelection));
  }
});

test('STARTUP insertion preserves frontmatter and protected examples, rejects ambiguity and unclosed frontmatter',()=>{
  for(const doc of ['---\ntitle: Test\n---\n# H\nText','---\ntitle: Test\n---','```org\n#+STARTUP: content\n```\n# H\nText']){
    const view=fixture(doc),p=planStartupSetting(view.state,'overview');assert.ok(p.spec);view.dispatch(p.spec);
    assert.equal(readStartupVisibility(view.state).mode,'overview');
    if(doc.startsWith('---'))assert.ok(text(view).startsWith(doc.split('---').slice(0,2).join('---')+'---'));
    else assert.ok(text(view).includes(doc));
  }
  for(const doc of ['#+STARTUP: content\n#+STARTUP: overview\n# H','---\ntitle: Unclosed']){
    const view=fixture(doc);assert.ok(planStartupSetting(view.state,'content').message);assert.equal(text(view),doc);
  }
  assert.ok(planStartupSetting(fixture('# H').state,'unknown').message);
  const readonly=EditorState.create({doc:'# H',extensions:[markdown(),EditorState.readOnly.of(true)]});
  assert.match(planStartupSetting(readonly,'content').message,/schreibgeschützt/);
  assert.equal(planStartupSetting(fixture('#+STARTUP: content\n# H').state,'content').noop,true);
});

test('Real registry opens descriptive STARTUP choices; cancellation leaves text and selecting defers folding',()=>{
  const view=fixture('# Heading\nBody\n## Child\nText');let options,context={hasDocument:true,busy:false},notices=[];
  const panel={openChoices:value=>{options=value;return true;}};
  const controller=createStartupSettings({view,panel,getContext:()=>context,notify:m=>notices.push(m)});
  const registry=createCommandRegistry(commandDefinitions({'startup.configure':()=>controller.open()}),()=>({...context,state:view.state}));
  assert.ok(registry.list('Startansicht').some(c=>c.id==='startup.configure'&&c.enabled));
  assert.ok(registry.list('STARTUP').some(c=>c.id==='startup.configure'));
  assert.equal(registry.execute('startup.configure'),true);
  assert.equal(text(view),'# Heading\nBody\n## Child\nText');assert.equal(undoDepth(view.state),0);
  assert.equal(options.entries.length,8);assert.ok(options.entries.every(e=>e.text.includes('#+STARTUP:')));
  assert.match(options.hint,/Escape/);assert.match(options.summary,/nächsten Öffnen/);
  assert.equal(options.choose('overview',{state:view.state}),true);
  assert.ok(text(view).startsWith('#+STARTUP: overview\n'));assert.equal(foldedRanges(view.state).size,0);
  assert.match(notices.at(-1),/Strg\+S/);
  applyStartupVisibility(view);assert.ok(foldedRanges(view.state).size>0);
  assert.equal(registry.execute('startup.configure'),true);assert.match(options.entries.find(e=>e.id==='overview').text,/aktuell/);
});

test('STARTUP choices refuse stale documents, busy/readonly sessions and missing documents',()=>{
  for(const kind of ['changed','busy','missing','readonly']){
    const view=fixture('# H\nText');let options,context={hasDocument:true};const notices=[];
    const controller=createStartupSettings({view,panel:{openChoices:o=>{options=o;return true;}},getContext:()=>context,notify:m=>notices.push(m)});
    assert.equal(controller.open(),true);const saved={state:view.state};
    if(kind==='changed')view.dispatch({changes:{from:0,insert:'Changed\n'}});
    if(kind==='busy')context.busy=true;
    if(kind==='missing')context.hasDocument=false;
    if(kind==='readonly')view.state=EditorState.create({doc:'# H\nText',extensions:[markdown(),EditorState.readOnly.of(true)]});
    const before=text(view);assert.equal(options.choose('overview',saved),false);assert.equal(text(view),before);assert.ok(notices.length);
  }
});

test('STARTUP uses the shared panel policy and is wired to the actual app handler',async()=>{
  assert.equal(usesSharedWorkPanel('startup.configure'),true);
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
  assert.match(app,/createStartupSettings\(\{view,panel:workPanel,getContext:editingContext,notify:status\}\)/);
  assert.match(app,/handlers\['startup.configure'\]=\(\)=>startupSettings.open\(\)/);
  let context={hasDocument:true,busy:false,state:fixture('# H').state};
  const registry=createCommandRegistry(commandDefinitions({'startup.configure':()=>true}),()=>context);
  for(const patch of [{busy:true},{hasDocument:false},{agendaActive:true,agendaDocked:false},{agendaActive:true,agendaDocked:true,agendaFocused:true},{filePickerActive:true},{agendaStatusActive:true}]){
    const before=context;context={...context,...patch};assert.equal(registry.execute('startup.configure'),false);context=before;
  }
});

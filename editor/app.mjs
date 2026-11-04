import {EditorState, Compartment} from '@codemirror/state';
import {EditorView, keymap, lineNumbers, drawSelection} from '@codemirror/view';
import {history, historyKeymap, defaultKeymap, undo, redo} from '@codemirror/commands';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {createSession, createBrowserStore} from './storage-session.mjs';
import {THEMES,readThemeChoice,saveThemeChoice,applyTheme} from './themes.mjs';
import {editorTheme} from './theme-editor.mjs';
import {markdownFolding,guardedFold,stagedUnfold} from './folding.mjs';
import {runStructure} from './structure.mjs';
import {structureKeyboard,withoutOrgArrowConflicts} from './structure-keymap.mjs';
import {visualStructure,DEFAULT_VISUAL_STRUCTURE,MARKER_STYLES} from './visual-structure.mjs';
import {runFormat} from './formatting.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {createCommandSurfaces} from './command-surfaces.mjs';
import {ORG_STRUCTURE,runOrgStructure} from './org-structure.mjs';
import {cycleOrgVisibility} from './org-folding.mjs';
import {runLineMove} from './line-move.mjs';

const $ = id => document.getElementById(id);
const editable = new Compartment();
const appearance = new Compartment();
const visualAppearance = new Compartment();
let visualOptions={...DEFAULT_VISUAL_STRUCTURE};
let themeStorage;
try {themeStorage = window.localStorage;} catch {}
let activeTheme = applyTheme(document.documentElement,readThemeChoice(themeStorage));
$('theme').replaceChildren(...THEMES.map(theme => new Option(theme.name,theme.id)));
$('theme').value = activeTheme.id;
let session, vault, busy = true, syncing = false, timer, persistPending = false;
const status = message => {$('status').textContent = message;};
const extensions = () => [
  lineNumbers(), history(), drawSelection(), markdown({base:markdownLanguage}), markdownFolding(status,id=>registry.execute(id)), structureKeyboard(()=>$('structureChildren').checked,status,id=>registry.execute(id),()=>$('orgTab').checked), visualAppearance.of(visualStructure(visualOptions)), appearance.of(editorTheme(activeTheme)),
  keymap.of([{key:'Mod-z',run:()=>{registry.execute('edit.undo');return true;}},{key:'Mod-y',run:()=>{registry.execute('edit.redo');return true;}},{key:'Mod-Shift-z',run:()=>{registry.execute('edit.redo');return true;}}]),
  // Remove CM's competing line move/copy shortcuts. Outside a recognized Org
  // context the browser receives Alt arrows; Shift+Alt up/down stays unbound.
  keymap.of([...withoutOrgArrowConflicts(defaultKeymap), ...historyKeymap]),
  EditorView.contentAttributes.of({'aria-label':'Markdown-Rohtext', spellcheck:'false'}),
  editable.of([EditorState.readOnly.of(true),EditorView.editable.of(false)]),
  EditorState.transactionFilter.of(transaction => {
    if (transaction.docChanged && !transaction.newDoc.toString().isWellFormed()) {
      status('Ungültige Unicode-Eingabe wurde verworfen; Entwurf bleibt unverändert.');
      return [];
    }
    return transaction;
  }),
  EditorView.updateListener.of(update => {
    if (!update.docChanged || syncing) return;
    for (const transaction of update.transactions) {
      if (!transaction.docChanged) continue;
      const changes = [];
      transaction.changes.iterChanges((from,to,_fromB,_toB,insert) => changes.push({from,to,insert:insert.toString()}));
      try {session.applyChanges(changes);}
      catch (error) {
        queueMicrotask(() => {syncEditor(); setBusy(busy); status(`Änderung verworfen: ${error.message}`);});
        return;
      }
    }
    render(); persistPending = true;
    clearTimeout(timer); timer = setTimeout(() => {void persistDraft();}, 300);
    status('Geändert. Browser-Entwurf wird gesichert; Markdown-Datei noch nicht gespeichert.');
  })
];
const view = new EditorView({parent:$('editor'), state:EditorState.create({extensions:extensions()})});
const handlers={};
const registry=createCommandRegistry(commandDefinitions(handlers),()=>({busy,hasDocument:!!session?.hasDocument,state:view.state,vault,synthetic:$('synthetic').checked,file:$('files').value,draft:$('drafts').value,structure:{children:$('structureChildren').checked,prefix:$('listPrefix').value}}),status);
const surfaces=createCommandSurfaces({registry,view,notify:status});
for(const [id] of ORG_STRUCTURE) handlers['structure.'+id]=()=>{runOrgStructure(view,id,status);view.focus();};
for(const [id,down] of [['line-up',false],['line-down',true]]) handlers['edit.'+id]=()=>{runLineMove(view,down,status);view.focus();};
for(const [id,global] of [['org-local-cycle',false],['org-global-cycle',true]]) handlers['fold.'+id]=()=>{cycleOrgVisibility(view,global,status);view.focus();};
handlers['view.org-tab']=()=>{$('orgTab').checked=!$('orgTab').checked;status($('orgTab').checked?'Org-Tab aktiv: Heading-Tab faltet; Shift+Tab außerhalb Liste/Code faltet global. Escape, dann Tab verlässt den Editor.':'Struktur-Tab aktiv: bisheriges Ein-/Ausrücken bleibt Standard.');};
$('orgTab').addEventListener('change',()=>{$('orgTab').checked=!$('orgTab').checked;registry.execute('view.org-tab');});
for(const kind of ['bold','italic','underline','strike','code']) handlers['format.'+kind]=()=>{runFormat(view,kind,status);view.focus();};
for(let n=1;n<=5;n++) {
  const select=$('markerLevel'+n);
  select.replaceChildren(...MARKER_STYLES.map(marker=>new Option(marker,marker)));
  select.value=DEFAULT_VISUAL_STRUCTURE.markers[n-1];
}
function updateVisualOptions() {
  visualOptions={headingIndent:$('headingIndent').checked,listMarkers:$('visualMarkers').checked,hierarchicalNumbers:$('hierarchicalNumbers').checked,
    markers:Array.from({length:5},(_,n)=>$('markerLevel'+(n+1)).value)};
  view.dispatch({effects:visualAppearance.reconfigure(visualStructure(visualOptions))});
}
for(let level=1;level<=5;level++) {
  const select=$('markerLevel'+level);
  handlers['view.marker-level-'+level]=value=>{select.value=MARKER_STYLES.includes(value)?value:MARKER_STYLES[(MARKER_STYLES.indexOf(select.value)+1)%MARKER_STYLES.length];updateVisualOptions();};
  select.addEventListener('change',()=>registry.execute('view.marker-level-'+level,select.value));
}
for(const [element,id] of [['headingIndent','heading-indent'],['visualMarkers','list-markers'],['hierarchicalNumbers','hierarchical-numbers'],['structureChildren','children']]) $(element).addEventListener('change',()=>{
  $(element).checked=!$(element).checked;registry.execute('view.'+id);
});
for (const action of ['heading-up','heading-down','heading-promote','heading-demote','list-up','list-down','list-indent','list-outdent','list-prefix']) handlers['structure.'+action]=()=>{
  runStructure(view,action,{children:$('structureChildren').checked,prefix:$('listPrefix').value},status);
  view.focus();
};
for(const [id,action] of [['undo',undo],['redo',redo]]) handlers['edit.'+id]=()=>{
  if(!action(view)) status('Keine weitere Undo-/Redo-Aktion verfügbar.');
  view.focus();
};
for (const [id,action] of [
  ['collapse',()=>guardedFold(view,status)],
  ['reveal',()=>stagedUnfold(view,status)],
  ['open',()=>stagedUnfold(view,status,true)]
]) handlers['fold.'+id]=()=>{
  action(); view.focus();
};
for(const theme of THEMES) handlers['theme.'+theme.id]=()=>{
  activeTheme = applyTheme(document.documentElement,theme.id);
  $('theme').value=activeTheme.id;
  view.dispatch({effects:appearance.reconfigure(editorTheme(activeTheme))});
  $('themeNote').textContent = saveThemeChoice(themeStorage,activeTheme.id) ? '' : 'Auswahl gilt nur für diese Sitzung: Browserspeicher nicht verfügbar.';
};
$('theme').addEventListener('change',()=>registry.execute('theme.'+$('theme').value));
for(const [id,element] of [['heading-indent','headingIndent'],['list-markers','visualMarkers'],['hierarchical-numbers','hierarchicalNumbers'],['children','structureChildren']]) handlers['view.'+id]=()=>{$(element).checked=!$(element).checked;if(id!=='children') updateVisualOptions();};
handlers['ui.options']=()=>{$('editorOptions').open=true;$('editorOptions').querySelector('summary').focus();};
handlers['ui.development']=()=>{$('development').open=true;$('development').querySelector('summary').focus();};
handlers['ui.palette']=()=>surfaces.palette();
function render() {
  $('document').textContent = session?.hasDocument ? `${session.vault.name}/${session.path}${session.dirty ? ' · geändert' : ' · unverändert'}` : 'Keine Datei geöffnet.';
}
function setBusy(value) {
  busy = value;
  for (const element of document.querySelectorAll('button,select,input')) if(!element.closest('.command-palette,.command-context')) element.disabled = value;
  view.dispatch({effects:editable.reconfigure([EditorState.readOnly.of(value || !session?.hasDocument),EditorView.editable.of(!value && !!session?.hasDocument)])});
}
function syncEditor() {
  syncing = true;
  try {
    // New state prevents undo history from crossing file or draft boundaries.
    view.setState(EditorState.create({doc:session.text,extensions:extensions()}));
  } finally {syncing = false;}
  render();
}
async function persistDraft() {
  if (!persistPending || busy || !session?.hasDocument) return;
  persistPending = false;
  try {await session.persist(); if (!persistPending) status('Browser-Entwurf gesichert. Markdown-Datei noch nicht gespeichert.');}
  catch (error) {persistPending = true; status(`Entwurf nur im Arbeitsspeicher: ${error.message}`);}
}
async function run(action) {
  if (busy) return;
  clearTimeout(timer); setBusy(true);
  try {await action();}
  catch (error) {status(`${error.name}: ${error.message}`);}
  finally {
    render(); setBusy(false);
    if (persistPending) timer = setTimeout(() => {void persistDraft();},300);
  }
}
const actionIds={choose:'workspace.choose',grant:'workspace.grant',scan:'workspace.scan',open:'file.open',save:'file.save',check:'file.check',listDrafts:'draft.list',recover:'draft.recover'};
function bind(id, action) {handlers[actionIds[id]]=()=>run(action);}
function requireSynthetic() {if (!$('synthetic').checked) throw Error('Synthetischen Test-Vault zuerst bestätigen.');}
async function permission(request = false) {
  if (!vault) throw Error('Test-Vault wählen.');
  let result = await vault.queryPermission({mode:'readwrite'});
  if (result !== 'granted' && request) result = await vault.requestPermission({mode:'readwrite'});
  if (result !== 'granted') throw Error('Ordnerrechte fehlen. Rechte per Knopf anfordern; Entwurf bleibt erhalten.');
}
async function scan() {
  await permission();
  const paths = [];
  let entries = 0;
  async function walk(dir,prefix='',depth=0) {
    if (depth > 10) throw Error('Test-Vault zu tief verschachtelt (maximal 10 Unterordnerebenen).');
    for await (const [name,handle] of dir.entries()) {
      if (++entries > 3000) throw Error('Test-Vault zu groß (maximal 3000 Einträge).');
      if (name.startsWith('.')) continue;
      if (handle.kind === 'directory') await walk(handle,prefix+name+'/',depth+1);
      else if (/\.md$/i.test(name)) paths.push(prefix+name);
      if (paths.length > 1000) throw Error('Test-Vault zu groß (maximal 1000 Markdown-Dateien).');
    }
  }
  await walk(vault);
  $('files').replaceChildren(...paths.sort().map(path => new Option(path,path)));
  status(`${paths.length} Markdown-Datei(en) im Test-Vault gefunden.`);
}
bind('choose', async () => {
  requireSynthetic();
  const selected = await showDirectoryPicker({mode:'readwrite'});
  await session.persist();
  $('files').replaceChildren(); vault = selected; await scan();
});
bind('grant', async () => {
  if (session.hasDocument) await session.grant();
  await permission(true); status('Ordnerrechte erteilt.');
});
bind('scan', scan);
bind('open', async () => {
  requireSynthetic(); await permission(); await session.persist();
  const path = $('files').value;
  if (!path) throw Error('Markdown-Datei auswählen.');
  let dir = vault; const parts = path.split('/');
  for (const name of parts.slice(0,-1)) dir = await dir.getDirectoryHandle(name);
  const handle = await dir.getFileHandle(parts.at(-1));
  await session.open({vault,handle,path}); syncEditor(); persistPending = false;
  status('Datei geöffnet. Änderungen werden erst mit Speichern in die Datei geschrieben.'); view.focus();
});
async function save() {
  requireSynthetic();
  if (!session.hasDocument) throw Error('Datei öffnen.');
  const result = await session.save(); persistPending = false;
  status(result.unchanged ? 'Bytegleich: Datei nicht neu geschrieben.' : `Gespeichert und geprüft. Sicherung: ${result.backupName}`);
}
bind('save',save);
bind('check', async () => {const result = await session.check(); status(result.conflict ? 'Externe Änderung erkannt. Speichern blockiert; Entwurf bleibt erhalten.' : 'Datei unverändert; Ordnerrechte gültig.');});
bind('listDrafts', async () => {
  const drafts = await session.listDrafts();
  $('drafts').replaceChildren(...drafts.map(d => new Option(`${d.vaultName}/${d.path} · ${new Date(d.updated).toLocaleString('de-DE')}`,d.key)));
  status(`${drafts.length} Browser-Entwurf/Entwürfe gefunden.`);
});
bind('recover', async () => {
  requireSynthetic(); const key = $('drafts').value;
  if (!key) throw Error('Entwurf auswählen.');
  await session.persist(); await session.recover(key); vault = session.vault;
  $('files').replaceChildren();
  syncEditor(); persistPending = false; status('Entwurf geladen. Vor Speichern werden Rechte und externe Änderungen geprüft.');
});
window.addEventListener('keydown', event => {
  if (event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && !event.isComposing && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if(document.querySelector('dialog[open]')) return;
    void registry.execute('file.save');
  }
}, true);
window.addEventListener('beforeunload', event => {
  if (busy || session?.dirty || persistPending) {event.preventDefault(); event.returnValue = '';}
});
window.addEventListener('focus', () => {
  if (!busy && session?.hasDocument) void run(async () => {
    const result = await session.check();
    if (result.conflict) status('Externe Änderung erkannt; Entwurf bleibt erhalten. Speichern blockiert.');
  });
});
for(const element of document.querySelectorAll('[data-command]')) {
  element.addEventListener('mousedown',event=>{if(event.button===0&&view.hasFocus) event.preventDefault();});
  element.addEventListener('click',()=>{void registry.execute(element.dataset.command);});
}
try {
  if (!window.showDirectoryPicker || !navigator.locks) throw Error('Microsoft Edge mit File System Access API und Web Locks erforderlich.');
  session = createSession({store:await createBrowserStore()});
  setBusy(false); status('Bereit. Synthetischen Test-Vault bestätigen und auswählen.');
} catch (error) {status(`Start blockiert: ${error.message}`);}

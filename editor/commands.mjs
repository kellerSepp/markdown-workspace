import {refileContext} from './refile.mjs';
import {todoContext,todoDefinitionLine,todoCycleContext} from './todo.mjs';
import {LIST_COMMANDS,planListInteraction} from './list-interaction.mjs';
import {planStructure} from './structure.mjs';
import {planFormat} from './formatting.mjs';
import {foldingContext} from './section-folding.mjs';
import {undoDepth,redoDepth} from '@codemirror/commands';
import {ORG_STRUCTURE,planOrgStructure} from './org-structure.mjs';
import {orgFoldReason} from './org-folding.mjs';
import {planLineMove} from './line-move.mjs';
import {EMACS_COMMANDS} from './emacs-policy.mjs';
import {emacsCommandReason} from './emacs-editing.mjs';
import {PREFIX_BINDINGS} from './emacs-policy.mjs';

const documentReason=c=>c.busy?'Ein Vorgang läuft.':!c.hasDocument?'Bitte zuerst eine Datei öffnen.':'';
const idle=c=>c.busy?'Ein Vorgang läuft.':'';
const synthetic=c=>idle(c)||(!c.synthetic?'Synthetischen Test-Vault zuerst bestätigen.':'');
const vault=c=>idle(c)||(!c.vault?'Bitte zuerst einen Test-Vault wählen.':'');
const catalog=[];
function add(id,name,category,description,context,unavailable,shortcut='') {catalog.push({id,name,category,description,context,unavailable,shortcut});}
add('workspace.choose','Test-Vault wählen / wechseln','Datei','Synthetischen lokalen Ordner wählen; bisherigen Entwurf sichern.','global',synthetic);
add('workspace.grant','Ordnerrechte anfordern','Entwicklung','Bestehende Ordnerfreigabe erneut anfordern.','vault',vault);
add('workspace.scan','Dateiliste aktualisieren','Datei','Markdown-Dateien im gewählten Test-Vault suchen.','vault',vault);
add('file.open','Ausgewählte Datei öffnen','Datei','Datei aus der Dateiauswahl laden; Undo-Grenze neu beginnen.','vault',c=>synthetic(c)||vault(c)||(!c.file?'Bitte eine Markdown-Datei in der Dateiauswahl wählen.':''));
add('file.save','Datei speichern','Datei','Explizit mit vorhandener Sicherungs- und Konfliktprüfung speichern.','document',c=>synthetic(c)||documentReason(c),'Strg+S');
add('file.check','Datei auf externe Änderungen prüfen','Entwicklung','Dateirechte und externe Änderungen prüfen.','document',documentReason);
add('draft.list','Browser-Entwürfe auflisten','Wiederaufnahme','Entwürfe dieses Browsers und Origins auflisten.','global',idle);
add('draft.recover','Ausgewählten Entwurf laden','Wiederaufnahme','Gewählten Entwurf nach Sicherung des aktuellen Entwurfs laden.','draft',c=>synthetic(c)||(!c.draft?'Bitte zuerst einen Browser-Entwurf auswählen.':''));
for(const [id,name] of [['collapse','Abschnitt einklappen'],['reveal','Nächste Sichtbarkeitsstufe'],['open','Abschnitt vollständig öffnen']])
  add('fold.'+id,name,'Folding','Ansicht des aktuellen Abschnitts oder lokalen Blocks verändern; Text bleibt erhalten.','editor',c=>documentReason(c)||(!foldingContext(c.state)?'Kein faltbarer Abschnitt oder Block im Cursorkontext.':''),id==='collapse'?'Strg+Umschalt+,':id==='reveal'?'Strg+Umschalt+.':'');
for(const [id,name] of [['heading-up','Abschnitt nach oben'],['heading-down','Abschnitt nach unten'],['heading-promote','Überschrift: Ebene höher'],['heading-demote','Überschrift: Ebene tiefer'],['list-up','Listenpunkt nach oben'],['list-down','Listenpunkt nach unten'],['list-indent','Listenpunkt einrücken'],['list-outdent','Listenpunkt ausrücken'],['list-prefix','Gewähltes Listenpräfix anwenden']])
  add('structure.'+id,name,id.startsWith('heading')?'Überschriften':'Listen','Vorhandene sichere Strukturaktion; Wahl „Unterstruktur mitnehmen“ beachten.','editor',c=>documentReason(c)||planStructure(c.state,id,c.structure).message||'','');
for(const [id,name,shortcut] of LIST_COMMANDS) add('list.'+id,name,'Listen','Kontextuelle Listenbedienung; Markdown-Schutzgrenzen beachten.','editor',c=>documentReason(c)||planListInteraction(c.state,id).message||'',shortcut);
for(const [id,name] of [['bold','Fett'],['italic','Kursiv'],['underline','Unterstrichen'],['strike','Durchgestrichen'],['code','Inline-Code']])
  add('format.'+id,name,'Textformatierung','Formatierung der Auswahl setzen oder bei passender Auswahl entfernen. Codeblöcke bleiben geschützt.','selection',c=>documentReason(c)||planFormat(c.state,id).message||'');
for(const [id,name,depth,shortcut] of [['undo','Rückgängig',undoDepth,'Strg+Z'],['redo','Wiederholen',redoDepth,'Strg+Umschalt+Z']])
  add('edit.'+id,name,'Bearbeiten','Letzte Änderung in der aktuellen Datei rückgängig machen beziehungsweise wiederholen.','document',c=>documentReason(c)||(!depth(c.state)?'Keine weitere '+name+'-Aktion verfügbar.':''),shortcut);
for(const {id,name,description,shortcut} of EMACS_COMMANDS)add('edit.emacs-'+id,name,'Bearbeiten',description,'editor',c=>documentReason(c)||emacsCommandReason(c.state,id),shortcut);
for(const id of ['midnight','terminal','nord','paper']) add('theme.'+id,'Theme: '+id[0].toUpperCase()+id.slice(1),'Ansicht','Vorhandenes Farbschema sofort anwenden und lokal merken.','global',idle);
for(const [id,name] of [['heading-indent','Überschrifteneinrückung umschalten'],['list-markers','Visuelle Listenmarker umschalten'],['hierarchical-numbers','Hierarchische Nummern umschalten'],['children','Unterstruktur mitnehmen umschalten']]) add('view.'+id,name,'Ansicht','Sitzungsoption umschalten; gespeicherte Markdown-Syntax bleibt unverändert.','global',idle);
for(let level=1;level<=5;level++) add('view.marker-level-'+level,'Listenmarker Ebene '+(level===5?'5+':level)+' wechseln','Ansicht','Nächsten visuellen Marker wählen; die Optionsauswahl kann einen konkreten Marker setzen. Keine Rohtextänderung.','global',idle);
add('ui.options','Editoroptionen anzeigen','Ansicht','Marker für fünf Ebenen und Listenpräfix in den Optionen einstellen.','global',idle);
add('ui.development','Entwicklungsbereich anzeigen','Entwicklung','Rechteprüfung und technische Editoraktionen anzeigen. Historischer Storage-Spike bleibt separat.','global',idle);
add('ui.palette','Command Palette öffnen','Bedienung','Alle registrierten Befehle durchsuchen.','global',idle,'Alt+X');
for(const [id,,children,name,shortcut,orgShortcut] of ORG_STRUCTURE) {
  add('structure.'+id,name,id.startsWith('heading')?'Überschriften':'Listen','Explizite Org-Aktion '+(children?'mit Unterbaum':'ohne Unterbaum')+'; unabhängig von der Unterstrukturwahl. Markdown-Schutzgrenzen beachten.','editor',c=>documentReason(c)||planOrgStructure(c.state,id).message||'',shortcut);
  Object.assign(catalog.at(-1),{orgShortcut,compatibility:id.startsWith('heading')?'Org-Kernverhalten, einzelne Cursorstelle; H1–H6.':'Org-Listen: erste Itemzeile; Single/Subtree, Erstpunkt und Wiederholungsregion; Markdown-Schutzgrenzen.'});
}
for(const [id,name,global,shortcut,orgShortcut] of [['org-local-cycle','Org: lokale Sichtbarkeit',false,'Tab (Org-Tab, Überschrift)','TAB'],['org-global-cycle','Org: globale Sichtbarkeit',true,'Umschalt+Tab (Org-Tab, außerhalb Liste/Code)','S-TAB']]) {
  add('fold.'+id,name,'Folding','Org-Sichtbarkeitszyklus; Legacy-Faltbefehle bleiben erhalten.','editor',c=>documentReason(c)||orgFoldReason(c.state,global),shortcut);
  Object.assign(catalog.at(-1),{orgShortcut,compatibility:global?'OVERVIEW → CONTENTS → SHOW ALL; Listen-/Code-Tab hat Vorrang.':'FOLDED → CHILDREN → SUBTREE; nur Überschriften, keine leeren Eintragszyklen.'});
}
add('view.org-tab','Org-Tab-Modus umschalten','Ansicht','Sitzungsoption: Heading-Tab faltet, Shift+Tab außerhalb Liste/Code faltet global. Standard bleibt Struktur-Tab; Escape aktiviert Fokusnavigation.','global',idle);
for(const [id,name,down,shortcut,orgShortcut] of [['line-up','Zeile nach oben',false,'Alt+Umschalt+Oben','M-S-UP'],['line-down','Zeile nach unten',true,'Alt+Umschalt+Unten','M-S-DOWN']]) {
  add('edit.'+id,name,'Bearbeiten','Aktuelle physische Zeile tauschen, unabhängig von Hierarchie und Unterstrukturwahl. Marker werden nicht geändert. Code/Fences/Frontmatter sind geschützt.','editor',c=>documentReason(c)||planLineMove(c.state,down).message||'',shortcut);
  Object.assign(catalog.at(-1),{orgShortcut,compatibility:'Org/Emacs-Zeilenbewegung bei einzelnem Cursor; Code-/Frontmatter-Grenzen zusätzlich geschützt, keine Regionen.'});
}
add('structure.refile-h1','Teilbaum unter H1 verschieben','Überschriften','Aktuellen Teilbaum als letztes Kind unter H1 dieser Datei verschieben; keine Regionen.','editor',c=>documentReason(c)||refileContext(c.state).message||'');
add('todo.status','Aufgabenstatus wählen','Aufgaben','Status dieser H1–H6-Überschrift wählen; Kinder und Eltern behalten ihren eigenen Status.','editor',c=>documentReason(c)||todoContext(c.state).message||'');
add('todo.reload','TODO-Regeln neu laden','Aufgaben','Dateilokale SEQ_TODO-Definition laden; Fehler behalten letzte gültige Regeln.','editor',c=>documentReason(c)||(c.state.readOnly?'Editor ist schreibgeschützt.':c.state.selection.ranges.length!==1||!c.state.selection.main.empty?'Nur ein Cursor ohne Auswahl.':!todoDefinitionLine(c.state)?'Cursor muss auf der SEQ_TODO-Zeile stehen.':''));
for(const [id,name,shortcut] of [['previous','Vorheriger Aufgabenstatus','Umschalt+Links'],['next','Nächster Aufgabenstatus','Umschalt+Rechts']])add('todo.'+id,name,'Aufgaben','Status auf der Aufgabenüberschrift wechseln; Textauswahl hat Vorrang.','editor',c=>documentReason(c)||todoCycleContext(c.state).message||'',shortcut);
for(const {id,key,label} of PREFIX_BINDINGS){const command=catalog.find(c=>c.id===id);command.shortcut=[command.shortcut,'C-c '+(label??key)+' (Editor)'].filter(Boolean).join(' / ');}
for(const id of ['heading-up','heading-down']) Object.assign(catalog.find(c=>c.id==='structure.'+id),{shortcut:id==='heading-up'?'Alt+Oben':'Alt+Unten',orgShortcut:id==='heading-up'?'M-UP':'M-DOWN',compatibility:'Org-Unterbaumtausch nur mit gleichrangigem Geschwister innerhalb derselben Elterngrenze.'});
export const COMMAND_METADATA=Object.freeze(catalog.map(c=>Object.freeze(c)));
export function commandDefinitions(handlers) {
  return COMMAND_METADATA.map(command=>({...command,execute:(_context,args)=>{
    const handler=handlers[command.id];
    if(!handler) throw Error('Command-Handler fehlt: '+command.id);
    return handler(args);
  }}));
}

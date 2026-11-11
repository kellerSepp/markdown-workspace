import {refileContext} from './refile.mjs';
import {planSubtreeReturn} from './subtree-return.mjs';
import {planMetaReturn} from './meta-return.mjs';
import {planningContext} from './planning.mjs';
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
import {agendaCommandReason} from './agenda-command-policy.mjs';
import {checklistReason,checklistConfirmReason} from './checklists.mjs';
import {planTaskInsert} from './task-insert.mjs';
import {tagContext} from './tag-model.mjs';
import {tagDefinitionLine} from './tag-rules.mjs';
import {confirmReason} from './context-confirm.mjs';

const documentReason=c=>c.busy?'Ein Vorgang läuft.':!c.hasDocument?'Bitte zuerst eine Datei öffnen.':'';
const idle=c=>c.busy?'Ein Vorgang läuft.':'';
const synthetic=c=>idle(c)||(!c.synthetic?'Alpha-Nutzungshinweis zuerst bestätigen.':'');
const vault=c=>idle(c)||(!c.vault?'Bitte zuerst einen Vault wählen.':'');
const catalog=[];
add('tags.edit','Tags bearbeiten','Tags','Eigene Tags wählen oder frei ergänzen; geerbte Tags getrennt anzeigen.','editor',c=>documentReason(c)||tagContext(c.state).message||'');
add('tags.reload','Tagvorlagen neu laden','Tags','Dateilokale TAGS-Vorgaben laden; bei Fehler letzte gültige Auswahl erhalten.','editor',c=>documentReason(c)||(c.state.readOnly?'Editor ist schreibgeschützt.':c.state.selection.ranges.length!==1||!c.state.selection.main.empty?'Nur ein Cursor ohne Auswahl.':!tagDefinitionLine(c.state)?'Cursor muss auf der TAGS-Zeile stehen.':''));
add('structure.subtree-return','Überschrift nach Unterbaum einfügen','Überschriften','Gleichrangige leere Überschrift nach dem gesamten aktuellen Unterbaum einfügen; Cursor bereit für den Titel.','editor',c=>documentReason(c)||planSubtreeReturn(c.state).message||'','Strg+Enter');
add('structure.meta-return','Überschrift oder Listenpunkt einfügen','Überschriften','Org Meta-Return: gleichrangige Überschrift oder Listenpunkt; Text am Cursor teilen.','editor',c=>documentReason(c)||planMetaReturn(c.state).message||'','Alt+Enter');
add('view.line-wrap','Zeilenumbruch umschalten','Ansicht','Visuellen Wortumbruch umschalten; aus: horizontal scrollen. Gilt für diesen Tab, ohne Textänderung.','global',idle);
function add(id,name,category,description,context,unavailable,shortcut='') {catalog.push({id,name,category,description,context,unavailable,shortcut});}
add('workspace.choose','Vault wählen / wechseln','Datei','Separaten Alpha-Vault wählen; bisherigen Entwurf sichern.','global',synthetic);
add('workspace.grant','Ordnerrechte anfordern','Entwicklung','Bestehende Ordnerfreigabe erneut anfordern.','vault',vault);
add('workspace.scan','Dateiliste aktualisieren','Datei','Markdown-Dateien im gewählten Vault suchen.','vault',vault);
add('agenda.refresh','Agenda-Index neu einlesen','Datei','Alle Markdown-Dateien des gewählten Vaults rein lesend neu indizieren; Editorentwurf erhalten.','vault',c=>synthetic(c)||vault(c));
add('agenda.dispatch','Agenda öffnen','Agenda','Kompakten Dispatcher für Wochenagenda und TODO-Liste öffnen.','vault',c=>synthetic(c)||vault(c));
add('agenda.week','Wochenagenda öffnen','Agenda','Gespeicherte Termine und Aufgaben von Montag bis Sonntag anzeigen.','vault',c=>synthetic(c)||vault(c));
add('agenda.todo','TODO-Liste öffnen','Agenda','Offene Überschriftenaufgaben im Vault anzeigen; abgeschlossene Zustände optional einblenden.','vault',c=>synthetic(c)||vault(c));
add('file.open','Ausgewählte Datei öffnen','Datei','Datei aus der Dateiauswahl laden; Undo-Grenze neu beginnen.','vault',c=>synthetic(c)||vault(c)||(!c.file?'Bitte eine Markdown-Datei in der Dateiauswahl wählen.':''));
add('file.find','Datei öffnen/anlegen','Datei','Vault-relativen Markdown-Pfad vervollständigen und öffnen oder eine fehlende Datei leer anlegen.','vault',c=>synthetic(c)||vault(c));
add('file.save','Datei speichern','Datei','Explizit mit vorhandener Sicherungs- und Konfliktprüfung speichern.','document',c=>synthetic(c)||documentReason(c),'Strg+S');
add('file.check','Datei auf externe Änderungen prüfen','Entwicklung','Dateirechte und externe Änderungen prüfen.','document',documentReason);
add('draft.list','Browser-Entwürfe auflisten','Wiederaufnahme','Entwürfe dieses Browsers und Origins auflisten.','global',idle);
add('draft.recover','Ausgewählten Entwurf laden','Wiederaufnahme','Gewählten Entwurf nach Sicherung des aktuellen Entwurfs laden.','draft',c=>synthetic(c)||(!c.draft?'Bitte zuerst einen Browser-Entwurf auswählen.':''));
for(const [id,name] of [['collapse','Abschnitt einklappen'],['reveal','Nächste Sichtbarkeitsstufe'],['open','Abschnitt vollständig öffnen']])
  add('fold.'+id,name,'Folding','Ansicht des aktuellen Abschnitts oder lokalen Blocks verändern; Text bleibt erhalten.','editor',c=>documentReason(c)||(!foldingContext(c.state)?'Kein faltbarer Abschnitt oder Block im Cursorkontext.':''),id==='collapse'?'Strg+Umschalt+,':id==='reveal'?'Strg+Umschalt+.':'');
for(const [id,name] of [['heading-up','Abschnitt nach oben'],['heading-down','Abschnitt nach unten'],['heading-promote','Überschrift: Ebene höher'],['heading-demote','Überschrift: Ebene tiefer'],['list-up','Listenpunkt nach oben'],['list-down','Listenpunkt nach unten'],['list-indent','Listenpunkt einrücken'],['list-outdent','Listenpunkt ausrücken'],['list-prefix','Gewähltes Listenpräfix anwenden']])
  add('structure.'+id,name,id.startsWith('heading')?'Überschriften':'Listen','Vorhandene sichere Strukturaktion; Wahl „Unterstruktur mitnehmen“ beachten.','editor',c=>documentReason(c)||planStructure(c.state,id,c.structure).message||'','');
for(const [id,name,shortcut] of LIST_COMMANDS) add('list.'+id,name,'Listen',id==='insert-checkbox'?'Listenpunkt zur Checkbox machen; auf Überschrift folgendes TODO gleicher Ebene, auf leerer Textzeile TODO letzter Headingebene erstellen. Cursor steht bereit für den Titel.':'Kontextuelle Listenbedienung; Markdown-Schutzgrenzen beachten.','editor',c=>documentReason(c)||(id==='insert-checkbox'?planTaskInsert(c.state):planListInteraction(c.state,id)).message||'',shortcut);
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
add('view.org-tab','Org-Tab-Modus umschalten','Ansicht','Sitzungsoption, standardmäßig an: Tab faltet Überschriften und Listenpunktinhalt; Shift+Tab außerhalb Liste/Code faltet global. Escape aktiviert Fokusnavigation.','global',idle);
for(const [id,name,down,shortcut,orgShortcut] of [['line-up','Zeile nach oben',false,'Alt+Umschalt+Oben','M-S-UP'],['line-down','Zeile nach unten',true,'Alt+Umschalt+Unten','M-S-DOWN']]) {
  add('edit.'+id,name,'Bearbeiten','Aktuelle physische Zeile tauschen, unabhängig von Hierarchie und Unterstrukturwahl. Marker werden nicht geändert. Code/Fences/Frontmatter sind geschützt.','editor',c=>documentReason(c)||planLineMove(c.state,down).message||'',shortcut);
  Object.assign(catalog.at(-1),{orgShortcut,compatibility:'Org/Emacs-Zeilenbewegung bei einzelnem Cursor; Code-/Frontmatter-Grenzen zusätzlich geschützt, keine Regionen.'});
}
add('structure.refile-h1','Teilbaum unter H1 verschieben','Überschriften','Aktuellen Teilbaum als letztes Kind unter H1 dieser Datei verschieben; keine Regionen.','editor',c=>documentReason(c)||refileContext(c.state).message||'');
for(const [id,name] of [['scheduled','Scheduling bearbeiten'],['deadline','Deadline bearbeiten']])add('planning.'+id,name,'Planung','Datum und optionale Wiederholung (+/++/.+ d/w/m/y) dieser Überschrift bearbeiten; Tagwahl erhält Uhrzeit und Regel.','editor',c=>documentReason(c)||planningContext(c.state).message||'');
add('todo.status','Aufgabenstatus wählen','Aufgaben','Status dieser H1–H6-Überschrift wählen; wiederholende Aufgaben beim Abschluss mit Log fortschreiben und zurücksetzen. Kinder und Eltern bleiben unabhängig.','editor',c=>documentReason(c)||todoContext(c.state).message||'');
add('todo.reload','TODO-Regeln neu laden','Aufgaben','Dateilokale SEQ_TODO-Definition laden; Fehler behalten letzte gültige Regeln.','editor',c=>documentReason(c)||(c.state.readOnly?'Editor ist schreibgeschützt.':c.state.selection.ranges.length!==1||!c.state.selection.main.empty?'Nur ein Cursor ohne Auswahl.':!todoDefinitionLine(c.state)?'Cursor muss auf der SEQ_TODO-Zeile stehen.':''));
add('editor.confirm','Kontext bestätigen','Bearbeiten','Auf Überschrift Tags bearbeiten, TAGS-/SEQ_TODO-Vorgaben laden oder Blattcheckbox umschalten.','editor',c=>documentReason(c)||confirmReason(c.state));
for(const [id,name,description] of [
  ['section','Abschnittszähler aktualisieren','Vorhandene Fortschrittszähler des aktuellen Headings aktualisieren, Tags erhalten.'],
  ['toggle','Checkbox umschalten','Checkbox auf der ersten Listenpunktzeile abhaken; Eltern und vorhandene Zähler atomar aktualisieren.'],
  ['marker','Checkbox hinzufügen/entfernen','Checkboxmarker dieses Listenpunkts hinzufügen oder entfernen; Text erhalten.'],
  ['refresh','Checklisten neu berechnen','Elternzustände und vorhandene Fortschrittszähler der aktuellen Datei nach Rohtexteingabe neu berechnen.']
])add('checklist.'+id,name,'Checklisten',description,'editor',c=>documentReason(c)||checklistReason(c.state,id));
for(const [id,name,shortcut] of [['previous','Vorheriger Aufgabenstatus','Umschalt+Links'],['next','Nächster Aufgabenstatus','Umschalt+Rechts']])add('todo.'+id,name,'Aufgaben','Status auf der Aufgabenüberschrift wechseln; wiederholende Aufgaben beim Abschluss fortschreiben. Textauswahl hat Vorrang.','editor',c=>documentReason(c)||todoCycleContext(c.state).message||'',shortcut);
for(const {id,key,label} of PREFIX_BINDINGS){const command=catalog.find(c=>c.id===id);command.shortcut=[command.shortcut,'C-c '+(label??key)+' (Editor)'].filter(Boolean).join(' / ');}
for(const id of ['heading-up','heading-down']) Object.assign(catalog.find(c=>c.id==='structure.'+id),{shortcut:id==='heading-up'?'Alt+Oben':'Alt+Unten',orgShortcut:id==='heading-up'?'M-UP':'M-DOWN',compatibility:'Org-Unterbaumtausch nur mit gleichrangigem Geschwister innerhalb derselben Elterngrenze.'});
export const COMMAND_METADATA=Object.freeze(catalog.map(c=>Object.freeze(c)));
export function commandDefinitions(handlers,beforeExecute=()=>true) {
  return COMMAND_METADATA.map(command=>({...command,unavailable:context=>context.filePickerActive?'Dateidialog zuerst schließen.':agendaCommandReason(command,context)||command.unavailable(context),execute:(_context,args)=>{
    if(beforeExecute(command.id)===false)return false;
    const handler=handlers[command.id];
    if(!handler) throw Error('Command-Handler fehlt: '+command.id);
    return handler(args);
  }}));
}

// Product choices live here; models and input routing consume the same policy.
export const EMACS_POLICY=Object.freeze({maxEntries:120,maxBytes:8*1024*1024,byteEncoding:'UTF-8',previewLength:180,completionMaxCharacters:256});
export const PREFIX_BINDINGS=Object.freeze([
  Object.freeze({key:'1',id:'fold.collapse'}),
  Object.freeze({key:'2',id:'fold.reveal'}),
  Object.freeze({key:'3',id:'fold.open'}),
  Object.freeze({key:'w',label:'w',id:'structure.refile-h1'}),
  Object.freeze({key:'t',id:'todo.status'}),
  Object.freeze({key:'c',ctrl:true,label:'C-c',id:'todo.reload'}),
  Object.freeze({key:'s',label:'s',id:'planning.scheduled'}),
  Object.freeze({key:'d',label:'d',id:'planning.deadline'}),
  Object.freeze({key:'a',id:'agenda.dispatch'}),
  Object.freeze({key:'f',id:'file.find'}),
  Object.freeze({key:'l',id:'view.line-wrap'})
]);
export const EMACS_BINDINGS=Object.freeze([
  {id:'mark',key:' ',ctrl:true,label:'Strg+Leertaste'},
  {id:'cancel-mark',key:'g',ctrl:true,label:'Strg+G'},
  {id:'copy',key:'w',alt:true,label:'Alt+W'},
  {id:'cut',key:'x',ctrl:true,label:'Strg+X'},
  {id:'yank',key:'y',ctrl:true,label:'Strg+Y'},
  {id:'yank-pop',key:'y',alt:true,label:'Alt+Y'}
].map(Object.freeze));
export const EMACS_COMMANDS=Object.freeze([
  ['mark','Marke setzen','Marke am Cursor aktivieren; Bewegung erweitert die Auswahl.'],
  ['cancel-mark','Markierung deaktivieren','Marke und Auswahl am Cursor lösen.'],
  ['copy','Region kopieren','Auswahl im internen Ring sichern und Windows-Kopie versuchen.'],
  ['cut','Region ausschneiden','Auswahl sicher im Ring sichern und danach atomar entfernen.'],
  ['yank','Text einfügen (Yank)','Clipboard versuchen, bei fehlendem Zugriff klar gekennzeichneten internen Ring verwenden.'],
  ['yank-pop','Älteren Ringtext einfügen','Direkt nach Yank den Einfügebereich austauschen; sonst Ringauswahl öffnen.'],
  ['show-ring','Kill-Ring anzeigen','Ältere Texte im unteren Arbeitsbereich suchen und auswählen.'],
  ['paste-external','Windows-Clipboard einfügen','Explizites externes Einfügen; bei Lesefehler keine interne Ersatzquelle.'],
  ['clear-ring','Kill-Ring leeren','Nur flüchtigen internen Textspeicher leeren; Windows-Clipboard bleibt erhalten.']
].map(([id,name,description])=>Object.freeze({id,name,description,shortcut:EMACS_BINDINGS.find(b=>b.id===id)?.label??''})));
export function emacsShortcut(event,bindings=EMACS_BINDINGS){
  if(event.isComposing||event.keyCode===229||event.metaKey||event.getModifierState?.('AltGraph'))return null;
  const key=event.key.toLowerCase();
  return bindings.find(b=>key===b.key&&!!event.ctrlKey===!!b.ctrl&&!!event.altKey===!!b.alt&&!event.shiftKey)?.id??null;
}
// C-y belongs exclusively to Yank on Windows. Do not let fallback history maps
// run Redo when a guard refuses a Yank or a browser key is synthesized in tests.
export function withoutYankRedo(bindings){
  return bindings.filter(b=>!['Mod-y','Ctrl-y','Control-y'].includes(b.key)&&!['Mod-y','Ctrl-y'].includes(b.win));
}

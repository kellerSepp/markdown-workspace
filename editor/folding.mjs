import {EditorState} from '@codemirror/state';
import {keymap} from '@codemirror/view';
import {codeFolding, foldGutter, forceParsing, syntaxTreeAvailable} from '@codemirror/language';
import {collapseContext,revealContext,cycleContext,foldingContext,unfoldExisting} from './section-folding.mjs';

// The installed Markdown language supplies heading ranges. Do not duplicate its parser.
export function prepareFold(view, notify = () => {}) {
  if (syntaxTreeAvailable(view.state) || forceParsing(view, view.state.doc.length, 50)) return true;
  notify('Abschnitt noch nicht vollständig analysiert. Bitte erneut einklappen; der Text bleibt unverändert.');
  return false;
}
export function guardedFold(view, notify) {
  if (!prepareFold(view, notify)) return true;
  return collapseContext(view,notify);
}
export function stagedUnfold(view,notify,fully=false) {
  if (!prepareFold(view,notify)) {unfoldExisting(view,notify); return true;}
  return revealContext(view,notify,undefined,fully);
}
export function foldingBindings(notify,execute) {
  return [
    {key:'Ctrl-Shift-,', run:view => execute?(execute('fold.collapse'),true):guardedFold(view, notify), preventDefault:true},
    {key:'Ctrl-Shift-.', run:view=>execute?(execute('fold.reveal'),true):stagedUnfold(view,notify), preventDefault:true}
  ];
}
export function markdownFolding(notify,execute) {
  return [
    codeFolding({placeholderText:'…',placeholderDOM(view) {
      const button=document.createElement('button');
      button.type='button'; button.className='cm-foldPlaceholder'; button.textContent='…';
      button.title='Nächste Sichtbarkeitsstufe'; button.setAttribute('aria-label',button.title);
      button.onclick=event=>{
        event.preventDefault();
        const pos=view.posAtDOM(button);
        if (prepareFold(view,notify)) revealContext(view,notify,pos);
        else unfoldExisting(view,notify,pos);
        view.focus();
      };
      return button;
    }}),
    foldGutter({
      openText:'▾', closedText:'▸',
      markerDOM(open) {
        const marker=document.createElement('span');
        marker.textContent=open?'▾':'▸';
        marker.title='Sichtbarkeit des Abschnitts wechseln';
        marker.setAttribute('aria-label',marker.title);
        return marker;
      },
      domEventHandlers:{click(view, line) {
        if (!prepareFold(view,notify)) {unfoldExisting(view,notify,line.from); return true;}
        if (foldingContext(view.state,line.from)) {cycleContext(view,notify,line.from); return true;}
        return false;
      }}
    }),
    keymap.of(foldingBindings(notify,execute)),
    EditorState.phrases.of({
      'Fold line':'Abschnitt einklappen', 'Unfold line':'Abschnitt ausklappen',
      'folded code':'Eingeklappter Abschnitt', 'unfold':'Ausklappen',
      'Folded lines':'Eingeklappte Zeilen', 'Unfolded lines':'Ausgeklappte Zeilen', 'to':'bis'
    })
  ];
}

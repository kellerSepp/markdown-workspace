import {forceParsing,syntaxTreeAvailable} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {frontmatterEnd} from './structure.mjs';
import {startupDefinitionLines,readStartupVisibility} from './startup-visibility.mjs';

export const STARTUP_CHOICES=Object.freeze([
  ['overview','Nur oberste Überschriften — Trees eingeklappt'],
  ['content','Alle Überschriften — Textkörper verborgen'],
  ['show2levels','Bis Ebene 2 — H1/H2 sichtbar'],
  ['show3levels','Bis Ebene 3 — H1 bis H3 sichtbar'],
  ['show4levels','Bis Ebene 4 — H1 bis H4 sichtbar'],
  ['show5levels','Bis Ebene 5 — H1 bis H5 sichtbar'],
  ['showall','Alles geöffnet'],
  ['showeverything','Alles geöffnet — Org-Alternative showeverything']
].map(([id,text])=>Object.freeze({id,text:`${text} · #+STARTUP: ${id}`})));

export function planStartupSetting(state,mode){
  if(state.readOnly)return {message:'Editor ist schreibgeschützt.'};
  if(!STARTUP_CHOICES.some(choice=>choice.id===mode))return {message:'Unbekannte Startansicht.'};
  if(!syntaxTreeAvailable(state,state.doc.length))return {message:'STARTUP: Dokument noch nicht vollständig analysiert.'};
  const lines=startupDefinitionLines(state);
  if(lines.length>1)return {message:'Mehrere STARTUP-Zeilen: Bitte zuerst auf eine Definition reduzieren.'};
  const line=lines[0];let from,to,insert;
  if(line){
    from=line.from;to=line.to;
    insert=/^ */.exec(line.text)[0]+`#+STARTUP: ${mode}`;
  }else{
    from=to=frontmatterEnd(state);
    if(state.doc.line(1).text==='---'&&!Array.from({length:state.doc.lines-1},(_,i)=>state.doc.line(i+2).text).some(text=>/^(---|\.\.\.)$/.test(text)))
      return {message:'Frontmatter ist nicht geschlossen; STARTUP-Zeile wurde nicht eingefügt.'};
    // A closing frontmatter delimiter may be at EOF without a newline.
    insert=(from>0&&state.doc.sliceString(from-1,from)!=='\n'?'\n':'')+`#+STARTUP: ${mode}\n`+(from<state.doc.length?'\n':'');
  }
  if(state.doc.sliceString(from,to)===insert)return {noop:true};
  const changes=state.changes({from,to,insert});
  return {spec:{changes,selection:state.selection.map(changes),annotations:isolateHistory.of('full'),userEvent:'input.startup'}};
}

export function createStartupSettings({view,panel,getContext=()=>({}),notify=()=>{}}){
  const ready=()=>{const context=getContext();return !context.busy&&context.hasDocument!==false&&!view.state.readOnly;};
  return {open(){
    if(!ready())return false;
    if(!forceParsing(view,view.state.doc.length,100)){notify('STARTUP: Dokument noch nicht vollständig analysiert.');return false;}
    if(startupDefinitionLines(view.state).length>1){notify('Mehrere STARTUP-Zeilen: Bitte zuerst auf eine Definition reduzieren.');return false;}
    const current=readStartupVisibility(view.state).mode;
    return panel.openChoices({title:'Startansicht festlegen',label:'Startansichten',
      hint:'↑ ↓ / Alt+↑ ↓ wählen · Enter setzt Dateioption · Escape/Strg+G abbrechen',
      summary:'Ändert die Datei · mit Strg+S speichern · wirkt beim nächsten Öffnen',empty:'Keine passende Startansicht.',
      entries:STARTUP_CHOICES.map(choice=>({...choice,text:choice.text+(choice.id===current?' · aktuell':'')})),
      choose:(mode,saved)=>{
        if(!ready()||saved?.state!==view.state){notify('STARTUP-Ziel geändert; bitte erneut öffnen.');return false;}
        const plan=planStartupSetting(view.state,mode);
        if(plan.message){notify(plan.message);return false;}
        if(!plan.noop){
          const expected=plan.spec.changes.apply(view.state.doc);view.dispatch(plan.spec);
          if(!view.state.doc.eq(expected))return false;
          view.dispatch({selection:view.state.selection,userEvent:'select.startup'});
        }
        notify(`Startansicht: ${mode}. Mit Strg+S speichern; wirkt beim nächsten Öffnen.`);return true;
      }
    });
  }};
}

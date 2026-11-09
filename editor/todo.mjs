import {StateEffect,StateField,Prec} from '@codemirror/state';
import {EditorView,Decoration,ViewPlugin} from '@codemirror/view';
import {syntaxTree,ensureSyntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {frontmatterEnd} from './structure.mjs';
import {sectionAt} from './section-folding.mjs';
import {emacsMark,setEmacsMark} from './emacs-editing.mjs';

export const DEFAULT_TODO=Object.freeze([{name:'TODO',key:'t',closed:false},{name:'DONE',key:'d',closed:true}].map(Object.freeze));
const fail=message=>({message});
function excluded(tree,pos){for(let n=tree.resolveInner(pos,1);n;n=n.parent)if(/^(FencedCode|CodeBlock|HTMLBlock|Blockquote|ListItem)$/.test(n.name))return true;return false;}
export function readTodoRules(state){
  const tree=ensureSyntaxTree(state,state.doc.length,100);if(!tree)return fail('TODO-Regeln: Dokument noch nicht vollständig analysiert.');
  const definitions=[],front=frontmatterEnd(state);
  for(let i=1;i<=state.doc.lines;i++){const l=state.doc.line(i);if(l.from<front||!/^ {0,3}#\+SEQ_TODO\b/i.test(l.text)||excluded(tree,l.from))continue;definitions.push(l);}
  if(!definitions.length)return {rules:DEFAULT_TODO};
  if(definitions.length!==1)return fail('TODO-Regeln: Genau eine SEQ_TODO-Definition pro Datei erlaubt.');
  const line=definitions[0],match=/^ {0,3}#\+SEQ_TODO:\s*(.*?)\s*$/.exec(line.text);
  if(!match)return fail('TODO-Regeln: Erwartet wird #+SEQ_TODO: NAME(t) | DONE(d).');
  const parts=match[1].split('|');if(parts.length!==2||parts.some(p=>!p.trim()))return fail('TODO-Regeln: Genau ein | mit Zuständen auf beiden Seiten erforderlich.');
  const rules=[],names=new Set(),keys=new Set();
  for(let side=0;side<2;side++)for(const token of parts[side].trim().split(/\s+/u)){
    const m=/^([^\s()|]+)\(([a-zA-Z])\)$/u.exec(token);
    if(!m||/^#+$/.test(m[1]))return fail('TODO-Regeln: Status ohne Leerzeichen/Trennzeichen und eine Buchstaben-Schnelltaste erforderlich.');
    const name=m[1],key=m[2].toLowerCase();if(names.has(name)||keys.has(key))return fail('TODO-Regeln: Statusnamen und Schnelltasten müssen eindeutig sein.');
    names.add(name);keys.add(key);rules.push(Object.freeze({name,key,closed:side===1}));
  }
  return {rules:Object.freeze(rules),line:line.number};
}
export const reloadTodo=StateEffect.define();
const setTodoCycle=StateEffect.define();
export const todoRules=StateField.define({
  create(state){const loaded=readTodoRules(state);return {rules:loaded.rules??DEFAULT_TODO,error:loaded.message??'',cycleFrom:null};},
  update(value,tr){
    let next=value,ownCycle=false;
    for(const e of tr.effects){
      if(e.is(reloadTodo))next={rules:e.value.rules??value.rules,error:e.value.message??'',cycleFrom:null};
      if(e.is(setTodoCycle)){next={...next,cycleFrom:e.value};ownCycle=true;}
    }
    if(next.cycleFrom!==null){
      const selection=tr.newSelection;
      if(tr.docChanged&&!ownCycle||tr.reconfigured||selection.ranges.length!==1||!selection.main.empty||tr.newDoc.lineAt(selection.main.head).from!==next.cycleFrom)
        next={...next,cycleFrom:null};
    }
    return next;
  }
});
export function todoDefinitionLine(state){
  // Availability is queried repeatedly by Registry/help. Never parse here or
  // trust a top-level fallback from an incomplete tree for code exclusion.
  if(syntaxTree(state).length<state.doc.length||!syntaxTreeAvailable(state,state.doc.length))return false;
  const line=state.doc.lineAt(state.selection.main.head);
  return line.from>=frontmatterEnd(state)&&/^ {0,3}#\+SEQ_TODO\b/i.test(line.text)&&!excluded(syntaxTree(state),line.from);
}
export function todoContext(state,{headingOnly=false,requireStatus=false}={}){
  if(state.readOnly)return fail('Editor ist schreibgeschützt.');
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return fail('TODO benötigt einen Cursor ohne Textauswahl.');
  if(syntaxTree(state).length<state.doc.length||!syntaxTreeAvailable(state,state.doc.length))return fail('Dokument noch nicht vollständig analysiert.');
  const pos=state.selection.main.head,h=sectionAt(state,pos);if(!h||h.from<frontmatterEnd(state))return fail('Keine aktuelle Aufgabenüberschrift.');
  let node=syntaxTree(state).resolveInner(h.from,1);while(node&&!/^ATXHeading[1-6]$/.test(node.name))node=node.parent;
  if(!node||node.parent?.name!=='Document')return fail('Nur normale H1–H6-Überschriften unterstützt.');
  const line=state.doc.lineAt(h.from);if(headingOnly&&state.doc.lineAt(pos).number!==line.number)return fail('Cursor steht nicht auf der Aufgabenüberschrift.');
  const prefix=/^ {0,3}#{1,6}(?:[ \t]+|$)/.exec(line.text);if(!prefix)return fail('Keine sichere Überschrift.');
  const from=line.from+prefix[0].length,tail=state.doc.sliceString(from,line.to),word=/^([^\s]+)(?=\s|$)/u.exec(tail)?.[1];
  const loaded=state.field(todoRules,false),rules=loaded?.rules??DEFAULT_TODO;
  // While this exact heading is explicitly in the transient empty cycle state,
  // its first title word is still title text even when it spells a loaded state.
  const status=loaded?.cycleFrom===line.from?null:rules.find(r=>r.name===word)??null;
  if(requireStatus&&!status)return fail('Überschrift hat keinen geladenen Aufgabenstatus.');
  return {heading:h,line,from,to:from+(status?.name.length??0),status,rules};
}
export function todoCycleContext(state){
  return todoContext(state,{headingOnly:true});
}
export function planTodo(state,name){
  const c=todoContext(state);if(c.message)return c;if(name!==null&&!c.rules.some(r=>r.name===name))return fail('Unbekannter Aufgabenstatus.');
  if((c.status?.name??null)===name)return {noop:true};
  let {from,to}=c,insert=name??'';
  if(c.status&&name===null){const ws=/^[ \t]+/.exec(state.doc.sliceString(to,c.line.to));to+=ws?.[0].length??0;}
  else if(!c.status&&name!==null){insert+=from<c.line.to?' ':'';if(!/[ \t]$/.test(state.doc.sliceString(c.line.from,from)))insert=' '+insert;}
  const changes=state.changes({from,to,insert});return {spec:{changes,selection:state.selection.map(changes),annotations:isolateHistory.of('full'),userEvent:'input.todo'}};
}
export function createTodoController({view,panel,getContext=()=>({}),notify=()=>{}}){
  const ready=()=>{const c=getContext();return !c.busy&&c.hasDocument!==false&&!view.state.readOnly;};
  function apply(name,saved,cycleFrom=null){if(!ready()||saved&&saved.state!==view.state){notify('TODO verworfen: Ziel geändert.');return false;}const p=planTodo(view.state,name);if(p.noop)return true;if(!p.spec){notify(p.message);return false;}if(cycleFrom!==null)p.spec.effects=setTodoCycle.of(cycleFrom);const expected=p.spec.changes.apply(view.state.doc);view.dispatch(p.spec);return view.state.doc.eq(expected);}
  return {open(){if(!ready())return false;
    if(view.state.field(todoRules,false)?.cycleFrom!=null)view.dispatch({effects:setTodoCycle.of(null)});
    const c=todoContext(view.state);if(c.message){notify(c.message);return false;}
    if(view.state.field(emacsMark,false)?.active)view.dispatch({effects:setEmacsMark.of(false)});
    return panel.openChoices({title:'Aufgabenstatus',label:'Aufgabenstatus',hint:'Buchstabe: Status · Leertaste: kein Status · ↑ ↓ / Alt+↑ ↓ · Enter · Escape/Strg+G',empty:'Keine passenden Zustände.',summary:'Status der aktuellen Überschrift',fastKeys:true,entries:[{id:'',key:' ',text:'[Leertaste] Kein Status'+(!c.status?' · aktuell':'')},...c.rules.map(r=>({id:r.name,key:r.key,text:`[${r.key}] ${r.name} · ${r.closed?'abgeschlossen':'offen'}${c.status===r?' · aktuell':''}`}))],choose:(id,saved)=>apply(id||null,saved)});
  },reload(){if(!ready()||view.state.selection.ranges.length!==1||!view.state.selection.main.empty||!todoDefinitionLine(view.state))return false;const result=readTodoRules(view.state);view.dispatch({effects:reloadTodo.of(result)});notify(result.message??'TODO-Regeln geladen.');return !result.message;},cycle(delta){if(!ready())return false;const c=todoCycleContext(view.state);if(c.message)return false;const sequence=[null,...c.rules.map(r=>r.name)],index=sequence.indexOf(c.status?.name??null),next=sequence[(index+delta+sequence.length)%sequence.length];return apply(next,null,next===null?c.line.from:null);}};
}
function clearTodoCycle(view){if(view.state.field(todoRules,false)?.cycleFrom!=null)view.dispatch({effects:setTodoCycle.of(null)});return false;}
// This tiny non-consuming handler must precede the prefix router, whose abort
// handling intentionally consumes Escape/C-g before ordinary editor handlers.
export function todoCycleAbortCleanup(){return Prec.highest(EditorView.domEventHandlers({keydown(event,view){
  if(!event.isComposing&&event.keyCode!==229&&!event.altKey&&!event.metaKey&&!event.shiftKey&&!event.getModifierState?.('AltGraph')&&
    (event.key==='Escape'&&!event.ctrlKey||event.key.toLowerCase()==='g'&&event.ctrlKey))clearTodoCycle(view);
  return false;
}}));}
export function todoKeyboard(execute,getContext=()=>({})){
  const clear=(_event,view)=>clearTodoCycle(view);
  return [Prec.highest(EditorView.domEventHandlers({keydown(event,view){
    if(event.key==='Escape'||event.ctrlKey&&event.key.toLowerCase()==='g')clear(event,view);
    if(!view.hasFocus||!event.shiftKey||event.ctrlKey||event.altKey||event.metaKey||event.isComposing||event.keyCode===229||event.getModifierState?.('AltGraph')||!['ArrowLeft','ArrowRight'].includes(event.key))return false;
    const c=todoCycleContext(view.state);if(c.message||getContext().busy||getContext().hasDocument===false)return false;event.preventDefault();if(!event.repeat)execute(event.key==='ArrowLeft'?'todo.previous':'todo.next');return true;
  },blur:clear,compositionstart:clear,mousedown:clear})),ViewPlugin.define(view=>{
    const win=view.dom?.ownerDocument?.defaultView,cancel=()=>clear(null,view);win?.addEventListener('blur',cancel);
    return {destroy(){win?.removeEventListener('blur',cancel);}};
  })];
}
export function todoDecorations(state,ranges){const marks=[];for(const range of ranges)syntaxTree(state).iterate({from:range.from,to:range.to,enter(ref){if(!/^ATXHeading[1-6]$/.test(ref.name)||ref.node.parent?.name!=='Document'||ref.from<frontmatterEnd(state))return;const line=state.doc.lineAt(ref.from),loaded=state.field(todoRules,false);if(loaded?.cycleFrom===line.from)return;const m=/^ {0,3}#{1,6}[ \t]+([^\s]+)/u.exec(line.text);if(!m)return;const r=(loaded?.rules??DEFAULT_TODO).find(r=>r.name===m[1]);if(!r)return;const from=line.from+m[0].length-m[1].length;if(marks.some(x=>x.from===from))return;marks.push(Decoration.mark({class:r.closed?'cm-todo-closed':'cm-todo-open',attributes:{title:r.closed?'Aufgabe abgeschlossen':'Aufgabe offen','aria-label':r.closed?'Aufgabe abgeschlossen':'Aufgabe offen'}}).range(from,from+r.name.length));}});return Decoration.set(marks,true);}
export const todoHighlight=ViewPlugin.fromClass(class{constructor(view){this.decorations=todoDecorations(view.state,view.visibleRanges);}update(u){if(u.docChanged||u.viewportChanged||syntaxTree(u.startState)!==syntaxTree(u.state)||u.startState.field(todoRules)!==u.state.field(todoRules))this.decorations=todoDecorations(u.state,u.view.visibleRanges);}},{decorations:v=>v.decorations});

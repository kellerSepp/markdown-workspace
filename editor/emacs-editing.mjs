import {StateEffect,StateField,Prec} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {isolateHistory,selectCharLeft,selectCharRight,selectGroupLeft,selectGroupRight,selectLineUp,selectLineDown,selectLineStart,selectLineEnd,selectDocStart,selectDocEnd,selectPageUp,selectPageDown} from '@codemirror/commands';
import {EMACS_BINDINGS,emacsShortcut} from './emacs-policy.mjs';
import {createKillRing} from './kill-ring.mjs';
import {createClipboardAdapter} from './clipboard-adapter.mjs';

export const setEmacsMark=StateEffect.define();
export const emacsMark=StateField.define({
  create:()=>({active:false,anchor:0}),
  update(value,tr){
    let next={active:tr.docChanged?false:value.active,anchor:tr.changes.mapPos(value.anchor)};
    for(const effect of tr.effects)if(effect.is(setEmacsMark))next={active:effect.value,anchor:tr.state.selection.main.head};
    return next;
  }
});
export function emacsCommandReason(state,id){
  if(state.readOnly)return 'Editor ist schreibgeschützt.';
  if(state.selection.ranges.length!==1)return 'Eine einzelne Auswahl oder Cursorstelle verwenden.';
  if(['copy','cut'].includes(id)&&state.selection.main.empty)return 'Bitte zuerst Text markieren.';
  return '';
}

// Per-workspace controller; policies, clipboard and future chooser are injected.
// Only view state owns selections/history. The ring never stores document handles.
export function createEmacsEditing({ring=createKillRing(),clipboard=createClipboardAdapter(),getContext=()=>({}),notify=()=>{},bindings=EMACS_BINDINGS,openChooser=()=>false}={}){
  let generation=0,request=0,lastYank=null,ownDispatch=0,observedClipboard=null;
  function invalidate({clearRing=false}={}){generation++;request++;lastYank=null;if(clearRing){ring.clear();observedClipboard=null;}}
  function ready(view){const c=getContext();return !c.busy&&c.hasDocument!==false&&!view.state.readOnly;}
  function available(view){return ready(view)&&view.hasFocus!==false;}
  function reason(view,id){return !available(view)?'Editor nicht bereit oder nicht fokussiert.':emacsCommandReason(view.state,id);}
  function dispatch(view,spec){ownDispatch++;try{view.dispatch(spec);}finally{ownDispatch--;}}
  function snapshot(view){const state=view.state,epoch=generation,serial=++request;return ()=>available(view)&&view.state===state&&generation===epoch&&request===serial;}
  function change(view,from,to,text){
    const old=view.state,insert=old.toText(text),head=from+insert.length,expected=old.changes({from,to,insert}).apply(old.doc);
    dispatch(view,{changes:{from,to,insert},selection:{anchor:head},effects:setEmacsMark.of(false),annotations:isolateHistory.of('full'),scrollIntoView:true,userEvent:'input.emacs'});
    // Transaction filters can reject or transform the requested mutation.
    return view.state.doc.eq(expected)&&view.state.selection.main.head===head;
  }
  function mark(view,active){dispatch(view,{selection:{anchor:view.state.selection.main.head},effects:setEmacsMark.of(active),userEvent:'select.emacs'});}
  function endInteraction(view){invalidate();if(view.state.field(emacsMark,false)?.active)dispatch(view,{effects:setEmacsMark.of(false)});return false;}
  async function copy(view,cut){
    const id=cut?'cut':'copy',blocked=reason(view,id);if(blocked){notify(blocked);return false;}
    invalidate();
    const range=view.state.selection.main,text=view.state.doc.sliceString(range.from,range.to),saved=ring.add(text);
    if(!saved.ok){notify(saved.message);return false;}
    if(cut&&!change(view,range.from,range.to,'')){notify('Ausschneiden vom Editor verworfen; Originaltext ist im Ring gesichert.');return false;}
    if(!cut)dispatch(view,{effects:setEmacsMark.of(false)});
    const current=snapshot(view),result=await clipboard.writeText(text,{isCurrent:current});
    if(!current()||result.stale)return true;
    if(result.ok){observedClipboard=text;notify(cut?'Region ausgeschnitten und kopiert.':'Region kopiert.');}
    else notify('Text im internen Kill-Ring gesichert; Windows-Kopie nicht verfügbar.');
    return true;
  }
  async function yank(view,external=false){
    const blocked=reason(view,'yank');if(blocked){notify(blocked);return false;}
    invalidate();const current=snapshot(view),result=await clipboard.readText({isCurrent:current});
    if(!current()||result.stale)return false;
    let entry=ring.current(),fallback=false;
    if(result.ok){
      if(typeof result.value!=='string'||!result.value.isWellFormed()){notify('Clipboard enthält ungültigen Text; Einfügen verworfen.');return false;}
      // Empty is a valid OS result; it must never paste older internal text.
      if(result.value===''){notify('Windows-Clipboard enthält keinen Text; nichts eingefügt.');return false;}
      if(external||result.value!==observedClipboard||!entry){
        const added=ring.add(result.value);if(!added.ok){notify(added.message);return false;}
        entry=added.entry;observedClipboard=result.value;
      }
    }else{
      if(external){notify('Windows-Clipboard nicht lesbar; externes Einfügen abgebrochen.');return false;}
      fallback=true;
    }
    if(!entry){notify('Kill-Ring ist leer; nichts eingefügt.');return false;}
    const from=view.state.selection.main.head;
    if(!change(view,from,from,entry.text)){notify('Einfügen vom Editor verworfen; Ringtext bleibt erhalten.');return false;}
    ring.select(entry.id);lastYank={state:view.state,from,to:view.state.selection.main.head,id:entry.id,generation};
    notify(fallback?'Windows-Clipboard nicht lesbar: aus internem Kill-Ring eingefügt.':'Text eingefügt (Yank).');return true;
  }
  function yankPop(view){
    const blocked=reason(view,'yank-pop');if(blocked){notify(blocked);return false;}
    request++;
    const previous=lastYank;
    if(!previous||previous.state!==view.state||previous.generation!==generation)return showRing(view);
    const next=ring.older(previous.id);if(!next){notify('Kill-Ring ist leer.');return false;}
    if(!change(view,previous.from,previous.to,next.text)){lastYank=null;notify('Austausch vom Editor verworfen; Ring bleibt erhalten.');return false;}
    ring.select(next.id);lastYank={state:view.state,from:previous.from,to:view.state.selection.main.head,id:next.id,generation};
    notify('Älteren Ringtext eingefügt.');return true;
  }
  function showRing(view){
    const blocked=reason(view,'show-ring');if(blocked){notify(blocked);return false;}
    invalidate();
    // Snapshot belongs to the post-deactivation state; focusing the chooser
    // must not immediately make its own target stale through the blur handler.
    if(view.state.field(emacsMark,false)?.active)dispatch(view,{effects:setEmacsMark.of(false)});
    const opened=openChooser(view);if(!opened)notify('Keine Ringauswahl verfügbar.');return opened;
  }
  function insertRingEntry(view,id,target){
    if(!ready(view)||view.state!==target?.state||view.state.selection.ranges.length!==1){notify('Ziel hat sich geändert; Ringauswahl erneut öffnen.');return false;}
    const entry=ring.get(id);if(!entry){notify('Ringtext ist nicht mehr vorhanden.');return false;}
    invalidate();const from=target.head;
    if(!change(view,from,from,entry.text)){notify('Einfügen vom Editor verworfen; Ringtext bleibt erhalten.');return false;}
    ring.select(entry.id);lastYank={state:view.state,from,to:view.state.selection.main.head,id:entry.id,generation};notify('Ringtext eingefügt.');return true;
  }
  function nativeClipboard(event,view){
    if(event.defaultPrevented)return false;
    if(!ready(view)||view.state.selection.ranges.length!==1){
      if(event.type!=='copy'){event.preventDefault();notify('Clipboardänderung: Editor nicht bereit oder mehrere Auswahlen.');return true;}
      return false;
    }
    const range=view.state.selection.main;
    if(event.type==='copy'){
      if(range.empty)return false; // Native line-copy remains CodeMirror behavior.
      invalidate();const text=view.state.doc.sliceString(range.from,range.to),saved=ring.add(text);
      if(view.state.field(emacsMark,false)?.active)dispatch(view,{effects:setEmacsMark.of(false)});
      if(saved.ok)observedClipboard=text;else notify('Windows-Kopie bleibt möglich; '+saved.message);
      return false; // Observe only; CM/browser owns this native copy event.
    }
    if(event.type==='cut'){
      event.preventDefault();invalidate();
      if(range.empty){notify('Keine Auswahl; keine ganze Zeile ausgeschnitten.');return true;}
      const text=view.state.doc.sliceString(range.from,range.to),saved=ring.add(text);
      if(!saved.ok){notify(saved.message);return true;}
      try{
        if(!event.clipboardData?.setData)throw Error('Clipboarddaten fehlen');
        event.clipboardData.setData('text/plain',text);
      }catch{notify('Native Clipboard-Kopie nicht möglich; Ausschneiden abgebrochen, Text im Ring.');return true;}
      observedClipboard=text;
      notify(change(view,range.from,range.to,'')?'Region ausgeschnitten; im Ring gesichert.':'Ausschneiden vom Editor verworfen; Text im Ring gesichert.');return true;
    }
    if(event.type==='paste'){
      event.preventDefault();invalidate();
      if(!event.clipboardData?.getData){notify('Kein lesbarer Klartext im Paste-Ereignis; alternativ explizites Clipboard-Einfügen versuchen.');return true;}
      let text;
      try{text=event.clipboardData.getData('text/plain');}
      catch{notify('Paste-Klartext nicht lesbar; nichts eingefügt.');return true;}
      if(!text){notify('Kein Klartext im Paste-Ereignis; nichts eingefügt.');return true;}
      const allowed=ring.check(text);if(!allowed.ok){notify(allowed.message);return true;}
      if(!change(view,range.from,range.to,text)){notify('Paste vom Editor verworfen; kein Ringimport.');return true;}
      ring.add(text);observedClipboard=text;
      notify('Externen Klartext eingefügt und im Ring gesichert.');return true;
    }
    return false;
  }
  function run(view,id){
    if(id==='copy'||id==='cut')return copy(view,id==='cut');
    if(id==='yank'||id==='paste-external')return yank(view,id==='paste-external');
    if(id==='yank-pop')return yankPop(view);
    if(id==='show-ring')return showRing(view);
    const blocked=reason(view,id);if(blocked){notify(blocked);return false;}
    invalidate();
    if(id==='mark'||id==='cancel-mark'){mark(view,id==='mark');notify(id==='mark'?'Marke aktiv: Cursorbewegung erweitert Auswahl.':'Markierung deaktiviert.');return true;}
    if(id==='clear-ring'){ring.clear();notify('Interner Kill-Ring geleert.');return true;}
    return false;
  }
  function navigation(event,view){
    if(!view.state.field(emacsMark,false)?.active||event.altKey||event.metaKey)return null;
    const ordinary={ArrowLeft:selectCharLeft,ArrowRight:selectCharRight,ArrowUp:selectLineUp,ArrowDown:selectLineDown,Home:selectLineStart,End:selectLineEnd,PageUp:selectPageUp,PageDown:selectPageDown};
    const control={ArrowLeft:selectGroupLeft,ArrowRight:selectGroupRight,Home:selectDocStart,End:selectDocEnd,ArrowUp:selectLineUp,ArrowDown:selectLineDown};
    return (event.ctrlKey?control:ordinary)[event.key]??null;
  }
  function keydown(event,view,execute){
    if(!view.hasFocus||event.isComposing||event.keyCode===229||event.metaKey||event.getModifierState?.('AltGraph'))return false;
    if(event.key==='Escape'&&!event.ctrlKey&&!event.altKey&&!event.shiftKey){
      invalidate();if(view.state.field(emacsMark,false)?.active)mark(view,false);
      return false; // Preserve the existing Escape -> Tab focus escape.
    }
    const id=emacsShortcut(event,bindings);
    if(id){
      // Known shortcuts never fall through into native Cut or competing Redo,
      // even when a repeated key or an unavailable editor refuses the action.
      event.preventDefault();
      if(!event.repeat&&available(view))execute('edit.emacs-'+id);
      return true;
    }
    if(!available(view))return false;
    const move=navigation(event,view);
    if(move){invalidate();move(view);event.preventDefault();return true;}
    if(!['Control','Alt','Shift'].includes(event.key))invalidate();
    return false;
  }
  function extension(execute){return [emacsMark,
    EditorView.updateListener.of(update=>{if(!ownDispatch&&(update.docChanged||update.selectionSet))invalidate();}),
    Prec.highest(EditorView.domEventHandlers({
      keydown:(event,view)=>keydown(event,view,execute),
      copy:nativeClipboard,cut:nativeClipboard,paste:nativeClipboard,
      blur:(_event,view)=>endInteraction(view),
      compositionstart:(_event,view)=>endInteraction(view),
      mousedown:(_event,view)=>{invalidate();if(view.state.field(emacsMark,false)?.active)dispatch(view,{effects:setEmacsMark.of(false)});return false;}
    }))
  ];}
  return {ring,run,keyDown:keydown,extension,invalidate,insertRingEntry,nativeClipboard};
}

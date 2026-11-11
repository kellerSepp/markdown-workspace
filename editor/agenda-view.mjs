import {createPanelShell} from './work-panel.mjs';
import {revealPanelRow} from './panel-layout.mjs';
import {panelMove} from './panel-navigation.mjs';
import {createAgendaSplit} from './agenda-split.mjs';
import {localToday,agendaWeek,moveAgendaWeek,projectAgendaWeek,projectAgendaTodos,agendaStampLabel} from './agenda-model.mjs';

export const AGENDA_CHOICES=Object.freeze([
  {key:'a',id:'agenda.week',label:'Wochenagenda'},
  {key:'t',id:'agenda.todo',label:'Alle TODO-Einträge'},
  {key:'m',label:'Match · geplant',disabled:true},
  {key:'s',label:'Suche · geplant',disabled:true}
].map(Object.freeze));

export function createAgendaView({index,execute,navigate,host,workspace,view,onOpen=()=>{},onClose=()=>{},onActiveChange=()=>{},cancelNavigation=()=>{},now=()=>new Date(),document:doc=globalThis.document,timers=globalThis}){
  const dialog=doc.createElement('dialog');dialog.className='agenda-dialog';dialog.setAttribute('aria-label','Agenda');doc.body.append(dialog);
  const split=createAgendaSplit({host,workspace,view,document:doc});
  const shell=createPanelShell({host:dialog,document:doc}),{root}=shell;root.className='work-panel agenda-panel';
  const toolbar=doc.createElement('div');toolbar.className='agenda-toolbar';
  const makeButton=(text,fn)=>{const b=doc.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;};
  const previous=makeButton('← b',()=>shift(-1)),next=makeButton('f →',()=>shift(1)),current=makeButton('Heute .',()=>goToday());
  const refresh=makeButton('Neu einlesen r',()=>{if(!committing)execute('agenda.refresh');});
  const filter=doc.createElement('label'),includeClosed=doc.createElement('input');includeClosed.type='checkbox';filter.append(includeClosed,doc.createTextNode(' Abgeschlossene einblenden'));
  includeClosed.addEventListener('change',()=>{if(committing){includeClosed.checked=closedBeforeCommit;return;}render();});
  const followButton=makeButton('Follow: aus · Shift+F',()=>toggleFollow());
  followButton.setAttribute('aria-pressed','false');
  toolbar.append(previous,next,current,refresh,followButton,filter);
  const dispatcher=doc.createElement('div');dispatcher.className='agenda-dispatcher';
  for(const choice of AGENDA_CHOICES){const button=makeButton(`[${choice.key}] ${choice.label}`,()=>execute(choice.id));button.disabled=!!choice.disabled;dispatcher.append(button);}
  const hint=doc.createElement('p');hint.className='hint';
  const results=doc.createElement('div');results.className='agenda-results';results.tabIndex=0;results.setAttribute('role','listbox');results.setAttribute('aria-label','Agendaeinträge');
  const notice=doc.createElement('p');notice.className='agenda-notice';notice.setAttribute('role','status');
  const errors=doc.createElement('details'),summary=doc.createElement('summary'),errorList=doc.createElement('ul');summary.textContent='Betroffene Quellen';errors.append(summary,errorList);
  root.append(toolbar,dispatcher,hint,results,notice,errors);
  let mode=null,date=null,snapshot=index.snapshot(),rows=[],selected=0,savedFocus=null,opening=false,disposed=false,committing=false,closedBeforeCommit=false;
  let follow=false,followTimer=null,followVersion=0,pendingFollow=null;
  const commitMessage='Quelldatei wird geöffnet. Bitte kurz warten; Schließen ist während dieses Schritts gesperrt.';
  const disposers=[];
  function listen(el,name,fn){el.addEventListener(name,fn);disposers.push(()=>el.removeEventListener(name,fn));}
  function stopFollow(){if(followTimer!==null)timers.clearTimeout(followTimer);followTimer=null;pendingFollow=null;followVersion++;cancelNavigation();}
  function scheduleFollow(){
    stopFollow();if(!follow||!mode||mode==='dispatch'||!rows[selected])return;
    const version=followVersion,key=rows[selected].entry.key;
    followTimer=timers.setTimeout(()=>{followTimer=null;pendingFollow={key,version};void runFollow();},140);
  }
  async function runFollow(){
    if(opening||committing||!pendingFollow)return;
    const {key,version}=pendingFollow;pendingFollow=null;
    if(!follow||!mode||version!==followVersion||key!==rows[selected]?.entry.key||!dialog.contains(doc.activeElement))return;
    const id=rows[selected].entry.record.id;opening=true;let retry=false;
    try{const success=await navigate(id,{follow:true});retry=!success&&version===followVersion&&key===rows[selected]?.entry.key&&id!==rows[selected]?.entry.record.id;}
    catch(error){if(mode&&version===followVersion)message(error.message??String(error));}
    finally{opening=false;if(retry)scheduleFollow();else if(pendingFollow)void runFollow();}
  }
  function toggleFollow(){
    if(committing||mode==='dispatch')return;
    follow=!follow;followButton.textContent=`Follow: ${follow?'an':'aus'} · Shift+F`;followButton.setAttribute('aria-pressed',String(follow));
    if(follow)scheduleFollow();else stopFollow();
  }
  function select(position,followSelection=false){
    if(!rows.length){results.removeAttribute('aria-activedescendant');return;}
    selected=Math.max(0,Math.min(position,rows.length-1));
    for(let n=0;n<rows.length;n++){rows[n].button.setAttribute('aria-selected',String(n===selected));rows[n].button.classList.toggle('agenda-active',n===selected);}
    results.setAttribute('aria-activedescendant',rows[selected].button.id);revealPanelRow(results,rows[selected].button);
    if(followSelection)scheduleFollow();
  }
  function message(text){notice.textContent=text;}
  async function activate(entry=rows[selected]?.entry){
    if(!entry||opening||committing)return false;stopFollow();opening=true;const activeMode=mode,version=followVersion;
    try{if(await navigate(entry.record.id,{follow:false})&&mode===activeMode&&version===followVersion){close({restore:false});onClose();return true;}return false;}
    catch(error){if(mode===activeMode&&version===followVersion)message(error.message??String(error));return false;}
    finally{opening=false;if(pendingFollow)void runFollow();}
  }
  function row(entry){
    const button=doc.createElement('button');button.type='button';button.className='agenda-row';button.tabIndex=-1;button.setAttribute('role','option');button.id='agenda-entry-'+rows.length;
    const source=doc.createElement('span');source.className='agenda-source';source.textContent=entry.record.path+(entry.record.editor?' · aktuelle Datei': '')+': ';
    const marks=doc.createElement('span');marks.className='agenda-marks';marks.textContent=entry.marks.map(agendaStampLabel).join(' · ')+(entry.marks.length?' · ':'');
    if(entry.marks.some(m=>m.late))marks.classList.add('agenda-late');
    const state=doc.createElement('span');state.className=entry.record.closed===true?'agenda-closed':entry.record.closed===false?'agenda-open':'agenda-appointment';state.textContent=(entry.record.status??'Termin')+' ';
    const title=doc.createElement('span');title.textContent=entry.record.title||'(ohne Titel)';
    button.append(source,marks,state,title);
    if(entry.record.effectiveTags?.length){const tags=doc.createElement('span');tags.className='agenda-tags';tags.textContent=(entry.record.tags?.length?' :'+entry.record.tags.join(':')+':':'')+(entry.record.inheritedTags?.length?' · geerbt: '+entry.record.inheritedTags.join(', '):'');button.append(tags);}
    button.addEventListener('click',()=>{if(committing){message(commitMessage);return;}select(rows.findIndex(r=>r.button===button),follow);if(follow)results.focus();else void activate(entry);});
    results.append(button);rows.push({button,entry});
  }
  function render(){
    if(!mode||disposed)return;
    dialog.setAttribute('data-mode',mode);
    const key=rows[selected]?.entry.key,top=results.scrollTop;rows=[];results.replaceChildren();
    const isDispatch=mode==='dispatch',isWeek=mode==='week';
    current.disabled=refresh.disabled=includeClosed.disabled=followButton.disabled=committing;
    for(let n=0;n<AGENDA_CHOICES.length;n++)dispatcher.children[n].disabled=committing||!!AGENDA_CHOICES[n].disabled;
    dispatcher.hidden=!isDispatch;toolbar.hidden=isDispatch;results.hidden=isDispatch;
    for(const b of [previous,next,current])b.hidden=!isWeek;filter.hidden=mode!=='todo';
    if(isDispatch){shell.show('Agenda');hint.textContent='a: Woche · t: TODO · Escape/q: schließen';}
    else if(isWeek){
      const today=localToday(now()),projected=projectAgendaWeek(index,{date,today});
      shell.show(`Wochenagenda · KW ${String(projected.week).padStart(2,'0')}/${projected.year}`);
      hint.textContent='f/b: Woche · .: heute · ↑ ↓: wählen · Shift+F: Follow · Enter: Editor · r: einlesen · q/Escape: schließen';
      previous.disabled=committing||moveAgendaWeek(projected.monday,-1)===projected.monday;next.disabled=committing||moveAgendaWeek(projected.monday,1)===projected.monday;
      for(const [dayIndex,day] of projected.days.entries()){const h=doc.createElement('h3');h.className='agenda-day';if(dayIndex>=5)h.classList.add('agenda-weekend');if(day.date===today)h.classList.add('agenda-today');h.textContent=day.label;results.append(h);for(const entry of day.entries)row(entry);}
    }else{
      shell.show(includeClosed.checked?'TODO-Liste · alle Zustände':'TODO-Liste · offen');hint.textContent='↑ ↓: wählen · Shift+F: Follow · Enter: Editor · r: einlesen · q/Escape: schließen';
      for(const entry of projectAgendaTodos(index,{includeClosed:includeClosed.checked}))row(entry);
      if(!rows.length){const empty=doc.createElement('p');empty.className='hint';empty.textContent='Keine passenden Aufgaben im gespeicherten Indexstand.';results.append(empty);}
    }
    errorList.replaceChildren();for(const diagnostic of snapshot.diagnostics){const li=doc.createElement('li');li.textContent=`${diagnostic.path}${diagnostic.line?':'+diagnostic.line:''}: ${diagnostic.message}`;errorList.append(li);}
    errors.hidden=!snapshot.diagnostics.length;
    message(`${snapshot.running?'Index wird gelesen. ':''}${snapshot.editorPending?'Editor wird analysiert. ':''}${snapshot.diagnostics.length?'Index unvollständig oder mit Warnungen. ':''}${snapshot.files} Dateien · ${isDispatch?snapshot.records.length:rows.length} Einträge. ${snapshot.editorPath?'Aktuelle Datei: Editorstand, auch ungespeichert. Andere Dateien: gespeicherter Stand.':'Gespeicherter Dateistand; ungespeicherte Änderungen nicht enthalten.'}`);
    if(committing)message(commitMessage);
    results.scrollTop=top;select(Math.max(0,rows.findIndex(r=>r.entry.key===key)));
    if(key!==rows[selected]?.entry.key)scheduleFollow();
  }
  function open(nextMode){
    if(disposed||committing)return false;
    const wasActive=!!mode;
    if(!mode){savedFocus=doc.activeElement;onOpen();}
    stopFollow();follow=false;followButton.textContent='Follow: aus · Shift+F';followButton.setAttribute('aria-pressed','false');
    mode=nextMode;snapshot=index.snapshot();selected=0;
    if(!wasActive)onActiveChange(true);
    if(nextMode==='week')date=agendaWeek(localToday(now())).monday;
    if(nextMode==='todo')includeClosed.checked=false;
    if(dialog.open)dialog.close();
    if(nextMode==='dispatch'){split.setOpen(false);doc.body.append(dialog);}
    else if(host){host.append(dialog);split.setOpen(true);}
    render();if(nextMode==='dispatch')dialog.showModal();else dialog.open=true;
    if(nextMode==='dispatch')dispatcher.children[0]?.focus();else results.focus();return true;
  }
  function close({restore=true,force=false}={}){
    if(!mode)return;if(committing&&!force){message(commitMessage);return false;}mode=null;onActiveChange(false);stopFollow();follow=false;split.setOpen(false);shell.hide();if(dialog.open)dialog.close();rows=[];results.replaceChildren();
    const target=savedFocus;savedFocus=null;
    if(restore){if(target?.isConnected)target.focus({preventScroll:true});onClose();}
  }
  function shift(delta){if(mode!=='week'||committing)return;date=moveAgendaWeek(agendaWeek(date).monday,delta);render();results.focus();}
  function goToday(){if(mode!=='week'||committing)return;date=agendaWeek(localToday(now())).monday;render();results.focus();}
  listen(shell.closeButton,'click',()=>close());
  listen(dialog,'cancel',event=>{event.preventDefault();close();});
  listen(dialog,'focusout',event=>{if(!dialog.contains(event.relatedTarget))stopFollow();});
  listen(dialog,'keydown',event=>{
    if(event.isComposing||event.keyCode===229||event.ctrlKey||event.altKey||event.metaKey||event.getModifierState?.('AltGraph'))return;
    if(event.shiftKey){if(event.key==='F'&&mode!=='dispatch'){event.preventDefault();event.stopPropagation();if(!event.repeat)toggleFollow();}return;}
    const key=event.key.toLowerCase(),move=panelMove(event,{plain:true});
    if(!['Escape','q','r','f','b','.','Enter','ArrowUp','ArrowDown','a','t','m','s'].includes(event.key)&&!['q','r','f','b','a','t','m','s'].includes(key))return;
    if(event.key==='Escape'||key==='q'){event.preventDefault();event.stopPropagation();if(!event.repeat)close();return;}
    if(committing){event.preventDefault();event.stopPropagation();message(commitMessage);return;}
    if(mode==='dispatch'){
      const choice=AGENDA_CHOICES.find(c=>c.key===key);if(choice){event.preventDefault();event.stopPropagation();if(!event.repeat&&!choice.disabled)execute(choice.id);}return;
    }
    if(move){event.preventDefault();event.stopPropagation();select(selected+move,true);results.focus();return;}
    if(event.key==='Enter'){
      // Preserve native activation for toolbar buttons and the filter/summary.
      if(event.target!==results&&!rows.some(r=>r.button===event.target))return;
      event.preventDefault();event.stopPropagation();if(!event.repeat)void activate();return;
    }
    if(key==='r'||mode==='week'&&['f','b','.'].includes(key)){
      event.preventDefault();event.stopPropagation();if(event.repeat)return;
      if(key==='r')execute('agenda.refresh');else if(key==='.')goToday();else shift(key==='f'?1:-1);
    }
  });
  return {openDispatcher:()=>open('dispatch'),openWeek:()=>open('week'),openTodos:()=>open('todo'),close,message,
    update(next){const switched=snapshot.epoch!==next.epoch;snapshot=next;if(switched){close({restore:false,force:true});return;}render();},
    setCommitting(value){if(disposed)return;if(value)closedBeforeCommit=includeClosed.checked;committing=value;render();},
    get active(){return !!mode;},get docked(){return mode==='week'||mode==='todo';},get element(){return dialog;},
    destroy(){if(disposed)return;close({restore:false,force:true});disposed=true;for(const dispose of disposers)dispose();shell.destroy();dialog.remove();split.destroy();}
  };
}

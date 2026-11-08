import {createPanelShell} from './work-panel.mjs';
import {revealPanelRow} from './panel-layout.mjs';
import {inspectVaultPath,completeVaultPath} from './vault-files.mjs';

// The picker owns only presentation and request lifetime. The app owns dirty,
// permission and session guards; the storage adapter owns all file operations.
export function createFilePicker({getContext,execute,onOpen=()=>{},onClose=()=>{},document:doc=globalThis.document}){
  const dialog=doc.createElement('dialog');dialog.className='file-dialog';dialog.setAttribute('aria-label','Datei öffnen/anlegen');doc.body.append(dialog);
  const shell=createPanelShell({host:dialog,document:doc}),{root}=shell;root.className='work-panel file-panel';
  const label=doc.createElement('label');label.textContent='Pfad relativ zum Vault';
  const input=doc.createElement('input');input.type='text';input.spellcheck=false;input.setAttribute('aria-label','Markdown-Pfad im Vault');input.setAttribute('autocomplete','off');label.append(input);
  const hint=doc.createElement('p');hint.className='hint';hint.textContent='Tab: vervollständigen · ↑ ↓: Kandidaten · Enter: wählen/ausführen · Escape/Strg+G: schließen · vorhandene Ordner, nur Markdown';
  const results=doc.createElement('div');results.className='file-results';results.id='file-candidates';results.setAttribute('role','listbox');results.setAttribute('aria-label','Passende Pfade');
  input.setAttribute('role','combobox');input.setAttribute('aria-controls',results.id);input.setAttribute('aria-autocomplete','list');
  const target=doc.createElement('p');target.className='file-target';target.setAttribute('role','status');
  const submitButton=doc.createElement('button');submitButton.type='button';submitButton.textContent='Öffnen';
  const message=doc.createElement('p');message.className='hint';message.setAttribute('role','status');
  root.append(label,hint,results,target,submitButton,message);
  let active=false,disposed=false,serial=0,vault=null,originDoc=null,committing=false,executing=false,irreversible=false,preview=null,rows=[],selected=-1;
  const disposers=[];
  function listen(element,name,handler){element.addEventListener(name,handler);disposers.push(()=>element.removeEventListener(name,handler));}
  function current(token){const context=getContext();return active&&!disposed&&serial===token&&context.vault===vault&&(irreversible||context.doc===originDoc);}
  function clearRows(){rows=[];selected=-1;results.replaceChildren();input.removeAttribute('aria-activedescendant');input.setAttribute('aria-expanded','false');}
  function lock(value){committing=value;if(value)irreversible=true;input.disabled=submitButton.disabled=value;shell.closeButton.disabled=value;
    for(const row of rows)row.button.disabled=value;
    if(value)message.textContent='Datei wird geöffnet/angelegt. Bitte warten; Schließen ist während dieses Schritts gesperrt.';
    else submitButton.disabled=!preview||!['file','missing'].includes(preview.kind);
  }
  function choose(position){if(!rows.length)return;selected=Math.max(0,Math.min(position,rows.length-1));rows.forEach((row,n)=>row.button.setAttribute('aria-selected',String(n===selected)));input.setAttribute('aria-activedescendant',rows[selected].button.id);revealPanelRow(results,rows[selected].button);}
  async function inspect(token=++serial){
    preview=null;target.textContent='Pfad wird geprüft …';submitButton.disabled=true;
    try{const result=await inspectVaultPath(vault,input.value,{current:()=>current(token)});if(!result||!current(token))return false;preview=result;
      if(result.kind==='directory'){target.textContent=`Ordner: ${result.path||'/'} · Dateinamen ergänzen`;submitButton.textContent='Dateinamen angeben';}
      else{submitButton.textContent=result.kind==='file'?'Öffnen':'Neue Datei anlegen';target.textContent=`${submitButton.textContent}: ${result.path}`;}
      submitButton.disabled=result.kind==='directory';return true;
    }catch(error){if(current(token)){target.textContent=error.message;submitButton.disabled=true;}return false;}
  }
  function takeCandidate(entry){if(committing||executing)return;input.value=entry.path;clearRows();message.textContent='';void inspect();input.focus();}
  async function complete(){
    if(committing||executing)return false;const token=++serial;preview=null;submitButton.disabled=true;message.textContent='Passende Pfade werden gelesen …';
    try{const result=await completeVaultPath(vault,input.value,{current:()=>current(token)});if(!result||!current(token))return false;
      input.value=result.value;clearRows();message.textContent=result.message||`${result.candidates.length} passende Pfade`;
      for(const entry of result.candidates){const button=doc.createElement('button');button.type='button';button.tabIndex=-1;button.className='file-row';button.id='file-candidate-'+rows.length;button.setAttribute('role','option');button.textContent=entry.path;button.addEventListener('click',()=>takeCandidate(entry));rows.push({button,entry});results.append(button);}
      input.setAttribute('aria-expanded',String(rows.length>0));await inspect(token);return true;
    }catch(error){if(current(token)){target.textContent='Pfadprüfung erforderlich.';message.textContent=error.message;submitButton.disabled=true;}return false;}
  }
  async function submit(){
    if(committing||executing||!active)return false;
    if(!preview||submitButton.disabled){await inspect();return false;}
    const token=++serial,path=input.value;executing=true;input.disabled=true;submitButton.disabled=true;clearRows();message.textContent='';
    try{const result=await execute(path,{current:()=>current(token),onCommit:lock});
      if(current(token)&&result?.opened&&!result.stale){close({restore:false});onClose();return true;}
      if(current(token)&&result?.message)message.textContent=result.message;return false;
    }catch(error){if(current(token))message.textContent=error.message??String(error);return false;}
    finally{executing=false;if(active){lock(false);irreversible=false;originDoc=getContext().doc;await inspect();}}
  }
  function open(){
    const context=getContext();if(disposed||committing||executing||context.busy||!context.vault||!context.accepted)return false;
    if(active){input.focus();return true;}onOpen();active=true;vault=context.vault;originDoc=getContext().doc;irreversible=false;serial++;preview=null;clearRows();message.textContent='';
    input.value=context.path?.includes('/')?context.path.slice(0,context.path.lastIndexOf('/')+1):'';
    shell.show('Datei öffnen/anlegen · C-c f');dialog.showModal();input.focus();void inspect();return true;
  }
  function close({restore=true,force=false}={}){
    if(!active)return true;if(committing&&!force){message.textContent='Datei wird geöffnet/angelegt. Bitte bis zum Ende warten.';return false;}
    active=false;serial++;preview=null;clearRows();shell.hide();if(dialog.open)dialog.close();if(restore)onClose();return true;
  }
  listen(input,'input',()=>{if(committing||executing)return;clearRows();message.textContent='';void inspect();});
  listen(submitButton,'click',()=>{void submit();});listen(shell.closeButton,'click',()=>close());
  listen(dialog,'cancel',event=>{event.preventDefault();close();});
  listen(dialog,'keydown',event=>{
    if(event.isComposing||event.keyCode===229||event.metaKey||event.getModifierState?.('AltGraph'))return;
    const key=event.key.toLowerCase();
    if(event.key==='Escape'&&!event.ctrlKey&&!event.altKey&&!event.shiftKey||key==='g'&&event.ctrlKey&&!event.altKey&&!event.shiftKey){event.preventDefault();event.stopPropagation();if(!event.repeat)close();return;}
    if(event.ctrlKey||event.altKey||event.shiftKey)return;
    if(committing){if(['Enter','Tab','ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();event.stopPropagation();}return;}
    if(event.key==='Tab'&&event.target===input){event.preventDefault();if(!event.repeat)void complete();return;}
    if(['ArrowDown','ArrowUp'].includes(event.key)&&event.target===input&&rows.length){event.preventDefault();choose(selected+(event.key==='ArrowDown'?1:-1));return;}
    if(event.key==='Enter'&&event.target===input){event.preventDefault();if(event.repeat)return;if(selected>=0)takeCandidate(rows[selected].entry);else void submit();}
  });
  return {open,close,complete,submit,get active(){return active;},get element(){return dialog;},
    invalidate(){const context=getContext();if(active&&(context.vault!==vault||!irreversible&&context.doc!==originDoc))close({restore:false,force:true});},
    destroy(){if(disposed)return;close({restore:false,force:true});disposed=true;for(const dispose of disposers)dispose();shell.destroy();dialog.remove();}
  };
}

// Local modal only: app owns persistence and all file mutations.
export function archiveDialog({settings,openTasks=0,title='Archivieren',document:doc=globalThis.document}){
  return new Promise(resolve=>{
    const dialog=doc.createElement('dialog');dialog.className='file-dialog';
    const heading=doc.createElement('h2');heading.textContent=title;
    const label=doc.createElement('label');label.textContent='Archivdatei relativ zum Vault ';
    const input=doc.createElement('input');input.value=settings.defaultPath||'archiv.md';input.setAttribute('list','archive-targets');
    const list=doc.createElement('datalist');list.id='archive-targets';for(const path of settings.paths||[]){const o=doc.createElement('option');o.value=path;list.append(o);}label.append(input,list);
    const standard=doc.createElement('input');standard.type='checkbox';standard.checked=true;
    const standardLabel=doc.createElement('label');standardLabel.append(standard,doc.createTextNode(' Als Standardarchiv verwenden'));
    const quick=doc.createElement('input');quick.type='checkbox';quick.checked=settings.quickConfirm!==false;
    const quickLabel=doc.createElement('label');quickLabel.append(quick,doc.createTextNode(' Offene Aufgaben mit y/n bestätigen'));
    const info=doc.createElement('p');info.textContent=`Speichert auch ungespeicherte Änderungen der Quelldatei. ${openTasks} offene Aufgabe(n) im Unterbaum. Nach Archivierung beginnt die Editor-History neu; Wiederherstellung über eigenen Befehl.`;
    const yes=doc.createElement('button');yes.textContent=openTasks?'Trotzdem archivieren':'Archivieren';
    const no=doc.createElement('button');no.textContent='Abbrechen';
    let confirming=false;
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    const confirm=()=>finish({path:input.value,standard:standard.checked,quickConfirm:quick.checked});
    yes.onclick=()=>{if(openTasks&&quick.checked&&!confirming){confirming=true;info.textContent=`${openTasks} offene Aufgabe(n): Trotzdem archivieren? y = ja · n = abbrechen`;yes.textContent='Ja (y)';yes.focus();}else confirm();};
    no.onclick=()=>finish(null);
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
    dialog.addEventListener('keydown',event=>{if(event.isComposing||event.ctrlKey||event.altKey||event.metaKey)return;if(confirming&&['y','n'].includes(event.key.toLowerCase())){event.preventDefault();event.stopPropagation();event.key.toLowerCase()==='y'?confirm():finish(null);}});
    dialog.append(heading,label,standardLabel,quickLabel,info,yes,no);doc.body.append(dialog);dialog.showModal();input.focus();
  });
}

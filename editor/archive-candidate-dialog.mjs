export function archiveCandidateDialog({title,original,index,total,archived=0,document:doc=globalThis.document}){
  return new Promise(resolve=>{
    const dialog=doc.createElement('dialog');dialog.className='file-dialog archive-candidate-dialog';
    const heading=doc.createElement('h2');heading.textContent=`Sammelarchivierung ${index}/${total}`;
    const candidate=doc.createElement('p');candidate.textContent=title;
    const preview=doc.createElement('pre');preview.textContent=original;preview.setAttribute('aria-label','Aktueller vollständiger Unterbaum');preview.setAttribute('style','max-height:35vh;overflow:auto;white-space:pre-wrap');
    const hint=doc.createElement('p');hint.textContent=`y = diesen Unterbaum archivieren · n = unverändert weiter · Escape = Rest abbrechen. Bereits archiviert: ${archived}.`;
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    const yes=doc.createElement('button'),no=doc.createElement('button'),cancel=doc.createElement('button');
    yes.textContent='Archivieren (y)';no.textContent='Überspringen (n)';cancel.textContent='Rest abbrechen';
    yes.onclick=()=>finish('y');no.onclick=()=>finish('n');cancel.onclick=()=>finish(null);
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
    dialog.addEventListener('keydown',event=>{
      const key=event.key.toLowerCase();
      if(event.repeat&&['enter',' ','y','n'].includes(key)){event.preventDefault();event.stopPropagation();return;}
      if(event.isComposing||event.keyCode===229||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)return;
      if(key==='y'||key==='n'){event.preventDefault();event.stopPropagation();finish(key);}
    });
    dialog.append(heading,candidate,preview,hint,yes,no,cancel);doc.body.append(dialog);dialog.showModal();yes.focus();
  });
}

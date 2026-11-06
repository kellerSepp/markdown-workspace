// Isolated AP-01 probe: no editor imports, persistence, or automatic clipboard access.
export const PROBE_TEXT='CC-PROBE-2026';
export const PROBE_SHORTCUTS=Object.freeze(['C-c','C-SPC','M-w','C-x','C-y','M-y','C-g','Escape','C-Shift-z']);
export function shortcutReport(stats){
  return PROBE_SHORTCUTS.map(key=>{
    const s=stats[key]??{arrived:0,prevented:0};
    return `${key}: ${s.arrived?'angekommen '+s.arrived:'noch nicht angekommen/getestet'} | verhindert ${s.prevented}`;
  }).join('\n');
}
export function probeShortcut(event) {
  if(event.isComposing||event.keyCode===229||event.metaKey||event.getModifierState?.('AltGraph'))return null;
  const key=event.key.toLowerCase();
  if(event.ctrlKey&&!event.altKey){
    if(event.shiftKey)return key==='z'?'C-Shift-z':null;
    if(key===' '||key==='spacebar')return 'C-SPC';
    if(['c','x','y','g'].includes(key))return 'C-'+key;
  }
  if(event.altKey&&!event.ctrlKey&&!event.shiftKey&&['w','y'].includes(key))return 'M-'+key;
  if(!event.ctrlKey&&!event.altKey&&!event.shiftKey&&key==='escape')return 'Escape';
  return null;
}

if(typeof document!=='undefined'){
  const byId=id=>document.getElementById(id),surface=byId('probe'),outside=byId('outside');
  const counters={keydown:0,handled:0,cancelled:0,copyProbe:0,cutProbe:0,pasteProbe:0,copyOutside:0,cutOutside:0,pasteOutside:0};
  const shortcutStats=Object.fromEntries(PROBE_SHORTCUTS.map(key=>[key,{arrived:0,prevented:0}]));
  const clipboardResults={write:'nicht geprüft',read:'nicht geprüft'};
  const lines=[];
  function render(){
    const counts=Object.entries(counters).map(([k,v])=>`${k}: ${v}`).join(' | ');
    const shortcuts=shortcutReport(shortcutStats);
    byId('counts').textContent=counts;
    byId('shortcuts').textContent=shortcuts;
    byId('events').textContent=lines.join('\n');
    byId('report').value=['AP-01 native Edge-Probe – Bericht','Nur Testseite; noch kein Mark-/Kill-Ring-Produktverhalten.',
      'Native Zustellung (isTrusted=true):',shortcuts,'',
      `copy Testfläche: ${counters.copyProbe}; cut: ${counters.cutProbe}; paste: ${counters.pasteProbe}`,
      `copy Vergleichsfläche: ${counters.copyOutside}; cut: ${counters.cutOutside}; paste: ${counters.pasteOutside}`,
      `Clipboard schreiben: ${clipboardResults.write}`,`Clipboard lesen/vergleichen: ${clipboardResults.read}`,
      '','Sichtbare Browser-/OS-Reaktionen: vom Tester im Chat ergänzen.',
      'AltGr/IME und nicht getestete Punkte: vom Tester im Chat ergänzen.'
    ].join('\n');
  }
  function log(message){lines.unshift(message);lines.length=Math.min(lines.length,24);render();}
  surface.addEventListener('keydown',event=>{
    counters.keydown++;
    const shortcut=probeShortcut(event);
    if(shortcut){counters.handled++;event.preventDefault();if(event.defaultPrevented)counters.cancelled++;}
    if(shortcut&&event.isTrusted){shortcutStats[shortcut].arrived++;if(event.defaultPrevented)shortcutStats[shortcut].prevented++;}
    // Ordinary typed text and clipboard payloads are never logged.
    if(shortcut||event.ctrlKey||event.altKey||event.isComposing){
      const name=shortcut??(event.isComposing?'IME':'unhandled modifier');
      log(`keydown ${name} | code=${event.code} | native=${event.isTrusted} | repeat=${event.repeat} | cancelable=${event.cancelable} | prevented=${event.defaultPrevented}`);
    }else render();
  });
  surface.addEventListener('keyup',event=>{
    const shortcut=probeShortcut(event);
    if(shortcut)log(`keyup ${shortcut} | code=${event.code}`);
  });
  for(const type of ['copy','cut','paste'])document.addEventListener(type,event=>{
    if(event.target!==surface&&event.target!==outside)return;
    const where=event.target===surface?'Probe':'Outside';
    if(event.isTrusted)counters[type+where]++;
    log(`${type} ${where} | trusted=${event.isTrusted} | prevented=${event.defaultPrevented} | payload hidden`);
  });
  byId('clear').addEventListener('click',()=>{
    for(const key of Object.keys(counters))counters[key]=0;
    for(const stats of Object.values(shortcutStats)){stats.arrived=0;stats.prevented=0;}
    lines.length=0;clipboardResults.write='nicht geprüft';clipboardResults.read='nicht geprüft';
    render();byId('status').textContent='Zähler zurückgesetzt. Text und Clipboard unverändert.';
  });
  byId('write').addEventListener('click',async()=>{
    const status=byId('status');
    try{
      if(!navigator.clipboard?.writeText)throw new Error('APIUnavailable');
      await navigator.clipboard.writeText(PROBE_TEXT);
      clipboardResults.write='erfolgreich (fester Testtext)';
      status.textContent='Windows-Clipboard: synthetischer Testtext CC-PROBE-2026 geschrieben.';
    }catch(error){clipboardResults.write='fehlgeschlagen: '+(error.name||'Error');status.textContent='Clipboard-Schreiben nicht möglich: '+(error.name||'Error')+'. Keine Rechte automatisch ändern.';}
    render();
  });
  byId('read').addEventListener('click',async()=>{
    const status=byId('status');
    try{
      if(!navigator.clipboard?.readText)throw new Error('APIUnavailable');
      const value=await navigator.clipboard.readText();
      clipboardResults.read=value===PROBE_TEXT?'erfolgreich, Testtext stimmt überein':'erfolgreich, anderer Inhalt (nicht ausgegeben/gespeichert)';
      status.textContent=value===PROBE_TEXT?'Clipboard-Vergleich: Testtext stimmt überein.':'Clipboard-Vergleich: anderer Inhalt; Inhalt wird weder angezeigt noch gespeichert.';
    }catch(error){clipboardResults.read='fehlgeschlagen: '+(error.name||'Error');status.textContent='Clipboard-Lesen nicht möglich: '+(error.name||'Error')+'. Keine Rechte automatisch ändern.';}
    render();
  });
  render();
}

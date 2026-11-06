import {readFile,writeFile} from 'node:fs/promises';
const base=(await readFile(new URL('./qa-prefix-run.mjs',import.meta.url),'utf8')).split('const f=integrated();\nfor(let i=0;i<120;i++)')[0];
await writeFile(new URL('./qa-prefix-focused.mjs',import.meta.url),base+String.raw`
let focused=0;
for(const which of ['row','close'])for(const forcedBlur of [false,true]){
 const f=integrated();f.start();const row=f.results.children[2],target=which==='row'?row:f.close;
 const down=f.root.emit('mousedown',{target});assert.equal(down.defaultPrevented,true);focused++;
 // Browser default focus transfer is skipped when mousedown is prevented.
 // Also exercise a real blur delivered despite this guard (window/focus loss).
 if(!down.defaultPrevented||forcedBlur){f.view.hasFocus=false;const extState=EditorState.create({extensions:f.router.extension()});const handlers=extState.facet(pluginFacet).find(p=>p.plugin.domEventHandlers)?.plugin.domEventHandlers;handlers.blur({},f.view);}
 target.click();assert.equal(f.calls.length,which==='row'&&!forcedBlur?1:0);assert.equal(f.router.active,false);assert.equal(f.panel.isOpen,false);focused+=3;
 target.click();f.panel.close();f.router.cancel();assert.equal(f.calls.length,which==='row'&&!forcedBlur?1:0);focused++;
 f.panel.destroy();
}
{
 const f=integrated();f.ring.add('RING');f.start();f.panel.openRing();assert.equal(f.router.active,false);assert.equal(f.panel.isOpen,true);assert.equal(f.search.hidden,false);focused+=3;
 f.view.hasFocus=true;f.start();assert.equal(f.router.active,true);assert.equal(f.search.hidden,true);assert.equal(f.results.children.length,3);focused+=3;
 f.panel.close();assert.equal(f.router.active,false);assert.equal(f.panel.isOpen,false);assert.equal(f.results.children.length,0);focused+=3;
 f.panel.destroy();
}
{
 const f=integrated();f.ring.add('RING');f.start();const old=[...f.results.children];f.panel.refresh();
 console.log(JSON.stringify({refreshWhilePrefix:{routerActive:f.router.active,searchHidden:f.search.hidden,rows:f.results.children.map(x=>x.textContent),prefixAttribute:f.root.attributes['data-prefix-help'],oldListeners:old.map(x=>x.listeners.click.length)}}));
 assert.equal(f.router.active,true);assert.equal(f.search.hidden,true);assert.match(f.results.children[0].textContent,/RING/);focused+=3;
 f.router.cancel();f.panel.destroy();
}
console.log(JSON.stringify({checks,focusedChecks:focused}));
`);


// Synthetic browser fixture. Build with node scripts/tag-layout-probe.mjs,
// then open build/tag-layout-probe.html in the browser.
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const source=`
import {EditorView,lineNumbers} from '@codemirror/view';
import {EditorState,Compartment} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {history,defaultKeymap,historyKeymap} from '@codemirror/commands';
import {keymap} from '@codemirror/view';
import {tagHighlight} from './editor/tag-highlight.mjs';
import {editorTheme} from './editor/theme-editor.mjs';
import {THEMES,applyTheme} from './editor/themes.mjs';
import {visualStructure} from './editor/visual-structure.mjs';
const palette=new Compartment(),wrap=new Compartment();
applyTheme(document.documentElement,'midnight');
const sample=Array.from({length:6},(_,i)=>'#'.repeat(i+1)+' Title'+(i+1)+' :WORK:HOME: ##').join('\\n');
const view=new EditorView({parent:document.querySelector('#editor'),state:EditorState.create({doc:sample,extensions:[
markdown(),history(),keymap.of([...defaultKeymap,...historyKeymap]),lineNumbers(),tagHighlight,
palette.of(editorTheme(THEMES[0])),wrap.of(EditorView.lineWrapping),visualStructure({headingIndent:true})]})});
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(requestAnimationFrame);};
const report=document.querySelector('#report');
function inspect(label){
 const failures=[];
 const rows=Array.from(view.contentDOM.querySelectorAll('.cm-line')).map((line,i)=>{
  const tag=line.querySelector('.cm-heading-tags'),gap=line.querySelector('.cm-heading-tag-gap');
  if(!tag||!gap){failures.push('missing tag/gap '+i);return {};}
  const range=document.createRange();range.setStart(line,0);range.setEndBefore(gap);
  const rects=Array.from(range.getClientRects()).filter(r=>r.width>0),title=rects.at(-1);
  const box=tag.getBoundingClientRect(),lineBox=line.getBoundingClientRect();
  const right=lineBox.right-parseFloat(getComputedStyle(line).paddingRight);
  if(Math.abs(box.top-title.top)>3)failures.push('H'+(i+1)+' wraps');
  if(Math.abs(box.right-right)>3)failures.push('H'+(i+1)+' right offset '+(box.right-right).toFixed(2));
  return {h:i+1,titleRight:title.right,titleTop:title.top,tagTop:box.top,tagRight:box.right,right,gap:gap.getBoundingClientRect().width,padding:getComputedStyle(line).paddingRight};
 });
 report.textContent+=(failures.length?'FAIL ':'PASS ')+label+' '+failures.join('; ')+'\\n'+JSON.stringify(rows)+'\\n';
 return failures.length;
}
async function run(){
 report.textContent='';let failures=0;
 for(const width of [1000,700,420])for(const theme of THEMES){
  document.querySelector('#editorWorkspace').style.width=width+'px';
  applyTheme(document.documentElement,theme.id);view.dispatch({effects:palette.reconfigure(editorTheme(theme))});
  await settle();failures+=inspect(width+' / '+theme.id);
 }
 document.querySelector('#editorWorkspace').style.width='700px';
 applyTheme(document.documentElement,'midnight');view.dispatch({effects:palette.reconfigure(editorTheme(THEMES[0]))});
 for(const char of ' more words'){
  const line=view.state.doc.line(1),pos=line.text.indexOf(' :WORK:');
  view.dispatch({changes:{from:pos,insert:char},selection:{anchor:pos+1}});await settle();failures+=inspect('typing '+JSON.stringify(char));
 }
 report.textContent='TOTAL '+(failures?'FAIL '+failures:'PASS')+'\\n'+report.textContent;
}
document.querySelector('#run').onclick=run;
document.querySelector('#narrow').onclick=async()=>{document.querySelector('#editorWorkspace').style.width='420px';await settle();inspect('manual narrow');};
run();
`;
const bundled=await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'tag-layout-probe-entry.mjs'},bundle:true,format:'iife',write:false});
const css=await readFile(new URL('../editor/styles.css',import.meta.url),'utf8');
const html='<!doctype html><meta charset="utf-8"><title>Synthetic Tag Layout Probe</title><style>'+css+'\n#editorWorkspace{width:700px;height:260px;min-height:260px} #report{white-space:pre-wrap;font:12px monospace} body{margin:15px}</style><h1>Synthetic Tag Layout Probe</h1><button id="run">Run matrix</button> <button id="narrow">Narrow</button><div id="editorWorkspace"><div id="editor"></div></div><pre id="report"></pre><script>'+bundled.outputFiles[0].text+'</script>';
await mkdir(new URL('../build/',import.meta.url),{recursive:true});
await writeFile(new URL('../build/tag-layout-probe.html',import.meta.url),html);
console.log('Built build/tag-layout-probe.html');

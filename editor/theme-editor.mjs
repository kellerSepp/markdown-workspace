// CodeMirror adapter; palette definitions remain plain data in themes.mjs.
import {EditorView} from '@codemirror/view';
import {HighlightStyle, syntaxHighlighting} from '@codemirror/language';
import {tags} from '@lezer/highlight';
const highlight = syntaxHighlighting(HighlightStyle.define([
  ...[tags.heading1,tags.heading2,tags.heading3,tags.heading4,tags.heading5,tags.heading6].map((tag,n)=>({tag,color:`var(--syntax-heading${n+1})`,fontWeight:n<2?'600':n<4?'550':'500'})),
  {tag:tags.heading,color:'var(--syntax-heading)',fontWeight:'550'},
  {tag:[tags.link,tags.url],color:'var(--syntax-link)',textDecoration:'underline'},
  {tag:tags.emphasis,fontStyle:'italic'}, {tag:tags.strong,fontWeight:'bold'},
  {tag:tags.strikethrough,textDecoration:'line-through'},
  {tag:[tags.keyword,tags.typeName],color:'var(--syntax-keyword)'},
  {tag:[tags.string,tags.literal,tags.inserted],color:'var(--syntax-string)'},
  {tag:[tags.number,tags.bool,tags.atom],color:'var(--syntax-number)'},
  {tag:tags.comment,color:'var(--syntax-comment)'},
  {tag:[tags.meta,tags.contentSeparator],color:'var(--syntax-meta)'},
  {tag:[tags.processingInstruction,tags.escape],color:'var(--syntax-marker)'},
  {tag:tags.quote,color:'var(--syntax-quote)'},
  // Keep code backgrounds transparent so the drawn selection stays visible.
  {tag:tags.monospace,color:'var(--syntax-code)',fontFamily:'var(--font-editor)'}
]));
function createEditorTheme(dark) {
  return [EditorView.theme({
    '&':{color:'var(--text)',backgroundColor:'var(--surface)'},
    '&.cm-focused':{outline:'2px solid var(--focus)'},
    '.cm-content':{caretColor:'var(--cursor)'},
    '.cm-content .cm-todo-open':{color:'var(--todo-open)',fontWeight:'bold',textDecoration:'underline',textDecorationStyle:'dotted'},
    '.cm-content .cm-todo-closed':{color:'var(--todo-closed)',fontWeight:'bold',textDecoration:'line-through'},
    // Syntax highlighting may be nested INSIDE the task mark. Its explicit
    // heading/inline color otherwise wins over the outer mark's inherited color.
    // Limit this override to status descendants so the title keeps its H1–H6 color.
    '.cm-content .cm-todo-open *':{color:'var(--todo-open)'},
    '.cm-content .cm-todo-closed *':{color:'var(--todo-closed)'},
    '.cm-content .cm-checklist-marker':{cursor:'pointer',borderRadius:'2px',fontWeight:'bold'},
    '.cm-content .cm-checklist-open, .cm-content .cm-checklist-open *':{color:'var(--todo-open)'},
    '.cm-content .cm-checklist-done, .cm-content .cm-checklist-done *':{color:'var(--todo-closed)'},
    '.cm-content .cm-checklist-partial, .cm-content .cm-checklist-partial *':{color:'var(--accent)'},
    '.cm-content .cm-checklist-marker:focus':{outline:'2px solid var(--focus)',outlineOffset:'2px'},
    '.cm-content .cm-planning-keyword':{color:'var(--planning-keyword)',fontWeight:'600'},
    '.cm-content .cm-planning-keyword *':{color:'var(--planning-keyword)'},
    '.cm-content .cm-planning-timestamp':{color:'var(--planning-timestamp)',textDecoration:'underline',textUnderlineOffset:'2px'},
    '.cm-content .cm-planning-timestamp *':{color:'var(--planning-timestamp)'},
    '.cm-cursor, .cm-dropCursor':{borderLeftColor:'var(--cursor)'},
    '.cm-gutters':{backgroundColor:'var(--control)',color:'var(--muted)',borderRight:'1px solid var(--border)'},
    '.cm-structureGutter .cm-gutterElement':{color:'var(--muted)',fontSize:'0.85em',padding:'0 4px',maxWidth:'12ch',overflow:'hidden',textOverflow:'ellipsis'},
    ...Object.fromEntries(Array.from({length:6},(_,n)=>['.cm-heading-indent.cm-heading-level'+(n+1),{paddingLeft:`calc(6px + ${n} * var(--heading-indent-step))`}])),
    '.cm-codeBlock':{position:'relative',borderLeft:'2px solid var(--border)'},
    // The selection layer is z=-1. A non-stacking line's background stays below it.
    '.cm-codeBlock::before':{content:'""',position:'absolute',inset:'0',backgroundColor:'var(--code-background)',zIndex:'-2',pointerEvents:'none'},
    '.cm-foldGutter .cm-gutterElement':{color:'var(--accent)',cursor:'pointer',padding:'0 4px'},
    '.cm-foldPlaceholder':{color:'var(--text)',backgroundColor:'var(--control)',border:'1px solid var(--border)',borderRadius:'2px',padding:'0 4px',cursor:'pointer'},
    // Match CodeMirror's focused selection specificity so its dark/light defaults cannot win.
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':{backgroundColor:'var(--selection)'},
    '.cm-content ::selection':{backgroundColor:'var(--selection)',color:'var(--selection-text)'},
    '.cm-tooltip':{color:'var(--text)',backgroundColor:'var(--control)',border:'1px solid var(--border)'},
    '.cm-panels':{color:'var(--text)',backgroundColor:'var(--control)'}
  },{dark}),highlight];
}
// Only two static style modules; switching palettes changes variables, not generated CSS.
const variants = {dark:createEditorTheme(true),light:createEditorTheme(false)};
export function editorTheme(theme) { return variants[theme.scheme]; }

// CodeMirror adapter; palette definitions remain plain data in themes.mjs.
import {EditorView} from '@codemirror/view';
import {HighlightStyle, syntaxHighlighting} from '@codemirror/language';
import {tags} from '@lezer/highlight';
const highlight = syntaxHighlighting(HighlightStyle.define([
  {tag:tags.heading,color:'var(--syntax-heading)',fontWeight:'bold'},
  {tag:[tags.link,tags.url],color:'var(--syntax-link)',textDecoration:'underline'},
  {tag:tags.emphasis,fontStyle:'italic'}, {tag:tags.strong,fontWeight:'bold'},
  {tag:tags.strikethrough,textDecoration:'line-through'},
  {tag:[tags.keyword,tags.typeName],color:'var(--syntax-keyword)'},
  {tag:[tags.string,tags.literal,tags.inserted],color:'var(--syntax-string)'},
  {tag:[tags.number,tags.bool,tags.atom],color:'var(--syntax-number)'},
  {tag:tags.comment,color:'var(--syntax-comment)'},
  {tag:[tags.meta,tags.processingInstruction,tags.contentSeparator],color:'var(--syntax-meta)'},
  // Keep code backgrounds transparent so the drawn selection stays visible.
  {tag:tags.monospace,color:'var(--text)',fontFamily:'var(--font-editor)'}
]));
function createEditorTheme(dark) {
  return [EditorView.theme({
    '&':{color:'var(--text)',backgroundColor:'var(--surface)'},
    '&.cm-focused':{outline:'2px solid var(--focus)'},
    '.cm-content':{caretColor:'var(--cursor)'},
    '.cm-cursor, .cm-dropCursor':{borderLeftColor:'var(--cursor)'},
    '.cm-gutters':{backgroundColor:'var(--control)',color:'var(--muted)',borderRight:'1px solid var(--border)'},
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

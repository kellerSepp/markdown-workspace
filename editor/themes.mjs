// Data only: no editor APIs, file handles, CSS rules, URLs or executable theme content.
export const DEFAULT_THEME = 'midnight';
export const THEME_STORAGE_KEY = 'markdown-workspace-theme-v1';
const fonts = {fontUi:'system-ui, sans-serif', fontEditor:'Consolas, monospace',headingIndentStep:'0.55em'};
const headingColors = {
  midnight:['#9bc9ff','#ffb6cf','#b4dda0','#d8b8f3','#f0d58b','#93ddd4'],
  terminal:['#a0f0b2','#f0cb83','#9ccff5','#deb1f2','#f0aaa5','#9de1d7'],
  nord:['#a9d3f5','#edd18f','#aed5a5','#d4b3e5','#efb1ac','#9ddcd6'],
  paper:['#244181','#8a411f','#3d602e','#6f3f82','#8b3553','#176467']
};
const define = (id, name, scheme, colors) => Object.freeze({id,name,scheme,tokens:Object.freeze({
  ...fonts,...colors,
  ...Object.fromEntries(headingColors[id].map((color,n)=>['syntaxHeading'+(n+1),color])),
  syntaxCode:colors.syntaxString,syntaxQuote:colors.muted,syntaxMarker:colors.syntaxMeta
})});
export const THEMES = Object.freeze([
  define('midnight','Midnight','dark',{
    background:'#191d24',surface:'#222833',control:'#293240',hover:'#344154',text:'#e8edf5',muted:'#b4c1d2',border:'#8294ac',accent:'#91bfff',focus:'#b0d2ff',
    selection:'#344865',selectionText:'#ffffff',cursor:'#d7e7ff',codeBackground:'#101722',statusBackground:'#252e3b',statusText:'#e8edf5',warning:'#ffd08a',
    syntaxHeading:'#a8caff',syntaxLink:'#9ad9ed',syntaxKeyword:'#e0b4f5',syntaxString:'#b6deb0',syntaxNumber:'#ffd09b',syntaxComment:'#bac5d5',syntaxMeta:'#d4c4ed'
  }),
  define('terminal','Terminal','dark',{
    background:'#07100b',surface:'#0b1910',control:'#11281a',hover:'#1c3b28',text:'#c5f2c9',muted:'#a1c9a7',border:'#6da67b',accent:'#8cf2a4',focus:'#b6ffcd',
    selection:'#245334',selectionText:'#ffffff',cursor:'#bcffcc',codeBackground:'#163521',statusBackground:'#102b1b',statusText:'#c5f2c9',warning:'#efdf93',
    syntaxHeading:'#a9ffbd',syntaxLink:'#9cebd7',syntaxKeyword:'#d4f7a5',syntaxString:'#b7e6a0',syntaxNumber:'#eee4a0',syntaxComment:'#b1ccb7',syntaxMeta:'#c2e9c7'
  }),
  define('nord','Nord','dark',{
    background:'#2e3440',surface:'#303846',control:'#3b4556',hover:'#46546a',text:'#eceff4',muted:'#c4cedd',border:'#99aabd',accent:'#a6d6e3',focus:'#b9deed',
    selection:'#3c4b5d',selectionText:'#ffffff',cursor:'#e5efff',codeBackground:'#202938',statusBackground:'#384252',statusText:'#eceff4',warning:'#ebcb8b',
    syntaxHeading:'#b7d5f3',syntaxLink:'#a6dce6',syntaxKeyword:'#d9bddb',syntaxString:'#c3dda9',syntaxNumber:'#edc6a6',syntaxComment:'#c0cbd9',syntaxMeta:'#d7c9e6'
  }),
  define('paper','Paper','light',{
    background:'#f6f1e7',surface:'#fffaf0',control:'#eee5d5',hover:'#e2d6c0',text:'#302d27',muted:'#595449',border:'#776c5c',accent:'#245579',focus:'#195777',
    selection:'#c9dbe5',selectionText:'#202b33',cursor:'#243f54',codeBackground:'#e7ddca',statusBackground:'#e9e0cf',statusText:'#302d27',warning:'#75451d',
    syntaxHeading:'#254f79',syntaxLink:'#245a63',syntaxKeyword:'#69436f',syntaxString:'#3c5c2a',syntaxNumber:'#7a4524',syntaxComment:'#595449',syntaxMeta:'#654b67'
  })
]);
export function getTheme(id) { return THEMES.find(theme => theme.id === id) ?? THEMES[0]; }
export function readThemeChoice(storage) {
  try { return getTheme(storage?.getItem(THEME_STORAGE_KEY)).id; }
  catch { return DEFAULT_THEME; }
}
export function saveThemeChoice(storage,id) {
  try { if (!storage) return false; storage.setItem(THEME_STORAGE_KEY,getTheme(id).id); return true; }
  catch { return false; }
}
export function applyTheme(root,id) {
  const theme = getTheme(id);
  for (const [name,value] of Object.entries(theme.tokens)) root.style.setProperty('--'+name.replace(/[A-Z]/g,letter => '-'+letter.toLowerCase()),value);
  root.style.colorScheme = theme.scheme;
  root.dataset.theme = theme.id;
  return theme;
}

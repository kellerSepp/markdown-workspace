// A dock permits editing the source while agenda-local keys remain isolated.
// File/vault/draft replacement continues to require explicitly closing agenda.
const sharedPanels=new Set(['structure.refile-h1','todo.status','planning.scheduled','planning.deadline','edit.emacs-show-ring']);
export const usesSharedWorkPanel=id=>sharedPanels.has(id);
export function agendaCommandReason(command,context){
  if(!context.agendaActive||command.id.startsWith('agenda.'))return '';
  if(!context.agendaDocked||context.agendaFocused)return 'Agenda zuerst schließen oder den Editor fokussieren.';
  const safe=['editor','selection','document'].includes(command.context)||command.id.startsWith('view.')||command.id.startsWith('theme.')||['ui.options','ui.development','ui.palette'].includes(command.id);
  return safe?'':'Agenda vor Datei-, Vault- oder Entwurfswechsel schließen.';
}

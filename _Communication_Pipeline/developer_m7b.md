# Developer M7b — 2026-11-08

Rollenrevision **M32A-2026-11-03** geladen. Ausschließlich delegiertes M7b umgesetzt, vorhandene M6a-/M7a-Arbeit erhalten. Keine Subagenten, Dependencies, Storage-Sicherheitsänderungen oder Git-Commits/Pushs.

## Ergebnis / Module

- Neu `editor/agenda-model.mjs` und `.test.mjs`: reine Ansichtsprojektion aus M7a, ISO-Woche/Jahr, Montag–Sonntag, lokale heutige Kalenderdate, Tagesvereinigung, Uhrzeitreihenfolge und Rückstandshinweise.
- Neu `editor/agenda-view.mjs` und `.test.mjs`: kompaktes zweispaltiges Dispatcher-/Wochen-/TODO-Modal mit bestehender Panelhülle, lokaler Auswahl/Scroll, Fehlermeldungen und Fokuswiederherstellung.
- Neu `editor/agenda-source.mjs` und `.test.mjs`: rein lesende Quellenprüfung mit bestehendem Parser/Codec, revisions-/epochgebundener Validierung, Abbruchgeneration, gezieltem Sessionadapter und Dirty-Verweigerung.
- Integration `editor/app.mjs`, `editor/index.html`, `editor/styles.css`, `editor/commands.mjs`, `editor/emacs-policy.mjs`, begrenzter `blocked`-Callback in `editor/command-surfaces.mjs`, Agenda-Hinweis in `editor/work-panel.mjs`.
- Regression angepasst in `editor/commands.test.mjs`, `editor/prefix-router.test.mjs`, `editor/agenda-index.test.mjs`: neue Registry83/Agenda-Verfügbarkeit, alte M7a-no-dispatch-Sperre ersetzt; Sicherheitsprüfungen erhalten.
- Synthetische optionale Vorschau `test-vault/m7b-preview.mjs`/`.html` mit echter Agendaansicht/CodeMirror-Präfixrouter und festem Testdatum 8.11.2026. Quellnavigation dort nur Vorschauhinweis, keine Produktions-/Filesystemabnahme. Vorhandenes esbuild ohne Installation zum Bundle genutzt.

Registry neu: `agenda.dispatch` / Agenda öffnen / Agenda; `agenda.week` / Wochenagenda öffnen / Agenda; `agenda.todo` / TODO-Liste öffnen / Agenda. Bestehendes `agenda.refresh` bleibt gesonderter Indexbefehl. Gamebook integriert Lead.

## Verhalten / Grenzen

`C-c a` im Editor nach C-keyup und Loslassen von Strg, danach im Dispatcher `a`/`t`; `m`/`s` disabled/geplant. Lokal Woche `f`/`b`/`.`; `q`/Escape schließen; ↑/↓ wählen, Enter/Klick navigieren; `r` führt vorhandenen Refresh aus. Mausbuttons für Navigation, Refresh, Schließen und Checkboxfilter. Default-TODO nur offen, Filter zeigt alle erkannten TODO-Zustände einschließlich CANCELLED. Keine neue Aufgabenverwaltung.

Alle Quellrecorddaten/Klassifikation aus `snapshot`, `query`, `source`; `rebuild`/`updateFile` bestehend. Kein zweiter Index. Offene Ansichten rendern auf M7a-Publikation erneut, Vault-Epochenwechsel schließt/leert. Fehlerpfade/Ursachen und laufender Index sichtbar. Kein Polling und keine Hintergrundüberwachung.

Termine am Originaldatum; SCHEDULED/DEADLINE derselben Aufgabe taggleich vereinigt mit beiden Zeiten. Früheste vorhandene Tagesuhrzeit sortiert, sonst Quellpfad/Offset. Offene vergangene Angaben werden zusätzlich auf heute projiziert, nur wenn heute in der Woche liegt. Mehrere Hinweise pro Record/Tag vereinigt. Abgeschlossene und statuslose Termine erzeugen keine Rückstände. Keine Deadline-Vorwarnung, Repeater oder Uhrzeit-Überfälligkeit.

Quellsprung bei schmutzigem Editor grundsätzlich verweigert, auch gleiche Datei: ausdrückliches Speichern erforderlich. Keine automatische Speicherung oder stille Ersetzung ungespeicherter Arbeit. Saubere gleiche Datei erhält vorhandenen Editorstate/History, sonst bestehende `session.open`/Persistenz-/Rechtepfade. Quelle vor Navigation neu parsen/mit Recordposition, Titel, Ebene, Status und Metadaten vergleichen; verschobene/veränderte Ziele ablehnen. Token wird vor asynchroner Rechteprüfung reserviert. Nach `await open` nochmals Epoch/Revision/Session/Dirty und zweite geladene Textfassung prüfen; keine veraltete Cursorposition anwenden. Bestehendes Sessionopen ist selbst nicht nachträglich abbrechbar, sobald gestartet. Deshalb meldet ein optionales `onCommit(bool)` im Sourceadapter die kurze Öffnungsphase: View blockiert währenddessen q/Escape/Close, Datum/Refresh/Filter/weitere Aktivierung mit verständlicher Meldung. Davor bleibt Abbruch wirksam. Nach Erfolg normaler Close+Fokus; bei Fehler entsperrt, Fehler sichtbar und q wieder möglich. Ein während Commit gedrücktes q wird nicht nachträglich ausgeführt. Vaultreset/Destroy erzwingen Lifecyclecleanup und invalidieren Quelltoken; regulärer Vaultwechsel ist während bestehendem App-Busy ausgeschlossen. Kein Sessionpatch oder Rollback. Kein dauerhafter Aufgaben-Identifier behauptet.

Modal isoliert Editorhandler; Registry sperrt nicht-Agenda-Befehle während Agenda aktiv, globale Palette blockiert. Erfolgreicher Quellsprung setzt Fokus ausdrücklich erst nach Dialogclose in den Quelleditor. Modalclose allein verändert keine Dokument-/Historydaten. Sehr große DOM-Listen werden vollständig gerendert, keine Virtualisierung; native kleine-Fenster-/Zoom-/Fokusprüfung bleibt offen.

## Tatsächlich ausgeführte Prüfung

Final `npm test`: **308/308**, `npm run build`, zehn Syntaxchecks (`agenda-model/source/view` samt Tests, App, Commands, Command Surfaces, Preview) und `git diff --check` grün. Nach letzter Commitphase-Korrektur alle zehn Syntaxchecks erneut erfolgreich. Log `test-vault/m7b-developer-tests.log`.

19 neue Prüfgruppen: ISO-Wochenjahreswechsel/Jahre0001/9999/Schaltjahr, lokale Tagesbasis, Tagesvereinigung/Zeiten/Sortierung/statuslos, Custom/TODO/closed-Rückstände, Quellen-Offset-Duplikate/Dirty/extern/stale/Readfehler, konkurrierende Revision/Vault/State/Session/Cancel inklusive awaited permission und open, Dispatcherkeys/Maus/IME/Modifier/Repeat, Datumsnavigation, TODO-Filter, Fehler-/Vaultupdate, Registry-/AltX-Isolation, modale Inertness-Fokusreihenfolge und tatsächlicher App-source-Adapter mit echter Session. Zusätzlich echter verzögerter `session.open` mit q/Escape/Close/Filter/Refresh während Commit, erfolgreichem Ende und Leseausnahme sowie erzwungenem Vaultreset-/Destroycleanup.

Modelltests beweisen keine native Browserzustellung oder visuelle Abnahme. Lead hat native Vorschau vor Input wegen Runtime-/Nutzer-Escape beendet; keine native Probe als erfolgreich melden. Mehrstündige Ressourcen-/Idle-/Memory-Leak-Prüfung nicht ausgeführt. Unabhängige QA ausstehend. Ab hier keine weiteren Codeänderungen ohne konkreten QA-/Leadbefund.

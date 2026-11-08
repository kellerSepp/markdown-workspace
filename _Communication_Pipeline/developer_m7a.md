# Developer M7a — 2026-11-08

Rollenrevision M32A-2026-11-03 geladen. Freigegebenen M7a-Umfang umgesetzt, vorhandene M6a-Arbeit erhalten.

- Neu: `editor/agenda-index.mjs`, `editor/agenda-index.test.mjs`.
- Integration: `editor/app.mjs`, `editor/index.html`, `editor/commands.mjs`, `editor/commands.test.mjs`.
- Bestehende Parser/Funktionen: CodeMirror Markdown, `readTodoRules`, `planningRecords`, `TextCodec`. Keine Storage-Sicherheitsänderung, neuen Abhängigkeiten, Markdown-Schreiboperationen, Agendaansicht, Dispatcher oder Kürzel.
- Alle Markdown-Dateien rekursiv, auch versteckte Dateien/Ordner; nur eigener Sicherungsordner `.storage-spike-backups` ausgeschlossen. Keine Übernahme der bestehenden Dateilistenlimits 1000/3000/10. Lesefehler pro Datei/Ordner mit Pfad, Planungsfehler mit Zeile. Fehlerhafte Regeln behalten letzte gültige dieser Datei/Sitzung, sonst Standard, mit Diagnose.
- RAM-Snapshot ohne Handles/EditorStates, tief eingefroren. Epoch/Operationsgeneration verhindert alte Async-Ergebnisse nach Vaultwechsel, erneutem Refresh und konkurrierenden Saves. ID/Source gilt nur für epoch/revision, keine dauerhaft eindeutige Aufgaben-ID. Aktualisierung ersetzt komplette Dateieinträge und Positionen.
- `selectVault` leert synchron und startet lesenden Neuaufbau, `rebuild` liest explizit erneut, `updateFile` liest gespeicherte Datei; konkurrierende Updates während Aufbau starten Neuaufbau. App führt Index außerhalb globalem Busy aus. Editorentwurf wird nie eingespielt oder verändert; Save eines anderen Vaults wird abgewehrt.
- `snapshot`, `query`, `source` bereiten M7b vor. Querytypen all/todo/open/closed/scheduled/deadline/overdue/day/week; `status`, `from`, `to`, `today`. Woche bedeutet Starttag plus sechs Folgetage, Jahresende 9999 wird begrenzt. Overdue: offene TODO mit Deadline vor explizitem today; abgeschlossene und statuslose Termine ausgenommen.
- Neuer Registrybefehl `agenda.refresh`/„Agenda-Index neu einlesen“/Datei/ohne Kürzel. Diagnose-Details zeigt Dateizahl, Eintragszahl, Hinweise und Revision; keine Agendaansicht. Gamebook integriert Lead.

Validierung: `npm test` **288/288** grün, `npm run build`, vier `node --check` (Index, Indextests, App, Commands) und `git diff --check` grün. Log `test-vault/m7a-developer-tests.log`.

12 neue Prüfgruppen: verschachtelte H1–H6, Custom/Default/ungültige Regeln, offene/abgeschlossene Status, beide Planungsarten/Zeiten/Zeitfenster, statuslose Termine, Ausschluss Code/Frontmatter/HTML/Quote/List/Setext, keine Checkboxaufgaben, leere Quellen, Datei-/Verzeichnislesefehler, Immutable Snapshot, Quellenposition/Revision, neue/gelöschte Dateien, Vaultwechsel, veraltete Reads, konkurrierende Saves und Queryränder.

Lastprobe: 400 synthetische verschachtelte Dateien, 400 Einträge, 403 Yield-Aufrufe, separater Lauf ca. 216 ms. Eine Datei mit 266890 Zeichen/600 Headings vollständig durch echten Parser, 1 Parser-Yield, ca. 34 ms. Einmalwerte im Node-Modell; kein Browser-Latenz-/Perzentil-/Langzeitbeweis. Parserarbeit wird in 15-ms-Scheiben fortgesetzt; Auswertung eines einzelnen sehr großen Dokuments und Snapshotpublikation sind synchron und können länger dauern. Keine permanente Hintergrundüberwachung/Polling.

Native Edge-, Zoom-, kleine-Fenster-, Permissionpraxis und Langzeit-/Memory-Leak-Nachweis bleiben offen. Dateiverzeichnis ist keine atomare externe Vaultaufnahme; Änderungen während Lesen können erneuten Refresh verlangen. QA unabhängig ausstehend. Kein Commit/Push. Ab jetzt keine weiteren Änderungen bis konkretem QA-Befund.

## QA-Nachbesserung: erneutes Dateiöffnen

QA bestätigte, dass erneutes `file.open` nach externer Strukturänderung den Editor, aber noch nicht den Index aktualisierte. Nach erfolgreichem Öffnen stößt der tatsächliche Callback jetzt im selben ausgewählten Vault ein rein lesendes `updateFile` im Hintergrund an. Kein Editortext wird aus dem Index übernommen. Neue Regression führt den tatsächlichen App-Callback mit echter `createSession`/`createAgendaIndex` und synthetischen Handles aus: Original TODO/from0 → extern Reloaded DONE/from8/Zeile3, Editor/Index passen, alte Source-ID ungültig.

Final nach Korrektur: **289/289** Tests, Build, vier Syntaxchecks und Diffcheck grün. 13 eigene Indexprüfgruppen. QA-Retest ausstehend; warte auf konkrete weitere Befunde.

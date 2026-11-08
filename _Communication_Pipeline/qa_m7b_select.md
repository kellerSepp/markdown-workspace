# QA M7b — Dateiauswahl nach Quellsprung, 2026-11-08

Rollenrevision M32A-2026-11-03. Ausschließlich gezielte Nachprüfung des vom PO gemeldeten Auswahlfehlers. Keine Implementierung geändert; eigene Probe `test-vault/qa-m7b.mjs` an die echte App-Helperfunktion angepasst und um fünf fokussierte Prüfgruppen ergänzt. `syncAgendaFileSelection()` wird aus `app.mjs` übernommen, nicht als Stub ersetzt. Dateisystem-/Selectadapter bleiben synthetisch; Session, Index und App-Sourcecallbacks sind tatsächlich ausgeführte Produktionsmodule.

**Ergebnis:** `npm test` **308/308**, Build, drei Syntaxchecks und Diffcheck grün. `node test-vault/qa-m7b.mjs --select`: **5/5** gezielte Gruppen grün. Vollständige reparierte eigene Probe: **21/21**, keine Findings. Kein belegter verbleibender Blocker in diesem Umfang.

Geprüft:

- Agendaöffnung von `team/project.md` bei zuvor ausgewähltem `project.md`: Session, Editortext und Select stimmen auf dem vollständigen relativen Pfad überein.
- Erneuter Sprung innerhalb derselben Datei setzt eine zwischenzeitlich anders gewählte Dateiauswahl zurück, ohne die Session erneut zu öffnen.
- Eine fehlende Option wird genau einmal mit `text` und `value` gleich dem relativen Quellpfad angelegt; erneute Sprünge erzeugen keine Duplikate.
- Ungespeicherter Editor beziehungsweise Lesefehler vor dem Öffnen lassen Session und Dateiauswahl unverändert.
- Eine Änderung während des zweiten Dateilesens führt zum bekannten verweigerten Positionssprung; da die Sessionöffnung tatsächlich erfolgt ist, zeigt der Select trotzdem die wirklich geladene Datei an.
- Bei bereits anderem ausgewähltem Vault übernimmt die echte Helperfunktion keinen Pfad aus der älteren Session.

Pflichtchecks: `npm test`, `npm run build`, `node --check` für `editor/app.mjs`, `editor/agenda-view.test.mjs` und `test-vault/qa-m7b.mjs`, außerdem `git diff --check`: alle Exit 0. Keine zusätzliche native Automation; Edge-Sicht-/Tastenzustell- und Langzeitgrenzen des M7b-Abschlusses bleiben unverändert offen. Keine Storage-Sicherheitsänderung, Abhängigkeit, Commit oder Push.

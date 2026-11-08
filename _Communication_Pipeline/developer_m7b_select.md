# Developer — M7b Dateiauswahlkorrektur, 2026-11-08

Gezielter PO-Befund korrigiert; bestehende Vorarbeit erhalten. Nur `editor/app.mjs` und bestehende Regression in `editor/agenda-view.test.mjs` geändert.

`syncAgendaFileSelection()` gleicht die Dateiauswahl gezielt nach tatsächlich erfolgreichem Agenda-`session.open` sowie nach einem erfolgreichen Same-file-Quellsprung mit `session.path` ab. Relative Pfade unterscheiden gleichnamige Dateien. Fehlt die Option, wird sie sicher über `new Option(text, value)` ergänzt. Der Identitätsguard übernimmt keine Sessiondatei eines anderen Vaults. Kein genereller Renderzwang und keine Änderung absichtlich vorgewählter Dateien außerhalb dieser Agendaaktionen.

Nach tatsächlichem Dateiöffnen stimmt die Auswahl auch dann mit der Session überein, wenn eine anschließende zweite Quellvalidierung den Positionssprung verweigert. Dirty-Verweigerung und Lesefehler ohne Sessionwechsel erhalten die Vorauswahl.

Bestehenden tatsächlichen App-source-Callback mit echter Session/Index erweitert: gleichnamige Wurzel-/Unterordnerdatei, Same-file mit falscher Vorauswahl, fehlende Option, Dirty-/Readfehler, zweite externe Textfassung nach erfolgreichem Öffnen sowie fremdes Sessionvault. Keine neue breite Suite.

Prüfung: **308/308 Tests**, Build, zwei Syntaxchecks (App/Agenda-View-Test) und `git diff --check` grün. Log `test-vault/m7b-select-developer-tests.log`. Unabhängige QA folgt. Native Select-/Edgeprobe nicht durchgeführt. Keine Index-/Storage-/Dependency-/Formatänderung, kein Commit/Push, keine Subagenten. Ab jetzt keine weiteren Edits ohne konkreten Befund.

# QA M4b.1a EOL-Bugfix — 2026-11-05

Rollenrevision M32A-2026-11-03 bestätigt, aktuelles AGENTS-Gate END-OF-LINE CONTEXT BUGFIX gelesen. Nur delegierter Prüfauftrag; keine Appänderung, Installation, Subagenten oder produktiven Daten.

Kein nachgewiesener Blocker im geprüften Umfang.

## Automatisiert ausgeführt

- `npm test`: 122/122 bestanden, keine Fehler/übersprungenen Tests, Node-Testdauer 358,5633 ms.
- `npm run build`: erfolgreich. `node --check editor/structure.mjs` und `node --check editor/alt-keyboard.test.mjs`: erfolgreich. `git diff --check`: erfolgreich; lediglich LF/CRLF-Hinweise.
- Zwei neue additive Tests führen die aufgelösten CodeMirror-DOM-Handler mit synthetischen Events aus: alle Spalten einschließlich EOL/EOF für Bullet/Ordered/nested/Multiline/Heading, jeweils Undo/Redo; fünf Schutzkontexte Code/Frontmatter/Fortsetzung/Leerzeile bleiben unverändert. Bestehende Alt-/Heading-/Tab-/Org-/Storage-Mocktests grün.
- Sechs zusätzliche unabhängige Node-Repros bestanden: ursprünglicher Fehler `- A\n- Beta\n- C`, Cursor 10, Einzel-Einrücken ergibt `- A\n  - Beta\n- C`, Cursor 12; identisches EOF-Verhalten; EOL-Unterbaumtausch vor Leerzeile/Heading erhält Nachbarbereich und Cursor; Heading-EOL-Demotion erhält nachfolgende Liste und Cursor. Für diese vier Änderungen genau eine Undo-Einheit, ursprünglicher Text/Cursor nach Undo und Ergebnis nach Redo bestätigt. Leere Zeile zwischen Listenpunkten und Code-EOL verweigern ohne Textänderung/Undo-Eintrag.
- Codeprüfung: linksgerichteter Syntax-Bias nur bei nichtleerem physischen Zeilenende; Leerzeilen erhalten rechten Bias. Begrenzte Korrektur am gemeinsamen Strukturplaner; keine neue Befehlssemantik.

## Berichtete Ergebnisse und offene Grenzen

Keine neuen vom Nutzer berichteten Browserergebnisse. Die automatisierten Handlerprüfungen belegen keine native Edge-Zustellung, Alt-Menü-Unterdrückung oder echte IME-Eingabe. Kein Browserlauf durchgeführt.

Keine Stunden-/Idle-/Memory-Leak-Messung: Last kurzlebige Node-Tests, Messdauer Testsuite 358,5633 ms, keine Speicher-Zeitreihe oder Latenzverteilung; daraus kein Performancebudget/Perzentil ableitbar. Große Vaults, Offline-/Berechtigungs-/Wiederherstellungsszenarien nicht neu durchgeführt; bestehende Storage-Mocks sind begrenzte Regressionsevidenz. Keine Freigabe weiterer Milestones, kein Commit/Push.

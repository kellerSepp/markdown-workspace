# QA M6a — sofortige Datumwahl und Rohtext-Wochentage

2026-11-08. Rollenrevision `M32A-2026-11-03` aus geladenen Instruktionen und Brief bestätigt. Ausschließlich synthetische Daten und delegierter Prüfauftrag; keine App-/Lead-Dokumentänderung, Dependencies, Storageänderung, Commit oder Push durch QA.

## Ergebnis

**276/276 Tests**, Build, sieben Syntaxprüfungen (sechs Produktmodule plus QA-Script) und Diffcheck erfolgreich. **79 unabhängige Prüfgruppen** in `test-vault/qa-m6a-flow.mjs` erfolgreich. Kein bewiesener verbleibender Blocker im geprüften Umfang; kein Developer-Fix aus diesem QA-Durchlauf erforderlich.

- Echter Controller plus gemeinsame Panelhülle mit synchronem `invalidateStale` während Dispatch: Tagklick, Enter und Space übernehmen genau einmal, schließen ohne weiteren Zugriff auf zerstörte Formularteile und geben Fokus zurück. Bestehende Einzelzeit/Zeitfenster unverändert, neue Angaben date-only. Genau ein Undo-Schritt und korrektes Undo. Reine Datumseingabe bleibt unverbindlich bis Enter/Tagaktivierung. Nur ein Datumsfeld, kein Übernehmen-Knopf. Entfernen/Abbrechen stehen vor dem Monatsbereich; Header-Escape/C-g, Stale/Busy und Modifier-/IME-/Repeatguards geprüft.
- Rohtextfilter: H1–H6 × SCHEDULED/DEADLINE × drei Whitespacevarianten mit Datumwechsel; nur Wochentag korrigiert, Uhrzeiten/Whitespace/Titel/Fremdmetadaten erhalten. Je Fall zehn exakte Undo/Redo-Zyklen im selben Historyschritt. Paste, fehlender Wochentag, ungültig→gültig, mehrere Cursor sowie Cursorabbildung nach eingefügtem Wochentag geprüft. Uhrzeitbearbeitung mit BOM/CRLF/mixed Außenzeilen bleibt bytegetreu außerhalb des betroffenen Fragments.
- Keine Korrektur bei Load, History, programmatischer Änderung ohne Input-/Delete-Event, Controller-`input.planning`, Code/Frontmatter/Quote/Bodybeispiel, Duplikaten, Wiederholern oder Read-only. Lesender Review bestätigt vollständige Parser-Gates, keine Timer oder verzögerte Migration. Gewöhnliche Bodyänderungen werden anhand betroffener neuer Zeilen abgegrenzt, bevor Abschnitts-/Planungsanalyse aufgerufen wird.

## Grenzen

DOM-/Editorstate- und Codecmodell, keine native Edge-Eingabe-/Pixeldarstellung. Native Klick-/Space-/Fokuszustellung, kleines Fenster/Zoom/Assistenztechnik sowie AltGr/IME müssen praktisch geprüft werden. Die vorhandene Computer-Use-Laufzeit war beim Lead nicht startfähig; daraus folgt kein UI-Nachweis. Keine Stunden-/Idle-/Leak-/RAM-Abnahme; die komplette Node-Suite lief in diesem Durchlauf rund 650 ms und stellt keinen Langzeitnachweis dar. Keine Agenda-/Index-/M6b-Implementierung.

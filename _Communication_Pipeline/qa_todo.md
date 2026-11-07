# Unabhängige QA TODO — 2026-11-07

Rollenrevision `M32A-2026-11-03` aus tatsächlich geladenen Instruktionen und `agents/qa.md` bestätigt. Nur Prüfscripte unter `test-vault/qa-todo.mjs` und dieser Bericht erstellt; kein Anwendungscode geändert. Bestehende uncommittete Refile-/Planungsarbeit erhalten.

## Abschließendes Ergebnis

- Final eigenständig ausgeführt: **241/241 Tests**, Build, neun Syntaxchecks (acht Produktmodule und QA-Script) und `git diff --check` erfolgreich. Eigene unabhängige Matrix: **186 Prüfgruppen plus sechs große Parser-Gateproben** einschließlich H1–H6/Statusvarianten, unbekannte Titelwörter, Grammatik, ignorierte Code-/Frontmatterdefinitionen, Reload mit Fehlererhalt, wiederholte Undo/Redo samt Cursor, 100 Panelzyklen, stale Rows, Modifier/IME/Repeat, Fastkey/Leertaste, Navigation/Scroll, Busy, Fokus-/Composition-/Windowblur und Cleanup. Kein nativer Browsernachweis.
- P2 gefunden: leere aktive Emacs-Marke fing Shift+Pfeile vor TODO ab. Developer korrigierte tatsächliche Extension-Reihenfolge, TODO vor Emacs. Unabhängiger Retest mit Prefix → TODO → Emacs geschlossen: leere Marke wechselt Status genau einmal; nichtleere Auswahl und Body/unmarkierte Überschrift verändern keinen Aufgabenstatus.
- P2 gefunden: `todoDefinitionLine` verwendete unvollständigen veröffentlichten Parserbaum. Bei 1.000 Überschriften (Dokument 17.988 Zeichen, ursprünglicher Baum nur 3.007 Zeichen) wurde eine scheinbare SEQ_TODO-Zeile im abschließenden FencedCode fälschlich aktiviert. Developer korrigierte `todoDefinitionLine` und `todoContext`: tatsächlich verwendeter veröffentlichter Baum muss volle Dokumentlänge haben; keine neue Analyse in Availability. Unabhängig geschlossen: Code-/Listen-/HTML-Scheindefinitionen bei großen Dateien vor und nach Veröffentlichung verweigert; echte Definition erst nach Veröffentlichung verfügbar, vollständige Regeln beim Öffnen bereits korrekt geladen. Noch nicht veröffentlichter Task-Kontext verweigert sicher statt falsches Ziel zu ändern.

Native Edge-Tastenzustellung, kleines Fenster/Zoom, AltGr/IME, Stunden-/Idle-/Ressourcenmessungen bleiben offen. Kurze Modellzyklen beweisen keine Langzeitstabilität oder Leakfreiheit. Keine Agenda/Storageänderung/Dependencies/Commit/Push.

**Keine verbleibenden bewiesenen Blocker im geprüften TODO-Umfang.** Beide unabhängig gemeldeten P2-Befunde korrigiert und mit eigener Reproduktion geschlossen. Nächste Aktion: native PO-Handprobe gemäß docs/TODO_ACCEPTANCE.md; kein weiterer Meilenstein.

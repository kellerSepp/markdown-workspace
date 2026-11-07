# TODO — native Handprobe

Nur synthetische Datei `test-vault/vault-structure/todo.md` verwenden. Nach finalem Build Editor mit Strg+F5 neu laden. Automatisierte Modelltests belegen keine native Tastenzustellung.

1. Datei öffnen: definierte Zustände im Panel über Strg+C, C und Strg loslassen, t ohne Modifier prüfen. Schnellwahltaste wählt den Zustand, Leertaste entfernt ihn. Abbruch mit Escape/Strg+G ändert keinen Text.
2. Auf verschachtelten H1-, H2- und H3-Aufgaben jeweils unabhängig den Status ändern. H4–H6 ebenfalls prüfen. Eltern, Geschwister, Kinder und Fließtext bleiben erhalten; kein automatischer Elternabschluss.
3. Cursor an Anfang, Mitte und Ende des Aufgabentitels: Shift+Links/Rechts schaltet Status, auch über Kein Status hinweg mehrfach in beide Richtungen. Vom leeren Zustand führt Rechts zum ersten und Links zum letzten definierten Status. Die Fortsetzung gilt nur für die gerade im Zyklus entmarkierte Überschrift im aktuellen Bedienkontext; nach anderer Textänderung, Kontext-/Fokuswechsel, Undo/Redo oder Abbruch ist sie beendet. Bei vorhandener Textauswahl bleibt Textmarkierung erhalten. Auch mit aktiver, noch leerer C-SPC-Marke muss auf einer Aufgabe der Statuswechsel greifen. Auf normalem Text und unmarkierter Überschrift bleiben Shift-Pfeile Textmarkierung; unmarkierte Überschrift per Panel zur Aufgabe machen.
4. Nach jeder Statusänderung Undo/Redo wiederholt prüfen: genau ein Schritt, Text und Cursor wiederhergestellt. Identische Statuswahl ändert nichts. Unbekannte Wörter am Titelanfang werden nicht entfernt.
5. Definition bearbeiten: geladene Zustände ändern sich erst mit Strg+C, C loslassen, erneut Strg+C auf der Definitionszeile. Geänderte Definition gültig übernehmen; doppelte Namen/Tasten, fehlendes | und mehrere Definitionen mit Fehlermeldung ablehnen und letzte gültige Regeln behalten. Datei ohne Definition verwendet TODO(t) | DONE(d).
6. Scheinbare Definitionen und Aufgaben in Code/Frontmatter ignorieren. Im Aufgabenbody Panel auf die zugehörige Überschrift beziehen; Unterüberschrift adressiert ihren eigenen Eintrag. Dateiwechsel darf keine alte Panelaktion anwenden.
7. In Midnight, Terminal, Nord und Paper offene Zustände grün, abgeschlossene einschließlich CANCELLED rot und auch über Text unterscheidbar prüfen. Kleines/gevierteltes Fenster: Panelnavigation und lokale Sichtbarkeit, Editorcursor und Textausschnitt prüfen.
8. Bestehende Copy/Yank-, C-c 1/2/3-, C-c w-, Listen-/Folding-Bedienung stichprobenartig prüfen; AltGr/IME und normale Texteingabe schützen. C-c a bleibt reserviert.

Ergebnis mit Browser-/Layoutangabe festhalten. Native Zustellung, AltGr/IME, Langzeit-/Idle-/Ressourcenverhalten sind offen, bis tatsächlich geprüft.

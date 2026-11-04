# M3.1: Kontextfaltung und Lesbarkeit

## In Edge ausprobieren

`npm start` ausführen und `http://127.0.0.1:8766` öffnen. Bei bereits laufendem Server nach neuem Build die Seite einmal neu laden. Nur `test-vault/vault-folding` wählen und `context.md` öffnen.

1. Cursor mitten in Absatz, Liste oder Codeblock unter einer Überschrift setzen. **Strg+Umschalt+Komma** klappt die nächste zugehörige Überschrift mitsamt Unterabschnitten ein. Verborgener Cursor wechselt auf die sichtbare Überschrift. Ohne Überschrift wird ein lokaler Listen-/Codeblock gewählt.
2. Auf `Projektübersicht` bleiben und **Strg+Umschalt+Punkt** wiederholen: erst Gliederung (alle Überschriften, keine Prosa), dann Text des Abschnitts und seiner direkten Kinder, schließlich alle tieferen Inhalte. Nicht unterscheidbare Stufen werden übersprungen. Manuell gemischte Falten werden vollständig geöffnet statt zusätzliche Prosa zu verbergen.
3. Dieselben Aktionen über die drei Knöpfe oberhalb des Editors ausprobieren. **Abschnitt vollständig öffnen** überspringt alle Zwischenstufen. Der Knopf ist über Tab/Enter erreichbar; kein neues globales Kürzel.
4. Randmarkierung anklicken: offener Abschnitt klappt zu; vorhandene Falten öffnen schrittweise. `…` bietet ebenfalls die nächste Stufe. Nach Platzhalterklick sollte der Editor wieder Fokus haben.
5. H1–H6, Links, Code und Zitate in Midnight, Terminal, Nord und Paper vergleichen. Cursor/Auswahl, aktive und inaktive Markierungen, Zoom und Windows-Hochkontrast praktisch prüfen.
6. Vorher/nachher Hash einer synthetischen Datei vergleichen: reine Sichtbarkeits-/Themeaktionen dürfen keine Dateiveränderung oder neue Sicherung auslösen. Textbearbeitung, Undo/Redo und explizites Speichern separat prüfen.

## Nachweise und Grenzen

Lead-Prüfung: 52/52 Tests bestanden (38 bestehende unverändert, 14 neu), Build, Syntax und `git diff --check` erfolgreich. Neue Zustandsfälle prüfen Kontext, Cursor, monotone Stufen, gemischte Falten, Vollöffnen im Zielabschnitt, Container, Setext, lange Gliederung, Theme-/Undoerhalt und tatsächliche Syntaxhervorhebung. Die bisherigen Tests prüfen die neuen Farbwerte ebenfalls auf Kontrast. Unabhängige QA prüfte lesend; ein Monotoniefehler und eine irreführende Gutter-Beschriftung wurden behoben. Aktive alte Agentenrestriktionen beschränkten Developer/QA auf lesende Arbeit; Implementierung und Testausführung durch Lead, keine Rollenänderung.

Automatische Zustandstests ersetzen keine echten Maus-/Windows-Tastenereignisse oder Browsermessungen. Keine interaktive M3.1-Abnahme behauptet. Strukturinformationen kommen aus dem vorhandenen Markdown-Syntaxbaum; Faltzustände bleiben temporär in der Ansicht. Es gibt keinen Org-mode-Parser und keine Struktur-/Formatierungsbefehle aus M3.2.

Neue Falten erfordern vollständige Analyse. Jeder Analyseversuch hat weiterhin ein 50-ms-Arbeitsbudget; das ist keine garantierte Gesamtlatenz. Bei unvollständiger Analyse kann ein bestehender Faltbereich unmittelbar geöffnet werden. Für die vollständige semantische Öffnung des Abschnitts gegebenenfalls nach Analyse erneut den Befehl ausführen. Änderungen der Überschriftenstruktur innerhalb bestehender Falten weiterhin durch vollständiges Öffnen und erneutes Einklappen prüfen.

Manuell noch offen: Container-Randfälle in Listen/Blockquotes, Platzhalterfokus, echte QWERTZ-/AltGr-Eingabe, Maus-/Tabbedienung, lange Dateien, RAM/Idle/Stundenbetrieb. Das bekannte externe Schreibrennen bleibt auf synthetische Daten begrenztes Restrisiko; Storage wurde nicht verändert.

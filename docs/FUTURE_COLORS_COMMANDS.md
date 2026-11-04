# Spätere Textfarben und gemeinsame Befehlsoberfläche

Historische Planung im Auftrag M3.2a.1. Seit 2026-11-04 sind gemeinsame Befehlsoberfläche, Palette und Editor-Kontextmenü separat in M4a freigegeben; siehe [Command Gamebook](COMMAND_GAMEBOOK.md). Textfarben und weitere unten genannte Erweiterungen bleiben Planung ohne Implementierungsfreigabe.

- Textfarbe über bestehende Auswahl und späteres Kontextmenü setzen.
- Vordefinierte sowie frei gewählte eigene Farben anbieten; Themewechsel, Kontrast und Lesbarkeit berücksichtigen.
- Ein offenes, möglichst kompatibles Speicherformat vor Umsetzung prüfen. Reines Markdown bietet dafür keine hier festgelegte Farbsyntax. HTML-basierte Markierung und andere Varianten hinsichtlich Renderer-Unterstützung, Portabilität, sanitisiertem Rendering und Erhalt fremder Syntax vergleichen; noch keine Formatentscheidung.
- Kontextmenü und Command Palette sollen dieselben benannten Befehle verwenden wie Maus-/Tastaturaktionen, mit gleicher Kontextprüfung, Undo/Redo und verständlichen Ablehnungen. Keine zweite Implementierung von Strukturaktionen.
- Keine Textfarbe in M4a. Änderungen an Notizformat/Storage bedürfen gesonderter Freigabe.

Weitere vorgemerkte Erweiterungen: alternative rein visuelle Nummerierung wie `1.a`, `1.b`; zusätzliche Syntaxsprachen über getrennte, gezielt geladene Module. Keine zusätzlichen Sprachpakete oder inkompatiblen Listenpräfixe aus dieser Notiz ableiten.

Vor Umsetzung Abnahme festlegen: Auswahl bleibt korrekt, eine Aktion ist als Undo-Einheit rücknehmbar, unbekannte Formatierungen bleiben erhalten, Exporte sind außerhalb der App lesbar und schlechte Farbkombinationen werden verständlich behandelt.

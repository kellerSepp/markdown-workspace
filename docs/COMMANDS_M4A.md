# M4a: Bedienung und Prüfung

Die Oberfläche verwendet 43 lokale Produktbefehle aus `editor/commands.mjs`. Registry, DOM-Oberflächen und App-Handler sind getrennt. Metadaten enthalten stabile IDs, Name, Beschreibung, Kategorie, Kontext, Verfügbarkeitsfunktion und optionale Kürzel. Lokale Handler führen bestehende Aktionen aus. Kein Markdown wird als Code geladen.

## In Edge ausprobieren

1. Im Repository `npm start` ausführen und `http://127.0.0.1:8766` in Edge öffnen. Einen bestehenden Server auf diesem Port nicht ungeprüft beenden. Nur synthetische Daten unter `test-vault/` wählen.
2. Vor Dateiauswahl Alt+X drücken. Nach „Fett“, „Datei“ oder „Ansicht“ suchen. Gesperrte Befehle müssen einen verständlichen Grund zeigen. Pfeiltasten wählen, Enter führt aus, Escape oder „Schließen“ schließt. Ein Suchbegriff ohne Treffer zeigt einen Leerzustand.
3. Test-Vault bestätigen, über die Dateileiste wählen und eine vorhandene synthetische Markdown-Datei öffnen, etwa `vault-structure/formatting.md`. Auch den Vault-Picker über die Palette prüfen: Er benötigt einen echten Klick/Enter als Benutzeraktivierung.
4. Ein Wort vorwärts und rückwärts markieren. Alt+X, „Fett“, Enter: nur diese Auswahl formatieren, Editorfokus wiederherstellen. Undo/Redo über Knöpfe, Palette und Strg+Z/Strg+Y prüfen. Palette erneut öffnen und mit Escape abbrechen: Auswahlrichtung und Cursorposition erhalten.
5. Rechtsklick innerhalb der Auswahl: Formatierungen erscheinen; außerhalb der Auswahl gilt die geklickte Cursorstelle. In Überschrift und Liste die passenden Strukturaktionen prüfen. In Code/Frontmatter gesperrte Aktionen dürfen nichts ändern. Umschalt+F10 und Kontextmenütaste im Editor, dann Pfeile/Enter/Escape ausprobieren. Escape stellt den Zustand vor dem Menü wieder her.
6. Umschalt+Rechtsklick im Editor sowie normalen Rechtsklick außerhalb des Editors prüfen: Browsermenü bleibt erreichbar. Browser-Copy/Paste unverändert nutzen. Kontextmenü an den Fensterrändern, bei 200 % Zoom und mit vier Themes prüfen.
7. Normale Eingabe `gj`, `ga`, `x`, AltGr-Zeichen und IME darf keine Palette öffnen. Strg+K bleibt Browserfunktion. Nach Escape im Editor muss Tab weiterhin die Fokusnavigation ermöglichen.
8. „Editoroptionen“ aufklappen oder per Palette anzeigen. Alle fünf Marker-Ebenen, Headingeinrückung, Nummern und Unterstrukturwahl ändern; Markdown-Rohtext bleibt bei Ansichtseinstellungen gleich. Seltene Struktur-/Faltaktionen liegen in Palette/Menü, Rechte-/Scan-/Prüfknöpfe im Entwicklungsbereich. Entwurfsbereich bleibt erhalten.

## Umfang und Grenzen

Automatisierte Node-Prüfungen umfassen Registry-Suche und erneute Kontextprüfung, AltGr-/IME-/Repeat-Guard, reale Markdown-Zustände, Struktur-/Formatierungsgrenzen, Undo/Redo und DOM-Modellfälle für Tastatur/Maus/Fokus/Auswahl. Das DOM-Modell ist kein Nachweis für native Edge-Ereignisse, Layout, Zoom, Screenreader oder echte DE-DE-Tastatur. Tatsächliche Edge-Ergebnisse werden getrennt im Projektstatus berichtet. Langzeit-, RAM- und Latenzmessungen sind damit nicht erbracht.

Gutter/Platzhalter bleiben positionsbezogene Adapter auf den gemeinsamen vorhandenen Folding-Primitiven, statt die aktive Auswahl zur Befehlsausführung zu versetzen. Codeblock-Tab bleibt native Codeeinrückung. Produkt-Shortcuts für Struktur, Folding, Undo/Redo und Speichern verwenden im App-Adapter das Registry. Native grundlegende Texteingabe und Browserbefehle sind keine vollständige Registry-Befehlsliste.

M4b kann auf stabilen IDs, getrennten Metadaten/Kontextprüfungen und zentralem Dispatcher aufbauen. Frei konfigurierbare Kürzel, Sequenzautomat und Folgehilfe sind noch nicht implementiert. Keine neue Abhängigkeit, kein Framework, kein Polling und keine Änderung am Storage-Sicherheitsmodell. Historische Storage-Testaktionen bleiben im separaten Spike; es wurde keine neue unsichere Brücke geschaffen.

Wünsche und Implementierungsstatus stehen in [COMMAND_GAMEBOOK.md](COMMAND_GAMEBOOK.md). Der automatisierte ID-/Name-/Kategorie-Abgleich läuft mit `npm test`; redaktionelle Verhaltensbeschreibungen brauchen weiterhin Review.

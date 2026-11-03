# Phase 2 M2: Theme-Grundgerüst

Vier mitgelieferte Farbpaletten: Midnight (Standard, Anthrazit/Blau), Terminal (Dunkel/Grün), Nord (gedämpftes Blau/Grau), Paper (warm/hell). Keine Skins, Animationen oder Hintergrundeffekte. Auswahl wird nur im Browser gespeichert; Markdown-Dateien und Storage-Logik bleiben unabhängig davon.

## In Edge ausprobieren

Im Repository `npm start` ausführen, dann `http://127.0.0.1:8766` öffnen. Theme in der Oberfläche wählen; kein Reload für den Wechsel erforderlich. Bei schon laufendem Server nach einem neuen Build die Seite einmal neu laden. Für Dokumentprüfungen ausschließlich synthetische Vaults unter `test-vault/` auswählen.

- Alle vier Paletten durchschalten: Buttons, Dateiliste, Menüs, Status, Editor, Zeilennummern und Syntax sollen konsistent und gut lesbar sein.
- Synthetische Markdown-Datei mit Überschrift, Link, Betonung, Inlinecode und Codeblock öffnen. Auswahl, Cursor und Tastaturfokus auf jeder Palette prüfen, auch bei inaktivem Editor und Windows-/Edge-Zoom.
- Ungespeicherten Text, Markierung und Undo-Verlauf anlegen, mehrfach wechseln: Text und Undo müssen unverändert erhalten bleiben. Ohne Textänderung speichern darf keinen neuen Schreibvorgang auslösen.
- Gewählte Palette durch Reload sowie Schließen/erneutes Öffnen wiederfinden. Browserdaten sind an den Origin gebunden; `localhost` oder anderer Port verwendet eine andere Auswahl. Bei blockierter Browserpersistenz muss der Wechsel in der aktuellen Sitzung funktionieren; die Auswahl kann dann nicht dauerhaft gespeichert werden.

## Grenzen

Abschluss: 29/29 automatisierte Tests einschließlich aller bisherigen 24 bestanden, Build und Syntaxprüfungen erfolgreich (Lead/Developer). Themeprüfungen decken Persistenz/Fallback, Tokenanwendung, Text-/Auswahl-/Undoerhalt, berechnete Kontraste und erzeugtes Auswahl-/Fokus-CSS ab. Lesende unabhängige QA fand eine CSS-Kollision mit CodeMirror, die korrigiert und erneut geprüft wurde. QA selbst führte wegen alter aktiver Rollenrestriktionen keine Tests aus. Kein Theme-Browsererfolg behauptet: automatischer Browserzugriff war nicht verfügbar.

Keine JSON-Import-/Exportfunktion, kein Theme-Editor, keine weiteren Skins oder neuen Editor-/Storagefunktionen. Künftige eigene Themes benötigen separat freigegebenes Datenformat und Validierung. Rechnerische Kontrast- und Zustandstests ersetzen keine visuelle Lesbarkeitsprüfung im tatsächlichen Edge. Stundenbetrieb, RAM und Idle-Verhalten bleiben offene praktische Nachweise.

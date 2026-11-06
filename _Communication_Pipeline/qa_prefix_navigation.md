# Unabhängige QA: Präfixnavigation

2026-11-06. Rollenrevision M32A-2026-11-03 anhand AGENTS.md, agents/qa.md und .codex/agents/qa.toml bestätigt. Begrenzten gemeinsamen Stand geprüft; keine App-/Docsänderungen, Installation, Storageänderung, Unteragenten, Commit oder Push.

## Ergebnis / priorisierte Befunde
Kein nachgewiesener Implementierungsblocker im geprüften Umfang. Native Edge-Abnahme bleibt offen beim PO.

Review editor/{panel-navigation,prefix-router,work-panel,app}.mjs und zugehöriger Tests: Ring und Präfix verwenden denselben panelMove-Resolver sowie moveSelection/select/revealPanelRow; App injiziert nur Panelaktionen. Kein dupliziertes Auswahlmodell. Auswahl überspringt gesperrte Zeilen mit Umlauf; vollständig gesperrte Auswahl aktiviert nichts. Registry prüft Verfügbarkeit bei Ausführung erneut.

Wiederherstellung work-panel.mjs gezielt geprüft: refresh/render bricht in Prefix-/Hidden-/Destroyed-Modus ab; Ringsubscription überschreibt aktive Präfixhilfe nicht. Close entfernt Zeilentexte, Click-/Hoverlistener, Suchwert, Status und aktiven Descendant; Prefix-Cancel und Layoutschutz bleiben erhalten. Destroy entfernt Subscription/Shelllistener. Unicode-/Zeilenpräfix-Completion mit Längengrenze bleibt vorhanden und getestet. Kein nachgewiesener Funktionsverlust im aktuellen Modul; ohne gesicherten Zwischenstand ist keine bytegleiche Wiederherstellung behauptet.

## Selbst ausgeführte automatisierte Nachweise
- npm test: 200/200 bestanden, 0 übersprungen; gemeldete Gesamtdauer 474,6075 ms.
- npm run build erfolgreich.
- node --check für vier Module und drei zugehörige Testdateien: 7/7 erfolgreich.
- git diff --check erfolgreich, nur Zeilenendhinweise. Unversionierte Dateien werden davon nicht erfasst; relevante Module sind durch Syntax/Suite abgedeckt.
- Zusätzlich node test-vault/qa-prefix-navigation.mjs: 119 Modellfälle einschließlich 100 vollständiger Lifecyclezyklen bestanden, 33,156 ms. Reproduktion mit diesem Befehl; nur synthetischer Inhalt.

Zusatzmodell koppelt echte CodeMirror-Handlerreihenfolge (kein nativer DOM) an Panel/Router: linkes Alt-down → Pfeil-Repeats → Alt-up → Enter; Ergebnisviewport genau eine 24-Pixel-Zeile, Umlauf und übersprungene/alle gesperrte Optionen, Releasegate, Enter-Repeat, 1/2/3, Escape/C-g, IME/229/AltGr/rechtes Alt/zusätzliche Modifikatoren, Fokus-/State-/Busywechsel und nachträgliche Registry-Sperre. Text/Undo und Editor-/Seitenoffsets bleiben erhalten; danach Org-Alt außerhalb Präfix, Ringöffnung, Tab-Completion und Cleanup alter Zeilen geprüft. Die Suite deckt darüber hinaus aktualisierungsbedingtes Cancel, Fenster-/Plugin-Cleanup und reale Faltaktionen im CodeMirror-Modell ab.

Zwei anfängliche Zusatzskriptfehler waren Fixture-Annahmen (Org-Aufruf mit nichtleerer Auswahl; Ringprobe ohne zurückgesetztes Busy bzw. Ringdaten); nur QA-Skript korrigiert, abschließender Lauf grün.

## Grenzen / berichtete Ergebnisse
Keine native Edge-, QWERTZ-, physische AltGr-/IME- oder Viertelfensterprobe durchgeführt. Vorherige positive PO-Copy/Paste-Berichte sind berichtete Ergebnisse und kein neuer Nachweis dieser Navigation.

Begrenzter Ressourcenlauf: 100 Zyklen innerhalb obiger 33,156 ms; Heap vor/nach allen 119 Fällen 12.231.864 / 17.975.424 Byte, ohne erzwungene GC. Entfernte Zeilenlistener und Shells geprüft; Heapdifferenz belegt weder Leak noch Leakfreiheit. Keine Latenzperzentile oder Performancebudget-Abnahme. Keine Stundenmessung, schleichende Performance-/Idle-/Langzeitstabilität weiterhin offen; auftragsgemäß kein 65-Sekunden- oder Stundenlauf. Keine neue Großvault-, Offline-, Dateikonflikt-, Rechte- oder Wiederherstellungsabnahme; vorhandene synthetische Storage-Suitetests liefen mit, Storage wurde nicht verändert.

Nächster Schritt: Lead übernimmt Bericht; PO führt native Edgeprobe einschließlich kleiner Ergebnisfläche aus. Keine weitere Phase freigegeben.

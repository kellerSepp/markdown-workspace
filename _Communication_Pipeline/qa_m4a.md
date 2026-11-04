# QA M4a — 2026-11-04

Unabhängige Rolle `qa_m4a`; tatsächlich geladene Revision `M32A-2026-11-03` bestätigt. AGENTS.md, Rollenbrief, M4a-Prüfanleitung, Gamebook und betroffene Implementierung gelesen. Keine Anwendungscodeänderung, Installation, Unterdelegation oder produktiven Vaults.

## Ergebnis

Kein belegter Blocker in den ausgeführten automatisierten Prüfungen und im gezielten Review. **95/95 Tests bestanden**, Build erfolgreich. Syntaxprüfungen für `app.mjs`, `command-registry.mjs`, `commands.mjs`, `command-surfaces.mjs` bestanden. `git diff --check` erfolgreich; nur bestehende LF/CRLF-Hinweise.

Zusätzlich unabhängig ausgeführte In-memory-Matrix: sechs echte Markdown-Zustände (H1, H6, verschachtelte Liste, Codeblock, Frontmatter, rückwärts gerichtete Textauswahl) × 43 Befehle = **258 erneute Busy-Kontextprüfungen**. Nach angezeigtem Zustand Busy aktiviert: jede Ausführung verweigert, kein Handleraufruf, Dokumente unverändert. Alle fünf Formate in Code/Frontmatter gesperrt.

Vorhandene Tests decken Suche in Name/Beschreibung/Kategorie, unbekannte/duplizierte IDs, AltGr/IME/Repeat, Auswahlrichtung, Formatierung/Undo/Redo, Kontextmenüziele, Escape und Browserausnahme im ausdrücklich begrenzten DOM-Modell ab. Bestehende Folding-, Struktur-, Theme-, Codec- und Storage-Regressionen bestanden unverändert. Gamebook-Abgleich für 43 IDs/Name/Kategorie bestanden; redaktionelle Verhaltensangaben bleiben Reviewaufgabe.

## Gezielter Review

- Kontext vor Ausführung neu ermittelt; rein lokale Handler, keine externe Codeausführung. Labels über `textContent`, kein HTML aus Befehlsdefinitionen.
- Palette erhält Suchfokus; Escape stellt Snapshot wieder her. Ausführung restauriert Auswahl vor der Aktion, nicht danach. Kontextmenü hält Zielauswahl getrennt von Abbruchauswahl. Dokumentidentität verhindert Rückspielen veralteter Auswahl in eine andere Datei.
- Rechtsklick nur am Editor registriert, Shift+Rechtsklick ausgenommen; Escape, Pfeile, Enter, Kontextmenütaste und Shift+F10 vorhanden. Native Browserereignisreihenfolge ist damit noch nicht praktisch bewiesen.
- Installiertes CodeMirror behandelt `mousedown` mit `basicMouseSelection` nur bei linker Taste; rechte Taste setzt lediglich den Auswahlursprung. Browser-/DOM-Auswahl vor `contextmenu` und native Shift+F10-Nachfolgeereignisse bleiben reale Edge-Prüffälle.
- Toolbarfunktionen weiterhin über Registry oder bestehende eingeklappte Bereiche erreichbar; Gutter/Platzhalter verwenden dokumentierte positionsbezogene gemeinsame Folding-Primitiven. Keine Änderung am Storage-Sicherheitskern/Codec, Datenmodell oder Abhängigkeiten festgestellt.
- Neue Oberflächen reagieren auf Eingabe, kein Polling/Worker/Animation. Listener werden beim `destroy` entfernt. Kein empirischer RAM-/Leak-/Latenznachweis daraus abgeleitet.

## Tatsächlicher Edge-Versuch und Grenze

Computer-Use-Skill vollständig einschließlich Guidance/API/Bestätigungsvorgaben gelesen. `@oai/sky` initialisiert, Edge als vorhandene installierte Anwendung gestartet. Erster Zustandsabruf endete mit: „Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.“ Danach keine weiteren GUI-Eingaben und keine Umgehung. **Keine Palette-, Editor-, Maus- oder Tastaturaktion in Edge als bestanden gewertet.** Temporärer eigener Server auf 127.0.0.1:8766 gestartet und anschließend per eigener Session beendet; keine fremden Prozesse beendet.

Offene Praxisabnahme: native Rechtsklick-Vorauswahl und Escape-Restaurierung, Shift+F10/Kontextmenütaste ohne zusätzliches Browsermenü, Fokus nach Menü-Tab und Dateiauswahl, native Picker-Benutzeraktivierung, echte DE-QWERTZ/AltGr/IME, vier Themes, Bildschirmränder, 200-%-Zoom, Screenreader/Hochkontrast. Schritte stehen in `docs/COMMANDS_M4A.md`. Kein neuer PO-Browserbericht vorhanden.

Keine Stunden-, Idle-, großen Vault-, Offline-, RAM- oder Langzeit-Leakmessungen ausgeführt; Messdauer/Lastkurve/Speicher-/Latenzreihe daher offen. Kurze Testlaufzeiten sind kein Performancebudgetnachweis. M4b bleibt ohne Umsetzung.

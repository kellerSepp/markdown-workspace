# Developer M6a — 2026-11-07

## QA-Korrektur: panelweiter Abbruch

Zusätzlicher QA-Befund: Records erkannten TODO nur vor ASCII-Leerzeichen, der Editor vor beliebigem Whitespace. Records verwenden jetzt dieselbe erste-Wort-/Whitespace-Grenze wie TODO-Kontext, ohne neue Statusverwaltung. Regression prüft Space/Tab/NBSP/Emspace sowie unbekannte Präfixe und formatierten Text. Final 265/265 Tests, Build, fünf Syntaxchecks und Diffcheck grün.

QA reproduzierte fehlenden Escape/C-g-Abbruch bei Fokus auf dem gemeinsamen Schließen-Knopf außerhalb des Formulars. Der gemeinsame Panel-Keyhandler behandelt Abbruch nun im Formularmodus vor dem Early Return. Der Formularhandler stoppt Ereignisse nach eigenem Abbruch, daher keine doppelte Ausführung. Modifier-/IME-/AltGr-Guards für Header und Formular vereinheitlicht. Neue Regression prüft Headerknopf, Eingabefeld und Kalendertag sowie geschützte Modifierfälle, Text-/Stateerhalt und Fokuswiederherstellung.

Final nach Fix: 264/264 Tests, Build, fünf Syntaxchecks und Diffcheck erfolgreich. Erneut QA-Freeze; keine native Probe daraus abgeleitet.

Rollenrevision M32A-2026-11-03 bestätigt. Expliziter Engage-Auftrag begrenzt umgesetzt; keine Subagenten, Dependencies, Storageänderung, Commit oder Push.

- `planning.mjs`: UI-unabhängige Datum-/Zeitvalidierung, deutscher automatisch berechneter Wochentag, SCHEDULED/DEADLINE-Parser und atomarer Textplaner, gemeinsamer Abschnittskontext und künftige Agenda-Records (Datei/Position/Elternposition/Ebene/Titel/geladenes TODO/Scheduled/Deadline/Fehler). Reine UTC-Kalenderarithmetik verhindert lokale Datumsverschiebung. Uhrzeiten 00:00–23:59, Endzeit >= Startzeit; keine Wiederholer/Mitternachtsintervalle.
- Metadatenblock unmittelbar unter ATX-H1–H6; Kombi-/Einzelzeilen werden positionsgetreu bearbeitet, nur fehlende Angaben direkt unter Heading eingefügt. Entfernen verändert nur das Feld und erforderliche Trennzeichen. Duplikate, ungültige/fremde Fragmente, Angaben außerhalb des Blocks werden mit Fehlermeldung verweigert. Code/Frontmatter/Container/Setext geschützt; Codebody adressiert seine echte Abschnittsüberschrift. Keine TODO-Statusänderung.
- `planning-calendar.mjs`: Monatskalender ab Montag, Monatsknöpfe, Pfeilnavigation über Tage/Wochen, manuelles ISO-Datum und optionale Zeitfelder, Vorbelegung, Vorschau, Übernehmen/Entfernen/Abbrechen/Escape/C-g. Monatsnavigation ändert den Entwurf nicht. Tastaturguards und beschriftete Formularfelder.
- `work-panel.mjs` verwendet bestehende Hülle/Layout/Scrollschutz und ergänzt Formularmodus, keine parallele Panelinstanz. Stale- und Kontextprüfung, Blur/Composition/Windowblur-Cleanup sowie Fokuswiederherstellung. Kalenderneubau darf Focusout ohne neues Ziel nicht irrtümlich schließen.
- `app.mjs`, `commands.mjs`, `emacs-policy.mjs`: Registry `planning.scheduled` (Scheduling bearbeiten), `planning.deadline` (Deadline bearbeiten), Kategorie Planung, Palette/Kontextmenü/exakte Ctrl-Folgen C-c C-s und C-c C-d. Bestehendes Prefixsystem konsumiert die synthetisch zugestellte zweite Kombination; keine Ersatzbelegung eingeführt.
- `styles.css`: Form/Kalender mit vorhandenen Theme-Tokens und lokalem Scrollbereich. Synthetische Datei `test-vault/vault-structure/scheduling.md`.

Tatsächlich ausgeführt: **263/263 Tests**, Build, fünf Syntaxchecks (planning/calendar/work-panel/app/commands), Diffcheck erfolgreich. Neue Tests: Kalender/Schaltjahr/Validierung, H1–H6 alle Spalten, Abschnitt/Kind/Codebody, kombinierte Felder und Entfernung, unsichere Syntax, 20 Undo/Redo-Zyklen, Source-Records, BOM/CRLF/mixed-EOL-Codec mit unveränderten Außenbytes, 1000-Heading-Gate, Panel/Monatsnavigation/Vorschau/Übernahme/Abbruch/Entfernen/Stale/50 Cleanupzyklen, Registry+Prefix+Controllerintegration für C-c C-s/C-d.

Kein nativer Edge-/Computed-Style-/kleines-Fenster-Beleg. Lead versuchte Computer Use, Runtime startet wegen fehlendem Pfad nicht; kein UI-Eingriff. Edge Save-Konflikt bleibt echte PO-Handprobe; automatisierte Eventprävention ist keine native Zustellgarantie. Keine Langzeit-/Idle-/Ressourcenabnahme. Keine M6b-/Agenda-/Indeximplementierung. Code eingefroren für unabhängige QA.

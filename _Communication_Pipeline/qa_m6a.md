# Unabhängige QA M6a — 2026-11-07

Rollenrevision `M32A-2026-11-03` aus geladenen Instruktionen und `agents/qa.md` bestätigt. Nur synthetische In-Memory-/Test-Vault-Daten. Keine Anwendungscodeänderung, Dependencies, Storageänderung, Commit oder Push durch QA.

## Ergebnis

Final nach Developer-Freeze: **265/265 Tests**, Build, sieben Syntaxprüfungen (planning, calendar, work-panel, app, commands, policy, eigenes QA-Script) und `git diff --check` erfolgreich. Keine bewiesenen verbleibenden Blocker im geprüften Umfang.

Unabhängiges Script `test-vault/qa-m6a.mjs`: **205 Prüfgruppen** erfolgreich. H1–H6 mit/ohne TODO, Datum-/Zeit-/Schaltjahr-/Jahrgrenzen, deutsche Wochentagskorrektur, kombinierte/getrennte Planungszeilen, beide Entfernungsrichtungen, fremder Text und unbekannte Titelwörter, zehn Undo/Redo je Headingfall, Kindabschnitte, ignorierte Code-/Zitatbeispiele und konservative Verweigerung mehrdeutiger Angaben. 100 Kalenderaufbau-/Monatsnavigation-/Datumsauswahl-/Übernahme-/Listener-Cleanupzyklen. Tatsächlich aufgelöste CM-Handlerreihenfolge Cleanup → Prefix → TODO → Emacs routet beide Ctrl-Folgen genau einmal; Modifier/Repeat/IME/AltGr lösen keine Planungsaktion aus. Kein nativer Browsernachweis daraus.

## Gefundene und geschlossene Befunde

- P2: Escape/C-g schlossen nur innerhalb des Formulars, nicht bei Fokus auf dem gemeinsamen Schließenknopf in der Panelüberschrift. Developer ergänzt panelweites Abbruchhandling mit Modifierguards. Unabhängiger Retest beider Tasten vom Headerziel schließt das Panel; geschlossen.
- P2: `planningRecords` erkannte TODO nur vor ASCII-Leerzeichen; `# TODO\tTitel` verlor im Record die Statuszuordnung trotz gültiger TODO-Erkennung. Developer gleicht Wortgrenze an vorhandene TODO-Konvention an. Unabhängiger Tab-Retest liefert Status TODO und Titel Titel; Developer-Suite ergänzt weitere Unicode-Whitespacefälle. Geschlossen.

## Grenzen und Messung

Ein synchroner Records-Lauf über 2.000 synthetische Überschriften mit Planungszeilen und Body lieferte 2.000 Records in 21,93 ms (vorheriger Lauf 18,32 ms). Einzelmessungen im Node-Modell, keine p95-/Browser-/Langzeitabnahme. Kein Polling oder Vaultindex hinzugekommen. Stundenstabilität, Speicherentwicklung über lange Idle-Phasen, native Edge-Zustellung gegen Save/Bookmark, tatsächliche Darstellung im kleinen Fenster, Zoom/Assistenztechnik und AltGr/IME bleiben offen. Lead meldet fehlgeschlagenen Computer-Use-Runtimestart vor UI-Eingriff; QA leitet daraus keinen Browsererfolg ab.

M6b/M7 nicht implementiert. Gemeinsame Records/Parser bilden nur Vorbereitung für spätere Agenda. Handprobe und Grenzen in `docs/M6A_SCHEDULING.md` beachten.

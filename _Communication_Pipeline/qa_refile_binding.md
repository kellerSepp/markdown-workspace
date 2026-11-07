# QA: enger Refile-Mappingfix-Retest — 2026-11-06

Rollenrevision `M32A-2026-11-03` in geladenen Rollenregeln und agents/qa.md bestätigt; AGENTS.md und Developerbericht gelesen. Keine nachgewiesenen Implementierungsblocker im geprüften Mappingfix.

## Automatisiert tatsächlich ausgeführt
- `npm test`: 222/222 bestanden, 0 übersprungen; gemeldete Testdauer 580,1975 ms. Bestehende Suite deckt Panelnavigation, 1/2/3 und Undo/Redo ab.
- `npm run build`: bestanden. `node --check` für emacs-policy.mjs, work-panel.mjs, prefix-router.test.mjs und work-panel.test.mjs: bestanden. Zusätzlich eigenes QA-Skript syntaxgeprüft.
- `git diff --check`: bestanden; nur LF/CRLF-Hinweise bestehender Dateien.
- `node test-vault/qa-refile-binding.mjs`: 20/20 unabhängige gezielte Fälle bestanden. Reproduktion: ausschließlich synthetisches `# Source\nbody\n# Target`, Cursor 3; echte aufgelöste CM-Handlerreihenfolge mit Registry, RefileController und WorkPanel auf DOM-Modell. C-c keydown, c keyup bei gehaltenem Ctrl, Control keyup, unmodifiziertes w öffnet das Refilepanel mit Target; Dokument/Zustand bleiben unverändert.
- Ctrl+w nach Prefix öffnet kein Refile; ebenso frühes w vor c-keyup, wiederholter Prefix/Folgetaste, zusätzliche Modifier, AltGraph und IME/keyCode229. Busy, Readonly, ersetzter State, Auswahl-/Dokumentänderung, fehlendes Dokument und Fokusverlust verweigern Refile.
- w ohne Prefix wird weitergereicht und durch die synthetische Text-Fallback-Keymap eingefügt. Alt+w ohne Prefix routet ausschließlich `edit.emacs-copy`; kein M-w-Refile.
- Quellprüfung: genau ein Refileeintrag in zentraler PREFIX_BINDINGS-Policy, unmodifiziertes w; Router konsumiert diese Policy. Registryshortcut daraus `C-c w (Editor)`; Prefixzeile w und Panelhint mit Loslassen von C/Strg sowie Alt+W Copy konsistent. Gamebook-Refileeintrag und REFILE_H1 trennen neue Workspacefolge, Org-Original und PO-Tabclose-Bericht. Historische AP-06-Abschnitte und QA-Berichte nicht umgeschrieben.

Eigene Attrappe vor Abschluss korrigiert: fehlender State-Setter, Keymap an separatem statt View-State und doppelter Emacs-Handler. Zwischenläufe waren QA-Harnessfehler; erst abschließender Lauf 20/20 als bestanden gewertet. Bestehende QA-Skripte unverändert.

## Nutzerbericht und offene Grenzen
PO berichtet Tabclose bei ursprünglichem C-c C-w; hier keine native Browserprüfung. Native Ersatzfolge C-c w einschließlich Browserreserve, AltGr/IME und Layout bleibt PO-Probe gemäß docs/REFILE_H1.md. Modelle beweisen keine Browserzustellung oder allgemeine Unmöglichkeit der Interception.

Keine Last-/Langzeitmessung beauftragt oder durchgeführt: Stundenstabilität, Speicherentwicklung/Leaks, schleichende Latenzverschlechterung, Idle, große Vaults und Offline-Grenzen bleiben offen; keine Perzentil-/Budgetaussage. Datensicherheit, Konflikte, Wiederherstellung und Rechte nur bestehende automatisierte Suite, keine neue Storage-Abnahme. Nur synthetische Daten; keine App-/Docs-/Storageänderungen, Dependencies, Unteragenten, Commit oder Push. Eigentum: dieser Bericht und neues test-vault/qa-refile-binding.mjs; Build erzeugte lokale dist-Artefakte. Nach Bericht gestoppt.

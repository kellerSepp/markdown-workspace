# Developer: Refile-Mappingfix

Rollenrevision `M32A-2026-11-03` in Laufzeit und agents/developer.md bestätigt; AGENTS.md gelesen.

Ergebnis: Workspace-Refile verwendet `C-c w`: Strg+C, C und Strg loslassen, unmodifiziert w. Kleinste Policyänderung ohne Routeränderung. Ctrl+w ist keine gültige Refilefolge; Alt+W bleibt Copy. Org-Original `C-c C-w` und gemeldetes Tab-Schließen in der Dokumentation getrennt; keine allgemeine Browserunmöglichkeit behauptet.

Bearbeitet: editor/emacs-policy.mjs, editor/work-panel.mjs (Hint), editor/prefix-router.test.mjs, editor/work-panel.test.mjs, docs/REFILE_H1.md, docs/COMMAND_GAMEBOOK.md und dieser Bericht. commands.test.mjs unverändert. Vorhandene uncommitted Refilearbeit erhalten; keine Änderungen an Router, Algorithmus, History, Storage oder Lead-Dokumenten.

Tatsächlich ausgeführt: `npm test` 222/222 bestanden; `npm run build` bestanden; `node --check` für die vier genannten bearbeiteten .mjs-Dateien bestanden; `git diff --check` bestanden (nur vorhandene LF/CRLF-Hinweise). Gezielter erster Testlauf 34/35: neuer Test ließ außerhalb des Prefix absichtlich eine fehlschlagende w-Fallbackattrappe zu; Attrappe auf zählende normale Weitergabe korrigiert, Gesamtlauf danach grün.

Regressionen: gültiges unmodifiziertes w nach Release; Ctrl+w, zusätzliche Modifier, AltGr/IME, frühe und wiederholte Folgetaste ohne Refile; w außerhalb Prefix wird weitergegeben; Alt+w ruft weiterhin edit.emacs-copy auf. Panelhint und Gamebookbelegung geprüft. Bestehende Schutztests bleiben grün.

Offen: unabhängige QA des Mappingfixes, native PO-Probe der neuen Folge, AltGr/IME und Langzeitressourcen. Keine nativen Browserprüfungen oder großen neuen Matrizen ausgeführt. Keine Dependencies, Unteragenten, Commits oder Pushes. Nach Bericht gestoppt.

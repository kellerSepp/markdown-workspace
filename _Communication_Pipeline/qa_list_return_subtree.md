# QA: Return und Listenteilbaum — 2026-11-05

Rollenrevision `M32A-2026-11-03` geladen. Begrenzter unabhängiger Prüfauftrag; keine Anwendungscodeänderung, Installation, Unterdelegation oder persönlichen Daten.

## Ergebnis

Finaler Stand: **141/141 Tests bestanden**, `npm run build`, drei `node --check` für `list-interaction.mjs`, `structure-keymap.mjs`, `structure.mjs` sowie `git diff --check` erfolgreich. Kein verbleibender belegter Blocker im geprüften Umfang.

Zusätzlich **57 unabhängige Fälle** mit synthetischen In-Memory-Dokumenten bestanden:

- 14 Kombinationen aus Marker (`-`, `+`, `*`, `1.`, `9.`, `10.`, Checkbox) und Verschachtelung, jeweils Return, wiederholtes Return auf Leerfortsetzung und Alt+Return; Text, Cursor und atomare Undo/Redo geprüft. Verschachtelte nummerierte Testliste beginnt mit `1.` als gültiger Markdown-Listenbeginn.
- PO-Beispiel über tatsächlich ausgeführtes `runLineMove` nach oben und anschließendes Ausrücken: `test3` vier auf zwei Leerzeichen, `test2` unverändert bei zwei. Unmittelbare zweite Ausrückaktion behält die begrenzte Wiederholungsregion bei.
- Drei Fälle mit echten Kindern und mehrzeiligen Fortsetzungen erhalten Folgepunkt und verschieben Kinder/Fortsetzung passend.
- Fünf Return-Modifierfälle (Ctrl, Meta, IME, AltGraph, Shift allein) erreichen keinen Listenhandler; vier geschützte Kontexte (Prosa, Fence, Frontmatter, Blockquote) bleiben unverändert ohne Undo-Eintrag.

## Gefundener und korrigierter Randfall

Zunächst reproduziert: `- Root\n    - Active\n  -\n- Tail`; Ausrücken veränderte auch den leeren geringeren Folgepunkt ohne Schlussleerzeichen und übersprang die Zwischenebene. Bei `+`/`*` ohne Space blieb der Folgepunkt erhalten, aber die Zwischenebene wurde übersprungen. Lead meldete dies an Developer; QA änderte keinen Code.

Nach Developer-Korrektur **12 unabhängige Retests bestanden**: Folgepunktmarker `-`, `+`, `*`, `1.` jeweils ohne Schlussleerzeichen, mit Leerzeichen und mit Text. `Active` vier auf zwei, Folgepunkt bytegleich; Undo/Redo und Cursor geprüft. Anschließend finale Gesamtsuite und Build/Syntax/Diff erneut erfolgreich.

## Grenzen

Automatisierte Node-/CodeMirror-Prüfung, keine native Edge-/QWERTZ-/AltGr-/IME-Bedienprobe. Physische Befehlsfolge automatisiert nachgewiesen; Browserzustellung separat offen. Keine Stundenmessung, Memory-Leak-, Idle- oder Langzeitlatenzprüfung: dieser kurze Lauf belegt keine Langzeitstabilität. Storagekern und bestehende Sicherheitsgrenzen unverändert; keine Commit-/Push-Aktion.

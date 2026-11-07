# Developerbericht TODO — 2026-11-07

Rollenrevision `M32A-2026-11-03` aus tatsächlichen Rolleninstruktionen und Rollenbrief bestätigt. Explizite PO-Freigabe „Feuer Frei“ und begrenzter Leadauftrag umgesetzt; bestehende Refile-/Planungsänderungen erhalten.

- `editor/todo.mjs`: dateilokale Regeln mit Default, validierter einzelner SEQ_TODO-Definition, explizitem Reload/Fehlererhalt, reiner Statusplanung, Controller, Shift-Tastaturadapter und sichtbereichsbezogenen Dekorationen. Frei benannte Status ohne Whitespace/`()|`, ein ASCII-Buchstabe pro Schnellwahl, keine reinen Hash-Namen (Markdown-Mehrdeutigkeit). Namen sind exakt/case-sensitive, Schnellwahltasten case-insensitive eindeutig; Definition `#+SEQ_TODO:` exakt großgeschrieben. Code/Frontmatter/Container/HTML ignoriert.
- H1–H6 einschließlich H1→H2→H3 mit jeweils eigenen Status; Änderung berührt ausschließlich die aktuelle Überschrift. Statusloses Kind erbt nichts; Codebody adressiert seine echte Abschnittsüberschrift. Keine Eltern-/Kinderautomatik und keine Agenda.
- Integration in `app.mjs`, `commands.mjs`, `emacs-policy.mjs`: C-c t / C-c C-c sowie Registry-/Mauszugang und Shift+Links/Rechts auf ganzer Aufgabenüberschrift. Nach Entfernen des Status ist die Überschrift normal; folgende Shift-Pfeile markieren wieder Text. Zur erneuten Aufgabe per Panel wählen. Kein Status über Leertaste.
- `work-panel.mjs` verallgemeinert bestehende H1-Auswahl mit eigenen Beschriftungen/Fastkeys für TODO; Layout/Navigation/Scrollschutz/Stale-Zielprüfung/Cleanup bleiben gemeinsam. Leere aktive Emacs-Marke vor intentionalem Panelblur gelöst, damit das Panel sein Ziel nicht selbst verwirft.
- `themes.mjs`/`theme-editor.mjs`: zentrale grüne/rote Tokens, zusätzlich offene Status gepunktet unterstrichen und abgeschlossene durchgestrichen; Panel bezeichnet offen/abgeschlossen ausdrücklich.
- Neue `todo.test.mjs`, ergänzte Commands-/Prefix-/Paneltests; synthetische Handprobe `test-vault/vault-structure/todo.md`.

Final tatsächlich ausgeführt: **239/239 Tests**, `npm run build`, sieben Syntaxchecks (TODO/App/Commands/Panel/Policy/Themes/Themeadapter) und `git diff --check` erfolgreich. Gezielt u.a. alle H1–H6-Spalten, Hierarchie/Codebody/Schutzfälle, Grammatik/Fehlerreload, 20 Undo-/Redozyklen, 100 Panel-Cleanupzyklen, Fastkeys/Leertaste/Registry+Prefixintegration, Transaktionsfilterverweigerung, 2.200-Heading-Datei mit Definition am Ende und sichtbereichsbezogenen Marks, rechnerischer Kontrast ≥4,5 aller acht Task-Farbpaare.

Große Dateien: Regeln verwenden explizit den vollständigen `ensureSyntaxTree`-Rückgabebaum, Änderungen verlangen vollständig veröffentlichten Parserbaum; bis dahin sicher verweigert. Keine Hintergrundscans oder Polling. Keine Storageänderung, Dependencies, Commit oder Push. Keine native Browserprüfung durchgeführt; Tastenzustellung/Zoom/kleines Fenster/AltGr/IME und Langzeitressourcen bleiben offen. Keine Aussage über Stundenstabilität oder Browserzustellung aus Modelltests.

## Korrektur nach unabhängigem QA-Befund

QA reproduzierte: Eine aktive, noch leere C-SPC-Marke fing Shift+Rechts im früher registrierten Emacs-Handler ab. Korrigiert ausschließlich in `app.mjs`: TODO-Keyboard vor Emacs-Keyboard registrieren (beide höchste Priorität); Präfixrouter bleibt davor. Außerhalb einer Aufgabenüberschrift und bei nichtleerer Auswahl gibt TODO unverändert an Emacs/Textmarkierung weiter. Neue Regression prüft die tatsächliche App-Reihenfolge und aufgelösten CodeMirror-DOM-Handler mit leerer aktiver Marke auf Task, markierter Region, Body und normaler Überschrift.

Finaler Retest nach Korrektur: **240/240 Tests**, Build, sieben Paket-Syntaxchecks und Diffcheck erfolgreich. Keine QA-Skripte oder fremden Dokumente geändert. Erneute Übergabe an unabhängige QA; Code ab jetzt eingefroren.

## Zweite Korrektur: unveröffentlichter vollständiger Parserbaum

QA fand bei großer Datei eine fälschlich verfügbare Reloadaktion auf einer scheinbaren Definition in einem noch nicht veröffentlichten Codeblock. Ursache: `syntaxTreeAvailable` kann nach fortgesetzter Analyse bereits wahr liefern, während `syntaxTree(state)` noch einen kurzen Snapshot enthält. `todoDefinitionLine` und `todoContext` verlangen jetzt zusätzlich die volle Länge des tatsächlich verwendeten veröffentlichten Baums. Availability führt keine neue Analyse aus; bis Veröffentlichung wird sicher verweigert. Regression prüft große FencedCode-/Listen-/HTML-/Frontmatterfälle und eine gültige Definition vor/nach Veröffentlichung.

Finaler Retest: **241/241 Tests**, Build, sieben Paket-Syntaxchecks und Diffcheck erfolgreich. Erneut Freeze zur unabhängigen QA.

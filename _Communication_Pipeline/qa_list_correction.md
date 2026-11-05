# QA Listen-Tab/Folding/Einfügen — 2026-11-05

Rollenrevision `M32A-2026-11-03` in geladenen QA-Anweisungen bestätigt. Unabhängige Prüfung nach Developer-Abschluss; Anwendungscode nicht geändert, keine Unterdelegation, Installation, persönlichen Daten oder Commit/Push.

**Ergebnis:** Nach gezielter Korrektur kein verbleibender Blocker im geprüften Umfang. Final **137/137 Tests**, `npm run build`, Syntaxprüfungen von `editor/list-interaction.mjs` und `editor/structure-keymap.mjs` sowie `git diff --check` bestanden. Diffcheck nur mit Git-Hinweisen zur künftigen CRLF-Konvertierung. Gesamttestdauer zuletzt rund 359 ms; daraus folgt kein Bedienlatenz- oder Ressourcenbeleg.

## Eigene unabhängige Prüfungen

51 zusätzliche In-memory-Fälle mit Assertions ausgeführt:

- Fünf Ebenen × `-`, `+`, `*`, `9.`, `10.`: gerichtetes Einrücken leerer Items, exakte Text-/Cursorwiederherstellung durch ein Undo und Redo. Verschachtelte nummerierte Starts mit erforderlicher CommonMark-Leerzeile; ein zunächst ungültiger synthetischer Fixtureaufbau wurde korrigiert, kein Produktfehler daraus abgeleitet.
- Fünf Einfügefälle einschließlich leerer Checkbox, nummerierter Geschwister mit Kindern/Fortsetzung und mehrzeiligem verschachtelten Item; drei Checkbox-Einfügefälle. Jeweils atomare Historie und Cursor-Roundtrip.
- Vier Readonly-, acht Frontmatter-/Code-/Zitat-/Fortsetzungs- und vier Auswahlverweigerungen ohne unerwünschte Text-/Historyänderung.
- Globaler Zyklus mit sechs Listenebenen, mehreren Überschriften und zwei Listen: vollständig öffnen erreichbar, Cursor bleibt sichtbar, kein Text-Undo; eigene Auswahltransaktion beendet die Fortsetzung.
- Registry verweigert einen zuvor verfügbaren Einfügebefehl nach Wechsel auf Busy erneut, ohne Handleraufruf oder Textänderung.

Bestehende Tests prüfen zusätzlich echte aufgelöste CM-Handlerreihenfolge, Heading-/Alt-/Tabregressionen, AltGr/IME-Guards, Escape/Fokus, Registry/Gamebook sowie Storage-/Codec-Sicherheitsfälle. Integration von vier `list.*`-Befehlen in Registry und Anwendung lesend geprüft.

## Gefundene und behobene Befunde

1. `- Parent\n  - Child\n\n  own tail\n- Next`, Cursor auf Parent: lokales Tab verbarg zunächst auch den eigenen Schlussabsatz. Ursache: Faltende am ganzen Item statt an der tatsächlichen Unterliste.
2. `- Parent\n  ```\n  own code\n  ```\n  - Child\n- Next`, Cursor auf Parent und eigene Codefalte vorab gesetzt: Tab öffnete zunächst die Codefalte und faltete die Children nicht. Ursache: zu breiter Filter bestehender lokaler Falten.

An Lead gemeldet, ausschließlich Developer korrigierte. Neuer gemeinsamer `childRanges`-Weg begrenzt lokale und globale Listenbereiche auf tatsächliche direkte Unterlisten; lokales Tab verändert nur darin liegende Falten. Developer ergänzte zwei Regressionstests.

Unabhängiger Retest mit vier eigenen Assertions bestanden: Schlussabsatz bleibt bei lokalem **und** globalem Listenfalten sichtbar; eigene Codefalte bleibt beim Ein-/Ausklappen der Children exakt erhalten; zwei getrennte direkte Unterlisten werden gemeinsam gefaltet, dazwischenliegende eigene Absätze bleiben sichtbar. Text und Text-Historie unverändert. Danach vollständige 137er-Suite und Build erneut erfolgreich.

## Grenzen und nächste Abnahme

Konservative Markdown-Verweigerungen gemäß Listenanleitung bleiben: erste Itemzeile, einzelner Cursor, keine unsicheren komplexen Splits/Container; fremde Elternzuordnungen dürfen durch Einrücken/Einfügen nicht verändert werden. Ein Checkboxmarker kann eine nummerierte Liste in getrennte Markdown-Listen aufteilen.

Keine native Edge-/Windows-/QWERTZ-/AltGr-/IME-/Screenreader-Prüfung durchgeführt. Keine Stunden-/Idle-/Memory-Leak-/Offline- oder große-Vault-Messreihe; keine Performancefreigabe. Nur synthetische In-memory-Dokumente und bestehende Tests verwendet. Nach Lead-Integration Bericht und Stopp; M4b.2 bleibt außerhalb des Auftrags.

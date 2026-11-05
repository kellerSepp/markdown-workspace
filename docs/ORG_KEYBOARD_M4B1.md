# M4b.1: Org-Tastatur und Abnahme

Die Org-Kompatibilität gilt für die unten beschriebenen Befehle und Grenzen, nicht für einen vollständigen Org-/Emacs-Editor. Markdown bleibt das Primärformat. Bestehende Struktur-IDs bleiben erhalten; neue explizite Einzel-/Unterbaumaktionen verwenden dieselben Planer. Tastatur, Palette und Kontextmenü führen identische Registry-Commands aus. Die frühere Checkbox „Unterstruktur mitnehmen“ beeinflusst die neuen Org-Aktionen nicht.

## Verbindliche Referenz und Prüfung

- [Org-Handbuch 9.8: Structure Editing](https://orgmode.org/manual/Structure-Editing.html): einzelne Überschrift mit Meta-Links/Rechts; Unterbaum mit zusätzlichem Shift; Meta-Oben/Unten tauscht bereits ganze gleichrangige Unterbäume.
- [Orgcard 9.8.12](https://orgmode.org/orgcard.pdf): Shift-Meta-Oben/Unten verschiebt die aktuelle Zeile. Der PO hat dieses Verhalten nach anfänglicher Rückfrage ausdrücklich bestätigt.
- [Plain Lists](https://orgmode.org/manual/Plain-Lists.html): Meta-Oben/Unten nimmt Unterpunkte mit; Meta-Links/Rechts ändert nur das Item, Shift-Meta auch dessen Unterpunkte.
- [Global and local cycling](https://orgmode.org/manual/Global-and-local-cycling.html): lokale und globale Dreistufenzyklen.
- Ergänzender tatsächlicher Quellreview: [org-list.el](https://raw.githubusercontent.com/bzg/org-mode/main/lisp/org-list.el), insbesondere `org-list-indent-item-generic`, und [org-cycle.el](https://raw.githubusercontent.com/bzg/org-mode/main/lisp/org-cycle.el), insbesondere CHILDREN mit `org-fold-show-entry` und `org-fold-show-children`. Der aktuelle Entwicklungszweig ist 10.0-pre, kein stabiler 9.8-Versionsnachweis; stabile Handbuch-/Orgcard-Regeln haben Vorrang. Kein installierter Emacs-Lauf als Test behauptet.

## Vier getrennte Tastaturfälle

| Workspace | Org-Original | Verhalten |
| --- | --- | --- |
| Alt+Links / Alt+Rechts | M-LEFT / M-RIGHT | Nur aktuelle Überschrift höher-/tieferstufen; in erster Listenpunktzeile nur Item aus-/einrücken. Children werden nicht automatisch mitgestuft. |
| Alt+Shift+Links / Alt+Shift+Rechts | M-S-LEFT / M-S-RIGHT | Überschriften-/Listen-Unterbaum gemeinsam aus-/einrücken; relative Level erhalten. |
| Alt+Oben / Alt+Unten | M-UP / M-DOWN | Ganzen Unterbaum beziehungsweise Listenpunkt einschließlich Unterpunkten mit vorherigem/nächstem gleichrangigem Geschwister tauschen. Keine übergeordnete Grenze überschreiten. |
| Alt+Shift+Oben / Alt+Shift+Unten | M-S-UP / M-S-DOWN | Aktuelle physische Zeile mit Nachbarzeile tauschen, unabhängig von Ebenen. Keine Markeränderung und kein implizites Mitnehmen von Unterbäumen. |

Pfeiltasten sind vom QWERTZ-Buchstabenlayout unabhängig. Die Umsetzung reagiert auf `event.key`, ignoriert AltGr/Control/Meta/IME und fängt keine gewöhnliche Eingabe ab. Nur im Editor registriert; Alt-Strukturbefehle erfordern eine einzelne Cursorstelle auf einer tatsächlichen Heading- beziehungsweise ersten Itemzeile. Auf gewöhnlichen Absätzen greift keine behauptete Org-Elementbewegung. Zeilenverschieben gilt auch im gewöhnlichen Text. Nichtleere oder mehrfache Auswahlen bleiben unverändert; Org-Regionoperationen sind nicht umgesetzt.

Erkannte Befehle werden auch an Strukturgrenzen abgefangen und melden die Verweigerung. Außerhalb ihres Kontexts wird Alt-Navigation nicht pauschal verhindert. Konkurrierende CodeMirror-Defaults für Alt-Oben/Unten (`moveLineUp/Down`) und Shift-Alt-Oben/Unten (`copyLineUp/Down`) sind entfernt. Es wird keine Zeile versehentlich kopiert. Die tatsächliche Tastenzustellung durch Edge/Windows muss praktisch geprüft werden; keine zuverlässige Kombination ohne Browsernachweis behaupten. Palette per Alt+X und Kontextmenü sind Maus-/Tastaturalternativen.

### Korrektur nach PO-Praxistest: Alt-Priorität und Browsermenü

Der PO meldete funktionierende Oben-/Unten-Varianten, aber Cursorbewegung bei Alt-Links/Rechts und Browserauswahl durch Alt allein. Ursache im installierten CodeMirror: Der allgemeine Keymap-DOM-Handler lief vor unserem Org-Handler und führte `cursorSyntaxLeft/Right` beziehungsweise die Shift-Auswahl aus. Der Org-Handler hat jetzt ausdrücklich höchste Präzedenz. Er führt erkannte Strukturaktionen genau einmal aus, bevor normale Cursorbefehle zum Zug kommen; außerhalb des Strukturkontexts bleibt die normale Verarbeitung erhalten.

Linkes Alt allein wird bei tatsächlichem Editorfokus auf `keydown` und zugehörigem `keyup` mit `preventDefault` behandelt. Ein erkannter Org-Alt-Befehl behält diese Freigabebehandlung; unbekannte Alt-Kombinationen sowie Fokusverlust löschen den vorgemerkten Zustand. Rechtes Alt, AltGr, Control/Alt, IME und Eingaben außerhalb des Editors bleiben ausgenommen. Es gibt keine globale Alt-Sperre und keine Änderung an Edge-/Windows-Einstellungen.

Das unterdrückt die Standardaktion nur für Ereignisse, die der Browser an die Seite liefert und abbrechen lässt. Ein vollständiger Schutz gegen Browser-/Betriebssystemtasten kann ohne tatsächliche Edge-Prüfung nicht zugesichert werden. Native Edge-Abnahme bleibt offen; die bisherigen Computer-Use-Versuche wurden vor App-Eingaben gestoppt. Falls Alt weiterhin Browserfokus auslöst, bleiben dieselben Commands per Palette-Schaltfläche und Kontextmenü erreichbar. Eine mögliche andere Belegung wäre Strg+Umschalt+Pfeile, würde aber bestehende Auswahlkürzel ersetzen und ist noch nicht aktiviert.

Zusätzliche Praxisfälle: Cursor auf `## A` beziehungsweise die erste Zeile eines Listenpunkts setzen und Alt-Links/Rechts mit/ohne Shift prüfen. Alt allein drücken und loslassen: Fokus soll im Editor bleiben. Anschließend AltGr-Zeichen, Alt+Tab, unbekannte Browserkombinationen und Alt außerhalb des Editors vergleichen. Die neuen automatisierten Tests prüfen die tatsächlich aufgelöste CodeMirror-Pluginreihenfolge einschließlich des Keymaphandlers; sie ersetzen keine Browsermenü-Abnahme.

## Folding und Tab-Konflikt

**Standard bleibt Struktur-Tab:** bisherige Heading-Level-/Listen-Einrückung und Codeeinrückung bleiben erhalten. Die Checkbox „Org-Tab-Modus (nur Sitzung)“ unter Editoroptionen beziehungsweise der gleichnamige Palettenbefehl aktiviert ausdrücklich eine andere Tab-Belegung.

| Kontext bei aktivem Org-Tab | Tab | Shift+Tab |
| --- | --- | --- |
| Überschriftenzeile | FOLDED → CHILDREN → SUBTREE | OVERVIEW → CONTENTS → SHOW ALL für gesamtes Dokument |
| Gewöhnlicher Absatz | normale Fokusnavigation | globaler Zyklus |
| Liste | bisheriges Struktur-Einrücken | bisheriges Struktur-Ausrücken |
| Codeblock | bisherige Codeeinrückung | bisheriges Code-Ausrücken |

CHILDREN zeigt den eigenen Text der Überschrift und die direkten Kindüberschriften, verbirgt deren Inhalte und tiefere Unterbäume. Ohne Kindüberschriften wird die Zwischenstufe ausgelassen. Globale CONTENTS zeigt alle Überschriften ohne deren Textkörper. Folding verändert weder Text noch Undo-Verlauf und verwendet vorhandene CodeMirror-Faltbereiche. Cursor wird vor dem Verbergen auf eine sichtbare Stelle versetzt. Die bisherigen vierstufigen Faltbefehle und Gutter/Platzhalter bleiben als getrennt bezeichnete Workspace-Funktionen erhalten.

**Escape, danach Tab oder Shift+Tab** aktiviert weiterhin zeitunabhängige Fokusnavigation aus dem Editor. Erneuter Eintritt aktiviert den gewählten Tab-Modus. Listen-Tab ist bewusst noch kein vollständiges Org-Listenfolding; leere Eintragszyklen, Tabellenfelder, Startup-Properties, Drawers und Präfixargumente sind nicht implementiert.

## Grenzen und Sicherheitsabweichungen

- H1–H6 statt unbegrenzter Org-Level; verletzt ein Unterbaum die Grenzen, wird die gesamte Aktion verweigert. Levelmarker der Nachbarabschnitte werden nie still angepasst.
- Einzel-Ausrücken eines Items mit Children wird entsprechend dem Quellcheck verweigert. Einzel-Einrücken lässt die absolute Einrückung der Children unverändert; das kann sie zu Geschwistern machen. Legacy-Checkboxaktionen behalten ihre frühere, anders bezeichnete Semantik.
- Zeilenbewegung ist bewusst einzeln und nicht auf aktive Regionen erweitert. In oder über Codeblöcke/Fences und Frontmatter wird sie zusätzlich verweigert. Gegenüber allgemeiner Emacs-Zeilenbewegung ist das eine Markdown-Sicherheitsgrenze. Außerhalb dieser Grenzen kann Zeilenbewegung die abgeleitete Hierarchie ändern; Rohmarker bleiben exakt gleich.
- Kein Refile, dateiübergreifendes Verschieben, Shortcuteditor, Sequenzautomat, neues Dateiformat, Storage-Eingriff oder Paket.

## In Edge manuell prüfen

1. `npm start`, dann `http://127.0.0.1:8766` in Edge öffnen. Nur den Repository-Unterordner `test-vault/vault-structure` wählen; `org-keyboard.md` öffnen. Fremde Server nicht beenden.
2. In `### A` Alt+Links und Alt+Rechts mit ausgeschalteter und eingeschalteter Unterstruktur-Checkbox vergleichen: nur aktuelle Marker ändern. Undo/Redo muss Text und Cursor wiederherstellen. Mit Shift dieselben Aktionen auf den Unterbaum anwenden; Kindabstände erhalten.
3. In `### A` Alt+Unten: gesamter Unterbaum tauscht mit `### B`; `## Zweiter Elternabschnitt` darf nicht übersprungen werden. In `### B` am Rand Verweigerung prüfen. H1-Promote und H6-Demote müssen atomar ablehnen.
4. In einer Headingzeile Alt+Shift+Oben/Unten: genau eine physische Zeile verschieben, auch an einer andersstufigen Headingzeile vorbei. Kinder nicht automatisch mitnehmen, keine `#` ändern. Undo/Redo, Anfang/Ende und Unicode-Cursor prüfen. Fences/Frontmatter dürfen nicht überquert werden.
5. Listenitemzeilen mit Alt und Alt+Shift Links/Rechts prüfen: Single und Subtree unterscheiden; oben/unten nimmt Children mit. Erstpunkt bewegt die ganze Liste; Wiederholungen behalten die Anfangsregion. Single-Outdent mit Kindern und Markdown-Codeumdeutung verweigern.
6. Ohne Org-Tab bisheriges Tab prüfen. Org-Tab explizit aktivieren, Heading-Tab dreimal und Shift+Tab dreimal drücken. Liste/Code behalten dokumentierte Struktur-/Codebelegung. Escape, dann Tab muss zuverlässig den Editor verlassen.
7. Alt+X → „Kürzelübersicht“ anklicken: Org-Original und Workspace getrennt lesen, suchen und dieselben Commands ausführen. Kontextmenü vergleichen. Klick/Enter/Escape müssen Auswahl und Fokus korrekt behandeln.
8. Außerhalb Editor Alt+Links/Rechts auf Browserverhalten prüfen. Im normalen Text `gj`, `ga`, `x`, AltGr-Zeichen und IME eingeben; keine Strukturaktion. Echte DE-QWERTZ-, Windows-/Edge-Konflikte, vier Themes und Zoom separat protokollieren.

Automatisiert werden reine Planer, echte Markdown-ASTs, CodeMirror-Historie/-Tab-Keymaps, Shortcutguard, Scope-Metadaten und ein begrenztes DOM-Modell geprüft. Diese Tests beweisen keine native Edge-Ereigniszustellung, sichtbare Auswahl, Screenreaderbedienung oder Langzeitressourcen. QA berichtet tatsächliche Browseraktionen separat.


M4b.1a aktualisiert Listen-Erstpunkt, Folgegeschwister, Wiederholungsregion und Nummernbreiten. Aktuelle Semantik, verbleibende Grenzen und Testanleitung: [ORG_LISTS_M4B1A.md](ORG_LISTS_M4B1A.md).

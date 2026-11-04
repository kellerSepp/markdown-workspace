# Projektstatus

**Phase:** 2 — M4b.1 Org-referenzierte Tastatursteuerung
**Stand:** 2026-11-04
**Anwendungscode:** separater Editor in `editor/`; unveränderter Schreibkern in `spike/storage.mjs` wiederverwendet.
**Freigabe:** M4b.1 gemäß PO-Auftrag: Org-referenzierte Strukturkürzel, klare Tab-Faltkonfliktlösung, Registry/Gamebook und einfache Palettenhilfe. M4b.2 bleibt gesperrt; keine Storage-/Datenmodelländerung, neuen Pakete oder Veröffentlichung.

## Aktuelles Arbeitspaket M4b.1

### Nachbesserung nach PO-Edge-Test — implementiert und unabhängig geprüft

- Neuester PO-Praxistest: Alt-Korrektur scheint zu funktionieren; PO konnte aktuell keine Bugs feststellen. Nutzerbericht, kein neuer unabhängiger Edge-Vollnachweis. PO gibt lokalen Gesamtcommit frei; kein Push. Commit enthält Projektcode, Tests, Dokumentation/Rollen und geprüfte synthetische Fixtures. Lokale `.storage-spike-backups` bleiben auf Platte und sind von Git ausgeschlossen; keine persönlichen Vaults, Zugangsdaten oder Build-/Abhängigkeitsverzeichnisse aufnehmen.
- Commitvorbereitung: `.gitattributes` erhält synthetische `test-vault/**` bytegetreu (keine automatische EOL-Konvertierung; Fixture-Leerzeichen bewusst erhalten). `.gitignore` schließt lokale Testlauf-Backups aus. Staged Umfang auf Dateiliste und typische Geheimnismuster geprüft; keine passenden Zugangsdatenmuster gefunden.

- PO berichtet: Alt-Links/Rechts bewegt Cursor statt Heading-/Listenstruktur; Alt-Auf/Ab und Shift-Alt-Auf/Ab funktionieren grundsätzlich. Alt allein aktiviert weiterhin Browserauswahl. Kein unabhängiger Browsernachweis daraus abgeleitet.
- `developer_alt_fix` implementierte/testete; `qa_alt_fix` prüfte unabhängig. Beide bestätigen Rollenrevision `M32A-2026-11-03`. Keine zusätzliche Featurefreigabe/M4b.2.
- Ursache am installierten CodeMirror nachgewiesen: dessen allgemeiner Keymap-DOM-Handler verbrauchte Alt-Links/Rechts als `cursorSyntaxLeft/Right`, bevor der normale Org-DOM-Handler lief. `Prec.highest` gibt dem fokussierten Org-Handler jetzt Vorrang; außerhalb passendem Strukturkontext bleibt Cursorfallback bestehen.
- Linkes Alt allein wird ausschließlich bei Editorfokus auf Drücken/Loslassen abgefangen. Rechte Alt/AltGr, Control/Meta/IME, fremde Alt-Kombinationen und Fokusverlust sind ausgenommen; keine globale Tastensperre. Browser-/OS-reservierte Tasten bleiben praktische Abnahmegrenze.
- Developer und QA jeweils **110/110 Tests und Build bestanden** (108 bestehende plus zwei neue Eventpipeline-/Modifierprüfungen), zwei Syntaxprüfungen und Diffprüfung erfolgreich. Neue Tests durchlaufen tatsächliche aufgelöste CM-ViewPlugin-Handler inklusive echter Keymap und vorangestellter Konkurrenzbindung, nicht nur direkten Org-Resolveraufruf. Vollständige Alt-Down/Arrow/Up-, Shift-, fremde Chord-, AltGr-/IME-/Fokusfolgen abgedeckt. [Unabhängiger QA-Bericht](../_Communication_Pipeline/qa_alt_fix.md).
- Edge von QA ausgewählt, erster Zustandsabruf hing und wurde nach 420,9 Sekunden durch Lead-Interrupt abgebrochen. Keine App-Eingaben/Browsererfolge; keine weitere GUI-Aktion oder Umgehung. Native Alt-Menüunterdrückung bleibt offen. Nach aktuellem Build Seite mit Strg+F5 neu laden und auf Heading-/Itemzeile Alt-/Shift-Alt-Links/Rechts sowie linkes Alt allein prüfen. Alternativvorschlag Strg+Shift+Pfeile nur dokumentiert (Konflikt mit Auswahlkürzeln), nicht aktiviert.
- Bugfix-Dateien: `editor/structure-keymap.mjs`, neu `editor/alt-keyboard.test.mjs`, `docs/ORG_KEYBOARD_M4B1.md`, `docs/COMMAND_GAMEBOOK.md`; Lead ergänzt Gate/REQUIREMENTS/DECISIONS/ARCHITECTURE und diesen Status; QA-Bericht `_Communication_Pipeline/qa_alt_fix.md`. Keine neue Belegung, Storage-/Paketänderung oder Veröffentlichung. Nach Bericht stoppen, PO-Rückmeldung abwarten.

### Vorheriger M4b.1-Abschluss

- `developer_m4b1` (developer) implementierte/testete; `qa_m4b1` (qa) prüfte danach unabhängig. Beide bestätigten geladene Rollenrevision `M32A-2026-11-03`. Lead prüfte offizielle Org-Referenzen, reviewte und integrierte Freigabe/Architektur/Dokumentation. Keine Unterdelegation oder parallele Spezialistenarbeit.
- Org-Handbuch/Orgcard geprüft: Meta-Auf/Ab bewegt bereits Unterbäume, Shift-Meta-Auf/Ab beschreibt Zeilenverschieben. PO stellte auf Rückfrage klar: Alt+Shift+Oben/Unten soll die aktuelle Zeile unabhängig vom Ebenenlevel verschieben, genau wie Org/Emacs. Struktur-Tab bleibt Standard, explizite Org-Tab-Sitzungsoption löst den Faltkonflikt.
- Developer und QA jeweils **108/108 Tests und Build bestanden**; QA zusätzlich vier Syntaxprüfungen und `git diff --check`. 95 bisherige Verhaltensprüfungen erhalten; Katalogzählung und additiver Gamebook-Kürzelabgleich aktualisiert. Zwölf Org-/Zeilentests und ein Palettenhilfetest ergänzt. QA-eigene Repros: 72 Headingfälle (57 akzeptiert, 15 atomar verweigert) über H1–H6, Single/Subtree und drei Cursorpositionen mit Text-/Undo-/Redo-/Cursorprüfung; 54 Zeilenfälle (26 Bewegungen, 28 sichere Verweigerungen) über Unicode/EOF/Leerzeilen/Code/Frontmatter; 406 erneute Busy-Kontextprüfungen, kein Handleraufruf. Kein belegter Blocker im geprüften Umfang. [QA-Bericht](../_Communication_Pipeline/qa_m4b1.md).
- **58 Registry-Befehle**: 15 Ergänzungen (zehn explizite Strukturvarianten, zwei Org-Faltzyklen, Org-Tab-Schalter, zwei Zeilenbewegungen), bestehende IDs erhalten. Original-/Workspace-Kürzel und Kompatibilitätsgrenzen in Palette/Gamebook; automatische Driftprüfung erweitert.
- Eindeutige vier Fälle: Alt-Links/Rechts Single, Shift-Alt-Links/Rechts Unterbaum; Alt-Oben/Unten gleichrangiger Unterbaumtausch innerhalb Elternabschnitt; Shift-Alt-Oben/Unten physische Zeilenbewegung ohne Markeränderung. Org-Befehle unabhängig von Legacy-Unterstrukturcheckbox. Kontextprüfung, AltGr-/IME-Schutz und atomare Undo/Redo-Cursorwiederherstellung; konkurrierende CM-Alt-LineMove/LineCopy-Defaults entfernt.
- Org-Tab ausdrücklich optional: Heading-Tab lokal FOLDED/CHILDREN/SUBTREE, Shift-Tab global OVERVIEW/CONTENTS/SHOW ALL außerhalb Liste/Code; identische Stufen überspringen. CHILDREN zeigt eigenen Body und direkte Kindüberschriften. Listen/Code behalten bisherige Tab-Bedeutung; Escape-Fokusausstieg bleibt. Vorhandenes vierstufiges Workspace-Folding bleibt separat.
- Grenzen: keine Org-Regionoperationen, Struktur nur tatsächliche Heading-/erste Itemzeile, H1–H6 und bestehende Markdown-Schutzgrenzen. First-item-Listenunterbaumverschiebung, Ausrücken mit folgenden Geschwistern und unmittelbare Wiederholungsregion konservativ gesperrt. Zeilenbewegung in/über Frontmatter oder Code/Fences zusätzlich gesperrt. Einzel-Outdent mit Children entsprechend geprüftem Org-Verhalten verweigert. Details: [ORG_KEYBOARD_M4B1.md](ORG_KEYBOARD_M4B1.md).
- Tatsächliche Edge-Prüfung erneut vor App-Eingaben durch Computer Use gestoppt (Browser-URL nicht zuverlässig erkennbar). Keine Alt-Zustellung, Appbedienung oder QWERTZ-Praxis als bestanden behauptet. Kein eigener QA-Server gestartet. Native Edge-/Windows-/AltGr-/IME-/Fokus-/Zoom-/Screenreaderprüfung sowie Langzeitressourcen offen.
- M4b.1-Dateien: `editor/app.mjs`, `editor/index.html`, `editor/structure.mjs`, `editor/structure-keymap.mjs`, `editor/commands.mjs`, `editor/command-registry.mjs`, `editor/command-surfaces.mjs`, `editor/commands.test.mjs`, `docs/COMMAND_GAMEBOOK.md`; neu `editor/org-structure.mjs`, `editor/org-folding.mjs`, `editor/line-move.mjs`, `editor/org-keyboard.test.mjs`, `docs/ORG_KEYBOARD_M4B1.md`, `test-vault/vault-structure/org-keyboard.md`. Lead ergänzt `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PHASES.md` und diesen Status; QA liefert `_Communication_Pipeline/qa_m4b1.md`. Keine Storage-/Codec-/Paket-/Frameworkänderung oder Installation/Veröffentlichung.

**Nächste Aktion:** Nach Abschlussbericht stoppen und PO-Rückmeldung abwarten. PO kann die [Edge-Abnahme](ORG_KEYBOARD_M4B1.md) mit synthetischer Probe durchführen. M4b.2 benötigt neue Freigabe.

## Vorheriger Meilenstein M4a

- `developer_m4a` (developer) implementierte/testete; `qa_m4a` (qa) prüfte unabhängig. Beide bestätigten tatsächlich geladene Rollenrevision `M32A-2026-11-03`. Lead koordinierte, reviewte und integrierte Projektdokumentation. Spezialisten nacheinander, keine Unterdelegation; kein Storage-/Documentation-Agent nötig.
- Bestehender historischer Storage-Spike bleibt getrennt; seine technischen Fehler-/Rennsimulationen sind keine vorhandenen Editorfunktionen. Frühere Palette-/Kontextmenü-Sperren durch aktuelle Freigabe begrenzt überholt.
- **Developer und QA jeweils 95/95 Tests und Build bestanden**; QA zusätzlich vier Syntaxprüfungen, `git diff --check` und 258 erneute Busy-Kontextprüfungen ohne Handleraufruf/Textänderung. Kein belegter Blocker im geprüften Umfang. [QA-Bericht](../_Communication_Pipeline/qa_m4a.md).
- **43 Befehle**: drei Workspace-, drei Datei-, zwei Entwurfs-, drei Falt-, neun Struktur-, fünf Formatierungs-, zwei Undo/Redo-, vier Theme-, neun Ansichts- und drei Oberflächenbefehle. Stabile IDs, Beschreibungen, Kategorien, Kontextgründe, erneute Ausführungsprüfung und Shortcut-Metadaten; ausschließlich lokale Handler. Vollständiger Index mit Bestandsaufnahme: [COMMAND_GAMEBOOK.md](COMMAND_GAMEBOOK.md).
- Palette per Alt+X und Schaltfläche, Suche in Name/Beschreibung/Kategorie, Pfeile/Enter/Escape und Maus; Editor-Kontextmenü per Rechtsklick, Shift+F10 oder Kontextmenütaste. Shift+Rechtsklick erhält Browsermenü. Auswahl bei Abbruch restaurieren, Zielauswahl vor Ausführung verwenden. Struktur-/Faltleisten in Palette/Menü verlagert; Rechte/Scan/Prüfen im Entwicklungsbereich, visuelle Einstellungen in Editoroptionen. Häufige Datei-/Format-/Theme-/Undoaktionen sichtbar; keine Funktion ersatzlos entfernt. Gutter/Platzhalter bleiben Positionsadapter auf gemeinsamen Folding-Primitiven.
- M4a-Anwendungsdateien: `editor/app.mjs`, `editor/index.html`, `editor/styles.css`, `editor/structure-keymap.mjs`, `editor/folding.mjs`; neu `editor/command-registry.mjs`, `editor/commands.mjs`, `editor/command-surfaces.mjs`, `editor/commands.test.mjs`. Dokumentation: `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PHASES.md`, `docs/PROJECT_STATUS.md`, `docs/FUTURE_COLORS_COMMANDS.md`; neu `docs/COMMAND_GAMEBOOK.md`, `docs/COMMANDS_M4A.md`, `_Communication_Pipeline/qa_m4a.md`. Vorbestehende fremde Änderungen erhalten; keine Storage-/Codec-/Abhängigkeitsänderung, Installation oder Veröffentlichung.
- Gamebook frei bearbeiten; Wünsche mit eindeutiger `future.`-ID und Status Idee/Geplant ergänzen. Kein ausführbarer Code und keine Freigabe durch Eintrag. `npm test` prüft ID/Name/Kategorie gegen Registry; Verhalten/Bedienwege redaktionell prüfen. M4b nur durch IDs/Metadaten/Dispatcher vorbereitet.
- **Echte Edge-Abnahme offen:** QA startete Edge mit Computer-Use-Skill; erster Zustandsabruf wurde wegen nicht zuverlässig bestimmbarer Browser-URL gestoppt. Keine Palette-/Editoraktion als bestanden gewertet; keine Umgehung. Eigener temporärer Server beendet. Native Rechtsklick-Vorauswahl, Shift+F10-Folgeereignisse, Fokus, Picker-Aktivierung, echte DE-QWERTZ/AltGr/IME, vier Themes, Zoom/Hochkontrast/Screenreader sowie Ressourcen-/Stundenmessungen offen. [Edge-Prüfanleitung](COMMANDS_M4A.md).

**Nächste Aktion:** Nach Abschlussbericht stoppen und PO-Rückmeldung abwarten; PO kann die dokumentierten Edge-Schritte prüfen. M4b und neue Gamebook-Wünsche erfordern gesonderte Freigabe. Markdown bleibt Primärformat, historische Formatuntersuchung unten unverändert.

## Vorherige Formatuntersuchung

- `developer_format_study` (developer) und `storage_format_study` (storage) tatsächlich parallel mit getrennten lesenden Aufträgen eingesetzt; keine Unterdelegation. Lead recherchierte Primärquellen und dokumentierte. Keine Tests, Benchmarks oder Konversionen ausgeführt.
- [FORMAT_COMPARISON.md](FORMAT_COMPARISON.md): Funktionen, Syntaxbeispiele, Browseraufwand, Codeauswirkungen, Performancegrenzen, Konversionsrisiken und Kompatibilität verglichen. Logseq OG/Dateigraphen und DB-Graphen ausdrücklich getrennt.
- Übereinstimmende Empfehlung beider Spezialisten: Markdown vorerst behalten; Org reduziert eigene Aufgaben-Dateikonventionen, liefert jedoch keine fertige Browser-Agenda oder erhöhte Speichersicherheit. Empfehlung ist keine Produktentscheidung.
- Geändert wurden nur dieser Status, ARCHITECTURE.md und die neue Vergleichsdokumentation. Anwendung, Storage, Abhängigkeiten und Test-Vaults unverändert.

**Nächste Aktion:** PO entscheidet Zielökosystem und Priorität der Org-Kompatibilität; danach gegebenenfalls ein Aufgabenprofil oder einen begrenzten Org-Spike separat freigeben. Offene Punkte: Aufgabenidentität/-granularität, Workflow-/Historienformat, Terminsemantik, unterstütztes Org-Profil und Erhaltungsgrenzen. Bis dahin stoppen; Markdown bleibt primär.

## Vorheriger Meilenstein M3.2b

- `developer_m32b` (Rolle developer) implementierte/testete; `qa_m32b` (Rolle qa) prüfte unabhängig. Beide bestätigten geladene Rollenrevision `M32A-2026-11-03`; QA-Baseline **76/76** bestanden. Lead koordinierte/reviewte/dokumentierte, kein eigener Anwendungscode, Storage-Agent oder Unterdelegation.
- Vorabcheck des installierten Codes: `markdown()` verwendet CommonMark und erkennt `~~…~~` nicht als Durchstreichung; vorhandene `markdownLanguage`-Variante unterstützt dies bereits. Keine neue Bibliothek für Syntaxunterstützung nötig. Parserkonfiguration und tatsächliche Syntaxwirkung im M3.2b prüfen.
- Fünf Auswahlbefehle mit gezieltem Ein-/Entfernen, atomarem Undo/Redo, Auswahlrichtung und sicheren Backtick-Begrenzungen umgesetzt. Randspaces bleiben außerhalb von Emphasis-Markern. Eine reine Auswahltransaktion nach der Dokumentänderung sichert Inhaltsauswahl bei Redo. Erste Grenze: eine nichtleere einzeilige Auswahl; unsichere Teilsyntax wird unverändert abgelehnt.
- H1–H6 je Theme durch sechs kräftige, ruhige Farbtonfamilien unterscheidbarer. Mindest-Headingkontrast über Editor/Code/Auswahl: Midnight 5,34:1, Terminal 4,66:1, Nord/Paper 4,83:1. Interner minimaler Hueabstand über 30°, Codeflächenabgrenzung über 1,15:1; reine Diagnostik, kein visueller/Colorblindheits-/Barrierefreiheitsvollnachweis. Bestehende Code-/Selection-Layer und Einrückungsfunktionen unverändert.
- **Developer und QA jeweils abschließend 89/89 Tests bestanden** (76 bisherige unverändert plus elf Formatierungs- und zwei zusätzliche Lesbarkeitsprüfungen); Build, Syntaxprüfungen und `git diff --check` bestanden. QA zusätzlich 45 eigene Schutzrepros und 120 Formatierungskombinationen: 108 akzeptiert, alle akzeptierten mit korrekten Außenbereichen/Auswahlrichtung/Undo/Redo/erneutem Toggle. Finale QA-89-Bestätigung nach rein additivem Flächenkontrasttest, keine Appcodeänderung danach.
- Gefundene Fehler bei getrennten `<u>`-Paaren, partiellen Struktur-/Link-/Escape-/Entitymarkern und Redo-Auswahl durch Developer behoben und unabhängig nachgeprüft. Tabellenzellengrenzen, Code-/Frontmatter-Überlappung geschützt. Keine verbleibenden Blocker im geprüften Umfang; keine Browseraktion als bestanden ausgegeben. Storage-/Codec-/Paketänderungen nicht vorgenommen, keine Installation.
- Synthetische Probe `test-vault/vault-structure/formatting.md`. Anleitung, vollständige Datei-/Testliste, Palettenmetriken und Grenzen: [FORMATTING_M32B.md](FORMATTING_M32B.md).

**Nächste Aktion:** M3.2b implementiert und automatisiert geprüft; stoppen und PO-Rückmeldung abwarten. Echte Edge-Auswahl-/Maus-/Tab-/Fokus-/Codeflächen-/Zoom-/Hochkontrastprüfung und Ressourcen-/Langzeitmessungen bleiben offen. Keine Textfarbe, Palette oder spätere Funktion ableiten.

## Vorheriger Meilenstein M3.2a.1

- Nutzerbericht: M3.2a in Edge ausprobiert; Grundoperationen vorhanden, Verbesserungsbedarf bei Bedienung und Darstellung. Keine vollständige neue Browserabnahme durch Agenten daraus abgeleitet.
- `developer_m32a1` (Rolle developer) implementierte/testete, `qa_m32a1` (Rolle qa) prüfte unabhängig. Beide bestätigten geladene Rollenrevision `M32A-2026-11-03`; QA-Baseline **65/65** bestanden. Lead koordinierte/reviewte und dokumentierte, kein eigener Anwendungscode. Kein Storage-Agent oder Unterdelegation.
- Implementiert: Kontext-Tab/Shift+Tab für tatsächliche Header/Listen, Children-Wahl, Codeeinrückung auch bei Mehrzeilenauswahl im selben Block. Escape aktiviert zeitunabhängige Fokusnavigation; nur Wiedereintritt von außerhalb setzt Struktur-Tab wieder aktiv, nicht Fokuswechsel zum inneren Faltplatzhalter. Plaintext-Tab bleibt nativ.
- Optionale, gedeckelte Headingeinrückung, fünf konfigurierbare Marker-Ebenen und hierarchische Nummern als zusätzliche Gutteranzeige; Rohpräfixe unverändert. Codeblockflächen und Seitenmarkierung über Theme-Tokens, Hintergrund-Pseudoelement unter der Auswahl. Anzeigeeinstellungen gelten nur für die Sitzung. Keine Textfarbfunktion oder neuen Sprachpakete.
- **Developer und QA jeweils 76/76 Tests bestanden** (65 bisherige unverändert plus sechs Keymap- und fünf Darstellungstests); Build, Syntaxprüfungen und `git diff --check` erfolgreich. QA zusätzlich: zehn eigene native Keymapfälle, sechs echte AST-Listentiefen mit 15 Undo-Schritten, visuelle Modelle bis `1.1.1.1.1.1.` mit zwölf Markern und Code-/Viewportabgrenzung. Kein Browser-/Performancebeleg daraus abgeleitet.
- QA fand falsche Elternzuordnung bei Shift+Tab auf führenden Listenleerzeichen. Developer korrigierte gemeinsame Kontextauflösung; Regression einschließlich Einzelmodus bestanden. Abschluss ohne verbleibende Blocker im geprüften Umfang. Storage-/Codec-/Paketdiff leer, keine Installation oder Veröffentlichung.
- Neue synthetische Probe `test-vault/vault-structure/hierarchy.md`; Anleitung [HIERARCHY_M32A1.md](HIERARCHY_M32A1.md). Textfarbe/Kontextmenü/Palette sowie alternative Nummerierung/Sprachmodule ausschließlich [vorgemerkt](FUTURE_COLORS_COMMANDS.md).

**Nächste Aktion:** M3.2a.1 implementiert und automatisiert geprüft; stoppen und PO-Rückmeldung abwarten. Echte DOM-/Edge-/Windows-Fokusnavigation, Maus/AltGr/Platzhalter, Codeauswahl und Zoom/Hochkontrast sowie Ressourcen-/Langzeitbelege bleiben offen. Keine spätere Funktion ableiten.

## Vorheriger Meilenstein M3.2a

- Rollenbereinigung in den beiden Developer-/QA-TOML-Dateien, Rollenbriefen und AGENTS.md abgeschlossen. Veraltete pauschale Entwicklungs-/Test-/Phase-2-Sperren durch begrenzte Freigaberegeln ersetzt; Sicherheitsgrenzen beibehalten. Revision `M32A-2026-11-03`.
- **Gate tatsächlich erfüllt:** frisch gestartete `/root/developer_role_check` (`agent_type: developer`) und `/root/qa_role_check` (`agent_type: qa`) bestätigten die Revision in ihren geladenen Laufzeitanweisungen. Erst danach Implementierungs-/Testauftrag erteilt. Kein Lead-Bypass und kein Neustart der Hauptsitzung erforderlich; Details in [AGENT_TEAM.md](AGENT_TEAM.md).
- Developer implementierte Überschriften-/Listenoperationen und testete selbst; QA prüfte unabhängig. Lead koordinierte/reviewte und dokumentierte, keine eigene Anwendungsimplementierung. Storage-/Documentation-Agent nicht benötigt, keine Unterdelegation.
- **Developer und QA jeweils: 65/65 Tests bestanden**, alle bisherigen 52 unverändert plus 13 neue Strukturtests; Build erfolgreich. Developer-Syntaxprüfungen erfolgreich. Abgesichert: Unterbaum/Einzelmodus, EOF, Undo/Redo, Folding, H1/H6, Code-/YAML-Schutz, Präfixe/Nummerierung, Unicode/BOM/gemischte EOL über bestehenden Codec.
- QA fand falsche Verschachtelung bei mehrfachen Markerabständen und mögliche Umdeutung von Listen in horizontale Linien. Developer korrigierte beides; vier unabhängige Reproduktionen bestanden. QA-Matrix mit 320 In-memory-Fällen: 160 akzeptierte Aktionen, Inhaltsmarker jeweils exakt einmal vorhanden. Kein vollständiger Semantik-/Performancebeleg. Abschließend keine verbleibenden Blocker in den ausgeführten Prüfungen.
- Ein zwischenzeitliches Nutzungslimit unterbrach beide Agententurns; nach Fortsetzung wurden Developer-Abschluss und unabhängige QA vollständig ausgeführt. Dies war keine Rollen-Sperre und wurde nicht durch Lead-Implementierung umgangen.
- Neue synthetische Bedienprobe: `test-vault/vault-structure/structure.md`. Vollständige Datei-/Testliste, Bediensemantik und Grenzen: [STRUCTURE_M32A.md](STRUCTURE_M32A.md). Keine Storage-/Abhängigkeitsänderung oder Installation.

**Nächste Aktion:** M3.2a implementiert und automatisiert geprüft; stoppen und auf PO-Rückmeldung warten. Echte Edge-/Maus-/Tab-/Enter-/QWERTZ-/Fokusprüfung sowie große Vaults/Idle/RAM/Langzeit bleiben offen. Konservative Verweigerungen bei Mischcontainern, Tabs, mehrzeiliger Setext→ATX-Konvertierung und Nummernbreitenwechsel beachten. M3.2b, Storageänderungen und neue Abhängigkeiten bleiben ausgeschlossen.

## Vorheriger Meilenstein M3.1

- Neuer Nutzerbericht: M3.1 in Edge erfolgreich ausprobiert; Kontextfaltung und stufenweises Öffnen wirken grundsätzlich funktionsfähig. Keine Wiederholung durch Lead und kein vollständiger QWERTZ-/Kontrast-/Ressourcennachweis daraus abgeleitet.
- M3.2-Planung ergänzt: optionale rein visuelle Überschrifteneinrückung, Struktur-/Listenoperationen mit Undo/Redo, Formatierungen und `<u>Text</u>` als Standard für Unterstreichen; `_Text_` bleibt unverändert. Anforderungen, Entscheidungen, Architektur und Strukturplan aktualisiert. Ausschließlich Dokumentation, keine Agenten, Tests oder Code-/Storageänderungen.

- Nutzerbericht: M3-Folding in Edge erfolgreich getestet; Ein-/Ausklappen und verschachtelte Abschnitte funktionieren grundsätzlich. Kein separater neuer M3.1-Browsernachweis.
- Beteiligte: `developer_m31` (Rolle developer) lieferte lesenden API-/Semantikcheck. Alte aktive Rollensperren erlaubten keine Entwicklungsarbeit; Lead implementierte. `qa_m31` (Rolle qa) prüfte unabhängig lesend, ohne eigene Test-/Browserausführung. Keine Konfigänderung, kein Storage-Agent oder weitere Unterdelegation.
- Kontext aus Absatz/Liste/Code zur nächsten zugehörigen Überschrift, ohne Überschrift lokale Blockfaltung. Stufen geschlossen → Gliederung → Text direkter Kinder → vollständig. Explizite Maus-/Tabbefehle; bisherige QWERTZ-Kürzel bleiben. Sichtbarkeitszustand aus nativen Foldbereichen, Cursor bei Bedarf sichtbar versetzt, keine Text-/Storageänderung.
- Eigene zentrale H1–H6-Tokens sowie Code-/Zitat-/Syntaxmarkerfarben in allen vier Themes. Native Syntax-Tags im tatsächlichen Syntaxbaum geprüft; kein neues Paket, Parser oder Framework. Neue synthetische Datei `test-vault/vault-folding/context.md`.
- Lead: **52/52 Tests bestanden** (alle bisherigen 38 unverändert plus zwölf Kontext-/Stufentests und zwei Syntaxlesbarkeitstests); Build, Syntaxprüfungen und `git diff --check` bestanden. Neue Fälle u.a. gemischte Falten, Setext, Containergrenzen, lokale Listen/Fences, unvollständige Analyse und 1.000 Unterüberschriften. Vorhandene Kontrasttests erfassen neue Tokens. Keine Latenz-/RAM-/Stundenabnahme daraus abgeleitet.
- QA fand nichtmonotones Öffnen gemischter Kindfalten sowie irreführende native Gutter-Titel. Korrigiert: gemischte Falten vollständig öffnen und Marker neutral beschriften. Regression ergänzt; lesender Nachreview ohne weitere M3.1-Blocker. Finale Testausführung ausschließlich Lead.
- Anleitung: [FOLDING_M31.md](FOLDING_M31.md). Geplante M3.2-Struktur-/Listen-/Formatierungsoperationen vollständig nur dokumentiert: [M3_2_STRUKTURPLAN.md](M3_2_STRUKTURPLAN.md).

**Nächste Aktion:** auf gesonderte M3.2-Implementierungsfreigabe warten; vorher konkrete kleine Teilpakete und offene Auswahl-/Bedienungsdetails festlegen. Noch offen: vollständige QWERTZ-/AltGr-/Maus-/Platzhalterfokusprüfung, Container/Zoom/Hochkontrast und Ressourcen-/Langzeitmessungen. Vollständiges Öffnen bei unvollständigem Parse zunächst auf tatsächlichen Faltbereich begrenzt; gegebenenfalls nach Analyse wiederholen. M3.2 nicht implementieren; Storageänderungen nur mit eigener Freigabe. Teamrollenrestriktionen bleiben ein gesondertes Konfigurationsthema.

## Vorheriger Meilenstein M3

- Nutzerbericht: M2 erfolgreich in Edge ausprobiert; die vier Themes gefallen dem PO. Nicht als vollständige Kontrast-, Hochkontrast- oder Performanceabnahme gewertet.
- Tatsächlich beteiligt: `developer_folding` (Rolle developer) prüfte vorhandene APIs lesend; aktive alte Rollenrestriktionen verboten ihm Entwicklungsarbeit. Lead implementierte deshalb den begrenzten M3-Abschnitt. `qa_folding` (Rolle qa) prüfte anschließend unabhängig lesend, ebenfalls ohne eigene Testausführung. Keine Konfigänderung, kein Storage-Agent oder Unterdelegation.
- `editor/folding.mjs` integriert native Abschnittsbereiche, Gutter und Platzhalter. H1–H6 einschließlich Kinder, Mausmarkierungen und Strg+Umschalt+Komma/Punkt. Faltzustand nur in aktueller Ansicht; kein Text-/Storageeingriff. Vor Einklappen begrenzte EOF-Analyse, bei Unvollständigkeit Hinweis statt Teilfalte. Theme-Tokens für Gutter und Auslassung.
- Lead: 38/38 automatisierte Tests bestanden (29 bestehende plus neun Foldingprüfungen), Build, Syntax und `git diff --check` erfolgreich. Abgedeckt: H1–H6, gleiche/höhere Abschnittsgrenzen, Kinder, Setext/EOF, Codeblock-Abgrenzung, Text/Undo/Redo, alle Themewechsel, simulierte QWERTZ-/AltGr-Ereignisse, unvollständige Analyse und Dokument mit 5.000 Absätzen. Kein echter Edge-/Performancebeleg.
- Unabhängige QA: keine M3-Blocker im gelesenen Code. Grenzen: keine DOM-/Browseraktionen, keine eigene Tests/Builds. Anleitung und offene Praxisprüfungen: [FOLDING_M3.md](FOLDING_M3.md); neue synthetische Datei unter `test-vault/vault-folding/folding.md`.

**Nächste Aktion:** M3 implementiert; stoppen und auf PO-Rückmeldung warten. Offen: echte Edge-/QWERTZ-/Mausbedienung, Platzhalter/Fokus/Zoom in vier Themes, Bearbeitung gefalteter Bereiche sowie Idle-/RAM-/Langzeitmessungen. Alte Rollenrestriktionen bei einem gesondert autorisierten Teamkonfigurationsauftrag bereinigen; hier unverändert.

## Vorheriger Meilenstein M2

- `developer_themes` (Rolle developer) implementierte das Theme-Grundgerüst; `qa_themes` (Rolle qa) prüfte unabhängig lesend. Storage-Spezialist nicht benötigt, Speicherbereich unverändert. Lead dokumentierte. Keine Unterdelegation.
- Midnight (Standard), Terminal, Nord, Paper mit CSS-Tokens und getrenntem CodeMirror-Adapter umgesetzt. Sofortiger Wechsel, lokale Auswahl und Midnight-Fallback; kein Theme-Import, Skin oder grafischer Theme-Editor.
- Lead und Developer: abschließend 29/29 Tests bestanden (24 bestehende plus fünf Themeprüfungen), Build und Syntaxprüfungen erfolgreich. Neue Prüfungen: Auswahlpersistenz/Fallback, Tokenanwendung, wiederholter Wechsel mit Text-/Auswahl-/Undoerhalt, rechnerische Kontrastpaare und erzeugte CSS-Auswahl-/Fokusregeln. `git diff --check` bestanden. Bundle etwa 532 KB; kein RAM-/Latenznachweis.
- QA fand eine CSS-Spezifitätskollision: CM-Basisregeln überstimmten fokussierte Auswahl und Fokusrahmen. Developer korrigierte den Adapter und ergänzte einen Regressionstest am erzeugten CSS. QA bestätigte die Korrektur lesend; keine weiteren M2-Blocker im geprüften Umfang. Kein automatisierter Browsernachweis daraus abgeleitet.
- QA-Ausführungsgrenze: aktive QA-Rolleninstruktionen enthalten noch das historische Verbot von Tests/Dateiänderungen. Deshalb unabhängiger lesender Review; automatisierte Läufe durch Lead/Developer. Keine Agentenkonfiguration im M2-Auftrag geändert.
- Browser-Sichtprüfung durch Lead versucht, Browserzugriff meldet „browser access host unavailable“. Kein Theme-Browsererfolg behauptet. Port 8766 war bereits belegt, bestehender Server nicht beendet. Anleitung und manuelle Abnahme: [THEMES_M2.md](THEMES_M2.md).

**Nächste Aktion:** M2 implementiert; stoppen und auf PO-Rückmeldung warten. Manuelle Lesbarkeit in Edge, native Menüs, Zoom/Hochkontrast, lokale Wiederaufnahme, Fokus/Auswahl/Undo und später Ressourcenmessungen getrennt nachweisen. Keine weitere Entwicklungsphase ableiten.

## Vorheriger Meilenstein M1 und Theme-Planung

- Nutzerbericht 2026-11-03: erster Editor erfolgreich in Edge praktisch getestet; Schreiben, Speichern, Schließen und erneutes Öffnen funktionierten. Nicht durch Lead wiederholt; keine genauen Browser-/Geräteversionen oder Messprotokolle geliefert. Dies ersetzt keine vollständige Sicherheits-, QWERTZ- oder Performanceabnahme.
- Planungsarbeit Themes: gewünschte Stilrichtungen, Trennung von Paletten/Skins, Tokens, sicherer JSON-Import/-Export, lokale Auswahl und spätere Live-Vorschau dokumentiert. Anforderungen in REQUIREMENTS.md, bestätigte Priorität in DECISIONS.md, technischer Vorschlag in ARCHITECTURE.md und Etappen in PHASES.md. Nur Dokumentation geändert; keine neuen Agenten, Pakete oder Implementierung.

- QA-Delegationstest und parallele Storage-/Developer-Reviews wurden erfolgreich durchgeführt; die nachstehenden historischen Blockiert-Meldungen sind überholt.
- Beteiligte Implementierung: `developer_m1` (Rolle developer) und `storage_m1` (Rolle storage) parallel; anschließend unabhängige `qa_m1` (Rolle qa). Keine Unterdelegation.
- Editor und Storage getrennt. Striktes UTF-8, BOM/unberührte Zeilenenden erhalten, keine YAML-/Markdown-Neuformatierung. Verifizierte Sicherungen samt JSON-Dateizuordnung im Test-Vault, keine automatische Löschung. IndexedDB-Entwürfe und Wiederaufnahme; explizites Speichern mit Web Lock und Konfliktprüfung.
- Vorbestehender Fixturefehler: `test-vault/vault-a/mixed.md` enthielt kein CRLF; ausschließlich dem ersten LF wurde ein CR vorangestellt, alle übrigen Bytes erhalten. Danach alle 11 bestehenden Storage-Tests bestanden. Keine Abschwächung der Tests oder Änderung des Spike-Schreibkerns.
- Anleitung und genaue Abhängigkeiten: [EDITOR_M1.md](EDITOR_M1.md). `npm run build`, Syntaxprüfungen und 24 automatisierte Tests bestanden (11 bestehende, 13 neue). Minifiziertes JavaScript etwa 528 KB; dies ist kein RAM-/Performancebeleg.
- QA fand einen CR/LF-Grenzfall beim Löschen: zwei logische Zeilen konnten verschmelzen. Lead korrigierte ihn samt Regressionstest; unabhängiger QA-Retest einschließlich 37 zusätzlicher In-Memory-Fälle erfolgreich. UI-Integration wurde zusätzlich auf Undo-Dateigrenzen und ausstehende Entwurfssicherung geprüft.
- Unabhängige QA: 24/24 Tests, Build, Syntax und `git diff --check` bestanden. Vier Serverassets plus HEAD erfolgreich; Vault-Zugriff, direkte/kodierte Pfadtraversierung, `package.json` und POST mit 404 abgewiesen; Testserver beendet. CodeMirror-Zustandsprüfung zur Undo-Grenze bestanden. Keine verbleibenden M1-Blocker im geprüften Umfang; keine tatsächliche Edge- oder Performanceabnahme behauptet.

**Nächste Aktion:** Auf PO-Rückmeldung bzw. nächsten begrenzten Umsetzungsauftrag warten. Für Themes noch erste Paletten, Token-/JSON-Schema, Kontrastkriterien und messbare Ressourcenabnahme konkretisieren. Weiter offen: vollständige Edge-/QWERTZ-Abnahme, Rechteentzug/vollständiger Browserneustart, Restore und Idle-/Langzeit-/Performancebelege. Weitere Funktionen sowie persönliche/produktive Vaults bleiben gesperrt. Sicherungsaufbewahrung über das vorläufige „nicht löschen“ hinaus und spätere Bereitstellung sind offen.

## Historischer Stand vor M1 (durch aktuelle Freigabe teilweise überholt)

## Aktuelles Arbeitspaket

- Nativer Browser-Dateizugriff, Vault-Wechsel, byteerhaltender Testmarker, getrennte Browser-Entwürfe, geprüfte Sicherungen, Konfliktprüfung, Web Lock für eigene Tabs und Fehler-/Rennfenster-Schalter implementiert.
- Synthetische Fixtures ausschließlich unter `test-vault/`; keine persönlichen Ordner verwendet.
- 11 Node-Tests mit simulierten Handles bestanden, JavaScript-Syntax geprüft. Loopback-Server: drei erfolgreiche HTTP-Abrufe und drei erwartete Zugriffssperren geprüft; anschließend beendet. `git diff --check` bestanden (nur Git-Zeilenendenhinweise).
- Nutzer berichtet erfolgreiche Edge-Tests: unverändertes SHA256, Marker/Byteverifikation (ein Vorgang 131,9 ms), externe Konflikte mit Entwurfserhalt, Tab-Wiederöffnung, sichtbare Entwürfe nach Vault-Wechsel, Zweitab-Konflikt, simulierter Schreibfehler ohne Dateiänderung und Backup-Wiederherstellung. Keine Wiederholung durch Lead; genaue Versionen/Rohprotokolle fehlen. Details und offene Teilprüfungen: [STORAGE_SPIKE.md](STORAGE_SPIKE.md).
- Weiter offen: Reload, vollständiger Browserneustart, Rechteentzug, Browser-Rennfenster, Stream-Abbruch, Idle, Offline und 100-KB/p95-Messreihe. Ein Einzelmesswert ersetzt keine Performanceabnahme.
- Projektrollen Developer, Storage, QA und Documentation grundsätzlich freigegeben. `.codex/config.toml`: `enabled = true`, Limit unverändert zwei. Developer um Tastatur-/Mausbedienung, Sequenzen/Palette und Eingabesicherheit ergänzt; QA um Langzeitstabilität/Leaks/Performanceverschlechterung. Anforderungen nur dokumentiert, keine Implementierung. Codex CLI 0.166.0 lokal nachgewiesen.
- Erster QA-Delegationstest blockiert: vorhandene Delegationsschnittstelle besitzt keinen Projektrollen-Selektor; auch das erzeugte lokale Thread-/Turn-Protokollschema bietet keinen direkten benannten Rollenstart. Kein Subagent gestartet, keine QA-Konfiguration nachweislich geladen, keine QA-Ergebnisse. Kein Lead-Ersatzreview als Erfolg ausgegeben. Details: [AGENT_TEAM.md](AGENT_TEAM.md).
- Nur Lead eingesetzt, keine Spezialagenten gestartet; keine Installationen, Anwendungscode- oder Produktentscheidungsänderungen in diesem Arbeitspaket.

**Nächste Aktion:** Stoppen und auf weitere Freigabe warten. Danach gegebenenfalls Laufzeit/Oberfläche benennen und frische Projektsitzung mit nachgewiesener Auswahl der registrierten Rolle `qa` verwenden; nur den freigegebenen lesenden Auftrag delegieren. Das reproduzierte Schreibrennfenster bleibt offen; keine Freigabe für Produktdaten oder Phase 2.

## Historischer Stand der Planung (2026-11-02)

## Erledigt

- FIRST_PROMPT, AGENTS, README, Anforderungen, Entscheidungen, Status und Rollenbriefe vollständig gelesen.
- ARCHITECTURE.md: Optionen, Storage-Risiken, Datenmodell, späteres Board, Desktop und Agentenrollen vorgeschlagen.
- PHASES.md: kleine Meilensteine, Storage-Spike und messbare Budgets beschrieben.
- Primärquellen recherchiert; noch keine praktische Machbarkeit behauptet.
- Keine Subagenten gestartet und keine Agentenkonfiguration geändert.

## Nächste Aktion und offene Entscheidungen

Product Owner prüft Architektur und Phasen. Danach ausdrücklich Phase 1 freigeben: kleiner Storage-Spike mit Testdateien, Browseraktionen und temporärem localhost-Server. Noch keine Editor-/Frameworkinstallation. Genehmigte Entscheidungen anschließend in DECISIONS.md aufnehmen.

Zusätzlich offen:

- Späteres statisches HTTPS-Hosting für Erstbereitstellung/Updates akzeptabel, wenn Notizen lokal bleiben?
- Welches Restrisiko externer gleichzeitiger Schreibzugriffe ist akzeptabel? Vor Produktfreigabe Spike-Ergebnis prüfen.
- Danach Editor-/Buildwerkzeuge, Aufgaben-/YAML-Syntax, Sicherungsaufbewahrung und Performancebudgets entscheiden.

## Abweichungen

Bestehende bestätigte Produktentscheidungen bleiben unverändert. README ergänzt das spätere Board; berücksichtigt ohne MVP-Erweiterung. Frühere Formulierung „Projektsetup“ ist keine Implementierungs-/Installationsfreigabe. Bereits vor Arbeitsbeginn geänderte README.md und FIRST_PROMPT.md wurden nicht bearbeitet.

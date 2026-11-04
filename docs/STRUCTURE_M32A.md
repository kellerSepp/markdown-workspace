# M3.2a: Überschriften- und Listenstruktur

Nur synthetische Testdaten, keine produktiven oder persönlichen Vaults. M3.2b (Textformatierung/visuelle Einrückung), Command Palette und neue Produktbereiche sind nicht enthalten. Storage und Abhängigkeiten bleiben unverändert.

## Start und manuelle Probe

`npm start` im Repository, dann `http://127.0.0.1:8766` in Edge öffnen. Bei bereits laufendem Server nach Build neu laden. Test-Vault `test-vault/vault-structure` wählen und `structure.md` laden.

- Cursor in Überschrift oder zugehörigem Absatz setzen. Hoch/runter verschiebt den Abschnitt mit allen untergeordneten Überschriften. Ebene erhöhen/verringern separat ausprobieren; Wahl „Unterstruktur mitnehmen“ beachten. Bei H1/H6 darf eine ungültige Gesamtänderung nichts teilweise ändern.
- Cursor in Listenpunkt setzen; hoch/runter und ein-/ausrücken mit und ohne Children ausprobieren. Liste anschließend von außen lesen, damit die tatsächliche Elternzuordnung geprüft wird. Präfixauswahl für `-`, `+`, `*`, `1.`, `- [ ]` ausprobieren; Nummerierung und Folgezeilen kontrollieren.
- Jede erfolgreiche Aktion mit Strg+Z rückgängig und mit Strg+Y wiederherstellen. Mehrere aufeinanderfolgende Aktionen müssen einzeln rückgängig sein. Schaltflächen auch per Tab/Enter bedienen; neue globale Tastenkürzel sind für diesen Prototyp nicht nötig.
- Cursor in echten Codeblock setzen: keinerlei Strukturoperation darf auslösen. YAML-Kopfbereich und fremde Markdown-Formatierung kontrollieren.
- Gefaltete Abschnitte bearbeiten, danach Folding/Zyklen und Themewechsel prüfen. Betroffene Falten dürfen für Strukturänderungen geöffnet werden; nicht betroffene sollen erhalten bzw. korrekt verschoben bleiben.
- Nach Kontrolle explizit speichern, erneut öffnen und Inhalt prüfen. Entwürfe, Konflikte und Sicherungen folgen dem unveränderten Storage-Verfahren.

## Festgelegte Bediengrenzen

- Überschriften verschieben zwischen unmittelbar benachbarten Geschwistern derselben Ebene; den ganzen Abschnitt immer mitnehmen. H1–H6-Ebenenänderung wahlweise einzeln oder im gesamten Unterbaum. Ungültige Gesamtbereiche atomar ablehnen statt einzelne Ebenen zu begrenzen. Setext H1/H2 bleibt nach Möglichkeit Setext; einzeiliges H2→H3 wird gezielt ATX. Mehrzeilige Setext→ATX-Konvertierung ist gesperrt.
- Listen verschieben/einrücken mit Unterstruktur oder einzeln. Ohne Children werden vorhandene Unterpunkte am bisherigen Elternlevel gefördert. Ausrücken setzt den Punkt hinter den bisherigen Eltern-Unterbaum, damit spätere Geschwister beim bisherigen Parent bleiben.
- Einrücken benötigt einen vorherigen Geschwisterpunkt und berücksichtigt dessen tatsächlichen Markerabstand. Präfixwechsel korrigiert betroffene Fortsetzungs-/Kind-Einrückung, ohne Checkboxtext als strukturelle Einrückungsbreite zu behandeln. Eine gezielte Präfixwahl ersetzt einen vorhandenen Aufgabenmarker; daraus entsteht keine Aufgabenverwaltung.
- Nummerierung wird nur in betroffenen Quell-/Ziellisten angepasst; bestehende Startnummern möglichst erhalten. Nummernbreitenwechsel (etwa 9↔10) werden derzeit sicher verweigert. Unverwandte Unterlisten werden nicht global neu nummeriert.
- Überschriften in Listen/Blockquotes sowie Listen mit Tabs, Blockcode, HTML, Blockquotes, mehreren Absatzblöcken oder mehreren direkten Unterlisten werden konservativ verweigert. Codeblock-Cursor, Frontmatter, unbekannte Befehle und schreibgeschützter Editor lösen keine Strukturänderung aus.

Eine einzelne Cursorstelle verwenden, keine Mehrfachauswahl oder Textbereichsauswahl. Bei unsicherem Misch-/Blockcontainer wird die Aktion mit verständlichem Hinweis unverändert verweigert. Keine stillschweigende Teiländerung. Nicht verfügbare Operationen sind keine erfolgreichen Strukturänderungen.

Text gelangt über die vorhandenen CodeMirror-Änderungen zum unveränderten Codec: BOM und unberührte Rohbereiche außen bleiben erhalten. Innerhalb ersetzter oder verschobener Bereiche können gemischte Zeilenenden auf den ersten ursprünglichen Zeilenendestil vereinheitlicht werden. Das ist keine Garantie für byteidentische Verschiebung beliebig gemischter Zeilenenden. Vollständiges Undo zur Ladefassung stellt deren Originalbytes wieder her. Keine Storageänderung zur Erweiterung dieser Grenze freigegeben.

## Noch manuell prüfen

Echte Edge-/Windows-/QWERTZ-/AltGr-Bedienung, Fokus und Cursor nach Aktionen, alle vier Themes mit Folding, komplexe Listen und lange Dokumente. Automatische Zustands-/Codecprüfungen ersetzen keine Browser-, Performance- oder Langzeitabnahme.

## Tatsächliche Ausführung und Dateien

Rollenrevision `M32A-2026-11-03` wurde vor Implementierung von neu gestarteten Developer-/QA-Agenten anhand ihrer tatsächlich geladenen Instruktionen bestätigt. Kein Neustart der gesamten Hauptsitzung nötig, kein Lead-Bypass. `/root/developer_role_check` implementierte und testete; `/root/qa_role_check` prüfte anschließend unabhängig. Lead koordinierte, reviewte und dokumentierte. Kein Storage-/Documentation-Agent und keine Unterdelegation.

Beide Spezialisten führten **65/65 Tests** (52 bisherige unverändert plus 13 Strukturtests) und den Build erfolgreich aus. Developer prüfte die betroffenen JavaScript-Dateien zusätzlich auf Syntax. QA prüfte vier eigene Reproduktionen nach: mehrfacher Markerabstand muss tatsächliche Verschachtelung erzeugen, Präfixwechsel darf Listen nicht in horizontale Linien umdeuten. Beide Befunde behoben und abgesichert. QA führte zusätzlich 320 Listenfälle im Speicher aus; 160 akzeptierte Aktionen erhielten alle Inhaltsmarker exakt einmal. Dies ist kein vollständiger Semantik-/Performancebeleg. Keine echte Edge-Abnahme durch Agenten behauptet.

Geänderte/neue Dateien dieses Arbeitspakets:

- Rollen: `.codex/agents/developer.toml`, `.codex/agents/qa.toml`, `agents/developer.md`, `agents/qa.md`, `AGENTS.md`.
- Anwendung/Tests: `editor/structure.mjs`, `editor/structure.test.mjs`, `editor/app.mjs`, `editor/index.html`, `editor/styles.css`.
- Synthetische Probe: `test-vault/vault-structure/structure.md`.
- Dokumentation: `README.md`, `docs/AGENT_TEAM.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PHASES.md`, `docs/PROJECT_STATUS.md`, `docs/REQUIREMENTS.md`, `docs/M3_2_STRUKTURPLAN.md`, `docs/STRUCTURE_M32A.md`.

Andere bereits vor M3.2a vorhandene Arbeitsbaumänderungen wurden nicht zurückgesetzt. Kein Storage-/Codec-/Paketwechsel, keine Installation oder Veröffentlichung.

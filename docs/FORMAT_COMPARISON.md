# Markdown oder Org – Architekturuntersuchung

Stand: 2026-11-03. Empfehlung zur Entscheidung, keine Formatfreigabe. Markdown bleibt das beschlossene Primärformat. Ausschließlich Recherche und Codelektüre; keine Implementierung, Konversion, Installation oder Benchmarks.

## Ergebnis

Markdown vorerst beibehalten. Org bietet ein wesentlich reichhaltigeres bestehendes Vokabular für Aufgaben, Planung und Historie. Das spart die Entwicklung eigener Dateikonventionen, überträgt aber weder Emacs-Befehle noch dessen Agenda in unseren Browser. Für einen öffentlich angebotenen Workspace mit Obsidian-Anbindung und vorhandener Markdown-Bearbeitung überwiegen derzeit die Vorteile von Markdown. Bei einem Schwerpunkt auf Emacs-kompatibler Aufgabenplanung könnte Org die bessere Wahl werden; das ist eine Produktentscheidung.

Developer `developer_format_study` und Storage `storage_format_study` arbeiteten parallel und ausschließlich lesend. Developer untersuchte Browser/Editor, Storage Dateierhalt/Konversion. Ihre Empfehlungen stimmen überein. Lead recherchierte Ökosystemfragen und integriert diese Dokumentation. Keine unabhängige QA-Abnahme oder praktische Parserprüfung behauptet.

## 1. Funktionsvergleich: Schreibweise und Verhalten trennen

| Geplant | Org-Dateiformat bzw. dokumentierte Konvention | Markdown: zusätzlich festzulegen | In beiden Anwendungen zu entwickeln |
|---|---|---|---|
| Individuelle Status/Workflows | TODO-Schlüsselwörter, offene/erledigte Gruppen, dateilokales `#+TODO:` | Mehr als GFM-Checkboxen: Zustandsnamen, Done-Semantik und Workflowkonfiguration | Übergänge, Validierung, Bedienung |
| Deadlines/Scheduling | Getrennte `DEADLINE:`-/`SCHEDULED:`-Planung, Zeitstempel und Wiederholer | Schlüssel und Semantik für Fälligkeit, geplanten Beginn, Ereignisse und Wiederholung | Datumsauswahl, Berechnung, Filter, Zeitzonenregeln |
| Aufgabenhistorie | `CLOSED:`, Zustandswechsel und Notizen, häufig im `LOGBOOK`-Drawer | Ereignisformat, Bezug zur stabilen Aufgabe, Aufbewahrung | Historie schreiben/anzeigen; keine Manipulationssicherheit allein durch Text |
| Hierarchie | Sternüberschriften ohne Markdown-H6-Grenze, verschachtelte Listen | H1–H6 und Listen vorhanden; Aufgabe als Überschrift oder Listeneintrag entscheiden | Folding, Verschieben, Auswahl, Undo |
| Tags/Metadaten/Links | Headline-Tags, abschnittsbezogene Properties, Datei-/ID-Links | Tag-, Wiki-, Block-ID- und Property-Profil; YAML allein ist dateiweit | Auflösung, stabile Identitäten, Such-/Backlinkindex |
| Daily Journal | Datumsbäume und Capture-Konventionen im Org-Werkzeugumfeld | Dateinamen, Datumsüberschriften, Vorlagen | Journalnavigation, Erzeugen, Datepicker |
| Agenda | Eingabedaten sind bereits strukturiert | Zuvor Aufgaben-/Terminschema definieren | Dateien sammeln, indexieren, abfragen, sortieren und anzeigen |
| Investigation Board | Kein fertiges räumliches Board allein aus Org-Text | Ebenfalls separates Layout-/Beziehungsmodell | Boardoberfläche, Layout, Referenzpflege |

Org definiert [dateilokale TODO-Zustände](https://orgmode.org/manual/Per_002dfile-keywords.html), [Planungsbedeutungen](https://orgmode.org/manual/Deadlines-and-Scheduling.html), [Zeitstempel](https://orgmode.org/manual/Timestamps.html) und [Statusprotokollierung](https://orgmode.org/manual/Tracking-TODO-state-changes.html). Die dafür beschriebenen Emacs-Aktionen sind keine mitgelieferte Browserimplementierung. Insbesondere ist Scheduling nicht dasselbe wie ein Ereignistermin.

Die [Org-Properties](https://orgmode.org/manual/Property-Syntax.html) können pro Eintrag gelten und konfigurationsabhängig vererbt werden. [Org-Überschriften](https://orgmode.org/manual/Headlines.html) liefern einen Outline-Baum; [Hyperlinks](https://orgmode.org/manual/Hyperlinks.html) liefern Verweise, keinen automatisch aufgebauten Backlinkindex. Die [Agenda](https://orgmode.org/manual/Agenda-Views.html) ist eine zusätzliche erzeugte Ansicht.

[GFM](https://github.github.com/gfm/#task-list-items-extension-) beschreibt Checkbox-Listen, aber kein universelles Modell für beliebige Workflows, Termine oder Historien. Org-inspiriertes Verhalten bleibt mit Markdown möglich; seine zusätzliche Semantik muss dann offen dokumentiert werden. Ein gemeinsamer Markdown-Unterbau garantiert keine gemeinsame Aufgabeninterpretation verschiedener Anwendungen.

## 2. Konkretes Beispiel

Synthetischer Org-Ausschnitt mit bestehenden Konventionen:

```org
#+TODO: TODO DOING WAIT | DONE CANCELED
* DOING Bericht fertigstellen :projekt:
SCHEDULED: <2026-11-04>
DEADLINE: <2026-11-06>
:PROPERTIES:
:ID: task-001
:END:
:LOGBOOK:
- State "DOING" from "TODO" [2026-11-03 10:00]
:END:
```

Eine denkbare Markdown-Darstellung, ausdrücklich **kein beschlossenes Schema und keine zugesagte Logseq-Kompatibilität**:

```markdown
- [ ] DOING Bericht fertigstellen #projekt
  scheduled:: 2026-11-04
  deadline:: 2026-11-06
  task-id:: task-001
```

Markdown kann diesen Text erhalten und lesbar anzeigen. Die Bedeutung der Zusatzzeilen und ein Historienformat müssten wir definieren. YAML wäre für eine Aufgabe pro Datei eine mögliche Alternative; mehrere Aufgaben innerhalb derselben Journaldatei benötigen weiterhin eine Zuordnung pro Aufgabe. Org hat diese Zuordnung bereits über den Abschnitt. Umgekehrt muss unser Browser auch bei Org den Wechsel nach DOING und den zugehörigen Historieneintrag aktiv erzeugen.

## 3. Browseraufwand und bisheriger Code

Relative Abschätzung, keine Aufwandsschätzung in Personentagen:

| Bereich | Markdown weiterführen | Org ergänzen/wechseln |
|---|---|---|
| Sprachintegration | Vorhandene getestete CodeMirror-Markdown-Integration | Geeigneten Parser/CodeMirror-Adapter prüfen und integrieren |
| Aufgaben-Dateischema | Höherer eigener Spezifikationsaufwand | Bestehende Konventionen übernehmen; unterstützte Teilmenge festlegen |
| Struktur/Formatierung | Vorhandene Befehle weiterverwenden | Syntaxabhängige Erkennung und Änderungen neu anbinden |
| Agenda, Journal, Historien-UI, Board | Eigene Entwicklung | Ebenfalls eigene Entwicklung |
| Zwei Formate | Nicht erforderlich | Zusätzliche Adapter, Fähigkeiten und Regressionstestmatrix |

Das [offizielle CodeMirror-Markdown-Paket](https://github.com/codemirror/lang-markdown) ist bereits installiert. In den geprüften [offiziellen Sprachkatalogen](https://github.com/codemirror/language-data/blob/main/src/language-data.ts) wurde kein fertiger gleichwertiger Org-Adapter belegt. Communityparser sind damit nicht ausgeschlossen. Ein Highlighter ohne verlässliche Struktur und Quellbereiche genügt unseren Bearbeitungsbefehlen nicht.

Konkrete Kopplungen im Repository:

- `editor/app.mjs`: Markdown-Sprachkonfiguration und `.md`-Dateiliste; `editor/storage-session.mjs`: `.md`-Pfadprüfung.
- `editor/structure.mjs`, `section-folding.mjs`, `visual-structure.mjs`, `structure-keymap.mjs`: Markdown-Knoten wie ATX/Setext-Überschriften, ListItem und FencedCode.
- `editor/formatting.mjs`: Markdown-Begrenzer, Toggle- und Schutzregeln. Org verwendet andere Zeichenbedeutungen, beispielsweise `*fett*` statt `**fett**`.
- Wiederverwendbar: CodeMirror-Zustand, Transaktionen/Undo, native Oberfläche, Theme-Tokens, grundlegende Fold-Effekte, Entwurfsrettung und der byteorientierte Speicheransatz. Syntaxabhängige Teile benötigen neue Zuordnungen und Tests.

`spike/storage.mjs` und `editor/text-codec.mjs` sind weitgehend formatneutral. Konfliktprüfung, geprüfte Backups und Schreibverifikation bleiben notwendig. Der externe Schreibwettlauf bleibt bei beiden Formaten bestehen. Die vorhandene Strategie für neue/ersetzte Zeilenenden ist keine Garantie für bytegleiche Formatkonversion. Speicheränderungen wären gesondert mit Storage freizugeben.

## 4. Performance und Dateigröße

Kein belegter pauschaler Gewinner. Beide Formate sind Text; Marker- und Metadatenaufwand hängt vom gewählten Schema ab. Org kann Aufgabenmetadaten knapp ausdrücken, ein ausführliches LOGBOOK wächst trotzdem mit der Historie. Markdown kann ähnlich kompakt oder durch Zusatzmetadaten größer sein. Ein einzelnes Beispiel erlaubt keine belastbare Größenprognose.

Für den Browser sind Parserqualität, inkrementelle Aktualisierung, Indexierung, Anzahl/Größe der Dateien und Aktualisierung der Oberfläche entscheidend. Eine Agenda muss bei beiden Formaten Daten erschließen. Bestehende Performanceziele gelten weiterhin vorläufig; Org ist weder als schneller noch als langsamer gemessen. Keine Benchmarks durchgeführt.

## 5. Konvertierung und Langzeiterhalt

Grundtext, einfache Überschriften, Listen und Code sind grundsätzlich abbildbar. Das ist keine Zusage eines verlustfreien Roundtrips. Risiken betreffen benutzerdefinierte Status, Historien, Wiederholer, Properties/Vererbung, IDs und Linkziele, Überschriften über H6, Tabellenformeln, unbekannte Erweiterungen und Org-Quellblöcke. Selbst bei gleichem sichtbarem Inhalt können Begrenzer, Whitespace, YAML und Zeilenenden verändert sein.

[Pandoc](https://pandoc.org/MANUAL.html) unterstützt beide Formatfamilien, warnt aber vor Informationsverlust durch sein Zwischenmodell. Ein Konverter beweist deshalb weder vollständige Aufgabenkompatibilität noch bytegleichen Quelltexterhalt. Es wurde keiner installiert oder ausgeführt.

Eine spätere Migration müsste Originale behalten, neue Zieldateien separat erzeugen, Verluste ausdrücklich melden und IDs/Verweise gemeinsam prüfen. Unbekannte Inhalte als Rohtext erhalten schützt ihren Text, garantiert aber keine Funktion im Zielprogramm. Dateien bleiben in beiden Formaten langfristig lesbar; für nutzbare Aufgabenlogik braucht es zusätzlich ein dokumentiertes Profil. Org-Konfiguration und eingebettete ausführbare Inhalte dürfen in unserem Workspace nicht automatisch ausgeführt werden.

## 6. Ökosystem und öffentliches Produkt

| Ziel | Markdown | Org |
|---|---|---|
| Obsidian | `.md` gehört zu den eingebauten Dateiformaten; Zusatzsemantik bleibt profil-/pluginabhängig | `.org` steht nicht in der eingebauten Formatliste; Plugins wären gesondert zu prüfen |
| Logseq OG / Dateigraphen | Unterstützt, aber konkrete Block-/Property-Konventionen beachten | Ebenfalls unterstützt; kein Nachweis vollständiger Emacs-Org-Semantik |
| Logseq DB-Graphen | Dokumentation nennt Markdown, verwendet jedoch eine Datenbank als Graphspeicher; kein frei austauschbarer `.md`-Vault daraus ableiten | Laut aktueller DB-Dokumentation nicht unterstützt |
| Andere Editoren | Rohtext überall lesbar; Markdown-Darstellung ersetzt keine Workspace-Aufgabenlogik | Rohtext ebenfalls lesbar; die stärkste native Semantik bietet Org/Emacs |

Quellen: [Obsidian-Dateiformate](https://help.obsidian.md/Files+and+folders/Accepted+file+formats), [Obsidian-Properties](https://help.obsidian.md/properties), [Logseq OG](https://github.com/logseq/og/tree/version/file), [Logseq-DB-Unterschiede](https://github.com/logseq/docs/blob/master/db-version-changes.md). Stand dieser Recherche, keine praktische Kompatibilitätsabnahme. Logseq-Variante und Zielversion müssen ausdrücklich benannt werden.

Für ein öffentliches Produkt mit dem bisherigen Ökosystemziel empfehle ich Markdown als Standard und ein kleines veröffentlichtes Metadatenprofil. Das ist eine technische Interoperabilitätsabwägung, keine belegte Marktgrößenaussage. Ein auf Org/Emacs ausgerichtetes Aufgabenprodukt könnte von Org als Standard stärker profitieren. Beide benötigen langfristige Schema-/Kompatibilitätstests, sichere Wiederherstellung und verständliche Angaben zu unterstützten Funktionen.

## 7. Beide Formate langfristig?

Optional sinnvoll, wenn echte Nachfrage und tragfähige Parser vorliegen; nicht sofort als verpflichtender Vollumfang. Architekturvorschlag: formatspezifische Analyse und gezielte Textänderungen hinter schmalen Adaptern; gemeinsame Aufgaben-/Termin-/Linkansichten verwenden semantische Daten mit Quellbereichen. Rohdateien bleiben führend, unbekannte Syntax wird erhalten oder eine unsichere Änderung verweigert. Kein vollständiges Neuschreiben über ein vereinfachtes universelles Zwischenformat.

Pro Notiz genau eine führende Datei. Keine automatische bidirektionale Spiegelung gleichberechtigter `.md`-/`.org`-Kopien: Sie schafft zusätzliche Konflikte und Konversionsverluste. Doppelunterstützung verlangt zwei Syntax-/Bearbeitungsprüfungen plus formatübergreifende Referenztests; nicht lediglich einen zusätzlichen Dateifilter. Keine Pluginplattform daraus ableiten.

## 8. Offene Entscheidungen und nächster möglicher Schritt

1. Vorrang: Obsidian-/Dateigraph-Austausch oder möglichst genaue Emacs-Org-Aufgabenkompatibilität? Welche Logseq-Variante/Zielversion?
2. Aufgaben als Listeneinträge, Überschriften oder beides? Stabile IDs, Historienumfang, Workflowablage und Property-Vererbung festlegen.
3. Welche Termin-/Wiederholungssemantik einschließlich Zeitzonen und unbekannter Syntax muss unterstützt werden?
4. Nur lesender Org-Import, begrenztes natives Org-Profil oder später gleichwertige Bearbeitung? Für jede Option Erhaltungsgrenzen nennen.

Vorschlag, separat freizugeben: zunächst ein kleines Markdown-Aufgabenprofil spezifizieren. Falls die Zielgruppenentscheidung noch offen bleibt, davor einen begrenzten Org-Machbarkeitsspike genehmigen. Akzeptanz: synthetischer Korpus mit Status, Planung, Historie, IDs, tiefen Abschnitten, Code und unbekannter Syntax; zuverlässige Quellbereiche; sichere Ablehnung nicht unterstützter Änderungen; Erhalt fremder Inhalte; Messung gegen bestehende Budgets. Keine Formatmigration, vollständige Agenda oder Produktionsdaten im Spike.

Grenze dieser Untersuchung: keine Implementierung, Parserauswahl, Paketfreigabe, Formatumstellung oder neue Produktentscheidung. Auf Entscheidung des Product Owners warten.

# Tags — Vorschlag zur PO-Freigabe

Stand: 2026-11-11. Nach PO-Klärung und „Engage“ umgesetzt; Bedienung und native Handprobe in TAGS.md. Der ursprüngliche Vorschlag darunter bleibt als Entscheidungsgrundlage erhalten. PO-Änderung: C-c C-c öffnet auf Überschriften immer Tags, lädt auf TAGS-/SEQ_TODO-Zeilen die Vorgaben und toggelt auf Checkboxzeilen den Zustand. Eigene Abschnittszähler sind über Palette/Kontextmenü separat erreichbar. Tab/Enter für freie Tags beliebig wiederholbar; erst Enter im Menü übernimmt. Agenda-Match bleibt ausdrücklich später. Nutzerreferenzen: `images/tags_video.png`, `images/tags_mitMenue.png`.

## Referenz und Ziel

Org setzt Tags an das Ende einer Überschrift: `:COMPUTER:URGENT:`. `#+TAGS:` definiert angebotene Tags und optionale Schnelltasten; diese Vorgaben weisen selbst keine Tags zu. Tags sind unabhängig vom TODO-Status. Org bietet C-c C-q und auf Headings C-c C-c, Mehrfachauswahl, freie Eingabe sowie hierarchische Vererbung.

Offizielle Quellen:
- https://orgmode.org/manual/Tags.html
- https://orgmode.org/manual/Setting-Tags.html
- https://orgmode.org/manual/Tag-Inheritance.html

## Empfohlenes erstes Paket

H1–H6 mit eigenen Tags, dateilokaler Auswahl und freien Tags; geerbte Tags rein lesend berechnen. Gemeinsamen Parser, vorhandenes unteres Panel, Registry, Prefix und Agendaindex verwenden. Kein zweiter Editor, keine Dependencies oder Storageänderung. Nach Umsetzung und Bericht für PO-Probe stoppen; keine Git-Integration daraus ableiten.

```markdown
#+TAGS: PHONE(o) COMPUTER(c) GARAGE(g) SHOPPING(s) FAMILY(f) URGENT(u)

## NEXT Steuerunterlagen vorbereiten :COMPUTER:URGENT:
## Fahrrad reparieren :GARAGE:
### TODO Ersatzteil bestellen :SHOPPING:
```

### Dateiformat und Regeln

- Nur normale H1–H6 außerhalb Code, Frontmatter und Mischcontainern. Auch Überschriften ohne TODO dürfen Tags haben. Listenpunkte werden nicht selbst getaggt.
- Ein klar abgegrenzter Tagblock am Ende des Headinginhalts, mit Leerraum davor; optionale schließende ATX-Hashes bleiben dahinter. Doppelpunkte im sonstigen Titel bleiben Text. Mehrdeutige oder beschädigte Tagblöcke nicht automatisch reparieren.
- Vorgeschlagene Namen: Unicode-Buchstaben/Ziffern sowie `_`, `@`, `#`, `%`, ohne Leerzeichen, Doppelpunkte oder Bindestriche. Groß-/Kleinschreibung erhalten und als verschieden behandeln. Exakte Duplikate beim bestätigten Schreiben einmalig führen, Reihenfolge stabil erhalten; keine dateiweite Normalisierung.
- Mehrere `#+TAGS:`-Zeilen wie in Org zusammenführen; `NAME` und `NAME(c)` unterstützen. Optionale Schnelltasten: eindeutige Buchstaben, ohne Unterscheidung von Groß-/Kleinschreibung. Doppelte identische Vorgabe zusammenführen, widersprechende Tasten/mehrdeutige Definitionen melden.
- Fehlerhafte Vorgaben ändern keine Überschrift; letzte gültige Auswahlliste bleibt in dieser Sitzung erhalten, beim Kaltstart ohne gültige Vorgabe nur dynamische Tags anbieten. Bereits verwendete und freie gültige Tags bleiben zulässig.
- Vorschlagsliste: Vorgaben plus in der aktuellen Datei tatsächlich an Headings verwendete Tags. Keine vaultweite Tagregistrierung. Ohne Schnelltaste Auswahl per Maus/Pfeilen, keine instabil automatisch erfundenen Tasten.
- Definitionen beim Öffnen laden; erneutes Laden über C-c C-c auf einer TAGS-Zeile und Palette. Direkt geschriebene gültige Headingtags werden beim nächsten Editor-/Indexupdate erkannt.

### Bedienung

- Vorschlag: C-c q (q ohne Strg nach Loslassen), Alt+X → Tags bearbeiten, Kontextmenü. Org-Original C-c C-q dokumentieren, native neue Belegung gesondert prüfen.
- Ziel ist der aktuelle sichere Headingabschnitt, auch aus dessen Body. Einzelcursor ohne Auswahl, kein Busy/Readonly. Öffnen nimmt das Ziel auf; Änderungen an Datei/Vault/Dokument während des Panels machen das Ziel ungültig.
- Vorhandene Panelhülle mit Mehrfachauswahl: eigene Tags an-/abwählen, Schnelltasten toggeln. Änderungen zunächst nur im Panelentwurf.
- Tab aus der Auswahlliste öffnet freie Eingabe; dort Tab für Vervollständigung. Kommagetrennte freie Tags möglich. Freies Textfeld und Schnelltastenmodus strikt trennen.
- Enter bestätigt die gesamte Auswahl, Escape/C-g verwirft verlustfrei. Leertaste im Auswahlmodus leert nur eigene Tags; im Texteingabemodus keine Löschaktion. Sichtbare entsprechende Mausaktionen anbieten.
- Cursor im Headingtitel wird sinnvoll abgebildet, beim Bodyaufruf bleibt er im Body; Fokus kehrt zum Editor zurück. Ein Bestätigen entspricht einem Undo-Schritt, Redo erhält den passenden Cursor. Unveränderte Bestätigung erzeugt keinen Text-/Historyeingriff.
- C-c C-c auf Headings bleibt im ersten Paket der Checklisten-/Zähleraktion vorbehalten. Nur auf TAGS-Definitionszeilen kommt das gezielte Neuladen hinzu; SEQ_TODO und Checkbox-Toggle behalten Priorität in ihren bisherigen Kontexten.

### Vererbung und Darstellung

- Effektive Tags = eigene plus Tags aller übergeordneten normalen Headings. Vererbung nicht in Kindzeilen schreiben. Eigene und geerbte Tags im Panel getrennt darstellen; geerbte Tags dort nicht löschbar, Herkunft anzeigen.
- H1–H6-Hierarchie des bestehenden Parsers wiederverwenden. Refile sowie Höher-/Tieferstufen ändern die effektive Vererbung entsprechend dem tatsächlichen neuen Elternkontext.
- Tags im Editor dezent, themeabhängig erkennbar; Rohtext bleibt sichtbar. Zunächst ein Leerzeichen zwischen Titel und Tagblock beim bewussten Schreiben, keine feste rechte Spalte/Whitespaceauffüllung und keine automatische Neuausrichtung bei anderen Befehlen.
- Bestehende Agendaeinträge erhalten getrennte Datenfelder für Titel, eigene und effektive Tags. Anzeige eigener Tags sowie bei Bedarf separat kenntliche geerbte Tags; Herkunft per Hinweis. Tag-only-Headings ohne TODO/Termin werden dadurch nicht automatisch zu Agendaeinträgen.
- Gespeicherter Index und aktuelle ungespeicherte Editorüberlagerung verwenden denselben Tagparser und dieselben Vererbungsregeln. Sichere Quellprüfung vergleicht die relevanten Tagdaten mit, nicht nur den bereinigten Titel.

## Modulgrenzen und bestehende Befehle

Ein gemeinsamer Heading-/Tagsuffix-Parser trennt Titel, Status, Checklisten-Zähler, lokale Tags und optionale schließende Hashes. Er darf nicht für jeden Verbraucher neu erfunden werden. Tagregeln, Schreibplaner, Panelcontroller und Darstellung getrennt halten; Integrationsänderungen gezielt in vorhandenen Modulen.

- Fortschrittszähler stehen vor Tags: `## Projekt [1/3] [33%] :WORK:`. Checklistenbefehle erkennen/aktualisieren diese weiterhin, ohne Tags zu verschieben oder zu löschen.
- TODO-Wechsel und Wiederholungsabschluss erhalten Tags; LOGBOOK/Planungsmetadaten unverändert. Tagbearbeitung selbst löst keinen TODO-Abschluss oder Zählerneuberechnung aus.
- Alt+Enter-Teilung im Titel: lokale Tags bleiben an der ursprünglichen Überschrift; die neue erhält keine eigenen Tags. Teilung innerhalb eines Tagblocks wird verweigert. Strg+Enter und neue TODO-Überschriften starten ebenfalls ohne eigene Tags; Vererbung folgt allein dem neuen Elternkontext.
- Refile, Folding, Hierarchie und Quellenpositionen bleiben konsistent. Texte mit Doppelpunkt, Links oder Code dürfen nicht versehentlich als Tagblock behandelt werden.
- Kein Eingriff in StorageCore, Backup-/Konfliktpfad oder Dateiformatkodierung. Keine automatische Speicherung/Migration.

## Abnahme vor PO-Probe

1. H1–H6 mit und ohne TODO, leere Titel, Umlaute, mehrere Tags und freie Tags; Hinzufügen, Entfernen, unveränderte Bestätigung, Abbruch und genaues Undo/Redo inklusive Cursor.
2. Mehrere/fehlende/fehlerhafte TAGS-Zeilen, doppelte Namen/Tasten, Code-/Frontmatter-Ausschluss, letzte gültige Regeln und Dateireset.
3. Eltern-/Kindvererbung über sechs Ebenen, normale Zwischenheadings, Refile und Ebenenwechsel; geerbte Tags erscheinen nicht als kopierter Markdowntext.
4. Zähler beider Arten mit Tags und schließenden ATX-Hashes, Statuswechsel, Wiederholungsabschluss, Alt+Enter/Strg+Enter/Alt+Shift+Enter; unveränderte Fremdmetadaten und atomare History.
5. Agenda gespeicherter Stand/Editorstand, Tagänderung ohne Titeländerung, Quellschutz, Vault-/Dirty-/Async-/Permission-/Panelgrenzen und Fokus.
6. Gesamttests, Build, Syntax-/Diffcheck; synthetischer Probevault und native Anleitung. Native Edge-/Zoom-/AltGr-/IME-Belege nur melden, wenn tatsächlich erhoben.

## Später, nicht Teil dieser Freigabe

Tagfilter/Match im Agenda-Dispatcher, komplexe Suchausdrücke, exklusive Gruppen/Taghierarchien/Regex, FILETAGS, globale Tagkonfiguration, massenweises Umbenennen, Tags an Listenpunkten sowie feste Rechtsausrichtung. Eine spätere Tag-Suche muss auch reine Tagheadings berücksichtigen; den jetzigen Aufgabenindex deshalb nicht als vollständiges Register sämtlicher getaggter Headings ausgeben.

## PO-Entscheidung

Empfehlung zur Freigabe: beschriebenes erstes Paket mit C-c q, hierarchischer lesender Vererbung und kompakter Darstellung ohne rechte Ausrichtung; Checklisten-C-c C-c erhalten. Danach erst Tagfilter/Match als eigenes Paket besprechen. Diese Datei selbst autorisiert keine Umsetzung.

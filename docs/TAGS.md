# Tags — Bedienung und PO-Probe

Implementiert nach PO-Freigabe „Engage“, 2026-11-11. Normale H1–H6 tragen einen abschließenden Tagblock; Tags sind unabhängig vom TODO-Status. Tags erscheinen rechtsbündig am Editorrand mit mindestens zwei Zeichenbreiten Abstand und in der Themefarbe ihrer Überschriftenebene. Die Ausrichtung verändert weder Markdowntext noch gespeicherte Leerzeichen; optionale schließende ATX-Hashes bleiben hinter dem Tagblock. Keine Taggruppen, FILETAGS oder Agenda-Matchfunktion.

Die Ausrichtung verwendet einen gemessenen Anzeigeabstand im normalen Textfluss. Der Cursor am Titelende steht vor diesem Abstand; beim Weitertippen bleibt ein vorhandener Quelltexttrenner vor den Tags erhalten. Bei schmalem Editor oder langen Titeln darf der Tagblock umbrechen. Die frühere Float-Ausrichtung wurde nach PO-Meldung über springende Tags beim Tippen ersetzt.

Nach der PO-Meldung über Tags in einer neuen Zeile berücksichtigt die Messung auch den rechten Innenabstand und Rahmen der Editorzeile. Die synthetische Browserprobe lässt sich mit `node scripts/tag-layout-probe.mjs` erstellen; anschließend `build/tag-layout-probe.html` öffnen. Sie prüft tatsächliche DOM-Geometrie in vier Themes und drei Breiten sowie fortlaufende Texteingabe und zeigt PASS/FAIL an. Die automatische native Probe wurde wegen nicht sicher bestimmbarer Browser-URL durch Computer Use gestoppt; für diese Korrektur ist kein nativer Erfolg belegt.

```markdown
#+TAGS: COMPUTER(c) PHONE(p) URGENT(u)

# Projekt :WORK:
## TODO Bericht [0/2] [0%] :COMPUTER:URGENT:
- [ ] Daten sammeln
- [ ] Gegenlesen
```

## Aufruf und Mehrfachauswahl

- C-c q: Strg+C drücken, C und Strg loslassen, dann q. Alternativ Alt+X → **Tags bearbeiten** oder Kontextmenü. Der aktuelle normale Headingabschnitt ist das Ziel, auch bei Aufruf aus dessen Text oder Liste.
- C-c C-c direkt auf einer H1–H6-Zeile öffnet ebenfalls Tags, auch bei vorhandenen Fortschrittszählern. Auf TAGS-/SEQ_TODO-Zeilen lädt es stattdessen die jeweiligen Vorgaben. Auf einer Checkboxzeile bleibt es Checkbox-Toggle.
- **Inherited · geerbt:** Tags aller Elternüberschriften. Herkunftszeilen stehen im Hinweis beim Darüberfahren; diese Tags werden nicht in den Kindtext kopiert und können dort nicht gelöscht werden.
- **Current · eigene:** der Entwurf der lokalen Tags dieser Überschrift. Buchstabentasten und Maus schalten Tags an/aus. Pfeile auf/ab wählen eine Option, Pfeil rechts toggelt die gewählte Option ohne Schnelltaste.
- **Tab** aus dem Menü öffnet die freie Eingabe. Einen oder mehrere kommagetrennte Tags eingeben; Tab im Feld vervollständigt vorhandene Namen. **Enter im Feld fügt hinzu und kehrt ins Menü zurück.** Diesen Ablauf beliebig oft wiederholen, mit vorhandenen oder neuen Tags; exakte Duplikate werden einmalig geführt.
- **Enter im Menü** beziehungsweise **Übernehmen** bestätigt den ganzen Entwurf mit genau einem Undo-Schritt. Unveränderte Bestätigung erzeugt keine Textänderung. Cursor im Titel beziehungsweise Body wird sinnvoll abgebildet; Redo stellt die Schlussposition wieder her.
- **Leertaste im Menü** leert nur eigene Tags. Im Textfeld löst sie keine Löschaktion aus. Escape/C-g/Abbrechen/Schließen verwirft den Entwurf verlustfrei. Native Tab/Shift+Tab auf Aktionsknöpfen bleibt Fokusnavigation.

Zähler auf Überschriften aktualisieren jetzt über Palette/Kontextmenü **Abschnittszähler aktualisieren**. Die dateiweite Aktion **Checklisten neu berechnen** bleibt erhalten.

## Vorlagen und Syntax

Mehrere `#+TAGS:`-Zeilen dürfen normale Namen und optionale eindeutige Buchstabentasten enthalten. Beispiel `HOME(h) WORK(w) URGENT(u)`; Namen ohne Taste sind erlaubt. Ohne Vorlagen stehen die bereits an Überschriften verwendeten Dateitags als Vorschläge bereit. Vorlagen weisen selbst keine Tags zu.

Beim Öffnen werden Vorlagen geladen; nach Bearbeitung C-c C-c auf einer TAGS-Zeile oder Palette **Tagvorlagen neu laden**. Bei ungültigen Vorgaben bleiben die letzten gültigen Vorlagen der Sitzung mit Fehlerhinweis erhalten. Beim Kaltstart ohne gültige Vorlagen stehen dynamische/freie Tags weiter zur Verfügung. Code, Frontmatter und Mischcontainer werden nicht als Definitionen ausgewertet.

Gültige Namen enthalten Unicode-Buchstaben/Ziffern sowie `_`, `@`, `#`, `%`. Keine Leerzeichen, Doppelpunkte oder Bindestriche. Groß-/Kleinschreibung bleibt erhalten und unterscheidet Tags. Ein lokaler Tagblock steht am Ende des Headinginhalts, vor optionalen schließenden ATX-Hashes: `## Titel [1/3] :WORK: ##`. Mehrere getrennte oder beschädigte Blöcke werden nicht automatisch repariert. Rohtexteingabe bleibt möglich.

## Integration und Grenzen

Vererbung folgt der tatsächlichen H1–H6-Struktur, auch nach Ebenenänderung und Refile. Geschwister erben nicht voneinander. Der gemeinsame Suffixparser trennt Tags vom Agenda-/Refiletitel und lässt Fortschrittszähler vor den Tags zu. TODO-Wechsel, wiederholende Aufgaben und Checklistenaktionen erhalten Tagblöcke.

Alt+Enter innerhalb des Titels lässt lokale Tags an der ursprünglichen Überschrift; die neue bekommt keine eigenen Tags. Innerhalb eines Tagblocks wird nicht geteilt. Strg+Enter und Alt+Shift+Enter erzeugen ebenfalls keine kopierten lokalen Tags. Die neue Überschrift erbt nur aus ihrem tatsächlichen Elternkontext.

Woche/TODO zeigen eigene und geerbte Tags getrennt. Gespeicherte Dateien und die ungespeicherte Editorüberlagerung verwenden dasselbe Modell. Tag-only-Headings ohne TODO oder Termin werden dadurch nicht automatisch zu Agendaeinträgen. Quellsprünge prüfen auch relevante Tagänderungen. **Agenda Match bleibt geplant/inaktiv.**

Der Tagentwurf lebt nur im Panel. Datei-, Vault-, Dokument- oder Cursorwechsel, Readonly/Busy und bestehende Panelgrenzen schützen vor veralteten Bestätigungen. Kein automatisches Speichern/Migrieren, keine Änderung an StorageCore, Backup-/Konfliktpfad oder Dependencies. Bei Tagaufruf aus dem oberen Editor wird eine offene Agenda wie andere gemeinsame Arbeitsmenüs gezielt abgelöst.

## Synthetische native Handprobe

Nach Build/Strg+F5 in Edge ausschließlich für Agenten den Vault `test-vault/tags` wählen, `tags.md` öffnen. Native Tastenzustellung/Layout ist durch Modelltests nicht belegt.

1. Auf „Bericht“ C-c C-c: Inherited WORK, Current COMPUTER/URGENT. `p` toggeln, danach Escape: Text unverändert.
2. Erneut öffnen, Tab → `Neu` → Enter; Tab → `PHONE` → Enter; Tab → `URG` → Tab vervollständigt URGENT → Enter. Bis hier keine Textänderung. Enter im Menü übernimmt; Strg+Z/Redo stellt die gesamte Tagänderung samt Cursor sinnvoll zurück/wieder her.
3. Leertaste im Menü entfernt eigene Tags, WORK bleibt geerbt. Abbrechen verliert nichts. Mausknöpfe und wiederholtes Öffnen/Schließen prüfen; in allen vier Themes und bei kleinem Fenster/Zoom.
4. Auf „Daten sammeln“ C-c C-c toggelt Checkbox und beide Berichtzähler, Tags unverändert. Auf „Bericht“ öffnet derselbe Befehl Tags. Palette **Abschnittszähler aktualisieren** funktioniert separat.
5. TAGS-Zeile um freie Vorgabe ergänzen, C-c C-c lädt sie. Doppelte Schnelltaste eintragen: klarer Fehler, bisherige gültige Vorgaben bleiben verfügbar. Korrigieren/neu laden. Anschließend zu `andere.md` wechseln: keine Übernahme der Vorlagen der ersten Datei.
6. Alt+Enter im Berichttitel: rechte Titelhälfte wird gleichrangiges Heading ohne eigene Tags; Original behält Tags/Zähler. Strg+Enter nach Unterbaum und Alt+Shift+Enter prüfen. Refile/Ebenenänderung verändert die geerbten Tags entsprechend dem Elternkontext.
7. Agenda öffnen: eigene und geerbte Tags sichtbar, Titel ohne Tagblock. Im oberen Editor Tags roh ändern, zur Agenda zurück: Editorstand nach kurzer Pause aktualisiert. Samefile-Follow erhält Dirty/Undo; andere Datei bleibt bei Dirty gesperrt.
8. H1–H6 mit Tags in allen Themes prüfen: Tags stehen rechts und haben die jeweilige Headingfarbe. Direkt am sichtbaren Titelende mehrere Wörter mit Leerzeichen tippen, löschen und Undo/Redo: Cursor bleibt am Titel, Tags bleiben ausgerichtet, kein zusätzliches Space als Reparatur nötig. Editorbreite/Zoom und Zeilenumbruch wechseln, lange Titel/Tagblöcke und `## Titel :WORK: ##` prüfen. Im Tagblock tippen, auswählen/kopieren, Undo/Redo: Rohtext und schließende Hashes bleiben in ihrer ursprünglichen Reihenfolge.

Automatisiert geprüft werden Parser/Regeln, H1–H6-Vererbung, Schreibpläne/History, echtes Panel mit wiederholter Eingabe, Abbruch/Stale/Modifier/IME, Zähler/Status/Wiederholungen/Struktur, Agenda und Quellenvalidierung. Keine unabhängige QA-Rollenabnahme oder native Langzeitabnahme behauptet. Keine Git-Integration ohne gesonderte Anweisung.

# Startansicht mit #+STARTUP

Eine einzelne Zeile in der Markdown-Datei bestimmt die Ansicht beim Öffnen:

```text
#+STARTUP: overview
```

| Wert | Ansicht |
| --- | --- |
| `overview` | Nur oberste vorhandene Überschriften; Trees eingeklappt. |
| `content` | Alle Überschriften sichtbar, Textkörper verborgen. |
| `showall` / `showeverything` | Alles geöffnet; beide Werte sind bei uns gleichbedeutend. |
| `show2levels` bis `show5levels` | Überschriften bis H2 bis H5 sichtbar, Textkörper und tiefere Unterbäume verborgen. |

Die Zeile steht am besten am Dateianfang, darf aber auch später stehen.
Groß-/Kleinschreibung ist unerheblich. Ohne Angabe bleibt alles geöffnet.
Genau eine Definition mit einem unterstützten Wert wird akzeptiert; ungültige
oder mehrfache Angaben lassen die Ansicht offen und erzeugen einen Hinweis.
Code, HTML/Kommentare, Frontmatter, Zitate, Listen und PROPERTIES-/LOGBOOK-Drawer
werden nicht als Konfiguration ausgewertet.

Die Vorgabe gilt beim Öffnen über Dateiauswahl, C-c f und Agenda sowie beim Laden
eines Entwurfs. Ein Agenda-Quellsprung darf den Zielabschnitt danach öffnen.
Manuelles Falten bleibt beim Speichern und Tippen erhalten. Eine geänderte
STARTUP-Zeile wirkt beim erneuten Öffnen. Ein interner Fehler-Rollback wendet die
Vorgabe nicht erneut an. Text, Dirty-Status und Texthistory werden durch die
Startansicht nicht verändert. Die bestehenden Tab-/Umschalt+Tab-Befehle bleiben.

Die vorhandene Markdown-Analyse und Faltbereiche werden wiederverwendet.
Bei Überschriften ohne H1 ist `overview` auf die tatsächlichen Wurzeln bezogen;
`showNlevels` verwendet die geschriebenen H-Ebenen. Einleitender Text vor der
ersten Überschrift bleibt sichtbar. Wenn die vollständige Analyse das begrenzte
100-ms-Zeitbudget überschreitet, bleibt die Datei mit Hinweis offen.
Keine globale Einstellung, kein Optionsmenü und keine VISIBILITY-Properties.

## Handprobe

1. Synthetischen Vault `test-vault/startup` öffnen, `overview.md` laden:
   nur „Arbeit“ und „Referenz“ sollen als Trees sichtbar sein.
2. Arbeit mit Tab öffnen, etwas bearbeiten und speichern: geöffnete Ansicht bleibt.
3. Datei wechseln und erneut öffnen: wieder Übersicht.
4. STARTUP-Wert in `content`, `show2levels` oder `showall` ändern, speichern und
   erneut öffnen; Überschriften/Text entsprechend obiger Tabelle prüfen.
5. Aus der Agenda zu einer versteckten Aufgabe springen: Ziel muss sichtbar sein.

Automatisierte Modelltests ersetzen keine native Browserabnahme.

## Startansicht über die Oberfläche festlegen

Alt+X öffnet die vorhandene Befehlspalette. Nach „Startansicht“ oder „STARTUP“
suchen und **Startansicht festlegen …** aktivieren. Der Befehl ist auch im
Editor-Kontextmenü verfügbar. Im unteren Arbeitsbereich stehen die erklärten
Ansichten samt zugehöriger STARTUP-Zeile; die erkannte Vorgabe ist mit „aktuell“
markiert. Suchen, Pfeiltasten und Enter oder Mausklick wählen einen Wert.
Escape/Strg+G oder Schließen bricht ohne Textänderung ab.

Die Auswahl ersetzt eine vorhandene aktive STARTUP-Zeile oder fügt sie am
Dateianfang, gegebenenfalls nach geschlossenem Frontmatter, ein. Beispiele in
geschützten Bereichen bleiben erhalten. Eine ungültige einzelne Zeile kann so
korrigiert werden; mehrere aktive Zeilen werden wegen Mehrdeutigkeit verweigert.
Bei ungeschlossenem Frontmatter wird keine neue Zeile eingefügt.

Die Änderung ist ein eigener Undo-/Redo-Schritt und erhält die Textauswahl.
Anschließend mit Strg+S speichern und erneut öffnen; die aktuelle Faltung wird
durch die Auswahl nicht neu angewendet. Öffnen der Auswahl allein verändert
keinen Text. Dateiwechsel, veralteter Zielzustand, Schreibschutz und laufende
Vorgänge bleiben geschützt. Der Befehl verwendet den vorhandenen gemeinsamen
Arbeitsbereich; eine angedockte Agenda wird vor Öffnung der Auswahl geschlossen.
Ein allgemeines Einstellungsmenü oder globaler Standard ist nicht enthalten.

Handprobe: Alt+X → „Startansicht“ → `content` wählen, Zeile kontrollieren,
Undo/Redo prüfen, speichern und erneut öffnen. Danach Auswahl erneut öffnen
und mit Escape abbrechen: Text und aktuelle Faltung bleiben erhalten.

# Checklisten — Vorschlag zur PO-Besprechung

Das Paket wurde auf `feature/checklists` umgesetzt und vom PO nach der praktischen Probe zur Integration freigegeben. Die folgenden Regeln dokumentieren den freigegebenen Vorschlag. [Bedienung und Probe](CHECKLISTS.md)

## Ziel und Quellen

Leichte Checklisten innerhalb einer Datei, mit Abhaken, verschachtelten Teilschritten und sichtbarem Fortschritt auch bei gefalteten Abschnitten. Heading-TODOs bleiben die Aufgaben für Agenda und Termine.

Referenzen, am 2026-11-10 gelesen:

- [Org-Handbuch: Checkboxes](https://orgmode.org/manual/Checkboxes.html): Checkboxen sind lokale Schritte außerhalb der globalen TODO-Liste. Org kennt offen, teilweise und erledigt, hierarchische Elternzustände sowie explizit eingefügte Bruch-/Prozentzähler. Standardstatistik zählt direkte Kinder. Umschalten und Einfügen aktualisieren Zähler; für manuelle Änderungen gibt es eine Neuberechnung.
- [GFM-Spezifikation: Task list items](https://github.github.com/gfm/#task-list-items-extension-): `[ ]`, `[x]` und `[X]` nach einem Listenmarker sind Checkboxsyntax. `[-]` und Fortschrittszähler gehören nicht zu dieser Erweiterung. Solche Angaben bleiben außerhalb unseres Workspace lesbarer Text, sind aber nicht überall interaktive Checkboxen.

## Vorhandene Bausteine

- `editor/list-interaction.mjs`: Einfügen mit Shift+Alt+Enter, Fortsetzungszeilen, Einrücken, Falten, strukturelle Validierung und isolierte Undo-Operationen. Noch kein Checkbox-Umschalten oder Zählerworkflow.
- `editor/emacs-policy.mjs`, `editor/app.mjs`: C-c C-c führt derzeit `todo.reload` aus. Neue Funktion muss über bestehenden Dispatcher/Registry kontextabhängig eingebunden werden; vorhandenes Neuladen auf SEQ_TODO-Zeilen erhalten.
- Bestehende Listenparser und Headinggrenzen wiederverwenden. Nicht nur mit einem dokumentweiten Regex nach `[ ]` suchen.

## Empfohlenes erstes Paket

Die folgenden Regeln bilden den vom PO zur Implementierung freigegebenen Vorschlag.

### Format und Bedienung

PO-Nachkorrektur: Alt+Shift+Enter setzt auch auf einer vorhandenen Headingzeile mit einer neuen TODO-Überschrift gleicher Ebene/Einrückung fort. Cursor hinter Status/Leerzeichen; Checkboxkonvertierung setzt Cursor mindestens hinter `[ ] ` und erhält eine bestehende Position innerhalb des Titels. Jeweils einschließlich Undo/Redo.

```markdown
## TODO Reise vorbereiten [1/3]
- [x] Unterkunft buchen
- [-] Gepäck vorbereiten [1/2]
  - [x] Kleidung
  - [ ] Ladegeräte
- [ ] Tickets ausdrucken
```

- `[ ]` offen, `[x]` erledigt; vorhandenes `[X]` ebenfalls erkennen. Neu geschriebene Abschlussmarker als `[x]`. `[-]` zeigt einen teilweise erledigten Elternpunkt.
- Gültige bestehende Bullet-/nummerierte Listen im bisherigen unterstützten Markdown-Umfang verwenden; bestehende Grenzen nicht beiläufig aufweiten.
- C-c C-c schaltet eine Blattcheckbox auf der aktuellen ersten Itemzeile um, unabhängig von der Cursor-Spalte. Keine Mehrfachauswahl- oder Bereichsoperation im ersten Paket.
- Klick genau auf den Checkboxmarker löst denselben Befehl aus. Text bleibt normal bearbeitbar; Markierungen themegerecht und mit erkennbarem Tastaturfokus darstellen.
- PO-Anpassung: Shift+Alt+Enter konvertiert den aktuellen normalen Listenpunkt zur Checkbox, ohne neue Zeile. Auf leerer Textzeile entsteht ein TODO im ersten geladenen offenen Zustand auf letzter vorheriger Headingebene (ohne Heading H1). Auf vorhandener Checkbox weiterhin neuen offenen Geschwisterpunkt einfügen. Enter bleibt Fortsetzung desselben Punktes. Alt+Enter bleibt normaler Listenpunkt.
- Ein eigener Palettenbefehl fügt am aktuellen normalen Listenpunkt eine offene Checkbox hinzu oder entfernt dessen Marker. Keine zusätzliche Tastenkombination dafür erforderlich. Bei Elternpunkten nur zulassen, wenn abhängige Zähler/Zustände eindeutig bleiben, sonst mit Hinweis verweigern.

### Hierarchie und Fortschritt

- Elterncheckboxen werden aus ihren direkten Checkboxkindern berechnet: alle offen → `[ ]`, alle erledigt → `[x]`, sonst `[-]`. Teilweise Kinder gelten als nicht vollständig erledigt. Mehrere Ebenen von unten nach oben berechnen.
- Empfohlene bewusste Bediengrenze: Eltern mit Checkboxkindern sind abgeleitet; direktes Umschalten verweigern und auf die Kinder hinweisen. Kein unerwartetes massenweises Abhaken des Unterbaums. Diese Grenze ist eine Produktentscheidung, keine behauptete vollständige Org-Nachbildung.
- Zähler nur auf ausdrücklichen Wunsch: Nutzer schreibt `[/]` und/oder `[%]` ans Ende einer Heading-/ersten Itemzeile. Beide Arten können mit Leerraum getrennt gemeinsam vorkommen, in beliebiger Reihenfolge. Vorhandene numerische Zähler an derselben Stelle aktualisieren. Keine automatische Ausstattung aller Überschriften.
- Ein Headingzähler zählt die obersten Checkboxpunkte seines eigenen Abschnitts bis zur nächsten Überschrift; Unterüberschriften besitzen eigene Abschnitte. Ein Itemzähler zählt direkte Checkboxkinder. Normale Listenpunkte sind keine Zähleinheiten und werden nicht übersprungen, um tiefere Checkboxen einzusammeln. Dadurch keine doppelte Zählung von Eltern und Enkeln.
- Vollständig erledigte Einheiten zählen; Prozentwert abrunden. Leere Menge als `[0/0]` beziehungsweise `[0%]`, ohne daraus einen Abschluss abzuleiten. Mehrere Zähler derselben Art, mehr als zwei oder mehrdeutige Zähler/Marker in Inline-Code/Links konservativ unverändert lassen und bei explizitem Befehl erklären.
- Checkboxaktionen und strukturelle Listenbefehle aktualisieren betroffene Eltern und bereits vorhandene Zähler atomar in derselben Undo-Operation. Löschen, Verschieben, Einrücken und Einfügen berücksichtigen.
- Nach Rohtextbearbeitung: expliziter Palettenbefehl „Checklisten neu berechnen“ für die aktuelle Datei. C-c C-c auf einer Überschrift mit Zähler aktualisiert nur deren Abschnitt, ohne Sammelumschalten. Beim Laden/Speichern keine stillen Textänderungen; Undo/Redo spielen die gespeicherte Änderung unverändert zurück.

### Abgrenzung

- Heading-TODO-Status bleibt manuell. 100 Prozent setzt kein DONE und löst keinen wiederkehrenden Abschluss oder LOGBOOK-Eintrag aus.
- Checklisten gelangen nicht als eigene Aufgaben in den Agendaindex.
- Wiederholender Headingabschluss setzt Checkboxen zunächst nicht zurück. Das würde den bisherigen M6b-Umfang erweitern und benötigt eine eigene PO-Entscheidung.
- Kein ORDERED, Radio-Modus, Properties-/COOKIE_DATA-Konfiguration, TODO-Kinderzähler, Fortschrittsbalken oder dateiübergreifender Checklistendienst im ersten Paket.
- Keine neuen Dependencies oder Storageänderungen. Kein Commit/Push/Deploy.

## Umsetzung und Abnahme nach Freigabe

Separates Checkboxmodell und Änderungsplaner, dünne Registry-/Editorintegration und vorhandene Themebausteine. Vor Beginn genaue Parsergrenzen und mögliche Wiederverwendung mit den Listenmodulen prüfen. Kein zweiter Listenparser oder persistenter Index.

Synthetische Abnahmefälle: flache Einkaufsliste; obiges Beispiel; mindestens fünf gültige Listenebenen; mehrere Headingabschnitte; mehrere getrennte Listen im selben Abschnitt; normale Punkte zwischen Checkboxen; Fortsetzungszeilen; Zähler mit null Einträgen; untere/obere Abschlussmarker; Code/Frontmatter/Links/escaped Text; Einfügen/Entfernen/Einrücken/Verschieben; atomare Undo-/Redo-Rückkehr einschließlich aller Eltern/Zähler; keine Aufgaben-/Termin-/LOGBOOK-Nebenwirkung; schreibgeschützt/Busy/IME/AltGr und Agendasplit erhalten.

Native PO-Probe zusätzlich für C-c C-c, Markerklick, Falten, Cursorposition, kleine Fenster und alle Themes. Automatisierte Tests ersetzen diese Probe nicht.

## Zur PO-Entscheidung

PO bestätigt das Paket und beauftragt ausdrücklich die Implementierung. Hierarchie mit `[-]`, abgeleitete Eltern ohne Sammelumschalten und Neuberechnung nach Rohtexteingabe per Befehl gehören zum umgesetzten Umfang. Nach Bericht folgt die native PO-Probe; weitergehende Funktionen und Merge benötigen eine neue Entscheidung.

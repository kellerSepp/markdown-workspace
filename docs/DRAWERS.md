# Allgemeine Drawer

Zusatzinformationen zu einer H1–H6-Überschrift lassen sich in benannten Bereichen
ablegen und unabhängig vom restlichen Text falten:

```text
## ONHOLD Bestellung :SHOPPING:

:PEOPLE:
Einkauf: synthetische Ansprechpartnerin
Lieferung: synthetischer Ansprechpartner
:END:
```

Tags bleiben das Suffix einer Überschrift; Drawer-Marker stehen allein auf eigenen
Zeilen. Gültige Namen beginnen mit einem ASCII-Buchstaben, danach sind Buchstaben,
Ziffern und Unterstriche erlaubt. Beim Anlegen wird der Name großgeschrieben.
`END`, `LOGBOOK` und `PROPERTIES` sind reserviert. LOGBOOK wird weiterhin über
„Logbuchnotiz hinzufügen …“ bzw. C-c z bedient; allgemeine Eigenschaftenverwaltung
und zusätzliche PROPERTIES-Faltung sind nicht enthalten.

## Anlegen oder Text verpacken

1. Unter einer normalen H1–H6-Überschrift den Cursor auf eine freie Textzeile setzen.
   Alternativ vollständige Textzeilen auswählen, auch rückwärts.
2. Alt+X → „Drawer anlegen …“ suchen und aktivieren. Der Befehl ist ebenfalls im
   Editor-Kontextmenü vorhanden; es gibt kein neues Tastenkürzel.
3. Namen eingeben, z. B. `PEOPLE` oder `DETAILS_2`. Enter oder der Übernehmen-Knopf
   legt an, Escape/Abbrechen verwirft die Eingabe.
4. Ohne Auswahl entsteht vor der aktuellen Zeile ein leerer Drawer; mit geeigneter
   Auswahl werden die ganzen Textzeilen eingehüllt. Neu angelegte Drawer bleiben
   offen, damit Inhalt eingegeben werden kann.
5. Strg+S speichert die Markdown-Datei. Anlage/Verpacken ist atomar per Undo/Redo
   rückgängig zu machen. Bereits vorhandener Inhalt bleibt erhalten.

Ungeeignete oder nur teilweise ausgewählte Zeilen, Überschriften, Metadaten,
Code-/Zitat-/Listenkontexte und bereits vorhandene Drawer werden nicht still
eingehüllt. Bei einem veralteten Zielzustand, Busy oder Schreibschutz wird die
Änderung verweigert; Auswahl am gewünschten Ziel erneut öffnen.

## Falten und Grenzen

Tab auf der Anfangszeile öffnet/schließt den Drawer. Die vorhandene Escape-
Fokusnavigation behält Vorrang. Beim Laden und beim Öffnen des Headings bleiben
gültige freie Drawer und LOGBOOK eingeklappt; explizites Öffnen des Drawers zeigt
den Inhalt. Ohne passende vollständige Analyse wird kein unsicherer Bereich
verändert. Speichern und normales Tippen wenden die Startfaltung nicht erneut an.

Drawer dürfen nicht verschachtelt werden oder Überschriften enthalten. Fehlende
Endmarker und Headinggrenzüberschreitungen werden nicht automatisch repariert.
Nur eindeutig gültige Bereiche sind faltbar. Marker in geschützten Beispielen
(Code, Frontmatter, Zitate, HTML, Notizinhalte) sind keine freien Drawer.

Eine Rohtexteingabe wie `# Zutaten` innerhalb der Hülle ist deshalb keine gültige
Drawer-Unterüberschrift. Die normale Markdown-Syntaxfarbe kann weiterhin eine
Überschrift zeigen; sie ist keine Bestätigung eines gültigen Drawers. Für einen
einfachen Zwischentitel etwa `Zutaten` ohne führendes `#` oder `**Zutaten**`
verwenden. Ein wörtliches Markdown-Zeichen kann mit `\#` geschrieben werden.
Die Anwendung schreibt solche Eingaben nicht automatisch um.

Bei einer durch eine Überschrift beschädigten Hülle verweigern Tab/Shift+Tab
und die positionsbezogenen Faltklicks im erkannten Diagnosebereich die Faltung
mit Hinweis. Eine zuvor gültige Drawerfaltung wird nach entsprechender
Rohtextänderung entfernt, damit ungültiger Inhalt nicht verdeckt bleibt. Das
ändert nur die Ansicht, nicht Text oder Texthistory. Unabhängige gültige Drawer
und sichere Nachbarüberschriften bleiben bedienbar. Die Diagnose macht aus
solchem Inhalt keinen gültigen Drawer und keine neue Properties-Konfiguration.

Freie Drawer sind Zusatztext. Darin enthaltene Beispielzeilen wie SCHEDULED,
TAGS oder SEQ_TODO sind keine neue Konfiguration oder Aufgabenplanung. Es gibt
keine automatische Statusprotokollierung, zusätzliche Agendaansicht oder
Änderung am Storage-/Backupmodell.

## Native Handprobe

Synthetischen Vault `test-vault/drawers` wählen, `drawers.md` öffnen:

1. PEOPLE, DETAILS_2 und LOGBOOK geschlossen, Überschriften/Tags erhalten.
2. Tab auf jedem Marker zweimal: öffnen/schließen; Child-PEOPLE separat testen.
3. Unter „Rückfrage“ die zwei Beispieltextzeilen vollständig auswählen und per
   Palette als `NOTES` verpacken. Inhalt textgleich, Undo/Redo jeweils ein Schritt.
4. Auf freier Textzeile einen leeren `CONTACTS`-Drawer anlegen, Inhalt eingeben,
   speichern, Datei wechseln/zurück: Drawer geschlossen und Inhalt vorhanden.
5. Ungültige Namen, reservierte Namen, Teilzeilenauswahl und Abbruch prüfen.
6. `invalid.md`: beschädigte/verschachtelte Bereiche bleiben sichtbar; Nachbartext
   unverändert. Codebeispiel in `drawers.md` bleibt normaler Code.
7. LOGBOOK-Schnellnotiz und bestehenden Wiederholungsabschluss regressionsprüfen.
   Beispieldatum aus DETAILS_2 darf keine Aufgabe in der Agenda planen.
8. `heading-invalid.md` öffnen: Tab auf ZUTATEN, auf der #-Zeile und auf den
   Listenzeilen verweigert im Diagnosebereich Faltung mit Hinweis; der Inhalt
   bleibt sichtbar. Der gültige PEOPLE-Drawer unter dem sicheren Nachbarheading
   lässt sich weiter bedienen. Zusätzlich in einen zuvor gültigen Drawer eine
   #-Überschrift schreiben: ein alter Drawerfold darf nicht bestehen bleiben.

Automatisierte Modelltests ersetzen keine native Browser-/IME-/Langzeitprobe.

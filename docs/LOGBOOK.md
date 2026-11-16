# Manuelle Logbuchnotizen

Auf einer normalen H1–H6-Überschrift oder in deren Textkörper: **C-c z**
(Strg+C, beide Tasten loslassen, unmodifiziertes z). Alternativ Alt+X und
„Logbuchnotiz hinzufügen …“ suchen oder Editor-Kontextmenü verwenden.
Ein TODO-Status ist nicht erforderlich; Überschriften-Tags bleiben unverändert.

Im unteren Arbeitsbereich mehrzeilig schreiben. Enter erzeugt einen Zeilenumbruch.
**C-c c** oder „Notiz übernehmen“ fügt den Eintrag in den Editor ein.
**C-c k**, Escape oder „Abbrechen“ verwirft ihn. Die Folgebuchstaben werden ohne
Strg gedrückt. Während der Texteingabe gelten die lokalen Panelbefehle.
Anschließend ausdrücklich **Strg+S im Editor**, um die Markdown-Datei zu speichern.
Eine noch nicht übernommene Panelnotiz ist nur flüchtige Eingabe; vor Dateiwechsel,
Schließen des Panels oder Öffnen eines anderen Panels übernehmen oder abbrechen.
Bloßer Fokus-/Fensterwechsel schließt das Notizpanel nicht. Hat sich der Editorzustand
inzwischen geändert, wird die Übernahme verweigert; Text kann aus dem Panel kopiert
und nach erneutem Öffnen eingefügt werden (Kontextmenü des Textfelds für Kopieren).

```text
## ONHOLD Bestellung :SHOPPING:
:LOGBOOK:
- Note taken on [2026-11-16 Mo 09:50] \\
    Lieferanten angerufen.
    Rückmeldung am Freitag zugesagt.
:END:
```

Zeitpunkt und deutscher Wochentag werden beim Übernehmen aus der lokalen Uhr
ermittelt. Neue Einträge stehen oben im gleichen eigenen LOGBOOK. Fehlt es, wird
es nach Überschrift, direktem Planungsblock und gegebenenfalls PROPERTIES angelegt.
Kindüberschriften und deren LOGBOOKs bleiben getrennt. Notiztext wird mit vier
Leerzeichen eingerückt, damit darin geschriebene Überschriften/Drawer-Marker nicht
als Dokumentstruktur wirken. Bestehende Wiederholungslogs bleiben erhalten;
automatisches Statuslogging wird nicht eingeführt.

Das LOGBOOK startet beim Laden und nach Übernahme eingeklappt. Auf der
`:LOGBOOK:`-Zeile öffnet/schließt **Tab** es, auch bei ausgeschaltetem Org-Tab.
Die Escape-Fokusnavigation behält Vorrang. Beim Öffnen einer Überschrift bleiben
ihre LOGBOOKs geschlossen. Es werden nur gültige LOGBOOKs gefaltet; allgemeine
benannte Drawer und spezielle PROPERTIES-Faltung sind nicht Teil dieses Pakets.
Tags werden ausschließlich als Heading-Suffix behandelt, LOGBOOK/END dagegen als
eigene Markerzeilen. Code-/Zitat-/Frontmatter-Kontexte bleiben geschützt.

Notiz und neue Drawer-Hülle bilden eine Textänderung mit Undo/Redo. Leere Notizen,
fehlender Headingkontext, mehrere eigene LOGBOOKs und beschädigte lokale Drawer
werden mit Hinweis verweigert. Kein stilles Reparieren. Die vorhandene begrenzte
Parserzeit gilt weiter; unvollständig analysierte Dokumente werden nicht verändert.

## Native Handprobe

1. Synthetischen Vault `test-vault/logbook` wählen und `notes.md` öffnen.
2. H1 oder eigenen Text fokussieren, C-c z, zwei Zeilen schreiben, C-c c.
3. Neuer Eintrag trägt aktuelle lokale Zeit; Drawer eingeklappt, Tags erhalten.
4. Tab auf LOGBOOK zweimal: öffnen/schließen. Wieder C-c z: zweite Notiz oben.
5. Undo/Redo: eine Notiz pro Textschritt; keine neue Zeit beim Redo.
6. Kindaufgabe separat kommentieren; Elterneinträge bleiben erhalten.
7. Panel mit C-c k und Escape abbrechen: keine Textänderung.
8. Speichern, andere Datei und zurück: LOGBOOK eingeklappt. Heading mit Tab und
   vorhandenen Faltbefehlen öffnen: LOGBOOK bleibt geschlossen.
9. Browser-/kleines-Fenster-/IME-/AltGr-Probe und Wiederholungsabschluss mit
   bestehenden manuellen Logs praktisch prüfen.

Automatisierte Modelltests sind keine native Browser- oder Langzeitabnahme.

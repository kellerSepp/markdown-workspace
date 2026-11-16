# Vorschlag: allgemeine benannte Drawer

Status: PO hat das vorbereitete Paket am 2026-11-16 ausdrücklich zur Umsetzung
freigegeben, einschließlich Faltung und Palettenbefehl. LOGBOOK ist auf main
integriert (abeec08); Umsetzung auf feature/drawers. LOGBOOK-Bedienung und
Wiederholungsprotokolle bleiben erhalten. Nach Bericht für native PO-Probe stoppen;
kein Commit/Push/Merge dieses Pakets ohne neuen Auftrag.

Umsetzung inzwischen abgeschlossen, unabhängige QA 525/525 Tests grün; Details
und praktische Abnahme in DRAWERS.md und PROJECT_STATUS.md. Nachfolgend ist der
freigegebene begrenzte Entwurf zur Nachvollziehbarkeit erhalten.

## Ziel und begrenzter Umfang

Freie Zusatzinformationen unter einer H1–H6-Überschrift ausblenden können:

```text
:PEOPLE:
Ansprechpartner und Gesprächsinformationen.
:END:
```

Vorgeschlagene erste Stufe: gültige allgemeine Drawer erkennen und mit Tab auf
der Anfangszeile falten; beim Laden und Öffnen des Headings geschlossen halten.
Eintrag in der Palette „Drawer anlegen …“ fragt den Namen ab und fügt einen
leeren Drawer ein oder verpackt eine vollständige mehrzeilige Textauswahl.
Kein neues Shortcut ohne Freigabe; vorhandene LOGBOOK-Folge C-c z bleibt.

Vorgeschlagene Namensregel: ASCII-Buchstabe gefolgt von Buchstaben, Ziffern oder
Unterstrich; beim Anlegen Großbuchstaben. Marker stehen allein auf eigenen
Zeilen mit höchstens drei führenden Leerzeichen. END ist Abschlussmarker,
LOGBOOK und PROPERTIES sind reserviert und werden nicht als frei anlegbare
Drawer angeboten. Bestehende allgemeine Drawer enthalten keine Überschriften
oder weiteren Drawer; verschachtelte, unvollständige oder über Headinggrenzen
reichende Strukturen werden nicht still repariert oder gefaltet.

Tags am Headingende bleiben Tags. Code, Frontmatter, Zitate, HTML und vorhandene
Notizinhalte sind geschützt. Einzelne Doppelpunktzeilen in freiem Text sind
potenziell mehrdeutig: nur ein vollständig und eindeutig begrenztes Paar gilt
als Drawer; sonst bleibt Rohtext sichtbar. Identische Namen in getrennten
gültigen Drawern können erlaubt bleiben, da Faltung positionsbezogen ist.

## Architekturvorschlag und Alternativen

Gemeinsame lesende Drawer-Erkennung und Faltbereichsbildung statt paralleler
Regex-Scanner. Die bestehende Planungserkennung für LOGBOOK/PROPERTIES nur nach
Regressionsprüfung auf diese Grundlage umstellen: Wiederholungslogik darf freie
Drawer nicht als Properties oder LOGBOOK interpretieren. Heading-/Notiz-/Index-
Parser dürfen Inhalte allgemeiner Drawer nicht als neue Aufgaben/Planung werten.
Native Markdown-Struktur respektieren; kein zweiter Markdownparser.

Alternative: zunächst ausschließlich Faltung handgeschriebener Drawer, ohne
Anlegebefehl. Kleinerer Umfang; Nutzer müsste Namen und Marker selbst schreiben.
Empfehlung zur PO-Entscheidung: Faltung plus kleiner Palettenbefehl, damit die
Funktion später auffindbar ist. Allgemeines Properties-System bleibt separat.

## Abnahme nach Freigabe

- H1–H6, mehrere eigene Drawer, Geschwister und Kinder korrekt abgegrenzt.
- Tab auf Marker toggelt, Escape-Fokusnavigation bleibt; Header öffnen erhält
  geschlossene Drawer, explizites Drawer-Öffnen zeigt den Inhalt.
- Tags, geschützte Beispiele, Zeilenenden und fremder Text bleiben erhalten.
- Anlegen/Verpacken atomar mit Undo/Redo; Abbruch ohne Textänderung. Teilzeilige,
  geschützte oder strukturell ungeeignete Auswahl mit Hinweis verweigern.
- Bestehende LOGBOOK-Notizen, Wiederholungsabschluss, Properties, TODO, Checklisten,
  STARTUP und Agendaindex unabhängig regressionsprüfen.
- Busy-/Readonly-/Stale-/Datei-/Vaultgrenzen und Panel-Fokus/Viewport erhalten.
- Synthetischer Probevault, Anleitung, Tests/Build/Syntax/Diffcheck; native Probe
  getrennt berichten. Keine Dependencies/Storageänderungen/automatischen Logs,
  weiteren Agendaansichten oder Git-Integration aus der Featurefreigabe ableiten.

Referenz: https://orgmode.org/manual/Drawers.html

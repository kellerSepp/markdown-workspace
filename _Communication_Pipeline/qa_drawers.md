# Unabhängige QA — allgemeine Drawer, 2026-11-16

Prüfauftrag: freigegebenes Paket `PLAN_DRAWERS.md` auf `feature/drawers`.
Eigene Dateien: `editor/drawers.qa.test.mjs` und dieser Bericht. Keine
Implementierungsänderungen durch QA; Nutzerdateien nicht geöffnet/verändert.

## Zwischenstand vor Korrektur

**P2 offen:** Gutter-Zyklus kann ein offenes Heading mit einzig geschlossenem
Drawer nicht einklappen. Repro: Dokument `# H`, Intro, gültiger PEOPLE-Drawer,
Tail. `applyStartupVisibility(view)` faltet den Drawer. Anschließend
`cycleContext(view, noop, 0)` lässt ausschließlich den Drawer geschlossen;
der Heading-Faltbereich wird nicht gesetzt. Ursache: `within()` zählt
Drawer-Faltung als Heading-Faltzustand; `revealContext()` öffnet dadurch einen
bereits offenen Header und stellt den Drawerfold wieder her.
Reproduzierbare unabhängige Regression: erste Gruppe in `drawers.qa.test.mjs`.
An Lead gemeldet, kein eigenmächtiger Fix.

Sechs unabhängige Prüfgruppen ausgeführt: fünf grün, eine rot. Geprüft:
Außentext/Zeilenenden bei EOF und nächstem Heading, vorwärts/rückwärts gerichtete
Auswahl, exakte Undo-/Redo-Auswahl; beschädigte/verschachtelte/über Headinggrenzen
reichende Drawer; geschützte Code-/HTML-/Zitat-/Frontmatter-Beispiele; reservierte
Properties-Werte; echte Agenda-Fixture ohne Datum aus DETAILS_2; tatsächlicher
Wiederholungsabschluss mit freiem Drawer, Tag, Property und altem LOGBOOK;
veraltete Auswahl, Busy, fehlendes Dokument und Readonly beim Übernehmen.

Serieller Gesamtlauf `node --test --test-concurrency=1 spike/storage.test.mjs
editor/*.test.mjs`: **520/521**, einzige rote Gruppe obiger P2, ca. 17,4 Sekunden.
Build, vier Syntaxchecks (`drawers`, `drawer-form`, `planning-drawers`,
`section-folding`) und Diffcheck erfolgreich. Testausgabe nach Zusammenfassung
entfernt. Kein Commit/Push.

## Grenzen

Alle Prüfungen sind Node-/Editorzustandsmodelle mit synthetischen Daten.
Keine native Browser-/Pixellayout-/Tastenzustellungs-/IME-/AltGr-Abnahme.
Kein Stundenlauf, keine Memory-Leak- oder Langzeitlatenzgarantie; Messdauer
des Testsuites ersetzt keinen Langzeitnachweis. Bestehendes externes Speicher-
Schreibfenster unverändert, Storage-Sicherheitsmodell nicht erweitert.

## Abschließender unabhängiger Retest

**P2 geschlossen.** Die unveränderte ursprüngliche QA-Reproduktion besteht nach
Developer-Korrektur. Headingstufen unterscheiden nun Drawerfolds von ihrer eigenen
Faltung. Zusätzlich zwei unabhängige QA-Gruppen: positionsbezogene Placeholder-/
Gutteradapter öffnen den gewählten Drawer statt des Headings, schließen mit Cursor
im Inhalt verschiebt diesen sichtbar auf die Markerzeile. Standalone-Code-/Listen-
Folds öffnen weiter korrekt. Acht eigene QA-Gruppen insgesamt grün.

Serieller abschließender Gesamtlauf: **525/525**, ca. 18,0 Sekunden. Build, fünf
Syntaxchecks (zusätzlich `folding.mjs`) und Diffcheck grün. Keine weitere belegte
Blockade im geprüften Umfang. Developer hatte zuvor 523/523; die zwei weiteren
QA-Gruppen erklären die neue Gesamtzahl.

Begrenzter zusätzlicher Node-Modelllauf: 300 Heading-/Drawerzyklen mit textgleichem
Dokument und konstant einem verbleibenden Drawerfold, 15,6 ms; Heap vor/nach
16.623.168 / 19.532.840 Bytes ohne erzwungene Garbage Collection. Dies ist eine
kurze Funktions-/Ressourcenprobe, kein Leak-Nachweis oder Stabilitätsbudget.
Native Browser-/IME-/AltGr- und Stundenprüfung bleiben ausdrücklich offen.
Temporäre Testausgabe entfernt; kein Commit/Push durch QA.

## PO-Nachbesserung: Überschrift im Drawer — unabhängige QA

PO-Beispiel `:ZUTATEN:` mit `# asda #asd a [50%]`, zwei Checkboxen und `:END:`
ist weiterhin ein ungültiger Drawer; keine automatische Textumwandlung. Der
Developer-Fix unterscheidet die Diagnose vom eigentlichen Drawerbereich und
entfernt veraltete gemappte Drawerfolds nach Rohtexteingabe per ViewPlugin.

Neue unabhängige Datei `editor/drawer-invalid-edit.qa.test.mjs`: **6/6 Gruppen grün**.
Geprüft wurden der exakt gemeldete Rohtext sowie H1–H6-Varianten, lokale/global
Tab-/Klickverweigerung ohne Text-/Historyänderung; interaktive Headingeinfügung
im früher gefalteten gültigen Drawer; verbleibende sichere Nachbarfolds;
Undo/Redo ohne Datenreparatur; schnelle Invalidierung und Reparatur vor dem
Microtask; zwei schnelle Änderungen mit verschobenen Positionen; normale
Außentextänderungen; destroy und neuer Editorzustand ohne alten Dispatch;
Readonly und Escape-Fokusnavigation; sichere folgende Headings und externe
END-Marker ohne pauschale Sperre.

Abschließender serieller Gesamtlauf **536/536**, ca. 18,0 Sekunden. Build,
fünf Syntaxchecks (drawers, planning-drawers, folding, structure-keymap, eigene
QA-Datei) und Diffcheck grün. Kein neuer belegter Befund im geprüften Umfang.
Temporäres Testlog entfernt. Native Browser-/IME-/AltGr-/Stundenprüfung bleibt
offen; dieser Fixlauf ist kein Langzeit- oder Speicherlecknachweis.

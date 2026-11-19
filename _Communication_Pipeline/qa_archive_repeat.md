# Unabhängige QA — wiederholte Archivprüfung / Plain-Pfeile, 2026-11-19

Begrenzter Auftrag auf feature/archiving. Nur eigene Datei
`editor/archive-repeat.qa.test.mjs` und dieser Bericht geändert. Keine
Implementierungsänderung durch QA, keine Nutzerdatei geöffnet/verändert.
PO-Ausschnitt ausschließlich als synthetisches Inmemory-Dokument übernommen.

## Ergebnis

Kein belegter verbleibender Befund im geprüften Umfang. Drei unabhängige Gruppen:

1. Geklärter PO-Ausschnitt: Auf Projekt A gibt es keinen Kandidaten, da das
   einzige direkte Kind Angebot zwei offene TODO-Nachfahren enthält. Auf dem
   Angebot-Header ist genau DONE dasdasda geeignet. Keine rekursive Entnahme
   erledigter Enkel vom Projekt-Header und keine Lockerung der Kandidatenregel.
2. Tatsächlicher App-/Runnercode, echte Registry, Router und gemeinsames Panel
   werden zweimal per C-c, Plain-Down und Enter durch u → x → s aktiviert.
   Erste Runde n, zweite Runde y mit nachgebildetem Speicher-/Quellreload;
   beide enden mit Editorfokus am ursprünglichen Angebot-Header. Pfeilnavigation
   selbst verändert weder Editorzustand/Auswahl noch Editor-Scrollposition.
   Der dritte identische Start meldet korrekt die zwei offenen direkten Kinder,
   ohne einen weiteren Zieldialog oder eine zusätzliche Verschiebung. Eine
   erfolgreiche gespeicherte Entfernung, alle offenen Inhalte bleiben erhalten.
3. Dateimodus: Liegt der Ausgangscursor im entfernten H1-Unterbaum, wird die
   Rückkehr auf eine tatsächlich vorhandene Textzeile im Rest abgebildet. Der
   Quelltext wird ausschließlich durch die bestätigte Entfernung verändert;
   keine künstlichen Leer-/Scope-Markierungszeilen. Erneute Prüfung bleibt
   Dateimodus, statt versehentlich Kindprüfung einer verbleibenden H1 zu werden.

Quellcodeprüfung bestätigt: returnTo wird bei normalem Abschluss und Abbruch
nur nach exakter Quell-/Regel-/Sessionvalidierung verwendet. Stop-/Fehlerpfade
setzen keinen vermeintlich erfolgreichen Rückkehrscope. Plain-Pfeile verwenden
den vorhandenen panelMove-/Panel-Selektionsweg; Alt-/Enter-/Disabledskip und
die vorhandenen Fokus-/Viewportschutzpfade wurden nicht ersetzt. Bestehende
Developer-Prüfungen der fünf vollständigen Runden inklusive Abbruch sowie
größerem synthetischen Dokument sind im Gesamtlauf erneut grün.

## Nachweise und Grenzen

- Eigene gezielte QA: **3/3 Gruppen grün**.
- Serieller Gesamtlauf: **596/596**, ca. 21,17 Sekunden.
- Build, vier Syntaxchecks (archive-batch, prefix-router, app, eigener QA-Test)
  und Diffcheck grün. Temporäre Testausgabe entfernt.
- Keine Änderung an Storage/Journal, kein Commit/Push/Merge.

Node-/Editorzustands-/DOM-Modelle; keine native Browser-/Tastenzustellungs-/
Pixel-/IME-/AltGr-/Rechteprompt-Abnahme. Kein Stunden-/Idle-/Speicherprofiling;
die kurzen Wiederholungsprüfungen sind kein Memory-Leak- oder Langzeitnachweis.
PO hat die Kandidatenregel inzwischen verstanden und bestätigt; dies ist von
der noch offenen nativen Prüfung der Fokus-/Scope-/Pfeilkorrektur zu trennen.

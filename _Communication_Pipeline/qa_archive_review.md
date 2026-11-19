# Unabhängige QA — Archivprüfung / Prefixfolgen, 2026-11-19

Begrenzter Prüfauftrag auf feature/archiving. Eigene Datei
`editor/archive-review.qa.test.mjs`; keine Implementierungsänderung durch QA.
Alle Daten synthetisch in Memory. Nutzerdateien source.md, archiv.md, steuer.md
und Bilder nicht geöffnet oder verändert. Kein Commit/Push.

## Zwischenstand vor Korrektur

**P2 offen: geschützte Beispielüberschriften blockieren sichere H1-Kandidaten.**
Bei Cursor in der Präambel dieser Datei:

```text
Preamble

> # Example
> text

# DONE Safe
Body
```

liefert `planArchiveBatch(..., {sourcePath:'qa.md'})` die Fehlermeldung
„Nur normale H1–H6-Teilbäume werden sicher archiviert.“ statt des sicheren
H1-Kandidaten DONE Safe. Mit `- # Example`/eingerücktem Listentext gleiches Ergebnis.
Ohne Präambel wird die Zitatzeile am Cursor sogar als Scope-Heading interpretiert
und liefert keine Kandidaten. Ursache: ungefilterte `headingSections` bei
Scope-/H1-Auswahl. Reproduzierbare rote erste Gruppe in eigener QA-Datei.
An Lead gemeldet; kein eigenmächtiger Fix.

Fünf weitere unabhängige Gruppen grün:

- Dateilokale TODO-Regeln: offene Nachkommen schließen Kandidaten aus,
  statuslose Informationsbäume bleiben geeignet; kein Heraustrennen fertiger Enkel.
- Identische Titel, y/n-Entscheidungen und Offsetfortschreibung; Fehler/undefined
  und teilweise geschriebener Schritt stoppen weitere Archivaufrufe, ohne
  Rückrollversprechen. Übersprungene und nachfolgende Inhalte bleiben erhalten.
- Tatsächlicher App-Batchcallback verweigert Quell-/Sessionwechsel während der
  Zielauswahl vor Kandidatenprompt oder Schreibaufruf; Abschlusslistener bereinigt.
- Tatsächliche Registry/Router: C-c s bleibt Scheduling, C-u C-c x s/a reicht
  Argument einmalig weiter, unsupported Ctrl/Alt/Meta-s konsumiert und unterbindet
  Bubbling; 100 kurze Argument-/Untermenü-Abbruchzyklen ohne hängenbleibendes
  Argument, nächste normale Archivfolge erhält keines.
- Kandidatendialog zeigt vollständigen Text über textContent und blockiert
  wiederholtes Enter/Space/y/n vor nativer Autoaktivierung; Escape/cancel beendet.

Gezielt **5/6**, serieller Gesamtlauf **585/586**, ca. 21,88 Sekunden.
Einzig oben genannter P2 rot. Build, fünf Syntaxchecks und Diffcheck grün.
Temporäre Testausgabe entfernt. Retest nach Developer-Korrektur steht aus.

## Abschließender Retest

**P2 unabhängig geschlossen.** Kandidaten/Scope verwenden nun echte
Document-ATX-Überschriften außerhalb Frontmatter. Unveränderte ursprüngliche
Reproduktion besteht; die QA-Gruppe prüft zusätzlich Cursor in Präambel und
auf Zitat-/Listen-/Code-/Setext-Beispielen: nur der echte sichere H1-Baum wird
angeboten. Die Beispiele werden nicht zu Archivkandidaten oder Scope-Headings.

Alle sechs unabhängigen QA-Gruppen grün. Kombinierter gezielter Lauf mit den
bestehenden Prefix-, Kandidaten-, tatsächlichen App- und Fokusfällen **25/25**.
Serieller Gesamtlauf **587/587**, ca. 21,28 Sekunden. Build, fünf Syntaxchecks
und Diffcheck grün. Die bestehende 100-Zyklen-Prüfung der Argument-/Untermenü-
Abbrüche erneut grün; nächster Normalaufruf erhält kein altes Argument.
Kein weiterer belegter Befund im geprüften Umfang. Keine Implementierungsänderung
durch QA. Testlog entfernt; kein Commit/Push.

## Grenzen

Node-/Editorzustands-/DOM-Modelle, keine native Browser-/Tastenzustellungs-/
Pixel-/Rechteprompt-/IME-/AltGr-Abnahme. Keine Stunden-/Idle-/Speicherprofilprobe.
Kurze 100-Zyklen-Prüfung ist weder Memory-Leak- noch Langzeitlatenzgarantie.
Journal/Storage nicht geändert, keine neue gemeinsame Atomarität behauptet.

## Native PO-Meldung und autorisierte Mappingkorrektur

PO meldet aus tatsächlicher Edge-Nutzung: **Ctrl+U öffnet den Seitenquelltext**.
Die zuvor geprüfte C-u-Routerfolge ist deshalb nur historischer Modellstand,
keine erfolgreiche native Bedienungsabnahme. PO erlaubt Ersatzbelegung:

- **C-c u x s** bzw. **C-c u x a**: Kandidatenprüfung mit einmaligem Argument.
- **C-c x s** bzw. **C-c x a**: unveränderte Einzel-Unterbaumarchivierung.
- Strg+C drücken/loslassen, danach u/x/s bzw. a unmodifiziert nacheinander.
- Kein eigenständiger Ctrl+U-Argumentstart mehr; keine neue Browser-Sonderpolicy.

Eigene Registry-/Routerprüfung auf die neue autorisierte Folge migriert, ohne
Schutzassertions zu reduzieren. Beide Prüfaliasse liefern universal=true; beide
Einzelaliasse liefern kein Argument. Geprüft: untergeordnete Hilfe enthält nach
u nur x und nach x nur s/a; tatsächlicher gemeinsamer showPrefix-Renderer wird
per Maus u → x → a durchlaufen und zeigt die jeweilige Sequenz an. Ctrl+U ohne
aktiven Prefix wird im Router false/unhandled zurückgegeben, preventDefault
und stopPropagation bleiben aus, kein Argumentzustand entsteht. Dies beweist
keine andere native Browseraktion und verändert keine globale Tastaturpolicy.

Unsupported Ctrl/Alt/Meta-Folgen bleiben konsumiert und führen keine normale
schreibende Aktion aus. Fokus-/Stale-/IME-/C-g-Abbruch und 100 kurze komplette
u-Untermenü-Abbrüche lassen kein Argument zurück. C-c s bleibt Scheduling;
folgende normale Archivierung enthält kein altes Argument. Weitere Kandidaten-,
App-Race-, Teilfehler-, Schutzbeispiel- und Dialogprüfungen bleiben grün.

Abschließende eigene QA: **8/8 Gruppen**, serieller Gesamtlauf **590/590**,
ca. 20,09 Sekunden; Build, vier Syntaxchecks und Diffcheck grün. Kein weiterer
belegter Befund. Keine Implementierungsänderung durch QA, Testlog entfernt,
kein Commit/Push. Die neue C-c-u-Belegung ist noch nicht nativ von QA geprüft;
PO-Tastenzustellung/IME/AltGr/Stundenstabilität bleiben offen.

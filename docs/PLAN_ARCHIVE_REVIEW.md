# Archivprüfung und mehrstufige Prefixfolgen — Freigabe 2026-11-19

Native PO-Nachkorrektur: Ctrl+U öffnet in Edge Quelltext. Autorisierter Ersatz
ist C-c u x s/a für die Prüfung, C-c x s/a bleibt Einzelarchivierung. u ist ein
Modifier-Gruppenknoten des vorhandenen Sequenzbaums. Eigenständiger Ctrl+U-Start
entfällt ohne neue globale Shortcutpolicy. Frühere C-u-Vorschläge nachfolgend
dokumentieren den ursprünglichen Entwurf; Bedienung in ARCHIVING.md ist aktuell.

Stand: umgesetzt für native PO-Probe, 587/587 Tests seriell, Build/Syntax/Diffcheck
und unabhängige QA grün. Bedienung ARCHIVING.md, Prüfbericht
_Communication_Pipeline/qa_archive_review.md. Kein Commit/Push/Merge erfolgt.
Nachfolgend bleibt der freigegebene Umfang als Entscheidungsgrundlage erhalten.

PO hat die besprochenen modularen Erweiterungen mit „Go go go“ freigegeben.
Umsetzung auf bestehendem Branch feature/archiving; Fokuskorrektur bleibt erhalten.
Kein Commit/Push/Merge oder weitere Folgefunktion aus diesem Auftrag ableiten.

## Bestätigte Bedienung

| Tastenfolge | Aktion |
| --- | --- |
| C-c x s | Aktuellen vollständigen Unterbaum archivieren |
| C-c x a | Standard-Archivierung, derzeit dieselbe externe Unterbaumaktion |
| C-u C-c x s | Geeignete Unterbäume einzeln zur Archivierung anbieten |

Ctrl+C drücken, loslassen, x und s/a unmodifiziert nacheinander. Für die Prüfung
vorher Ctrl+U drücken und loslassen. Bestehendes C-c s für Scheduling erhalten.
`entry` bezeichnet bei der Defaultaktion keinen einzelnen Header ohne Kinder;
es darf nie versehentlich nur die Wurzel entfernt werden.

## Auswahl nach Org-Regel

Direkte Kinder einer aktuellen Überschriftenzeile prüfen, jeweils einschließlich
ihres vollständigen Unterbaums. Außerhalb einer Überschriftenzeile nach
Org-Vorbild die H1-Unterbäume der Datei prüfen. Ein Kandidat darf **nirgendwo im
Unterbaum eine offene Aufgabe** enthalten. Geladene dateilokale SEQ_TODO-Regeln
verwenden, nicht fest auf DONE prüfen. Statuslose Wurzeln und vollständig
statuslose Informationsbäume sind ausdrücklich geeignet. Eine geschlossene
Wurzel mit offenen Kindern ist dagegen ungeeignet. Keine rekursive Einzelentnahme
erledigter Enkel aus einem ungeeigneten direkten Kind.

Org-Referenz: https://orgmode.org/manual/Moving-subtrees.html

## Interaktiver Ablauf

Archivziel einmal auswählen. Geeignete Kandidaten in Dokumentreihenfolge sichtbar
zeigen, mit Titel und lokaler Entscheidung y/n/Escape:

- y: genau diesen vollständigen Unterbaum über den bestehenden sicheren Ablauf
  archivieren, speichern/verifizieren und zum nächsten geeigneten Kandidaten.
- n: nichts an diesem Kandidaten ändern, zum nächsten.
- Escape: restliche Prüfung beenden. Bereits archivierte Einträge bleiben
  archiviert und einzeln über die vorhandene Wiederherstellung nachvollziehbar.
- Am Ende verständliche Anzahl archiviert/übersprungen melden. Bei Fehlern oder
  unsicherer Quelle stoppen, nicht blind weitere Kandidaten verarbeiten.

## Modulgrenzen

Tastenfolgen werden als Daten beschrieben; ein gemeinsamer kleiner Router hält
Sequenzzustand, erwartete Folgetasten und vorhandene Prefixhilfe. Keine speziellen
Archivierungsbedingungen im Tastaturrouter. C-u wird als getrenntes einmaliges
Argument weitergereicht, nicht als globale dauerhafte Einstellung. Unsupported
Argumentkombinationen dürfen nicht still eine normale schreibende Aktion auslösen.
Fokus-, Stale-, Busy-, Escape/C-g-, Repeat-, AltGr-/IME-Grenzen und bestehende
Copy-/Prefix-/Panelbefehle erhalten. Kein vollständiges numerisches Emacs-System.

Kandidatenmodell und Ablaufcontroller getrennt von Tastatur, Dialog und Storage.
Nach jedem Verschieben Quellzustand und verbleibende Kandidaten sicher neu
validieren; keine veralteten Offsets und kein Raten anhand gleicher Titel.
Bestehenden Archive-Storage/Journal-/Resume-/Restorepfad unverändert wiederverwenden.
Keine neue atomare Sicherheit für zwei Dateien behaupten. Fokus-/Cursor-Rückkehr
nach Entsperren erhalten; innerhalb Prüfung darf lokaler Dialogfokus bestehen.

## Abnahme und Grenzen

Bestehende Prefixfolgen vollständig regressionsprüfen; neue Zwischenstufe und
Help-Maus-/Keyboardnavigation, Freigabe nach Loslassen, C-u-Lebenszyklus,
Abbruch/Repeat/Stale/Focus/IME/AltGr/Busy. Kandidaten H1–H6, statuslos/closed/open,
offene Enkel, identische Titel, Offsetverschiebung nach mehreren Entscheidungen,
Abbruch nach Teilerfolg, Fehler- und Wiederaufnahmegrenzen unabhängig prüfen.
Gesamtlauf seriell, Build, Syntax und Diffcheck; native Browserzustellung als
separate PO-Probe ausweisen. Kein Stunden-/Speichersicherheitsbeweis durch Kurztests.

Nutzer-Testdateien test-vault/archiving/source.md (lokal geändert), archiv.md,
steuer.md und Bilder nicht für Agenten-/QA-Proben öffnen, verändern oder committen.
Nur eigene synthetische Daten, vorzugsweise Inmemory-Fixtures verwenden.

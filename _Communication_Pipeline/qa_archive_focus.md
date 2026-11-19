# Unabhängige QA — Archivierungsfokus, 2026-11-19

Begrenzter Auftrag auf feature/archiving: Nach erfolgreicher Archivierung und
y-Bestätigung Editorfokus wiederherstellen und Cursor an der Stelle des entfernten
Unterbaums belassen. Keine Implementierungsänderung durch QA. Eigene Tests:
`editor/archive-focus.qa.test.mjs`; ausschließlich synthetische Inmemory-Fixtures.
Nutzerbilder und untracked archiv.md/steuer.md nicht geöffnet oder verändert.

## Ergebnis

Kein belegter verbleibender Befund im geprüften Umfang. Drei unabhängige Gruppen
prüfen Cursorbegrenzung einschließlich EOF/leerer Quelle, Öffnen verdeckender
Folds, unveränderten Text/History sowie Abbruch/nicht abgeschlossene Vorgänge,
Fremdfokus, Fensterblur, Vault-/Pfad-/Dokumentwechsel, Readonly und fehlendes
Dokument. In allen Abschluss-/Abbruchpfaden werden temporäre Fokus-/Blurlistener
entfernt. 100 kurze synthetische Erfolg-/Abbruchzyklen hinterlassen keine dieser
Listener und keine Text-/Historyänderung; Laufzeit dieser Gruppe ca. 2,8 ms.
Dies ist keine Memory-Leak- oder Langzeitgarantie.

App-Integration gelesen: complete wird erst nach erfolgreichem Ablauf und
Abgleich des geladenen Quelltextes gesetzt; finish läuft nach setBusy(false).
Der vorhandene Save-Fokuspfad bleibt unverändert. Der tatsächliche
Archivhandler/Runner wird zusätzlich im Developer-Test mit erster/mittlerer/
letzter Entfernung, Fehlern und Abbruch ausgeführt; dieser Test sowie der
bestehende Save-Fokustest wurden von QA erneut ausgeführt.

- Gezielter Lauf: **7/7 Tests**.
- Serieller Gesamtlauf: **567/567**, ca. 20,45 Sekunden.
- Build, drei Syntaxchecks (archive-focus, QA-Test, app) und Diffcheck grün.
- Keine Storageänderung, kein Commit/Push. Temporäre Testausgabe entfernt.

## Grenzen / native Probe

Alle Ergebnisse stammen aus Node-/Editorzustandsmodellen. Native y-Dialog-,
Browserfokus-, Scroll-/Tastenzustellungs-, Rechteprompt-, IME-/AltGr-Probe bleibt
beim PO offen. Insbesondere nach Strg+F5 am ersten/mittleren/letzten bzw. einzigen
Unterbaum direkt nach y weiterschreiben und Cursorposition prüfen. Fenster oder
anderes Bedienelement während eines Vorgangs fokussieren: kein Fokusraub.
Kein Stunden-/Idlelauf oder Speicherprofiling durchgeführt; keine Aussage über
schleichende Langzeitlatenz oder vollständige Browserstabilität.

# Datei öffnen/anlegen — begrenzter Vorschlag

Stand 2026-11-08. **Implementiert und unabhängig geprüft.** PO bestätigt **C-c f** mit sichtbarem kleinem Hinweis und privaten **Alpha-Pilotbetrieb** für praktische Erfahrung. Ein Vault wird dabei nicht parallel in mehreren Editoren bearbeitet. Vorhandener Speicher-/Konflikt-/Backuppfad bleibt unverändert; Agenten/QA verwenden ausschließlich synthetische Vaults. Developer/QA jeweils324/324 Tests und Build grün, QA13 unabhängige Prüfgruppen. Einstieg und native Abnahme: [ALPHA.md](ALPHA.md).

## Bedienung

Kleine Pfadeingabe mit Mauszugang und Command-Registry-Befehl. Pfad relativ zum gewählten Vault, beispielsweise `team/notiz.md`; Anfangswert kann das aktuelle Unterverzeichnis vorgeben. Tab vervollständigt echte Datei-/Ordnernamen im Vault, Mehrdeutigkeit zeigt passende Kandidaten, keine willkürliche Wahl. Enter öffnet vorhandene Datei beziehungsweise legt eine fehlende Datei leer an; Kennzeichnung „Öffnen“/„Neue Datei anlegen“ vor Ausführung sichtbar. Escape/C-g bricht vor Ausführung ohne Dateianlage ab.

Erstes Paket nur Markdown und vorhandene Unterordner; keine automatische Ordneranlage, Umbenennung/Löschung oder beliebigen externen Pfade. Fehlende Dateiendung als `.md` ergänzen und Ziel vor Ausführung sichtbar machen. Absolute Pfade, `..`, ungültige Namen und eigener Sicherungsordner gesperrt. Existierende Datei niemals zum Zweck der Anlage leeren oder neu schreiben. Die API `getFileHandle(name,{create:true})` liefert eine bestehende Datei oder erstellt eine fehlende; für die reine leere Anlage ist kein Schreibstream erforderlich. Gleichzeitig extern entstandene Dateien als vorhanden behandeln, keine atomare Exklusiverstellung behaupten. [API-Referenz](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle).

Bestehende Session-/Berechtigungs-/Entwurfs- und Indexpfade wiederverwenden. Ungespeicherte aktuelle Arbeit nicht ersetzen; erster Umfang wie Agenda-Quellsprung konservativ mit Speicherhinweis blockiert. Nach erfolgreichem Öffnen/Anlegen Dateiauswahl, Dokumentanzeige und M7a-Index aktualisieren. Nach Fehler vollständigen Pfad und Ursache melden; eine bereits erfolgreich angelegte leere Datei bei nachfolgendem Openfehler benennen und nicht automatisch löschen.

## Bestätigte Tastaturentscheidung

PO bestätigt `C-c f`: Strg+C, C und Strg loslassen, dann f ohne Modifier. `C-x` bleibt Ausschneiden. Sichtbarer kleiner Hinweis beziehungsweise Tooltip an einem Mauszugang und bestehende Präfixhilfe/Registry machen den Einstieg auffindbar. Keine kontextabhängige Umdeutung von Ausschneiden.

## Private praktische Nutzung

PO erweitert die Produktgrenze ausdrücklich auf einen separaten privaten Alpha-Vault und akzeptiert den Betrieb ohne paralleles/doppeltes Editieren. Anwendung erhält eine klare Alpha-Kennzeichnung und ersetzt die bisherige synthetisch-only Nutzungsbeschriftung durch den Pilotnutzungshinweis. Empfohlen sind unabhängige regelmäßig geprüfte Sicherungen und keine parallelen Änderungen durch andere Editoren/Sync. Das bekannte externe Schreibfenster bleibt bestehen; Browser-IndexedDB und `.storage-spike-backups` im selben Vault ersetzen kein unabhängiges Backup. Native Langzeit-/Recovery-/Berechtigungsbelege sind teilweise offen. Kein Zugriff auf persönliche Vaults durch Entwicklungsagenten. Die vorhandene Pages-Pipeline veröffentlicht `dist`; kein Commit/Push/Deploy im Auftrag.

## Umgesetzte Modulgrenzen

`editor/vault-files.mjs` enthält `normalizeVaultFilePath`, `inspectVaultPath`, `completeVaultPath` und `executeVaultFile`. Preview/Completion lesen nur. Pfade werden über vorhandene Handle-Namen kanonisiert, um Alias-Dateieinträge bei abweichender Groß-/Kleinschreibung zu vermeiden. Completion ergänzt Unicode-codepoint-sichere gemeinsame Präfixe; bei unvollständiger Liste keine automatische Ergänzung. Interne und versteckte Unterordner bleiben im ersten Umfang gesperrt.

`executeVaultFile` verwendet `current()` zur Invalidierung vor Seiteneffekten und `onCommit(bool)` für die nicht abbrechbare Anlage-/Öffnungsphase. `creationRequested` meldet einen Anlageversuch, keinen exklusiv garantierten Neuerfolg. Ein überholtes Ergebnis kann `stale` und den gegebenenfalls bereits entstandenen Pfad melden; nach Ausführungsfehlern mit Anlageversuch wird niemals automatisch gelöscht. Die App erhält Kontrolle über Rechte, Dirty-Gate, Sessionöffnung und Indexupdate.

`editor/file-picker.mjs` verwendet den Adapter mit eigenem Dialog-/Anfragestatus und bestehender Panelhülle. Der Appadapter verwendet vorhandenes Busy-/Read-only-Gate, `session.persist/open` und M7a-Updates. `file.find` ist neuer Registry-Einstieg. Das selektive `canFindFile` im Präfixkontext erlaubt den fokussierten leeren Editor, ohne sonstige Dokument-/Readonly-Grenzen für Struktur-/Statusbefehle aufzuheben.

## Akzeptanz und Grenzen

- Vorhandene Wurzel-/Unterordnerdateien über echte Pfade öffnen, auch bei gleichen Basisnamen; Dateiauswahl zeigt danach die geladene Datei.
- Tab bei keinem/einem/mehreren Treffern, Unicode/Leerzeichen, geänderten Verzeichnissen und Dateifehlern nachvollziehbar.
- Neue Datei nur bei expliziter Ausführung, leere Anlage ohne Überschreiben, vorhandene Bytes unangetastet; anschließend normales gesichertes Speichern.
- Abbruch, ungültiger Pfad, fehlende Rechte, fremder Vault oder überholte asynchrone Ergebnisse erzeugen keinen irrtümlichen Quellsprung. Nicht abbrechbare Dateisystemoperationen klar kennzeichnen.
- Dirty-Editor/Selection/Undo erhalten, Datei-/Index-/Vaultwechsel konsistent. Bestehende Copy/Cut-/Präfix-/Agendaoperationen regressionsfrei.
- Storage besitzt `vault-files.mjs` und dessen Tests, Developer UI/App, QA prüft unabhängig. Storage-Rollenbrief und Laufzeitdefinition sind auf die begrenzte Revision `ALPHA-FILES-2026-11-08` aktualisiert und von einem frischen Storageagenten tatsächlich bestätigt.
- Nur synthetische Testdaten, keine neuen Dependencies/Storage-Sicherheitsstrategie, keine persönlichen Vaults/Commit/Push oder weiteren Funktionen.

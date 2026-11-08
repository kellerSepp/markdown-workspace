# M7a — Agenda-Datenmodell und Vault-Index

Stand M7a-Abschluss: 2026-11-08. Die nachfolgend erteilte M7b-Freigabe und Agendaoberfläche sind in [M7B_AGENDA.md](M7B_AGENDA.md) beschrieben; dieses Dokument hält Indexschnittstelle und ursprüngliche M7a-Grenzen fest.

## Zweck und Quellen

Markdown bleibt die einzige maßgebliche Datenquelle. Der Index lebt im RAM und lässt sich vollständig neu aufbauen. Alle Markdown-Dateien des gewählten Vaults werden automatisch rekursiv berücksichtigt. Eine zusätzliche Registrierung wie Org `C-c [` ist hier nicht vorgesehen: Die Vaultauswahl legt bereits den Quellenbereich fest. Das ist die Lead-Empfehlung zur offenen PO-Frage; eine spätere Einschränkung auf ausgewählte Dateien braucht eine gesonderte Entscheidung.

Der Index bildet gespeicherte Dateien ab. Ungespeicherte Editoränderungen werden weder hineingemischt noch durch Aktualisierung ersetzt. Externe Änderungen werden erst beim erneuten Einlesen sichtbar. Es gibt keine permanente Überwachung, kein Polling und keine Serverkomponente. Versteckte Markdown-Dateien und Ordner werden berücksichtigt; ausschließlich der anwendungseigene Sicherungsordner `.storage-spike-backups` wird ausgelassen. Die bisherigen Grenzen der separaten Dateiauswahl (1000 Markdown-Dateien, 3000 Einträge, 10 Unterordnerebenen) begrenzen den Index nicht.

## Fachliches Modell

Relevant ist eine normale ATX-Überschrift H1–H6 mit bekanntem TODO-Status oder gültigem SCHEDULED-/DEADLINE-Eintrag. Verschachtelte Aufgaben bleiben unabhängig; keine Statusvererbung. Überschriften ohne eigenen relevanten Eintrag bleiben als strukturelle Vorfahren zuordenbar. Checklisten `- [ ]`/`- [x]` sind keine eigenständigen Aufgaben.

Bestehende Markdown-, TODO- und M6a-Parser werden wiederverwendet. Dateilokales `#+SEQ_TODO` klassifiziert links von `|` offene und rechts abgeschlossene Zustände. Ohne Definition gilt `TODO(t) | DONE(d)`. Ungültige Definitionen melden einen Fehler und verwenden die letzte gültige Regelmenge dieser Datei in diesem Vault, ersatzweise den Standard. Dieser Fehlerersatz ist sitzungslokal; nach Neustart lässt sich bei ungültiger Quelle nur der Standard rekonstruieren. Der Fehler wird daher sichtbar ausgewiesen.

Termine sind auch ohne Status relevant. Datum und optionale Start-/Endzeit stammen aus dem M6a-Parser. Nur der unmittelbare Planungsblock nach der Überschrift gehört dazu; ungültige, doppelte oder versetzte Angaben werden diagnostiziert. Kein Einlesen vermeintlicher Aufgaben aus Code, Frontmatter, Zitaten, HTML oder Listencontainern. Keine Wiederholungen, Datumsbereiche oder Übernacht-Zeitfenster.

## Datenintegrität und Lebenszyklus

Auswahl beziehungsweise Wiederaufnahme eines Vaults startet den Aufbau. Erfolgreiches Speichern und erneutes Öffnen aktualisieren die betreffende gespeicherte Quelle; fehlgeschlagene Speicheroperationen ändern den Index nicht. Explizites Aktualisieren liest den Vault neu ein und berücksichtigt hinzugefügte/entfernte Dateien sowie geänderte Definitionen. Vaultwechsel verwirft vorherige Einträge und Regelhistorie.

Generationsprüfung verhindert, dass überholte Leseergebnisse einen neueren Stand veröffentlichen. Lesefehler einer Datei oder eines Verzeichnisses werden mit relativem Pfad und Ursache gemeldet; andere Quellen bleiben auswertbar. Ein unvollständiger Index darf deshalb nicht als Beweis für fehlende Aufgaben verwendet werden.

Positionen sind UTF-16-Offsets im LF-normalisierten Text entsprechend dem Editor, keine Bytepositionen. Quellenkennungen gelten nur für den jeweiligen Indexstand. Nach Strukturänderung/Neuaufbau sind alte Positionen keine zuverlässigen Navigationsziele. M7b muss eine aktuelle Quellenzuordnung verwenden und vor Navigation Quelle/Indexstand prüfen; dauerhafte Aufgaben-IDs erfordern eine gesonderte Formatentscheidung.

## Schnittstelle für M7b

`editor/agenda-index.mjs` exportiert `parseAgendaFile(bytes, path, previousRules, options)` und `createAgendaIndex({onChange, yieldTask})`. Die Extraktion nutzt den bestehenden UTF-8-/BOM-/Zeilenendencodec. Der Index hält keine Editoransicht und schreibt keine Dateien.

| Methode | Ergebnis / Zweck |
| --- | --- |
| `selectVault(handle)` | Synchron zurücksetzen, anschließend asynchron den neuen Vault lesen; `null` leert vollständig. |
| `rebuild()` | Alle Quellen erneut lesen, einschließlich Dateizugängen und Löschungen. |
| `updateFile(path, sourceVault)` | Eine erfolgreich gespeicherte Datei neu lesen; fremden Vault ablehnen. Während laufendem Aufbau vollständigen Neustart veranlassen. |
| `snapshot()` | Unveränderlicher Stand mit `vaultName`, `epoch`, `revision`, `running`, Dateizahl, `records` und `diagnostics`. |
| `query(options)` | Neues Array mit unveränderlichen Records des aktuellen Stands. |
| `source(id)` | Aktuelle Quellenbeschreibung oder `null` bei veralteter/unbekannter Kennung. |

Records enthalten `path` relativ zum Vault, `file` als Dateiname, Titel, `level`, Status, `closed` (`null` ohne Status), `scheduled`/`deadline` mit `date`, `startTime`, `endTime` und Metadatenpositionen. `from`, `to`, `line`, `parentFrom` und `ancestors` beschreiben Position und Hierarchie. `id` und `source` binden diese Zuordnung an `epoch`/`revision`; bereits der nächste veröffentlichte Stand kann alte Kennungen ungültig machen. Zeilen zählen ab 1, Offsets ab 0. Die Dateizahl umfasst auch Dateien ohne relevante Records und Dateien mit Lesediagnose.

Abfragen: `type` ist `all` (Standard), `todo`, `open`, `closed`, `scheduled`, `deadline`, `overdue`, `day` oder `week`; optional exakter `status`, `from`, `to`, `today` als `YYYY-MM-DD`. Datumsgrenzen sind einschließlich. `day` benötigt `from`; `week` reicht ohne `to` von `from` bis sechs Tage danach, berechnet also keinen Montag und endet spätestens am 9999-12-31. Datumsfilter berücksichtigen SCHEDULED oder DEADLINE, die jeweiligen Spezialabfragen nur ihre eigene Art. Ein Record erscheint auch bei beiden passenden Terminen nur einmal. `overdue` benötigt explizit `today` und liefert offene TODO-Aufgaben mit DEADLINE vor diesem Tag; statuslose Termine und abgeschlossene Aufgaben sind ausgeschlossen. Es gibt keine Uhrzeit-basierte Überfälligkeit und keinen impliziten Systemtag.

Beispiel für eine spätere Ansicht:

```js
const week = index.query({type: 'week', from: '2026-11-09'});
const open = index.query({type: 'open'});
const late = index.query({type: 'overdue', today: '2026-11-09'});
const target = index.source(week[0]?.id); // null, falls seitdem neu veröffentlicht
```

`onChange(snapshot)` informiert ereignisgesteuert über Veröffentlichung und laufenden Aufbau. Während eines Refreshs bleiben vorherige Daten bis zur Veröffentlichung verfügbar, mit `running: true`; bei Vaultwechsel werden sie sofort geleert. Diagnosen tragen relativen `path`, `kind`, `message` und gegebenenfalls `line`.

Sonderfall: `overdue` verwendet `today` und gegebenenfalls `status`; `from`/`to` begrenzen diese Abfrage nicht. M7b soll dafür ausschließlich `today` übergeben beziehungsweise zusätzliche Ergebnisfilter ausdrücklich anwenden. Die übrigen Abfragen verwenden die beschriebenen Datumsgrenzen.

## Abnahmekriterien

- Rekursive synthetische Vaults mit mehreren Dateien, H1–H6 und unabhängigen verschachtelten Aufgaben korrekt auswerten.
- Eigene Workflows, offene/abgeschlossene Aufgaben, Termine ohne TODO sowie kombinierte Datum-/Zeitangaben erkennen.
- Code/Frontmatter/Listen und ungültige Angaben sicher abgrenzen; Einzelquellenfehler mit Pfad melden.
- Speichern, Refresh, Vaultwechsel und konkurrierende asynchrone Aufträge ohne veraltete Veröffentlichung prüfen.
- Keine Schreibzugriffe durch den Index; keine Änderung von Editorentwurf, Storage-Schutzmechanismen, Dependencies oder Markdownformat.
- Mehrere Hundert synthetische Dateien mit kooperativen Unterbrechungen prüfen. Automatisierte Laufzeitmessung getrennt von nativer Bedienlatenz und Langzeitstabilität berichten.

## Manuelle Probe

1. Lokale Anwendung wie bisher mit `npm start` starten, neu laden und synthetischen Test-Vault bestätigen. Als Vault **nur** `test-vault/m7a-probe` auswählen.
2. „Agenda-Index: Diagnose“ aufklappen und Ende des Einlesens abwarten. Soll: **3 Dateien, 6 Einträge, 0 Hinweise/Fehler**. Die Dateien decken H1–H6, neutrale Vorfahren, eigenen Workflow, beide Terminarten und ausgeschlossene Textbereiche ab.
3. `main.md` öffnen, eine weitere `# TODO Neue Aufgabe` ergänzen. Vor Speichern bleibt die Indexzahl 6. Nach erfolgreichem Speichern soll sie 7 sein. Undo und Speichern stellen die Fixture wieder her.
4. Für externe Änderungen ausschließlich eine Kopie dieses synthetischen Ordners verwenden. Dort eine Markdown-Datei mit `# TODO Extern` ergänzen; erst „Agenda-Index neu einlesen“ übernimmt sie. Refresh darf einen ungespeicherten Editorentwurf nicht ersetzen.
5. Einen anderen synthetischen Vault auswählen; der vorherige Bestand muss sofort verschwinden. Ein Lesefehler lässt sich browser-/betriebssystemabhängig über eine entzogene Dateiberechtigung provozieren; Diagnose muss relativen Pfad und Ursache nennen. Die unabhängigen Modelltests decken solche Fehler reproduzierbar ab.

Sollwerte der API für die unveränderte Fixture: `todo` 5, `open` 3, `closed` 2, `scheduled` 3, `deadline` 2, `overdue` mit `today: '2026-11-09'` 1. Die API wird als Modul bereitgestellt und nicht als globaler Browserzustand veröffentlicht; die Produktoberfläche zeigt in M7a nur die Diagnose.

## Prüfergebnis

Developer und unabhängige QA jeweils **289/289 Tests**, Build, Syntaxchecks und Diffcheck grün; QA zusätzlich **14 unabhängige Prüfgruppen**. Ein veralteter Index nach erneutem Öffnen externer Änderungen wurde durch den tatsächlichen App-Callback reproduziert, vom Developer korrigiert und unabhängig erneut geprüft. Kein belegter verbleibender Blocker im geprüften Umfang. Einzelheiten: [Developerbericht](../_Communication_Pipeline/developer_m7a.md), [QA-Bericht](../_Communication_Pipeline/qa_m7a.md).

QA-Kurzprobe mit 500 Dateien und 20 weiteren Neuaufbauten: erster Aufbau 58,0 ms, weitere Läufe 19,3–34,6 ms; 1000 Überschriften/161890 Zeichen ca. 44,0 ms. Tatsächliche kooperative Unterbrechungen mit `setImmediate` geprüft. Das sind Node-Modellwerte; Heapentwicklung und Laufzeit belegen keine Langzeitstabilität oder native Tiplatenz. Die Handproben-Fixture wurde zusätzlich mit dem echten Parser auf die dokumentierten Sollzahlen geprüft.

## Grenzen

Keine Agendaoberfläche, Kalenderansicht, Dispatcher, C-c a, Benachrichtigungen oder echte Quellnavigation. M7b kann die vorbereiteten Abfragen und Quellenbeschreibungen nutzen. Native Edge-, Zoom-, Idle- und mehrstündige Ressourcenprüfungen benötigen eigene Nachweise. Keine privaten oder produktiven Vaults als Testdaten verwenden.

Dateien werden nacheinander gelesen, mit kooperativer Unterbrechung zwischen Einträgen; vollständiges Parsen wird in ungefähr 15-ms-Arbeitsabschnitten fortgesetzt. Recordextraktion innerhalb einer Datei und Snapshotveröffentlichung bleiben synchron: extrem große Einzeldateien können länger blockieren. Der Vaultscan ist keine atomare Dateisystemaufnahme; externe Änderungen während des Scans können einen weiteren Refresh erfordern. Modellmessungen ersetzen keine nativen Latenzbudgets.

# QA M7a — 2026-11-08

Rollenrevision **M32A-2026-11-03** geladen. Unabhängig geprüft, keine Implementierung geändert. Ausschließlich synthetische Handles/Daten und eigene Prüfung `test-vault/qa-m7a.mjs`; keine privaten Vaults, Installationen, Storage-Sicherheitsänderungen oder Git-Aktionen.

## Ergebnis

Final **289/289** bestehende/Developer-Tests grün, Build grün, fünf Syntaxchecks und `git diff --check` grün. Eigene **14 Prüfgruppen** grün: `node --expose-gc test-vault/qa-m7a.mjs`. Kein bewiesener verbleibender Implementierungsblocker im geprüften Umfang. Native Browserabnahme und mehrstündige Stabilität bleiben offen.

## Gefundener und unabhängig geschlossener P2

`file.open` las eine extern geänderte Datei korrekt in Session/Editor, ließ den Index jedoch veraltet. Reproduktion mit dem tatsächlichen App-Callback, echter `createSession`/`createAgendaIndex` und synthetischem Dateihandle: zunächst `# TODO Original` indiziert, Quelle zu `prefix\n\n# DONE Reloaded` geändert, anschließend Datei erneut geöffnet. Vor Korrektur blieb der Index bei Original/Offset 0, während der Editor Reloaded/Offset 8 enthielt.

Developer ergänzte begrenzt die Aktualisierung nach erfolgreichem Öffnen und Vaultprüfung samt Regression. Finaler eigener Wiederholungstest wartet das Ende des Hintergrundlesens ab und bestätigt Titel Reloaded, abgeschlossen und Offset 8. Befund geschlossen; kein eigenständiger QA-Patch am Anwendungscode.

## Geprüfter Umfang

- H1–H6, eigene offene/abgeschlossene Status, voneinander unabhängige verschachtelte Aufgaben, Vorfahren ohne eigenen Status, BOM/CRLF/Unicode und editoräquivalente UTF-16-Positionen.
- Dateilokale gültige/ungültige/mehrere Definitionen, letzte gültige Regeln, Standard und Reset bei erneuter Vaultauswahl. Kein Übertrag der Regelhistorie auf neue Vaultgeneration.
- SCHEDULED/DEADLINE einzeln/kombiniert, Termine ohne TODO, Start-/Endzeiten, inklusive gültigem Schaltjahr und Jahren 0001/9999. Ungültige Daten/Zeiten, rückwärts gerichtete Zeitfenster, Repeater, doppelte/versetzte Metadaten diagnostiziert.
- Keine Aufgaben aus Checklisten, Frontmatter, Fences, eingerücktem Code, Zitaten, HTML/Kommentaren oder Listencontainern. Leere/irrelevante Dateien erlaubt.
- Rekursive Quellen einschließlich versteckter Dateien/Ordner und mehr als zehn Ebenen. Eigener Sicherungsordner ausgeschlossen. Datei-/Verzeichnisfehler und ungültiges UTF-8 isoliert, Pfad/Ursache sichtbar; synthetische Handles verweigern Schreib-/Erstell-/Löschzugriffe durch den Index.
- Tages-/Wochenabfragen, Datumgrenzen, individuelle Statusfilter, offene/abgeschlossene Aufgaben, statuslose Termine und Deadline-Überfälligkeit. Snapshots/Records tief eingefroren, Queryarray unabhängig, alte Quellenkennungen nach Veröffentlichung ungültig.
- Neue/gelöschte/geänderte Dateien sowie geänderte Definitionen nach Refresh/Dateiupdate. Vaultwechsel mit identischem Namen, synchrones Leeren, alte verzögerte Reads/Fehler und konkurrierende Dateiupdates: keine veraltete Veröffentlichung oder Vermischung.
- Tatsächliche App-Callbacks für Öffnen, Wiederaufnahme und Speichern ausgeführt, mit synthetischem Kontext. Recovery indiziert gespeichertes Zielvault statt ungespeichertem Entwurf. Savefehler/fremdes Vault aktualisieren nicht; Erfolg löst Update aus.
- Echte schmutzige Session übersteht Indexrefresh unverändert. Extern geänderte gespeicherte Quelle wird indiziert, ohne den Entwurf zu ersetzen; nachfolgendes konfliktbehaftetes Speichern wird verweigert und erhält beide Fassungen.

## Kurze Ressourcenprobe

Node-Modell, parallel zur finalen Vollsuite/Build, keine native Latenzmessung: 500 Dateien, erster Aufbau **58,0 ms**, 20 weitere Neuaufbauten **19,3–34,6 ms** je Lauf, insgesamt **708,3 ms** einschließlich 100 ms Idle und großer Einzeldatei. **10.563** Yield-Aufrufe mit tatsächlichem `setImmediate` über alle 21 Aufbauten. Während 100 ms Idle keine weitere Veröffentlichung. GC-Heap vor Aufbau **11.837.512 Bytes**, nach 20 Neuaufbauten **13.479.736 Bytes**; erster Messpunkt ohne, zweiter mit aktiv gehaltenem 500-Dateien-Snapshot. Daraus keine Leakfreiheit oder Speicherobergrenze ableiten.

Große Einzeldatei: **161.890 Zeichen, 1.000 Headings, 44,0 ms**, vollständiger echter Parser und korrekte Recordzahl. Extraktion/Publikation enthält weiterhin synchrone Abschnitte. Keine Perzentile, native Tiplatenz, mehrstündige Last, Langzeit-Idle, Browserheapentwicklung oder Memory-Leak-Freiheit nachgewiesen.

## Grenzen / Dokumentation

Keine native Edge-/Permission-/Zoom-/kleines-Fenster-Probe durchgeführt. Handles/DOM-Adapter sind Modelle, keine Browserzustellgarantie. Externe Änderungen während eines mehrteiligen Lesens ergeben keine atomare Vaultaufnahme und können erneuten Refresh erfordern. Index ignoriert ungespeicherte Editoränderungen absichtlich. ID/Source sind revisionsgebunden, keine dauerhaften Aufgaben-IDs. Letzte gültige Regeln ungültiger Dateien sind sitzungslokal und können nach Kaltstart nur durch Standardregeln ersetzt werden; Diagnose ist vorhanden.

Dokumenthinweise an Lead: `overdue` wertet `today`/`status`, ignoriert `from`/`to`; Jahresende 9999 wird begrenzt. Lead hat beides in der Schnittstellenbeschreibung präzisiert. Keine Agendaansicht, Dispatcher, C-c a oder weitere M7b-Funktion geprüft oder freigegeben.

Pflichtchecks: `npm test`, `npm run build`, `node --check` für `editor/agenda-index.mjs`, `editor/agenda-index.test.mjs`, `editor/app.mjs`, `editor/commands.mjs`, `test-vault/qa-m7a.mjs`, außerdem `git diff --check`. Alle final mit Exit 0; Git-Zeilenendhinweise sind keine Diffcheckfehler.

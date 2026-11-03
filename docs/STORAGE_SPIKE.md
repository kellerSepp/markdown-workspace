# Storage-Spike – Anleitung und Ergebnis

Stand: 2026-11-03. Technisches Wegwerfexperiment, Phase 1. Keine Editorentwicklung, Pakete, PWA oder Veröffentlichung. Nur synthetische Test-Vaults verwenden.

## Start und automatische Tests

Im Repository in PowerShell:

```powershell
python spike/serve.py
```

In Edge **http://127.0.0.1:8765** öffnen. Den Origin unverändert lassen: `localhost` oder ein anderer Port hat getrennte Rechte und Browserdaten. Server mit Strg+C beenden. Er liefert ausschließlich vier Spike-Dateien über Loopback; Vault-Inhalte werden nicht per HTTP bereitgestellt. Der Server ist nur ein temporäres Testwerkzeug.

Separates Terminal:

```powershell
node --test spike/storage.test.mjs
node --check spike/app.mjs
```

## Verhalten und Grenzen

- Testordner explizit wählen; beliebiger vom Browser erlaubter lokaler Ordner grundsätzlich möglich. Während dieses Spikes ausschließlich `test-vault/vault-a` und `test-vault/vault-b`. OneDrive wird nicht benötigt und nicht getestet.
- Ein aktives Dokument, explizites Speichern. Technische Knöpfe statt Editor: Änderung hängt feste UTF-8-Bytes an. Originalbytes einschließlich BOM, unbekannter Metadaten und gemischter Zeilenenden bleiben als Präfix erhalten. Unverändertes Speichern öffnet keinen Schreibstream. Kein Nachweis für spätere beliebige Textbearbeitung.
- Ladefassung und Entwurf werden je Öffnung in IndexedDB gespeichert. Fehler beim Sichern des Entwurfs blockieren Schreiben. Wiederhergestellte Entwürfe erhalten eine eigene ID. Vault-Wechsel erhält alte Entwürfe; kein automatisches Löschen.
- Vor Ersetzen: Bytevergleich, separate Rohbytesicherung im Vault unter `.storage-spike-backups`, Rücklesen der Sicherung, erneuter Bytevergleich, Schreiben, `close`, Rücklesen. Keine Erfolgsmeldung vor Abschluss. Gleiches Origin koordiniert eigene Tabs mit einem globalen Web Lock. Fremde Programme, andere Origins und Browserprofile beachten dieses Lock nicht.
- Sicherungen heißen Zeitstempel plus UUID; Zuordnung zur Datei steht im sichtbaren Protokoll. Keine automatische Auswahl/Aufbewahrungsstrategie. Wiederherstellung lädt eine bewusst ausgewählte Sicherung als Entwurf; explizites Speichern sichert zuvor die aktuelle Datei. Verwechslung der Sicherung ist möglich: vor Speichern Vorschau vergleichen.
- Entwürfe/Sicherungen enthalten Inhalte. Browserdaten können gelöscht werden; Quota, private Sitzungen, Geräteausfall, voller Datenträger und Sync können Daten verlieren. IndexedDB ist kein unabhängiges Backup. Browseraktionen und dauerhafte Rechte sind nicht garantiert.
- **Nachgewiesenes Restfenster:** externe Änderung zwischen letzter Prüfung und Schreiben wird möglicherweise überschrieben. Diese Zwischenfassung ist nicht in der Sicherung. Readback kann spätere externe Änderungen ebenfalls nicht verhindern. Kein atomarer Compare-and-Swap und keine Zusicherung gegen Stromausfall. **No-Go für produktive Vaults/Phase 2 ohne PO-Entscheidung zur Speicherstrategie.**
- Fehlerknöpfe simulieren Fehler vor `close` bzw. einen Stream-Abbruch, keinen Prozessabsturz, Hardwarefehler oder echten Rechteentzug während des OS-Schreibens.
- Keine automatischen Scans im Hintergrund. Fokuswechsel prüft aktive Datei/Rechte; eine echte 30-Minuten-Messung steht aus. Kein Service Worker: Offline-Reload ohne Server ist nicht unterstützt; späterer PWA-Offline-Neustart bleibt separat.

## Edge-Tests: vom Nutzer auszuführen

Edge-Version (`edge://settings/help`), Windows-Version (`winver`) und Referenzgerät sind noch nachzutragen. Nur synthetische Dateien extern bearbeiten. Browserdaten nicht vor Abschluss der Wiederherstellungstests löschen. Die folgende Tabelle bleibt die Testanleitung; der aktuelle Nachweisstand steht darunter. Nicht ausdrücklich bestätigte Teilprüfungen bleiben offen.

| Fall | Schritte | Abnahmekriterium |
| --- | --- | --- |
| Auswahl/Bytegleichheit | Vault A wählen, `mixed.md` laden. Vorher/nachher in PowerShell `Get-FileHash test-vault/vault-a/mixed.md` ausführen; unverändert speichern. Dasselbe mit Vault B/`bom.md`. | Hash identisch; Meldung „kein Schreibzugriff“. |
| Änderung/Readback | Marker anhängen, speichern, Datei neu laden. | Marker vorhanden; Originalpräfix unverändert; Erfolg erst nach close/Verifikation. |
| Vault-Wechsel | In A Marker als Entwurf anlegen, zu B wechseln, dort laden. „Gesicherte Browser-Entwürfe auflisten“, A-Fassung wählen/laden. | A-Entwurf unverändert vorhanden, B wird nicht versehentlich beschrieben. Pfad/Vorschau prüfen. |
| Reload/Neustart | Ungespeicherten Marker anlegen; Reload, Tab schließen/neu öffnen, Edge vollständig beenden/neu starten jeweils getrennt prüfen. Entwürfe auflisten/laden. | Entwurf wiederherstellbar; Rechtezustand protokolliert. Falls nötig „Rechte erneut anfordern“. |
| Rechteentzug | Entwurf sichern, im Edge-Seitenmenü Dateiberechtigung entziehen (Bezeichnung je Edge-Version), prüfen/speichern. Danach erneut freigeben. | Kein falscher Erfolg, Entwurf wiederherstellbar; echte Rechteanzeige notieren. |
| Externe Änderung | Datei laden, Marker anlegen; Datei extern ändern/speichern; im Spike speichern. | Konflikt blockiert, externe Datei unverändert; Ladefassung/Entwurf/aktuelle Datei sichtbar. |
| Zwei Tabs | Gleichen Origin in zweitem Tab öffnen, dieselbe Datei in beiden laden, unterschiedliche Markeranzahl anlegen. Erst Tab A, dann B speichern; auch gleichzeitiges Speichern versuchen. | Ein Schreiber gewinnt; anderer erkennt geänderte Bytes. Beide Entwürfe bleiben über Liste zugänglich. |
| Restfenster | Nur synthetisch! Marker anlegen, Fehler „Pause nach letzter Prüfung“, speichern. Während Pause Datei extern ändern, danach „fortsetzen“. | Externe Zwischenfassung kann verloren gehen; Ergebnis und Sicherungsinhalt dokumentieren. Dieser Fall demonstriert Risiko, keinen sicheren Betrieb. |
| Fehler/Abbruch | Mit frischer Ladefassung Marker anlegen; je einmal Schreibfehler und Stream-Abbruch auswählen, speichern. | Keine Erfolgsmeldung; Entwurf erhalten; tatsächlichen Dateihash prüfen. Danach Fehler „keiner“ wählen. |
| Wiederherstellung | Vor Änderung Originalhash notieren. Erfolgreich Marker speichern; Sicherungen auflisten, anhand Log richtige Sicherung wählen, als Entwurf laden, Vorschau prüfen, explizit speichern. | Originalhash wiederhergestellt; auch vorheriger Dateistand erneut gesichert. |
| Idle | Entwurf anlegen, 30 Minuten Tab unberührt lassen, zurückkehren. | Entwurf erhalten; Fokusprüfung protokolliert; Zeit bis nutzbar messen (Ziel 1 s ohne Rechte-Dialog). |
| Offline | Entwurf sichern, Server beenden und Reload versuchen; danach Server auf gleichem Origin neu starten, Entwurf laden. | Ohne Server kein garantierter Reload; nach Neustart Entwurf wiederherstellbar. Kein PWA-Nachweis. |
| Speicherdauer | Synthetische 100-KB-Datei unter `test-vault` erstellen, 20 Marker-Speicherungen ohne Fehler ausführen. | Logzeiten erfassen, p95 berechnen; vorgeschlagenes Ziel 1 s noch nicht bestätigt. Dialogzeiten getrennt. |

Ein bekanntermaßen zurückgewiesener Ordner oder fehlende API ist als Einschränkung zu protokollieren, nicht zu umgehen. Für wiederholte Tests synthetische Dateien bewusst zurücksetzen; keine produktiven Ordner ausprobieren.

## Tatsächlich ausgeführt

2026-11-03, Node v24.22.1, Python 3.10.9 im vorhandenen Windows-Arbeitsverzeichnis:

- `node --test spike/storage.test.mjs`: **11 Tests bestanden**. Byteerhalt, unverändertes Speichern, Sicherungsreihenfolge, externe Konflikte, Konflikt während Sicherung, Sicherungsfehler, Abbruch/Schreibfehler, Readback-Abweichung, Rechtefehler, Wiederherstellung und bewusstes Restfenster mit simulierten Handles; Fixture-Prüfung liest reale synthetische Dateien. Mock-Tests beweisen kein Edge-/OS-Verhalten.
- `node --check spike/app.mjs`: bestanden.
- Temporärer Python-Server tatsächlich gestartet: `/`, `/app.mjs`, `/storage.mjs` liefern HTTP 200 mit `no-store`, Module mit JavaScript-MIME. Vault-Pfad, Testskript und Serverquelltext liefern erwartetes HTTP 404. Server anschließend beendet. `git diff --check` ohne Fehler; Git meldet bestehende LF/CRLF-Konvertierungshinweise.
- Die damalige automatisierte Prüfung enthielt keine Edge-Tests. Die inzwischen vom Nutzer berichteten Praxisergebnisse stehen im folgenden Abschnitt.

## Vom Nutzer berichtete Edge-Praxisergebnisse

Rückmeldung im aktuellen Auftrag, dokumentiert am 2026-11-03; nicht vom Lead erneut durchgeführt. Genaues Ausführungsdatum, Edge-Version, Windows-Build, Referenzgerät, Origin und Rohprotokolle wurden nicht mitgeliefert.

| Prüfung | Berichtetes Ergebnis |
| --- | --- |
| Unveränderte Datei | Erfolgreich: SHA256 bleibt identisch. Welche Fixtures geprüft wurden, ist nicht angegeben. |
| Änderung speichern | Erfolgreich: Marker geschrieben und Bytes verifiziert; **131,9 ms bei einem Vorgang**. Kein p95-/100-KB-Nachweis. |
| Externe Änderung | Erfolgreich: Konflikt erkannt, Überschreiben verhindert. |
| Entwurf nach Konflikt | Erfolgreich: ungespeicherter Entwurf weiterhin vorhanden. |
| Tab schließen/erneut öffnen | Erfolgreich: Entwurf bleibt erhalten. Vollständiger Browserneustart dadurch nicht belegt. |
| Vault-Wechsel | Erfolgreich: Entwürfe aus vorherigem Vault bleiben sichtbar. Wiederherstellung/Speichern nach Wechsel nicht separat bestätigt. |
| Zwei Tabs | Erfolgreich: erster Tab speichert, zweiter erkennt Konflikt und behält Entwurf. Exakt gleichzeitiger Schreibversuch nicht separat bestätigt. |
| Simulierter Schreibfehler | Erfolgreich: Fehlermeldung, Datei unverändert. Stream-Abbruch ist eine separate offene Prüfung. |
| Backup-Wiederherstellung | Erfolgreich: ältere Version zurückgeschrieben. Hashvergleich und erneute Sicherung des ersetzten Standes nicht separat bestätigt. |

Weiter offen: Reload als eigener Fall, vollständiger Edge-Neustart, Rechteentzug/-wiedererteilung, echte Berechtigungsverläufe, gezieltes externes Rennfenster im Browser, separater Stream-Abbruch, 30 Minuten Idle, Offline-Reload und Wiederaufnahme, 20 Speicherungen mit 100 KB/p95 sowie die oben nicht bestätigten Teilprüfungen. Die erfolgreichen Konflikttests beseitigen das bekannte Restfenster nicht. Phase 2 bleibt ausdrücklich gesperrt.

## Agenten beim ursprünglichen Spike (historisch)

Tatsächlich eingesetzt: nur Lead. `agents/storage.md` ist ein Rollenbrief; im Repository sind weder `.codex` noch `.agents` oder Agenten-Konfigurationsdateien vorhanden. Globale/private Konfiguration wurde wegen der Repository-Grenze nicht gelesen. Die vorhandene Laufzeit bietet allgemeine Delegation, aber keine nachgewiesene registrierte Storage-Rolle. Deshalb wurde kein weiterer Agent gestartet.

Minimaler Vorschlag zur separaten Einrichtung: genau eine lokale Storage-Rolle registrieren, bestehenden Rollenbrief referenzieren und für Phase 1 aktualisieren, keine zusätzlichen Pakete/Modelle. Begrenzter Auftrag: ausschließlich `spike/` und synthetische Fixtures; Bericht unter `_Communication_Pipeline/`; Dokumentintegration beim Lead. Vor erstem Einsatz Konfigurationsschema der vorhandenen Codex-Version und erfolgreiche Rollenauflösung prüfen. Noch keine Konfiguration angelegt; konkrete Syntax und Funktionsfähigkeit sind nicht verifiziert. Die Umsetzung des Spikes hing davon nicht ab.

Inzwischen wurden vier Projektrollen unter `.codex/agents/` freigegeben und aktiviert (Limit zwei). Der ausdrücklich erlaubte QA-Rollentest ist durch die fehlende Rollenauswahl der aktuellen Sitzung blockiert; weiterhin kein Spezialagent gestartet. Aktueller Stand: [AGENT_TEAM.md](AGENT_TEAM.md).

## Nächste Entscheidung

Weitere Schritte nach Rückmeldung: geeignete Laufzeit für den echten QA-Rollentest klären. Weitere Storage-Tests und Speicherstrategie separat beauftragen; Restrisiko externer Schreibrennen bewerten. Phase 2 bleibt gesperrt; erfolgreiche Praxisfälle sind keine automatische Freigabe.

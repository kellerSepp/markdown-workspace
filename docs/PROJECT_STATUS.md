# Projektstatus

**Phase:** 1 — Storage-Spike praktisch teilgeprüft; Agententeam aktiviert, QA-Rollentest blockiert
**Stand:** 2026-11-03
**Anwendungscode:** technisches Wegwerfexperiment in `spike/`; keine Pakete installiert
**Freigabe:** Teamkonfiguration bestätigt und Aktivierung autorisiert; ausschließlich ein lesender QA-Auftrag erlaubt. Phase 2 und weitere Agentenarbeit gesperrt.

## Aktuelles Arbeitspaket

- Nativer Browser-Dateizugriff, Vault-Wechsel, byteerhaltender Testmarker, getrennte Browser-Entwürfe, geprüfte Sicherungen, Konfliktprüfung, Web Lock für eigene Tabs und Fehler-/Rennfenster-Schalter implementiert.
- Synthetische Fixtures ausschließlich unter `test-vault/`; keine persönlichen Ordner verwendet.
- 11 Node-Tests mit simulierten Handles bestanden, JavaScript-Syntax geprüft. Loopback-Server: drei erfolgreiche HTTP-Abrufe und drei erwartete Zugriffssperren geprüft; anschließend beendet. `git diff --check` bestanden (nur Git-Zeilenendenhinweise).
- Nutzer berichtet erfolgreiche Edge-Tests: unverändertes SHA256, Marker/Byteverifikation (ein Vorgang 131,9 ms), externe Konflikte mit Entwurfserhalt, Tab-Wiederöffnung, sichtbare Entwürfe nach Vault-Wechsel, Zweitab-Konflikt, simulierter Schreibfehler ohne Dateiänderung und Backup-Wiederherstellung. Keine Wiederholung durch Lead; genaue Versionen/Rohprotokolle fehlen. Details und offene Teilprüfungen: [STORAGE_SPIKE.md](STORAGE_SPIKE.md).
- Weiter offen: Reload, vollständiger Browserneustart, Rechteentzug, Browser-Rennfenster, Stream-Abbruch, Idle, Offline und 100-KB/p95-Messreihe. Ein Einzelmesswert ersetzt keine Performanceabnahme.
- Projektrollen Developer, Storage, QA und Documentation grundsätzlich freigegeben. `.codex/config.toml`: `enabled = true`, Limit unverändert zwei. Developer um Tastatur-/Mausbedienung, Sequenzen/Palette und Eingabesicherheit ergänzt; QA um Langzeitstabilität/Leaks/Performanceverschlechterung. Anforderungen nur dokumentiert, keine Implementierung. Codex CLI 0.166.0 lokal nachgewiesen.
- Erster QA-Delegationstest blockiert: vorhandene Delegationsschnittstelle besitzt keinen Projektrollen-Selektor; auch das erzeugte lokale Thread-/Turn-Protokollschema bietet keinen direkten benannten Rollenstart. Kein Subagent gestartet, keine QA-Konfiguration nachweislich geladen, keine QA-Ergebnisse. Kein Lead-Ersatzreview als Erfolg ausgegeben. Details: [AGENT_TEAM.md](AGENT_TEAM.md).
- Nur Lead eingesetzt, keine Spezialagenten gestartet; keine Installationen, Anwendungscode- oder Produktentscheidungsänderungen in diesem Arbeitspaket.

**Nächste Aktion:** Stoppen und auf weitere Freigabe warten. Danach gegebenenfalls Laufzeit/Oberfläche benennen und frische Projektsitzung mit nachgewiesener Auswahl der registrierten Rolle `qa` verwenden; nur den freigegebenen lesenden Auftrag delegieren. Das reproduzierte Schreibrennfenster bleibt offen; keine Freigabe für Produktdaten oder Phase 2.

## Historischer Stand der Planung (2026-11-02)

## Erledigt

- FIRST_PROMPT, AGENTS, README, Anforderungen, Entscheidungen, Status und Rollenbriefe vollständig gelesen.
- ARCHITECTURE.md: Optionen, Storage-Risiken, Datenmodell, späteres Board, Desktop und Agentenrollen vorgeschlagen.
- PHASES.md: kleine Meilensteine, Storage-Spike und messbare Budgets beschrieben.
- Primärquellen recherchiert; noch keine praktische Machbarkeit behauptet.
- Keine Subagenten gestartet und keine Agentenkonfiguration geändert.

## Nächste Aktion und offene Entscheidungen

Product Owner prüft Architektur und Phasen. Danach ausdrücklich Phase 1 freigeben: kleiner Storage-Spike mit Testdateien, Browseraktionen und temporärem localhost-Server. Noch keine Editor-/Frameworkinstallation. Genehmigte Entscheidungen anschließend in DECISIONS.md aufnehmen.

Zusätzlich offen:

- Späteres statisches HTTPS-Hosting für Erstbereitstellung/Updates akzeptabel, wenn Notizen lokal bleiben?
- Welches Restrisiko externer gleichzeitiger Schreibzugriffe ist akzeptabel? Vor Produktfreigabe Spike-Ergebnis prüfen.
- Danach Editor-/Buildwerkzeuge, Aufgaben-/YAML-Syntax, Sicherungsaufbewahrung und Performancebudgets entscheiden.

## Abweichungen

Bestehende bestätigte Produktentscheidungen bleiben unverändert. README ergänzt das spätere Board; berücksichtigt ohne MVP-Erweiterung. Frühere Formulierung „Projektsetup“ ist keine Implementierungs-/Installationsfreigabe. Bereits vor Arbeitsbeginn geänderte README.md und FIRST_PROMPT.md wurden nicht bearbeitet.

# Architekturentscheidungen

## Freigabe: Teamaktivierung und Bedienungsanforderungen, 2026-11-03

Kontext: vier Projektrollen wurden vom PO geprüft. Entscheidung: Konfiguration grundsätzlich freigegeben, Subagenten aktivieren; Limit zwei beibehalten. Aktuell ausschließlich ein lesender QA-Dokumentationsauftrag autorisiert, keine Tests, Dateiänderungen durch QA oder Unterdelegation. Phase 2 bleibt gesperrt. Ein fehlender Rollenstart darf nicht durch einen Lead-Bericht als Delegationserfolg ersetzt werden.

Zusätzlich bestätigt: tastaturzentrierte Bedienung mit vollständiger Maus-Erreichbarkeit wesentlicher Funktionen, mehrstufige Sequenzen samt Folgehilfe, durchsuchbare Command Palette, DE-DE/QWERTZ, langfristige Kürzelkonfiguration, Schutz normaler Texteingabe, Berücksichtigung von OS-/Browserkonflikten und keine unnötigen Animationen/dauerhaftes Hintergrund-Polling. Beispiele wie `G → J`/`G → A` und `Strg+K` legen noch keine finalen Belegungen fest. Abnahme und Grenzen stehen in REQUIREMENTS.md; Implementierung erst nach eigener Phasenfreigabe.

QA-Auftrag langfristig um Langzeitstabilität, Memory Leaks und schleichende Performanceverschlechterung über Stunden ergänzt. Kein solcher Test ist mit dieser Freigabe durchgeführt oder als bestanden bewertet.

## Freigabe 2026-11-03

Kontext: Architekturplanung mit Product Owner geprüft. Optionen: weiter planen oder begrenzten Storage-Spike durchführen. Entscheidung: Phase 0 freigegeben; Phase 1 gemäß PHASES.md darf beginnen, einschließlich temporärem localhost-Testbetrieb mit vorhandenen Werkzeugen. Keine Installation, Produktoberfläche, Editorbibliothek oder Phase 2.

Konsequenzen/Abnahme: nur synthetische Daten unter `test-vault`, frei gewählter vom Browser erlaubter Ordner, Test-Vault-Wechsel möglich, vorhandene Bytes und unbekannte Metadaten erhalten. Konflikte und Datenverlust haben Vorrang. Automatische Tests ausführen; interaktive Edge-Fälle bleiben bis Nutzerprüfung offen. Ergebnisse und Sicherheitsgrenzen in STORAGE_SPIKE.md. Freigabe des Experiments ist keine Akzeptanz des externen Schreibrennens und keine Produktfreigabe.

Hier nur Entscheidungen festhalten, die der Product Owner bestätigt hat. Für jede Entscheidung: Datum, Kontext, Optionen, Entscheidung und Konsequenzen.

## Bestätigte Produktentscheidungen
- 2026-11-02: Beliebiger lokaler Vault-Ordner; OneDrive optional.
- 2026-11-02: Klassisches Markdown-Schreibgefühl mit begrenzten Hybrid-Funktionen.
- 2026-11-02: Edge/PWA zuerst; portable EXE eventuell später.

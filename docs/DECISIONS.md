# Architekturentscheidungen

## Produktplanung: Themes und Skins — 2026-11-03

PO bestätigt eine langfristige ressourcenschonende Theme-Bibliothek mit den in REQUIREMENTS.md aufgeführten Stilrichtungen. Farbthemes und aufwendige Skins werden getrennt; zuerst schlankes System mit mehreren Paletten, später Skins und Theme-Editor mit Live-Vorschau. Design-Tokens, eigene datenbasierte JSON-Themes ohne Programmierung, lokaler Wechsel ohne Neustart und ohne externe Ladeabhängigkeit sind Anforderungen.

Grenzen: kein ausführbarer Code in Themes, keine Inhaltsänderung, keine unnötigen Animationen/Hintergrundeffekte; lesbare Texte und barrierearme Kontraste. Bei Veröffentlichung keine ungeklärten Markenassets/geschützten Grafiken mitliefern. Noch keine Implementierung, Paketwahl, konkretes JSON-Schema oder Auswahl der ersten Paletten beschlossen. Technischer Vorschlag und Abnahmegrenzen in ARCHITECTURE.md und REQUIREMENTS.md.

## Freigabe Phase 2, Meilenstein 1 — 2026-11-03

Nach erfolgreichen QA- und parallelen Storage-/Developer-Reviews: direktes Speichern mit Konfliktprüfung und verifizierter Sicherung; externes Schreibrennen ausschließlich für synthetische Testdaten als Restrisiko akzeptiert. Keine persönlichen oder produktiven Vaults. Sicherungen separat im Test-Vault, keine automatische Löschung.

CodeMirror 6 und notwendiger Buildprozess sind für Öffnen, Rohtextbearbeitung und explizites Speichern freigegeben. Schlichte Oberfläche, Tastatur/Maus, QWERTZ; Performanceziele bleiben vorläufig. Kein neues Datenmodell, Framework, Cloud-Dienst, Agenda, Wiki-Links, Board oder Pluginplattform. Weitere Meilensteine benötigen Freigabe.

Abnahme: unveränderte Dateien ohne Schreibstream; erkannte externe Änderungen blockieren Speichern und erhalten Entwürfe; keine Markdown-/YAML-Umformatierung; bestehende Storage-Tests bleiben bestehen. Developer und Storage implementieren abgegrenzt, anschließend unabhängige QA. Kein Produktionsnachweis.

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

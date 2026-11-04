# Projektbezogenes Agententeam

Stand: 2026-11-03. Rollenrevision `M32A-2026-11-03` freigegeben und wirksam nachgewiesen. Developer darf innerhalb freigegebener Delegation implementieren und testen; QA darf unabhängig freigegebene Tests ausführen, aber Anwendungscode nicht eigenmächtig ändern. Tech Lead koordiniert/integriert und implementiert nur im begründeten Ausnahmefall. Storage bleibt zuständig für sicherheitskritische Speicheränderungen; Documentation nur nach explizitem Auftrag. Freigabe-/Datei-/Sicherheitsgrenzen gelten weiterhin.

## Tatsächlich geprüfte Rollenübernahme vor M3.2a

Nach Änderung der beiden TOML-Dateien, Rollenbriefe und AGENTS.md wurden **neue** Subagenten `/root/developer_role_check` mit `agent_type: developer` und `/root/qa_role_check` mit `agent_type: qa` gestartet. Beide bestätigten Revision `M32A-2026-11-03` in ihren tatsächlich geladenen Rolleninstruktionen; ausdrücklich nicht nur im nachträglich gelesenen Dateitext. Keine alten pauschalen Entwicklungs-/Test-/Phase-2-Sperren aktiv. Die Probe führte noch keine Implementierung oder Tests aus. Erst nach beiden Bestätigungen wurde M3.2a delegiert; QA führte danach die Baseline 52/52 aus.

Ein Neustart der gesamten Hauptsitzung wurde nicht durchgeführt und erwies sich für diese frisch geladenen Rollen als nicht erforderlich. Bereits laufende ältere Agenten werden nicht als aktualisiert betrachtet. Bei erneutem Auftreten alter Instruktionen anhalten und frische Sitzung/erneute Prüfung vor Implementierung verlangen; kein Lead-Bypass.

Das Rollenformat mit projektbezogenen TOML-Dateien und `name`, `description`, `developer_instructions` entspricht der [offiziellen OpenAI-Dokumentation](https://learn.chatgpt.com/docs/agent-configuration/subagents), am 2026-11-03 geprüft. Die praktische Übernahme ist durch die Agentenprobe belegt, nicht aus der Dokumentation abgeleitet.

## Historische Einrichtungsnachweise (frühere Sperren überholt)

## Nachgewiesene Grundlage

`codex --version` meldet **codex-cli 0.166.0**; das installierte npm-Paket `@openai/codex` bestätigt dieselbe Version. Geprüft wurde die über PATH aufrufbare CLI unter `C:/Users/sekel/AppData/Roaming/npm/`. Die Version einer eventuell separat laufenden ChatGPT-/Desktop-/IDE-Laufzeit wurde damit nicht ermittelt.

Die [offizielle Subagenten-Dokumentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) beschreibt Projektrollen als einzelne TOML-Dateien unter `.codex/agents/`. Pflichtfelder: `name`, `description`, `developer_instructions`. Darauf basiert diese Einrichtung; keine ältere Registrierung mit `agents.<name>.config_file`. Einstellungen sind zusätzlich in der [Konfigurationsreferenz](https://learn.chatgpt.com/docs/config-file/config-reference) beschrieben. Dokumentation am 2026-11-03 abgerufen.

## Dateien und Zuständigkeiten

| Datei | Aufgabe und Grenze |
| --- | --- |
| `.codex/config.toml` | Aktivierung und Limit für Gleichzeitigkeit; keine globalen Änderungen. |
| `.codex/agents/developer.toml` | Editor, Oberfläche, Anwendungslogik, Modularität; keine eigenmächtigen Storage-/Produktentscheidungen. |
| `.codex/agents/storage.toml` | Dateizugriff, Byteerhalt, Konflikte, Backup/Wiederherstellung; Datenverlustrisiken ausdrücklich nachweisen. |
| `.codex/agents/qa.toml` | Unabhängige Prüfung von Tests, Performance und Datensicherheit; keine eigenmächtigen Implementierungsfixes oder behaupteten Browsererfolge. |
| `.codex/agents/documentation.toml` | Status, Architektur, bestätigte Entscheidungen, Änderungen und Anleitungen; keine neuen Produktentscheidungen. |
| `agents/*.md` | Vorhandene fachliche Rollenbriefe als Grundlage; werden von den Rollen ausdrücklich referenziert. |
| `AGENTS.md` | Gemeinsame Phasensperre, Freigabegrenzen und Delegationsregeln. |

Der Tech Lead behält Koordination und Integration. Jede spätere Delegation benennt Ziel, erlaubte Dateien, Abnahmekriterien und Grenzen. Kein gemeinsames Dokument gleichzeitig bearbeiten. Spezialisten delegieren nicht weiter. Änderungen an Produktentscheidungen bleiben beim Product Owner. Persönliche Vaults, produktive Daten, Installationen und Veröffentlichung sind nicht autorisiert.

## Wichtigste Einstellungen

| Einstellung | Wirkung in dieser Einrichtung |
| --- | --- |
| `[agents].enabled = true` | Projektbezogene Subagenten aktiviert, sofern die verwendete Laufzeit diese Datei lädt. Kein automatischer Start und keine Arbeitsfreigabe für beliebige Aufgaben. |
| `max_concurrent_threads_per_session = 2` | Höchstens zwei gleichzeitig offene Subagenten-Threads, Lead ausgenommen. Erst nach Aktivierung relevant. Standardvorgehen: nur einen Spezialisten für einen begrenzten Auftrag einsetzen. |
| `name` | Eindeutiger Rollenname; hier identisch mit dem Dateinamen ohne `.toml`. Später bei Delegation genau diesen Namen verwenden. |
| `description` | Kurze Beschreibung zur Auswahl der passenden Rolle. |
| `developer_instructions` | Rollenauftrag, Grenzen und Berichtsformat; verweist auf gemeinsamen Projektvertrag und Rollenbrief. |
| `model` / `model_reasoning_effort` bewusst ausgelassen | Modell und Denkaufwand werden grundsätzlich vom Lead geerbt; es wird kein zusätzliches Modell vorausgesetzt. Diese Vererbung garantiert keine niedrigeren Kosten. |

Rechte/Sandbox und Freigabepolitik werden vom Elternprozess geerbt; Rollentexte bilden keine separate technische Dateizugriffssperre. Es gibt keine zugesicherte Schreibisolation je Spezialist. Keine Rollendatei erweitert Rechte. Die Konfiguration wirkt nur, wenn die konkrete Laufzeit sie tatsächlich lädt; Projektregeln erlauben derzeit ausschließlich den begrenzten QA-Auftrag.

Tokens sparen wir durch kleine Aufgaben, gezielte Dateilektüre, maximal zwei offene Spezialisten, kurze deutsche Ergebnisberichte und keine automatische Unterdelegation. Es ist kein hartes Tokenbudget konfiguriert. Modelle, Denkaufwand und Limit können später ausdrücklich angepasst werden; derzeit keine Modellmigration oder Kostenannahme.

## Ursprüngliche Gültigkeitsprüfung (vor Aktivierung)

- Alle fünf TOML-Dateien mit dem bereits installierten `pip._vendor.tomli` unter Python 3.10 syntaktisch geparst; nichts installiert.
- Für alle vier Rollen: genau die drei vorgesehenen Pflichtfelder als nichtleere Strings, eindeutige erwartete Namen und Übereinstimmung mit Dateinamen geprüft. Projektkonfiguration: Sperre `false` und Limit `2` geprüft.
- `codex --strict-config app-server --print-startup-config` erfolgreich: Startkonfigurationsprüfung durch CLI 0.166.0, kein App-Server oder Agent gestartet. Ausgabe bestätigt `appServerVersion: 0.166.0`.
- Anfangs scheiterte diese Prüfung im eingeschränkten Prozess mit „Could not find home directory“; nach genehmigter Ausführung außerhalb der Sandbox erfolgreich. Keine globale Konfiguration bearbeitet oder in die Projektdokumentation kopiert.
- `git diff --check` ohne Fehler; nur Git-Hinweise zur LF/CRLF-Konvertierung vorhandener Dateien.

**Grenze des Nachweises:** TOML-/Pflichtfeldprüfung und erfolgreiche Startprüfung ersetzen keinen Rollen-Ladetest. Die Startausgabe listet weder entdeckte Rollen noch wirksame Projektwerte auf. Projektvertrauen, Übernahme durch die konkrete Desktop-/IDE-Laufzeit, Rollenauflösung und tatsächliche Vererbung wurden nicht durch Agentenstart geprüft. Es wurde bewusst kein Testauftrag gestartet. Anwendungscode und synthetische Fixtures blieben in diesem Arbeitspaket unverändert.

## Erster Delegationstest: blockiert, kein Erfolg

PO-Freigabe: nur `qa` soll AGENTS.md, STORAGE_SPIKE.md und PROJECT_STATUS.md lesend prüfen, drei wichtigste Qualitätsrisiken und die nächste sinnvolle Prüfung nennen. Keine Dateien ändern, Tests ausführen oder weiteren Agenten starten.

Ergebnis der Schnittstellenprüfung:

- Die verfügbare `collaboration.spawn_agent`-Schnittstelle kennt `task_name`, `message`, `fork_turns` und Modell-/Denkaufwandoptionen, aber keinen Selektor für die registrierte Projektrolle. `task_name = qa` wäre nur ein Aufgabenname und kein Nachweis, dass `.codex/agents/qa.toml` geladen wurde.
- Zur Prüfung der vorhandenen Alternative wurde das Protokollschema der installierten Codex-CLI in einem temporären Ordner erzeugt und danach automatisch entfernt. `ThreadStartParams`/`TurnStartParams` enthalten keinen direkten Parameter für eine benannte Custom-Rolle. Ein zusätzlicher allgemeiner Lead-Prozess mit Modellauftrag zum Weiterdelegieren wurde nicht gestartet.
- Deshalb **kein `spawn_agent`-Aufruf, kein eigener QA-Subagent, keine geladene QA-Rollenkonfiguration und keine QA-Ergebnisse**. Es gab keinen Laufzeitfehler eines gestarteten QA-Threads; der Start war bereits durch die fehlende Rollenauswahl blockiert. Kein Ersatzreview durch Lead als QA-Erfolg ausgegeben.
- Die Projektdatei ist aktiviert; das ist kein Nachweis ihrer Übernahme durch diese bereits laufende Sitzung. Anwendungscode, Fixtures und persönliche Vaults wurden nicht verändert; keine Storage-Tests ausgeführt.

Developer-Konfiguration und Rollenbrief wurden um die freigegebenen Bedienungsanforderungen ergänzt; QA-Konfiguration und Rollenbrief um Langzeitstabilität, Memory Leaks und schleichende Performanceverschlechterung. REQUIREMENTS.md enthält Anforderungen, Abnahmegrenzen und die ausdrückliche Implementierungssperre.

Abschließend nach Aktivierung: alle fünf TOML-Dateien erneut erfolgreich geparst, `enabled = true` und Limit zwei geprüft; strenge Codex-Startprüfung mit Version 0.166.0 und `git diff --check` erfolgreich (nur Git-Zeilenendenhinweise). Dies sind Konfigurationsprüfungen durch Lead, keine QA- oder Anwendungstests und kein Rollen-Ladenachweis.

## Nächster Schritt nach weiterer Freigabe

Die verwendete Codex-Oberfläche/Laufzeit benennen und eine frische Projektsitzung öffnen, welche registrierte Custom-Rollen tatsächlich als Delegationsoption anbietet. Dort vor einem Start nachweisen, dass `qa` aus `.codex/agents/qa.toml` verfügbar ist. Dann auf ausdrücklichen Auftrag ausschließlich den bereits formulierten lesenden QA-Auftrag einmal delegieren und Rollenquelle/Thread-ID dokumentieren. Falls weiterhin kein Rollen-Selektor verfügbar ist, nicht auf einen allgemeinen Agenten ausweichen. Keine globalen Änderungen oder Installation ableiten.

Aktuell stoppen und auf PO-Rückmeldung warten. Aktivierung und Limit bleiben wie freigegeben bestehen. Phase 2 und alle weiteren Entwicklungsaufträge bleiben gesperrt.

## Historische Review-Anleitung (durch aktuelle Freigabe abgelöst)

1. Gemeinsam mit ChatGPT diese Anleitung, `.codex/config.toml` und die vier Rollen-TOMLs prüfen: Zuständigkeiten, Grenzen, Limit zwei, Modellvererbung und Berichtsformat.
2. Gewünschte Anpassungen nennen oder die Konfiguration ausdrücklich freigeben. **Bis dahin nichts aktivieren und keine Agentenaufträge erteilen.**
3. Nach Freigabe separat entscheiden, ob ein rein lesender Rollen-Ladetest stattfinden darf. Dafür die verwendete CLI-/App-/IDE-Laufzeit benennen. Erst dann `enabled` im Projekt auf `true` ändern und gegebenenfalls die Projektsitzung neu laden; Projektvertrauen in dieser Laufzeit prüfen. Keine globalen Einstellungen dafür ungeprüft ändern.
4. Ein später ausdrücklich freigegebener Ladetest soll je Rolle nur Namen und gelesene Grenzen zurückmelden, keine Dateien ändern und keine Entwicklung starten. Erfolgreiche Rollenauflösung dokumentieren, bevor Entwicklungsaufträge delegiert werden. Phase 2 braucht weiterhin eigene Freigabe.

Abnahme der ursprünglichen Einrichtung: vier bearbeitbare Projektdefinitionen, gültiges TOML, dokumentierte Einstellungen und Grenzen, keine Agentenstarts, keine Anwendungscodeänderung. Das Review ist inzwischen grundsätzlich erfolgt; der erfolgreiche echte QA-Rollenstart bleibt offen. Das bekannte Storage-Schreibrennfenster bleibt eine separate Produktentscheidung.

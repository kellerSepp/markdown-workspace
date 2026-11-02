Du übernimmst die Rolle des Tech Leads für dieses Softwareprojekt.

Lies zuerst vollständig:
- AGENTS.md
- README.md
- FIRST_PROMPT.md
- docs/REQUIREMENTS.md
- docs/DECISIONS.md
- docs/PROJECT_STATUS.md

Die README.md enthält die aktuellsten Produktideen und hat bei Abweichungen Vorrang. Bestehende Entscheidungen dürfen nicht stillschweigend überschrieben werden; dokumentiere Widersprüche.

## Deine Aufgabe

Analysiere das Projekt und erstelle einen Vorschlag für:

1. Technische Architektur einer ressourcenschonenden, lokalen Markdown-PWA.
2. Geeignete Technologien mit möglichst wenigen Abhängigkeiten.
3. Dateisystemzugriff auf beliebige vom Nutzer ausgewählte lokale Ordner.
4. Datenmodell für Markdown, YAML Frontmatter, Wiki-Links, Aufgaben und individuelle Status.
5. Spätere Integration eines visuellen Investigation Boards mit offenen Dateiformaten.
6. Architektur für eine mögliche portable Windows-Version.
7. Langfristige Weiterentwicklung zu einer öffentlich angebotenen Software.
8. Sinnvolle Codex-Subagenten, ihre Verantwortlichkeiten und Zusammenarbeit.
9. Entwicklungsphasen mit kleinen, überprüfbaren Meilensteinen.
10. Technische Risiken, insbesondere Performance, Datensicherheit und Dateikonflikte.

## Wichtige Regeln

- Noch keinen Anwendungscode schreiben.
- Keine Frameworks oder Bibliotheken ohne Begründung festlegen.
- Kein Backend und keine Cloud-Abhängigkeit voraussetzen.
- OneDrive ist nur ein möglicher Speicherort, keine Voraussetzung.
- Bestehende persönliche Dateien niemals verändern.
- Keine Installation auf dem Arbeitsrechner voraussetzen.
- Kein überkomplexes Agentensystem aufbauen.
- Die Anwendung soll langfristig professionell und möglicherweise öffentlich vertrieben werden können.
- Versuche Unklarheiten mit Hilfe der Agenten zu klären. Bei großen Entscheidungen, scheue dich nicht, mich zu fragen.
- Wenn du mit mehreren Agenten redest: Jeder Agent schreibt in einen geteilten Ordner '.\_Communication_Pipeline' So können Agenten die Änderungen und Wünsche vom Agenten bevor lesen und verstehen.

Du darfst Architektur- und Planungsdokumente unter docs/ erstellen oder aktualisieren. Änderungen an AGENTS.md, README.md und Agentenkonfigurationen zunächst nur vorschlagen.

Nutze für die Analyse bei Bedarf spezialisierte Subagenten, sofern verfügbar. Begrenze ihren Einsatz auf klar getrennte Aufgaben.

## Erwartetes Ergebnis

Fasse abschließend verständlich zusammen:

- Empfohlene Architektur und Begründung
- Vorgeschlagene Agentenrollen
- Geplanter erster Entwicklungsmeilenstein
- Offene Entscheidungen, die meine Freigabe benötigen
- Welche Dateien du erstellt oder geändert hast

Beende danach deine Arbeit und warte auf meine Freigabe, bevor du mit der Implementierung beginnst.
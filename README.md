# Markdown Workspace (Arbeitstitel)

Minimalistischer, lokaler Markdown-Workspace, inspiriert von Org-mode, Obsidian, Taskwarrior und Logseq.

## Status

**Phase 1: Storage-Spike.** Technisches Wegwerfexperiment, keine Produktanwendung. Start: `python spike/serve.py`, dann in Edge `http://127.0.0.1:8765`. Ausschließlich synthetische Ordner unter `test-vault` auswählen. [Testanleitung und Risiken](docs/STORAGE_SPIKE.md). Edge-Abnahme offen; Phase 2 nicht begonnen.

## Prinzipien

- Windows + Microsoft Edge als erster Zielbrowser, später PWA
- keine klassische Softwareinstallation als Voraussetzung für die Nutzung
- kein ständig laufender Backendserver, keine Cloudpflicht
- Vault kann in jedem geeigneten lokalen Ordner liegen; OneDrive ist optional
- Markdown-Dateien bleiben maßgebliche Datenquelle
- klassischer Editor mit einklappbaren Abschnitten und ausgewählten Blockfunktionen
- Fokus auf geringer CPU/RAM-Last, schnelle Wiederaufnahme nach Inaktivität
- nie mit produktiven Notizen testen

## Inspirationsgedanken
 - keine aufgedunsenen UIs. Das Produkt soll nicht für auf Schönheit fokusierte User gemacht sein. Bsp. keine Apple user, keine Tech Analphabeten wo die Usability auf "klicke auf neu"->"Schreibe Titel in extra Textfeld"->Beschreibung extra textfeld->Status extra feld und alles wird durch Klicks erstellt. Microsoft Planner ist ein gutes Beispiel für: "So nicht", OneNote ist ein gutes Beispiel für "So nicht"


### Positive Vorbilder

- **Org-mode:** Strukturierte Notizen, flexible Aufgabenstatus, Agenda, Zeitplanung, Journaling und weitreichende Anpassbarkeit.
- **Obsidian:** Lokale Markdown-Dateien, Wiki-Links, Backlinks, Plugins, schnelle Navigation und langfristige Datenunabhängigkeit. 
- **Taskwarrior:** Effiziente Aufgabenverwaltung, Filter, Prioritäten und individuelle Workflows.
- **Logseq:** Verknüpfte Notizen, Journaling, Referenzen und hierarchische Inhalte.

### Negative Vorbilder – So nicht!

- **Microsoft OneNote:** Keine ausreichend offene, dateibasierte Verwaltung der Inhalte. Zu starke Bindung an das eigene Ökosystem.
- **Microsoft Planner:** Zu eingeschränkte Anpassbarkeit, starre Aufgabenverwaltung und unzureichende Möglichkeiten, Aufgaben direkt mit eigenen Notizen und Dokumentationen zu verknüpfen.

### Investigation Board / Visual Workspace

Eine optionale, zuschaltbare visuelle Ansicht zur Organisation und Verknüpfung von Notizen, Aufgaben und Medien, inspiriert von klassischen Investigation Boards und Obsidian Canvas.

**Geplante Funktionen:**

- Umschalten zwischen klassischer Markdown-Ansicht und visuellem Board
- Projektbezogene Boards mit frei positionierbaren Karten
- Karten verschieben, skalieren, gruppieren und farblich markieren
- Markdown-Notizen, Bilder, Artikel, PDFs und Textausschnitte einbinden
- Karten durch beschriftete, gerichtete Verbindungen miteinander verknüpfen
- Beziehungen sowohl grafisch als auch textbasiert bearbeiten
- Projektzuordnungen und semantische Beziehungen in YAML Frontmatter speichern
- Layoutdaten getrennt vom Notizinhalt speichern, vorzugsweise in einem offenen Format wie JSON Canvas
- Bestehende Markdown-Notizen ohne Datenmigration verwenden
- Keine permanente Hintergrundberechnung oder ressourcenintensive Darstellung

**Grundprinzip:** Das Board ist lediglich eine alternative Darstellung der bestehenden Daten. Markdown-Dateien bleiben die maßgebliche Quelle für Notizinhalte und semantische Beziehungen.

**Priorität:** Spätere Entwicklungsphase. Die Architektur soll diese Funktion von Anfang an berücksichtigen, ohne die Entwicklung des grundlegenden Editors und Aufgabenmanagements zu verzögern.

### Grundprinzip

Das Ziel ist nicht, eines dieser Programme vollständig nachzubauen, sondern ihre besten Konzepte in einer schnellen, minimalistischen und flexibel erweiterbaren Anwendung zu vereinen.

**Die Anwendung soll sich dem Arbeitsablauf des Nutzers anpassen – nicht umgekehrt.**

Siehe `docs/REQUIREMENTS.md` und `docs/PROJECT_STATUS.md`.

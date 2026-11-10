# Markdown Workspace · Alpha

Minimalistischer, lokaler Markdown-Workspace, inspiriert von Org-mode, Obsidian, Taskwarrior und Logseq.

## Aktueller Stand

**Private Alpha für erste praktische Erfahrung.** Der Workspace läuft im Browser und arbeitet mit Markdown-Dateien in einem ausdrücklich gewählten lokalen Vault. Ein separater privater Arbeitsvault ist freigegeben; die Anwendung ist noch kein abschließend abgesichertes Produkt.

Bereits verfügbar:

- Markdown-Editor mit H1–H6, Folding, Org-artiger Überschriften-/Listensteuerung und Undo/Redo
- Textformatierung und die Themes Midnight, Terminal, Nord und Paper
- Command Registry, durchsuchbare Palette, Kontextmenü und Emacs-artige Tastensequenzen
- Dateiöffnung und leere Markdown-Dateianlage über eine Pfadeingabe mit Tab-Vervollständigung
- Dateilokale TODO-Workflows mit offenen und abgeschlossenen Zuständen
- Checklisten mit Markerklick, C-c C-c, verschachtelten Elternzuständen und Fortschrittszählern ([Bedienung/Probe](docs/CHECKLISTS.md))
- SCHEDULED und DEADLINE mit Datum, optionalen Uhrzeiten und Zeitfenstern
- Vaultweiter Agenda-Index, deutsche ISO-Wochenagenda und TODO-Liste mit Quellnavigation
- Explizites Speichern, Konfliktprüfung, Sicherungen im Vault und Browser-Entwürfe

## Starten

Die veröffentlichte **GitHub-Pages-Seite in Microsoft Edge** öffnen, den Alpha-Nutzungshinweis bestätigen und über **„Vault wählen“** den gewünschten Ordner freigeben. Für die Nutzung der veröffentlichten Seite ist kein lokaler Entwicklungsserver erforderlich.

Für einen lokalen Start aus diesem Repository wird Node.js benötigt; die vorhandene Pages-Pipeline verwendet Node.js 22:

```powershell
npm ci
npm start
```

Anschließend in Edge **http://127.0.0.1:8766** öffnen. Strg+C im Terminal beendet den lokalen Server. Ein separater Build ist mit `npm run build` möglich.

Die Pages-Pipeline baut und veröffentlicht `dist`. Private Vaults außerhalb des öffentlichen Repositories halten und nicht in Git aufnehmen. Die Wahl eines lokalen Vaults in der Anwendung ist keine Git-Veröffentlichung.

## Eigenen Vault wählen

Der Vault muss **nicht** unter `test-vault/alpha-acceptance` liegen. Dieser Ordner enthält lediglich synthetische Beispiele für die Abnahme. Einen eigenen Ordner an beliebiger vom Browser zugelassener Stelle anlegen und über „Vault wählen“ öffnen, beispielsweise `D:\Notizen\MeinVault`.

Auch ein lokal verfügbarer **OneDrive-Ordner** ist als privater Alpha-Vault vorgesehen, sofern Edge den Zugriff erlaubt. **OneDrive ist noch nicht praktisch geprüft.** Dateien lokal verfügbar halten, die Synchronisation während der Bearbeitung pausieren und ein unabhängiges Backup verwenden. Synchronisation und Sicherungen im selben Vault ersetzen kein unabhängiges Backup.

Für den Alpha-Betrieb gilt: **ein Editor pro Vault**. Dieselben Dateien nicht parallel in anderen Tabs oder Programmen bearbeiten. Entwicklungsagenten und QA verwenden weiterhin ausschließlich synthetische Testdaten.

## Wichtige Tastensequenzen

Bei `C-c` zuerst **Strg+C** drücken, anschließend **C und Strg loslassen** und die Folgetaste ohne Modifier drücken. Die Präfixfolgen gelten im fokussierten Editor; Mausknöpfe und Palette bieten zusätzliche Einstiege.

| Taste / Folge | Funktion |
| --- | --- |
| `C-c f` | Datei öffnen/anlegen; Tab vervollständigt den Vault-relativen Pfad |
| `C-c a`, danach `a` | Wochenagenda öffnen |
| `C-c a`, danach `t` | TODO-Liste öffnen |
| `C-c t` | Status der aktuellen Aufgabenüberschrift wählen |
| `C-c C-c` | Checkbox umschalten, Headingzähler aktualisieren oder SEQ_TODO-Regeln laden (zweites C mit Strg) |
| `C-c s` / `C-c d` | SCHEDULED / DEADLINE bearbeiten |
| `Alt+X` | Command Palette öffnen |
| `Strg+S` | Aktuelle Datei ausdrücklich speichern |

In der Pfadeingabe zeigt die Vorschau **„Öffnen“** oder **„Neue Datei anlegen“**. Enter führt aus, Escape beziehungsweise Strg+G bricht vor der Ausführungsphase ab. Neue Dateien werden zunächst leer angelegt; Inhalte anschließend mit Strg+S speichern. Eine fehlende Endung wird als `.md` ergänzt. Unterordner müssen bereits existieren; automatische Ordneranlage gehört noch nicht zum Umfang.

In der Wochenagenda wechseln `f`/`b` die Woche, `.` springt zur aktuellen Woche. Die Agenda steht im unteren Panel; die Trennlinie verändert den zunächst hälftigen Editor-/Agenda-Split. `Shift+F` oder der Follow-Schalter aktiviert/deaktiviert automatisches Folgen der Auswahl im Editor. Der Fokus bleibt dabei in der Agenda. Der obere Editor bleibt bei sichtbarer Agenda bearbeitbar; Schreiben, Undo/Redo und Speichern sind möglich. Beim Wechsel in den Editor werden ausstehende Follow-Sprünge verworfen. Enter öffnet die Quelle und wechselt in den Editor, `r` liest neu ein und `q`/Escape schließt mit Rückkehr zum Editor. Vor einem Quellsprung oder der Ausführung im Dateidialog ungespeicherte Arbeit ausdrücklich speichern. Die Agenda zeigt weiterhin den gespeicherten Indexstand, keine ungespeicherten Texte. Details und Handprobe: [Agenda Follow](docs/AGENDA_FOLLOW.md).

## Prüfstand und bekannte Grenzen

Die Checklisten wurden mit 422 Tests und einem erfolgreichen Build geprüft. Alt+Shift+Enter konvertiert den aktuellen Listenpunkt, setzt Überschriften mit einem TODO gleicher Ebene fort oder erstellt auf leerer Zeile ein TODO. Bruch- und Prozentzähler können gemeinsam verwendet werden. [Anleitung mit synthetischem Probevault](docs/CHECKLISTS.md)

Letzter dokumentierter Stand: **324/324 Tests** bei Developer und unabhängiger QA, Build erfolgreich; zusätzlich **13 unabhängige QA-Prüfgruppen** für Alpha/Dateieinstieg. Das sind automatisierte Modell- und Integrationstests. Native Edge-/Permission-/Zoom-/AltGr-/IME- sowie mehrstündige Stabilitätsnachweise sind noch offen.

Eine externe Änderung zwischen letzter Konfliktprüfung und Schreiben kann weiterhin überschrieben werden. Single-Editor-Betrieb reduziert dieses Risiko, beseitigt es aber nicht technisch. Browser-Entwürfe und `.storage-spike-backups` im Vault sind zusätzliche Sicherungen, kein unabhängiges Backup. Externe Änderungen werden über explizites erneutes Einlesen übernommen; die Agenda zeigt gespeicherte Dateien, keine ungespeicherten Editoränderungen.

Die Dateifunktion unterstützt Markdown in vorhandenen sichtbaren Ordnern. Offline-Neustart/PWA, wiederkehrende Termine, Benachrichtigungen, Match-/Suchansichten und das visuelle Board sind noch nicht implementiert.

## Dokumentation

- [Alpha-Einstieg, Grenzen und konkrete Testanleitung](docs/ALPHA.md)
- [Alle Befehle und Tastenkürzel](docs/COMMAND_GAMEBOOK.md)
- [Agenda und manuelle Abnahme](docs/M7B_AGENDA.md)
- [Dateiöffnung und Dateianlage](docs/PLAN_FIND_FILE.md)
- [Aktueller Projektstatus und historische Abschlüsse](docs/PROJECT_STATUS.md)
- [Anforderungen](docs/REQUIREMENTS.md)

## Prinzipien

- Windows + Microsoft Edge als erster Zielbrowser, später PWA
- keine klassische Softwareinstallation als Voraussetzung für die Nutzung
- kein ständig laufender Backendserver, keine Cloudpflicht
- Vault kann in jedem geeigneten lokalen Ordner liegen; OneDrive ist optional
- Markdown-Dateien bleiben maßgebliche Datenquelle
- klassischer Editor mit einklappbaren Abschnitten und ausgewählten Blockfunktionen
- Fokus auf geringer CPU/RAM-Last, schnelle Wiederaufnahme nach Inaktivität
- Entwicklung und QA ausschließlich mit synthetischen Daten; private Alpha-Erprobung bewusst getrennt davon

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

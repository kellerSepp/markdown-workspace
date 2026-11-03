# Architekturvorschlag – zur Freigabe

## Freigegebener Abschnitt: Phase 2 M1 (2026-11-03)

Native Weboberfläche und CodeMirror 6, ein aktives Markdown-Dokument. Editor meldet Textänderungen an einen separaten Storage-Adapter; nur dieser verwaltet Datei-Handles, Rohbytes, Entwürfe, Konflikte und Sicherungen. Der geprüfte Schreibpfad aus `spike/storage.mjs` bleibt Grundlage. Kein Markdown-/YAML-Parser oder neues Datenmodell.

UTF-8 wird strikt gelesen; BOM und unberührte Zeilenenden müssen trotz normalisierter Editoransicht erhalten bleiben. Neue Zeilen verwenden einen aus der Datei abgeleiteten Stil. Ungültiges UTF-8 blockiert das Öffnen statt verlustbehafteter Umwandlung. Browserentwürfe sind kein unabhängiges Backup.

Grenze: synthetische Testdaten; das externe Schreibrennen ist hierfür akzeptiert. Sicherungen bleiben separat im Test-Vault ohne automatische Löschung. Keine Garantie für OS-Dateimetadaten. Abnahme: Öffnen/Bearbeiten/Speichern, No-op, Konflikt und Fehler mit Entwurfserhalt automatisiert prüfen; echte Edge-, QWERTZ-, Idle- und Performanceprüfung separat kennzeichnen. Frühere Sperren im folgenden historischen Vorschlag gelten nicht für M1.

Aktualisierung 2026-11-03: Phase 0 wurde geprüft/freigegeben, Phase 1 separat autorisiert (DECISIONS.md). Der Storage-Spike verwendet native Module, Bytevergleiche, IndexedDB-Entwürfe, verifizierte Rohbytesicherungen und ein originweites Web Lock. Keine Parser-/Editorwahl abgeleitet. Abnahme und Grenzen: [STORAGE_SPIKE.md](STORAGE_SPIKE.md). Das automatisiert reproduzierte externe Schreibrennen verhindert weiterhin eine Aussage „kein Datenverlust“; vor Phase 2 Speicherstrategie entscheiden. Browsernachweis noch offen.

Stand: 2026-11-02. Alle folgenden technischen Entscheidungen sind Vorschläge. Bestätigte Produktentscheidungen bleiben unverändert in DECISIONS.md.

## Aufbau und Technologien

Empfehlung: statische Edge-Webanwendung ohne Backend. Oberfläche, Dokumentmodell, abgeleiteter Index und Dateizugriff als getrennte Module. Ein Storage-Adapter ermöglicht später den Wechsel von Browser- zu nativen Dateioperationen. Keine vorsorgliche Pluginplattform.

| Option | Vorteil | Grenze / Empfehlung |
| --- | --- | --- |
| Native Weboberfläche + CodeMirror 6 | Modularer klassischer Editor, Erweiterungen für Markdown und Faltung | Bevorzugter Kandidat nach Storage-Spike; Pakete und Buildwerkzeug erforderlich, Größe und RAM messen |
| Native Weboberfläche + Textfeld | Sehr kleines Dateizugriffsexperiment | Für Spike geeignet; Faltung und Syntaxhervorhebung würden später erheblichen Eigenbau erfordern |
| UI-Framework + CodeMirror | Struktur bei wachsender Oberfläche | Zusätzliche Abhängigkeiten; erst bei nachgewiesenem Bedarf |

Spike mit Browser-JavaScript und nativen APIs; später TypeScript als Kandidat für überprüfbare Modulgrenzen. Markdown-/YAML-Parser und sichere Vorschau separat auswählen, keinen vollständigen Parser selbst bauen. Keine Pakete oder Versionen beschlossen.

Abnahme: Fachmodell ohne UI prüfbar; Dateiadapter austauschbar. Grenze: kein Framework und kein Backend in Phase 0.

## Theme-System: Architekturvorschlag zur weiteren UI-Planung

Die Produktanforderungen in REQUIREMENTS.md sind bestätigt; folgende technische Ausgestaltung bleibt Vorschlag bis zur Umsetzungsfreigabe:

- Eine gemeinsame semantische Token-Schicht für UI und CodeMirror: etwa Flächen, Text, Akzent, Fokus, Auswahl, Fehler, Rahmen, Schriftfamilie/-größe und Syntaxrollen. CSS-Variablen für die Oberfläche und eine austauschbare CodeMirror-Theme-Konfiguration aus denselben validierten Werten ableiten. Vorteil: konsistente Paletten ohne Editor-Neuaufbau; Aufwand: Zustände und Syntaxrollen vollständig abdecken.
- Versioniertes JSON mit begrenzten bekannten Feldern und typisierten Werten. Importgröße, Wertebereiche und erlaubte Schriftangaben begrenzen; keine Skripte, HTML, frei formulierbaren CSS-Regeln, URLs oder externen Schrift-/Bildabrufe. Nur geprüfte Tokens übernehmen, unbekannte Formatversionen verständlich ablehnen. Vorteil: datenbasierter Import; Grenze: keine beliebige Skinbeschreibung im ersten Format.
- Theme-Verwaltung getrennt von Editorinhalt und Storage halten. Ein Wechsel aktualisiert ausschließlich Darstellung, erhält Undo, Fokus und Auswahl und schreibt keine Markdown-Datei. Lokale Auswahl außerhalb des Vaults speichern; bei ungültiger Einstellung oder fehlendem Theme auf ein mitgeliefertes Basistheme zurückfallen.
- Nur aktive Palette anwenden; keine Hintergrundschleifen. Mitgelieferte Paletten lokal bündeln. Aufwendige Skins später als eigene Darstellungsschicht mit gleichem Token-Vertrag planen; keine Pluginplattform ableiten. Feuer/Lava oder Terminalästhetik zunächst statisch, keine Effektengine.

Abnahme: Kriterien in REQUIREMENTS.md, einschließlich unverändertem Dokumenttext beim Wechsel, sicherem JSON-Rundlauf, lokalem Neustart und lesbaren Zuständen. Vor Umsetzung Token-/JSON-Schema, erste Paletten, Kontrastgrenzen und Messmethode konkret zur Prüfung vorlegen. Theme-Editor/Live-Vorschau und Skins folgen in separaten Abschnitten; öffentliche Assets erst nach geklärter Herkunft/Lizenz. Dieser Vorschlag ändert keinen Anwendungscode.

## Dateizugriff und Bereitstellung

File System Access API mit expliziter Ordnerauswahl empfohlen. „Beliebiger Ordner“ heißt jeder vom Browser erlaubte, vom Nutzer gewählte Ordner; geschützte Ordner und Richtlinien bleiben Grenzen. Handles in IndexedDB speichern, Berechtigung beim Wiedereinstieg prüfen und nötigenfalls nach Nutzeraktion neu anfordern. Dauerhafte Freigabe nicht garantieren.

Alternativen: Import/Download bietet keinen gleichwertigen Vault-Zugriff; OPFS ist privater Browserspeicher und kein frei gewählter Ordner. Ein nativer Adapter bleibt eine spätere Option.

Markdown-Dateien sind führend. IndexedDB enthält wiederaufbaubare Indizes und getrennt gekennzeichnete Entwürfe zur Wiederherstellung. Browserdaten können gelöscht werden und ersetzen kein Backup.

PWA-Vorschlag: statisches HTTPS-Hosting für Erstaufruf und Updates, Offline-Start anschließend über Service Worker. Keine Notizen hochladen, keine externen Laufzeit-CDNs. Hosting ist eine externe Bereitstellungsabhängigkeit und braucht Freigabe. Für den Spike alternativ kurzzeitig localhost mit festem Origin und vorhandener Laufzeit; kein dauerhaftes Produktbackend. Doppelklick auf eine HTML-Datei ist keine verlässliche PWA-Strategie.

Abnahme: Rechteverlust verständlich behandeln; Reload/Browserneustart und später Offline-Neustart auf dem tatsächlichen Gerät prüfen. Grenze: kein Offline-Erststart ohne Bereitstellung und kein Umgehen von Richtlinien.

## Dateisicherheit und Performance

Zunächst explizites Speichern. Ladeinhalt und Hash merken, unmittelbar vor Schreiben frisch lesen und vergleichen. Bei Abweichung Ersetzung blockieren, beide Fassungen zugänglich halten. Pro Datei Schreibvorgänge serialisieren, eigene Tabs koordinieren. Erfolg erst nach abgeschlossenem Schreibstream und erneutem Lesen melden. Entwurf bei Fehler erhalten. Vor Ersetzung eine separat abzustimmende Wiederherstellungskopie vorsehen; scheitert die Sicherung, Ersetzung blockieren.

Prüfung und Schreiben sind gegenüber externen Programmen keine gemeinsame Transaktion. Eine Änderung genau dazwischen bleibt ein Risiko; auch erneutes Lesen verhindert spätere Sync-Überschreibung nicht. Keine garantierte atomische Umbenennung voraussetzen. Der Spike muss dieses Restfenster untersuchen. Ist absoluter Schutz bei beliebiger Parallelbearbeitung zwingend, reicht der Browseransatz dafür nicht als Nachweis; Speicherstrategie vor Produktumsetzung erneut entscheiden.

Aktive Datei bei Fokuswechsel, Öffnen und vor Speichern prüfen. Vault-Aktualisierung manuell bzw. in kleinen abbrechbaren Paketen; keine permanenten Vollscans oder Abhängigkeit von experimentellen Dateiwächtern. Nur nötige Inhalte im RAM, größere Indexarbeit später im Worker. OneDrive ist optional; keine Tests in persönlichen oder synchronisierten Ordnern ohne gesondert genehmigte Testumgebung.

Abnahme: erkannte Konflikte verhindern Ersetzung, Fehler melden keinen Erfolg, Wiederherstellung wird geprüft. Grenze: kein eigenes Sync-System und kein verteiltes Locking.

## Datenmodell und Syntaxvorschläge

- Notiz: relativer Vault-Pfad, Markdown-Rohtext, optional YAML Frontmatter. Unbekannte Felder, Zeilenenden und unberührte Textbereiche erhalten. Ungültiges YAML melden; strukturierte Änderungen blockieren, Rohtext zugänglich halten.
- Anfangs Pfade als Identität; optionale stabile IDs erst für dauerhafte Referenzen. Keine automatische Massenmigration. Umbenennungen sichtbar behandeln.
- Wiki-Links: `[[pfad/notiz]]`, später Anzeigename/Überschrift. Exakten Pfad bevorzugen, Kurzname nur bei Eindeutigkeit; ungelöste Ziele anzeigen. Tags/Backlinks aus Text ableiten, Codeblöcke ausschließen.
- Illustrative Aufgabe: `- [ ] DOING Text [scheduled:: 2026-11-03] [due:: 2026-11-05]`. Checkbox für offen/erledigt, Status für Workflow; Widersprüche melden. Statusliste und Abschlussstatus in offener versionierter Vault-Konfiguration. Keine behauptete Logseq-Kompatibilität.
- Aufgabe intern: Notizpfad, Textbereich, Status, Termin, Deadline, optionale Priorität. Zeilenposition ist keine dauerhafte Aufgaben-ID.
- Datum zunächst ISO-Kalendertag; Termin bedeutet eingeplant, Deadline spätestens fällig. Uhrzeiten/Zeitzonen später entscheiden. Journalvorschlag: `journal/YYYY-MM-DD.md`.
- Projektverweise und typisierte semantische Beziehungen optional im YAML. Suche, Agenda und Backlinks müssen vollständig aus Dateien neu aufbaubar sein.

Abnahme: Dateien außerhalb der App lesbar, Neuindexierung liefert gleiche Ergebnisse, unbekanntes YAML übersteht gezielte Änderungen. Grenze: Syntax vor Phase 3 freigeben, kein Org-mode-/Logseq-Komplettparser.

## Investigation Board

Später separat laden und nur bei sichtbarer Ansicht rendern. JSON Canvas als offener Layoutkandidat für Positionen, Größen, Gruppen und visuelle Kanten. Inhalte und fachliche Beziehungen bleiben in Markdown/YAML. Fachliche Kanten daraus ableiten und über dieselben Modelloperationen ändern; rein visuelle Kanten nur im Layout speichern. JSON Canvas definiert keine YAML-Semantik; Zuordnung separat spezifizieren. Medien relativ referenzieren; externe Inhalte nicht automatisch laden.

Abnahme: Layoutdatei entfernen beeinträchtigt keine Notiz; bestehende Notizen ohne Migration verwenden; fachliche Beziehung textuell/grafisch konsistent. Grenze: kein Board im ersten MVP und keine Hintergrund-Graphberechnung.

## Portable Windows-Version und öffentliche Software

UI/Fachmodell wiederverwenden, nativen Dateiadapter ergänzen. Tauri/WebView2 als Kandidat; Electron als Alternative mit mitgelieferter Browserlaufzeit und entsprechendem Paketaufwand. Portable Nutzung separat beweisen: vorhandenes WebView2 oder mitgelieferte feste Runtime, Richtlinien, Schreiborte und Updates. Kleine EXE bedeutet nicht automatisch kleinen Gesamtbedarf. Keine Desktoplaufzeit beschlossen.

Vor öffentlichem Vertrieb: Formatversionierung, Lizenzinventar, sichere Vorschau ohne aktive Skripte, begrenzte native Rechte, Pfadprüfung, nachvollziehbare Releases, Wiederherstellungstests und rücknehmbare Migrationen. PWA-Updates erst bei gesicherten Entwürfen aktivieren. Kein Konto-/Telemetriezwang. Veröffentlichung separat freigeben.

Abnahme: Desktopprobe verwendet denselben Test-Vault ohne Konvertierung; Releaseprüfung dokumentiert Lizenzen und Datenflüsse. Grenze: kein Packaging/Publishing in Phase 0.

## Vorgeschlagene Agentenrollen

Lead koordiniert und integriert. Storage prüft Berechtigungen/Schreibkonflikte; Developer vergleicht Editor und Modulgrenzen; QA definiert unabhängige Sicherheits-/Performancefälle; Docs pflegt bei Bedarf kurze Entscheidungen und Anleitungen. Vorhandene Rollenbriefe sind keine registrierten Agenten.

Nur klar begrenzte unabhängige Aufgaben delegieren, ein Verantwortlicher pro Zieldokument. Bei Delegation schreibt jeder Agent seinen Bericht nach `./_Communication_Pipeline/`; Lead integriert. Keine permanente Agentenorganisation. Für diese Planung wurden keine Subagenten gestartet oder Konfigurationen verändert.

Abnahme: eindeutiger Auftrag, Ergebnis und Dokumentverantwortung. Grenze: Runtime-Konfiguration erst nach Review.

## Quellen und Zielkonflikte

Primärquellen geprüft am 2026-11-02; kein Ersatz für Tests auf dem tatsächlichen Edge-Gerät:

- [File System Access: Handles, Berechtigungen und Schreiben](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
- [Microsoft: PWA-Speicher und mögliche Löschung](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/offline)
- [CodeMirror: modulares Editorsystem und Bundling](https://codemirror.net/docs/guide/)
- [JSON Canvas 1.0](https://jsoncanvas.org/spec/1.0/)
- [Tauri: Windows-Verteilung und WebView2](https://v2.tauri.app/distribute/windows-installer/)

README ergänzt REQUIREMENTS um das spätere Board; kein Produktwiderspruch. Offene Zielkonflikte: beliebige Ordner gegenüber Browserrestriktionen; serverloser Betrieb gegenüber Erstbereitstellung; absoluter Überschreibungsschutz gegenüber externen Schreibrennen. Frühere Statusformulierung „Projektsetup“ ist keine Installationsfreigabe. Bestehende Entscheidungen werden nicht überschrieben.

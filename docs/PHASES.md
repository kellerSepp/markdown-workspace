# Entwicklungsphasen – zur Freigabe

## Aktuelle Freigabe: Phase 2 M2, 2026-11-03

Nur Theme-Grundgerüst: Midnight als Standard sowie Terminal, Nord, Paper, sofortiger Wechsel per UI-Auswahl und Browserpersistenz. Gemeinsame Tokens für Oberfläche und Syntax, keine Inhalts-/Storageänderungen. Developer implementiert, anschließend unabhängige QA; Abnahme: bestehende Tests, Themewechsel ohne Text-/Undoverlust, persistierte Auswahl mit Fallback, lesbare Zustände, keine dauernde Hintergrundarbeit. JSON-Import/-Export, Skins, Theme-Editor und weitere Funktionen bleiben gesperrt. Danach stoppen und auf PO-Rückmeldung warten.

### Vorherige Freigabe M1

Nur Datei aus synthetischem Test-Vault öffnen, CodeMirror-Rohtext bearbeiten und explizit mit Konfliktprüfung/Sicherung speichern. Keine vollständige Produktoberfläche. Faltung, weitere Codeblocksprachen, Sequenzhilfe/Palette und spätere Funktionen sind keine verpflichtenden M1-Erweiterungen. Performancebudgets unten bleiben vorläufig; keine Abnahme durch bloße Bibliothekswahl. Weitere Entwicklung nach M1 erst nach Rückmeldung des PO. Historische Sperren unten sind für diesen Abschnitt überholt.

Aktualisierung 2026-11-03: Phase 0 bestätigt, Phase 1 ausdrücklich freigegeben und als Wegwerfexperiment umgesetzt. Edge-Abnahme steht aus; Anleitung/Ergebnisse in [STORAGE_SPIKE.md](STORAGE_SPIKE.md). Phase 2 bleibt gesperrt. Ein aktiver Vault zur Zeit, Wechsel zwischen synthetischen Test-Vaults möglich; OneDrive nicht erforderlich. Externe Schreibrennen bleiben ein Produktblocker bis zur PO-Entscheidung.

Stand: 2026-11-02. Jede Phase braucht vor Umsetzung eigene Freigabe.

| Phase | Abnahme | Grenze |
| --- | --- | --- |
| 0 Planung | Architektur und Spike reviewbar | kein Code/Installation |
| 1 Storage-Spike | untenstehende Fälle protokolliert | keine Produkt-UI/Editorpakete |
| 2 Editor | Öffnen, Tippen, Speichern, Faltung, Codehervorhebung; Sicherheitsfälle bestehen | keine Agenda/Board |
| 3 Aufgaben/Journal | freigegebene Syntax, rekonstruierbare Agenda und Fälligkeiten | kein Org-mode-Komplettnachbau |
| 4 Links/Suche | Wiki-Links, Mehrdeutigkeit, Backlinks, Tags; Index wiederaufbaubar | kein Pluginsystem |
| 5 Offline/Export | Offline-Neustart, sichere Updates, Copy/Export, PDF; Logseq nach Formatentscheidung | kein ungeprüftes Importüberschreiben |
| 6 Board | offenes Layout, konsistente YAML-Beziehungen | keine permanente Graphberechnung |
| 7 Distribution | portable Machbarkeit und Releaseprüfung | kein automatisches Publishing |

## Geplante UI-Erweiterung: Themes, danach Skins

Nach dem ersten Editorabschnitt einen separat freizugebenden kleinen Theme-Meilenstein planen: semantische Tokens, mehrere lokale Farbpaletten, Wechsel ohne Neustart und lokale Auswahl; datenbasierten JSON-Import/-Export dabei ausdrücklich abgrenzen. Anforderungen und Abnahme in REQUIREMENTS.md, technischer Vorschlag in ARCHITECTURE.md. Reihenfolge innerhalb dieses Abschnitts, erste Paletten und Schema vor Implementierung zur Prüfung vorlegen.

Aufwendigere Skins und ein Theme-Editor mit Live-Vorschau bleiben spätere, getrennt freizugebende Abschnitte. Kein Ausbau von M1 durch diese Planungsnotiz, keine Animationseffekte oder Pluginplattform.

## Erster Spike: Edge und Testordner

Zweck: Speicher-/Bereitstellungsrisiko vor Editorwahl klären. Wegwerfexperiment mit nativen Browser-APIs, ein Vault, eine offene Markdown-Datei, explizites Speichern. Keine Pakete.

Vor Start freigeben: Spike-Code, Browser-Test, synthetische Dateien ausschließlich in `test-vault/` und temporärer localhost-Server mit festem Origin und vorhandener Laufzeit. Fehlt eine geeignete Laufzeit, Alternative besprechen; keine Installation ableiten. Hosting/Publishing nicht eingeschlossen.

1. Test-Vault ausdrücklich auswählen; synthetische Datei mit Umlauten und verschiedenen Zeilenenden öffnen. Unverändertes Speichern bleibt bytegleich.
2. Ändern, speichern, erneut lesen/vergleichen. Erfolg erst nach Abschluss.
3. Reload, Tab schließen, Browserneustart, Rechte entziehen: Zustand dokumentieren, erneute Freigabe verständlich ermöglichen, Entwurf erhalten.
4. Externe Änderung und zweiten App-Tab prüfen: erkannter Konflikt blockiert Ersetzung; beide Fassungen zugänglich.
5. Änderung gezielt zwischen Prüfung und Schreiben auslösen: Restfenster dokumentieren, keine absolute Konfliktgarantie behaupten. Ungeklärter Verlust blockiert Produktumsetzung bis zur Entscheidung.
6. Schreibabbruch, Rechteverlust und simulierten Schreibfehler prüfen: kein falsches Erfolgssignal, Entwurf erhalten. Wiederherstellung aus Sicherung nachweisen, bevor produktives Ersetzen freigegeben wird.
7. Nach 30 Minuten Idle zurückkehren: Entwurf erhalten, aktive Datei/Rechte erneut prüfen. localhost-Offline-Reload getrennt vom späteren echten PWA-Offline-Neustart bewerten.

Ergebnis: Bericht mit Edge-/Windows-Version, Origin, Rechten, Messwerten und Go/No-Go. Keine persönlichen Ordner/OneDrive. PWA-Installation und Unternehmensrichtlinien brauchen später eigenen Bereitstellungstest.

## Vorgeschlagene Messbudgets

Noch zu bestätigen, keine gemessenen Versprechen. Referenzgerät/Methode vorher festhalten. Synthetischer Standardsatz: 1.000 Dateien à etwa 10 KB, aktive Datei 100 KB; spätere Belastung: 10.000 Dateien und eine 1-MB-Datei.

- Ab Phase 2: Eingabe bis sichtbare Aktualisierung, 95. Perzentil höchstens 50 ms.
- Wiederaufnahme nach 30 Minuten Idle innerhalb 1 s; Nutzerfreigaben getrennt messen, Vollscan darf nicht blockieren.
- Lokales Speichern von 100 KB einschließlich Prüfung innerhalb 1 s in 95 % von 20 Versuchen, ohne Sync/Dialoge.
- Ruhe: keine wiederkehrenden Vollscans; weniger als 1 % zusätzliche CPU über 60 Sekunden auf Referenzgerät.
- Ab Phase 2: vorläufig höchstens 150 MB zusätzlicher Prozessspeicher gegenüber leerem Edge-Tab; gemeinsam genutzte Prozesse/Messunsicherheit dokumentieren.
- Ab Phase 4: Suche im vorhandenen Index von 1.000 Notizen innerhalb 200 ms. Erstaufbau separat messen und abbrechbar halten.

Spike-Abnahme beweist nur Machbarkeit unter dokumentierten Bedingungen. Editorpakete, Syntax, Hosting und Desktop bleiben separate Entscheidungen.

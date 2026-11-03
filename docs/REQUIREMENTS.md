# Anforderungen (Stand 2026-11-03)

## Ziel
Ein schneller, schlichter, ressourcenschonender Markdown-Workspace, der ohne klassische Installation und ohne eigenen permanenten Server funktioniert.

## Festgelegt
- Start auf Windows mit Microsoft Edge; PWA vorgesehen, sofern Geräte-Richtlinien das zulassen.
- Daten ausschließlich in einem explizit gewählten lokalen Testordner während der Entwicklung.
- Später beliebiger lokaler Vault-Ordner, einschließlich optional per OneDrive synchronisierter Verzeichnisse; kein OneDrive-Zwang.
- Markdown ist Primärformat. Kein proprietärer Datenbankspeicher als einzige Datenquelle.
- Klassischer textorientierter Editor plus ausgewählte Hybrid-Funktionen (einklappbare Überschriften, Abschnittsoperationen).
- Tastatur- und Mausbedienung; einfache UI ohne Glass/Animationen/aufwendige Effekte.
- Nach längerer Inaktivität rasch wieder nutzbar; keine dauernde Hintergrundberechnung.
- Markdown-Codeblöcke und Syntaxhervorhebung.
- Konfigurierbare Status (z.B. TODO, DOING, ON HOLD, DONE), Agenda, offene/überfällige Aufgaben.
- Daily Journal, Datumseingabe als Text oder Datepicker, Termin-/Deadline-Unterscheidung.
- Wiki-Links `[[Thema]]`, Hashtags, Backlinks und Suche.
- Copy/Export, später PDF und optional Logseq-Import.
- Optionale spätere portable Desktopvariante.

## Ergänzung: Tastaturbedienung und Command Palette (freigegebene Anforderung)

- Tastaturzentrierte Hauptbedienung nach Org-mode und Emacs; sämtliche wesentlichen Funktionen auch per Maus erreichbar.
- Mehrstufige Tastensequenzen, etwa `G → J` für Journal und `G → A` für Agenda; Beispiele sind noch keine verbindlichen Belegungen.
- Kleine kontextabhängige Hilfe zeigt nach einem Sequenzpräfix mögliche Folgebefehle.
- Durchsuchbare Command Palette, beispielsweise über `Strg+K`, vollständig per Tastatur und Maus bedienbar. Konkretes Kürzel erst nach Konfliktprüfung festlegen.
- Deutsches Layout QWERTZ/DE-DE unterstützen; langfristig vollständig konfigurierbare Tastenkürzel.
- Konflikte mit Windows- und Browser-Shortcuts berücksichtigen. Normale Texteingabe darf niemals versehentlich Tastenkürzel auslösen.
- Schlichte, schnelle Oberfläche ohne unnötige Animationen und ohne dauerhaftes Hintergrund-Polling.

Abnahme in einer später freigegebenen Entwicklungsphase: wesentliche Aktionen lassen sich mit beiden Eingabemethoden erreichen; Sequenzhilfe und Palette sind prüfbar; normale Texteingabe einschließlich `gj`/`ga` löst in Eingabefeldern keinen Befehl aus; DE-DE und reservierte OS-/Browserkombinationen werden explizit getestet. Kürzelkonfiguration bleibt langfristiges Ziel, kein automatisch erweiterter Phase-2-Umfang.

Grenze: hier nur Produktanforderungen; keine Implementierung, keine Editor- oder Bibliothekswahl und keine Phase-2-Freigabe. Journal-/Agenda-Funktionen bleiben an ihre eigenen Phasen gebunden.

## Theme- und Skin-System (Produktanforderung, 2026-11-03)

Langfristig eine umfangreiche, ressourcenschonende Bibliothek. Farbthemes ändern die Palette und Typografie; aufwendigere Skins gestalten die Oberfläche darüber hinaus. Beide getrennt behandeln.

Gewünschte Stilrichtungen:

| Richtung | Gestaltungsziel |
| --- | --- |
| Matrix | grün/schwarzes Terminal |
| Star Trek | LCARS-inspirierte Oberfläche |
| Star Wars | galaktisches Archiv |
| Lord of the Rings | Pergament, Gold, dunkle Erdtöne, Grün und Braun |
| DOOM | dunkel, industriell, Feuer und Lava als statische Gestaltung |
| Wolfenstein | militärisch-industrieller Retro-Stil |
| Winamp Classic | Retro-Mediaplayer-Ästhetik |
| Midnight, Terminal, Nord, Paper | schlichte Basisthemes |

- Design-Tokens für Farben, Rahmen, Schrift und Syntaxhervorhebung; Oberfläche und Editor konsistent gestalten.
- Eigene Themes ohne Programmierung erstellen und anpassen; Import/Export als JSON. Langfristig einfacher Theme-Editor mit Live-Vorschau.
- Wechsel ohne Neustart; Auswahl lokal speichern. Laden ohne externe Abhängigkeit oder Netzwerkzugriff.
- Importierte Themes enthalten ausschließlich Daten, keinen ausführbaren Code. Markdown-Inhalte, YAML, Entwürfe und Speicherverhalten bleiben unverändert.
- Keine unnötigen Animationen oder laufenden Hintergrundeffekte. Barrierearme Kontraste, gut lesbare Texte und erkennbare Fokus-/Auswahl-/Fehlerzustände in jeder Palette.
- Vor öffentlicher Veröffentlichung keine ungeklärten Markenassets oder urheberrechtlich geschützten Grafiken mitliefern. Die Stilnamen beschreiben Wünsche und erlauben keine Assetübernahme.

Priorität: zuerst schlankes Theme-System mit mehreren Farbpaletten; aufwendige Skins und Theme-Editor erst später. Phase 2 M2 ist für Midnight (Standard), Terminal, Nord und Paper freigegeben: UI-Auswahl, sofortiger Wechsel und im Browser gespeicherte Auswahl. Alle vier Paletten müssen UI und Markdown-Syntax konsistent gestalten, insbesondere Auswahl, Cursor und Codeblöcke.

Abnahme für einen später freizugebenden Abschnitt: Wechsel erhält Dokumenttext, Auswahl und Undo; Auswahl bleibt nach erneutem Start erhalten; JSON-Export/-Import erhält unterstützte Werte; ungültige oder aktive Inhalte werden abgewiesen, ohne das funktionierende Theme zu verlieren. Alle UI-/Syntaxzustände auf Kontrast und Lesbarkeit prüfen; kein Netzwerkabruf und keine dauernde Hintergrundarbeit durch Themes. Konkrete Kontrast- und Ressourcenmesskriterien vor Umsetzung festlegen.

Grenze: M2 erlaubt nur das Theme-Grundgerüst mit vier Paletten; JSON-Import/-Export, Skins und Theme-Editor bleiben Zukunftsanforderungen. Keine Änderung des Notizdatenmodells oder neuer Editor-/Storagefunktionen.

## Noch offene Entscheidungen
- Markdown-Syntax für Aufgabenstatus, Zeitstempel und Metadaten.
- Wahl des Editors/Frameworks (geringe Komplexität und RAM sind Entscheidungskriterien).
- Offline/PWA-Hosting-Strategie ohne dauerhaft laufenden eigenen Server.
- Persistente Ordnerfreigaben in Edge und Verhalten beim Reload.
- Dateikonflikte bei externer Änderung / OneDrive-Sync; sichere Schreibstrategie.
- Umfang von Quick Capture (nicht zwingend).
- Welche Logseq-Exportformate später unterstützt werden.

## Nicht für MVP
- Ein vollständiger Org-mode- oder Emacs-Klon.
- Multi-User-Synchronisation und eigenes Backend.
- Pluginsystem vor einer stabilen Basis.

## Qualitätsziele (zunächst qualitativ)
- Keine sichtbare Verzögerung beim Tippen in typischen Notizen.
- Nach Tab-Rückkehr zügig bedienbar; nur nötige Daten aktualisieren.
- Keine Datenverluste durch stillschweigende Überschreibung.
- Messbare Performancekriterien vor Implementierung vorschlagen.
- Langzeitstabilität bei stundenlang geöffneter Anwendung prüfen: Memory Leaks und schleichende Performanceverschlechterung anhand dokumentierter Last, Laufzeit, Speicherentwicklung und Latenzen untersuchen. Konkrete Messbudgets vor entsprechender Umsetzung festlegen; hier noch kein Langzeittest ausgeführt.

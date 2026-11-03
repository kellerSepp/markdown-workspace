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

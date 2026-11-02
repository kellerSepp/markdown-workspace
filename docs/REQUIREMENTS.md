# Anforderungen (Stand 2026-11-02)

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

## Noch offen
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

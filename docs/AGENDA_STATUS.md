# Aufgabenstatus aus der Agenda

PO-Auftrag: C-c t auf einem ausgewählten Agendaeintrag, Statusauswahl oben und Agenda unten. Implementiert mit vorhandener Quellnavigation, Panelhülle, Prefixrouter und TODO-Controller; kein zusätzlicher Editor und keine eigene Status-/Wiederholungslogik.

## Bedienung

1. Woche oder TODO-Liste öffnen, Eintrag mit Pfeilen auswählen.
2. Im Agendafokus Strg+C drücken, C und Strg loslassen, danach t. Alternativ den Knopf **Status · C-c t** verwenden.
3. Die tatsächliche Quelle wird geprüft und bei Bedarf im vorhandenen Editor geöffnet. Der obere Editor wird vorübergehend durch die Statusauswahl ersetzt; die Agenda bleibt unten sichtbar. Angezeigt werden die geladenen Zustände genau dieser Datei, einschließlich „Kein Status“.
4. Schnelltaste, Maus oder Pfeile/Enter wählen den Zustand. Leertaste entfernt den Status. Nach Auswahl oder Escape/C-g/Schließen erscheint oben wieder der Editor, der Fokus kehrt zur Agenda zurück. Der aktuelle Agenda-Modus und Filter bleiben erhalten.

Nachbesserung: Interne Parseraktualisierungen ohne Dokument-/Auswahl-/Regel-/Quellenänderung schließen die obere Auswahl nicht mehr. Die geladene dateilokale SEQ_TODO-Liste bleibt bedienbar. Echte Zieländerungen bleiben geschützt.

Eine erledigte Aufgabe verschwindet aus der offenen TODO-Liste beziehungsweise aus Vorwarnungen gemäß bestehenden Regeln; die Auswahl bleibt nach Möglichkeit auf der Aufgabe oder beim nächsten verbleibenden Eintrag. Im Wochenplan können abgeschlossene Aufgaben weiterhin an ihrem tatsächlichen Datum sichtbar sein. Bei einer Wiederholung wird wie im Editor derselbe Datensatz fortgeschrieben/zurückgesetzt und im LOGBOOK protokolliert.

## Speichern und Schutz

- Bereits vor C-c t geöffnete Quelldatei: Statusänderung bleibt eine gewöhnliche, undo-/redo-fähige Entwurfsänderung. Nach Schließen der Auswahl ausdrücklich mit Strg+S speichern.
- Vor C-c t andere Quelldatei: Nach tatsächlicher Statusänderung wird genau diese Datei automatisch über den bestehenden Session-Speicherpfad mit Backup, Konfliktprüfung, Rechteprüfung und Readback gespeichert. Der ursprüngliche Editor wird nicht mitgespeichert. Die Entscheidung richtet sich nach der vor dem Aufruf geöffneten Datei, nicht nach der für das Menü geladenen Quelle. Abbruch oder unveränderte Auswahl speichern nichts.
- Während der Speicherung sind weitere Aktionen kurz gesperrt. Ein Fehler bedeutet keinen bestätigten Speichererfolg; der geänderte Status bleibt im Editor, mit Hinweis zur Prüfung/manuellen Wiederholung. Erkannte externe Änderungen blockieren das Speichern; das bekannte externe Schreibfenster bleibt unverändert. Undo nach erfolgreichem Autosave erzeugt wieder einen Entwurf; es schreibt nicht automatisch zurück.
- Eigene aktuelle Datei: ungespeicherter Editorstand und aktuelle Quellpositionen werden wiederverwendet, keine Neuöffnung oder neue Undo-Grenze.
- Andere Datei: nur bei unverändertem aktuellem Editor öffnen, mit vorhandener Rechte-/Quell-/Indexprüfung. Bei Dirty erscheint der bestehende Speicherhinweis; nichts wird verworfen. Nach einer erfolgreichen fremden Dateiöffnung ist diese die aktuelle Editorquelle. Abbruch der Auswahl macht die vorangegangene sichere Dateiöffnung nicht rückgängig, ändert aber keinen Text.
- Follow und Agendaquellnavigation pausieren während der Auswahl. Das Menü besitzt ein fest aufgenommenes Editorziel; Dokument-/Cursor-/Datei-/Vaultwechsel sowie Busy/Readonly verwerfen veraltete Ziele. Andere globale Editoraktionen sind während der oberen Auswahl gesperrt.
- Ein Abbruch vor eigentlicher Sessionöffnung verwirft ausstehende Quellprüfungen. Eine bereits laufende Sessionöffnung bleibt wie bisher nicht abbrechbar und sperrt Schließen kurz sichtbar.
- C-c t im normalen Editor behält die bisherige Statusauswahl unten. Der modale Agenda-Dispatcher erhält diese neue Funktion nicht. Nur der lokale Agenda-Prefix kennt C-c t; AltGr/IME, fremde Modifier, Wiederholung und frühe Folgetasten bleiben geschützt.

Keine Änderung an StorageCore, Backup, Konfliktmodell, Dateiformaten oder Dependencies. Keine neue atomare Schutzbehauptung.

## Synthetische native PO-Probe

Nach Build/Strg+F5 den Vault `test-vault/agenda-status` wählen und `status.md` öffnen.

1. C-c a → t: „Lokale Aufgabe“ auswählen. C-c t: oben Statusauswahl mit NEXT/WAIT/DONE und Kein Status, darunter weiterhin TODO-Liste. `w` setzen: Editor kehrt zurück, Fokus zur Agenda, Aufgabe zeigt WAIT. Strg+S noch nicht drücken; Status ist weiterhin ein Entwurf.
2. Im Editor zusätzliche Notiz schreiben. Zur Agenda, dieselbe Datei auswählen und C-c t → `d`: Notiz erhalten, Aufgabe erledigt, im offenen Filter entfernt. Undo/Redo im Editor prüfen. Abbrechen des Statusmenüs ändert keinen Text.
3. Fremden Eintrag aus `andere.md` bei Dirty wählen und Statusknopf verwenden: Speicherhinweis, kein Dateiwechsel. Aktuelle Datei speichern, erneut versuchen: oben PLAN/FIN aus der fremden Datei. `f` ändert und speichert nur diese zuvor fremde Quelle, mit kurzer Speicheranzeige. Die vorherige Datei bleibt unverändert.
4. „Wiederholung“ auswählen, DONE setzen: NEXT bleibt offen, Termin einen Tag weiter, LOGBOOK ergänzt; ein Undo stellt das ganze Paket zurück. Tags und übriger Titel bleiben erhalten.
5. Follow aktivieren, Statusauswahl öffnen: keine Hintergrundsprünge während des Menüs. Schnelle C-c/t-Wiederholung, Escape/C-g, Menü-Schließen und Fensterfokuswechsel mitprüfen. Vor jeder Folgeaktion muss wieder die Agenda beziehungsweise der Editor erwartungsgemäß fokussiert sein.
6. Kleines Fenster, verändertes Agenda-Höhenverhältnis, alle Themes und Zoom: oben nur Statuspanel, unten Agenda, nach Schließen wieder oben Editor. Keine zusätzliche Überlagerung oder dritter Editor.

Nach Korrektur/Autosave: 467/467 Tests im seriellen Gesamtlauf, Build, vier Modul-Syntaxprüfungen und Diffcheck grün. Fünf zusätzliche Gruppen prüfen Parser-only-Updates bei custom SEQ_TODO, gebundenes Autosave, Nicht-Speicherfälle, echte Zieländerungen, Speicherfehler und tatsächlichen App-/Session-Backup-/Konfliktpfad. Neun neue Gruppen einschließlich echter Quell-/TODO-/Panelintegration und 30 kurzen Lifecycle-Zyklen. Modell-/Integrationstests ersetzen keine native Tastenzustellung, Layout-, Permission-, AltGr-/IME- oder Langzeitabnahme. Keine unabhängige QA-Rollenabnahme behauptet. Nach Bericht für PO-Probe stoppen; keine Git-Integration oder weitere Features daraus ableiten.

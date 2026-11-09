# M6a — Scheduling, Deadlines und Datumswahl

M6b-Nachtrag: Wiederholer und LOGBOOK sind separat freigegeben. Die historischen Wiederholer-Ausschlüsse unten werden ausschließlich durch [M6B_REPETITION.md](M6B_REPETITION.md) ersetzt; andere Grenzen bleiben bestehen. Bestehende Datumswahl und Registry werden wiederverwendet.

## Aktuelle Direktwahl — 2026-11-08

Abgeschlossen: Developer/QA jeweils276/276 Tests, Build, Syntax und Diffcheck erfolgreich; QA79 unabhängige Prüfgruppen. Berichte: [Developer](../_Communication_Pipeline/developer_m6a_flow.md), [QA](../_Communication_Pipeline/qa_m6a_flow.md). Native Handprobe offen.

Tagklick oder Enter/Leertaste auf dem Tag übernimmt sofort und schließt das Panel. Datuminput kann per Enter übernommen werden; Monats-/Pfeilnavigation und Tippen allein ändern das Dokument nicht. Bestehende Uhrzeiten/Zeitfenster bleiben erhalten. Neue Einträge ohne Zeit; Zeitfelder und Übernehmen-Knopf sind entfernt. Uhrzeit direkt im Zeitstempeltext bearbeiten, Entfernen/Abbrechen oberhalb des Kalenders.

Bei direkter gültiger Bearbeitung eines zugeordneten Datum-/Zeitstempels wird nur der Wochentag automatisch passend berechnet/ergänzt. Ungültige Zwischenstände bleiben unverändert; Eingabe und Korrektur bilden denselben Undo-Schritt. Keine Korrektur unberührter Angaben beim Öffnen, History oder Bodytyping. Frühere Formularbeschreibungen darunter sind für diese Änderung historisch.

Handprobe: Strg+F5, C-c s/d, Tag einmal klicken – ohne weiteren Knopf prüfen, dass Datum gesetzt, Panel geschlossen, Editorfokus wiederhergestellt ist. Auf Zeitstempel mit Uhrzeit/Zeitfenster wiederholen: Zeit bleibt exakt erhalten. Datum im Rohtext ändern, korrekten Wochentag und atomare Undo/Redo prüfen. Ungültiges Zwischendatum nicht automatisch verändern. Monats-/Pfeilnavigation mit Escape abbrechen: Dokument unverändert. Entfernen oben und Datuminput per Enter prüfen.

## Aktuelle PO-Korrektur — 2026-11-07

Abschluss dieser Korrektur: Developer/QA jeweils271/271 Tests, Build, Syntax und Diffcheck erfolgreich. QA177 eigene Prüfgruppen; einheitliche Schriftmaße für Monatsgruppen/Tagesraster korrigiert. Berichte: [Developer](../_Communication_Pipeline/developer_m6a_compact.md), [QA](../_Communication_Pipeline/qa_m6a_compact.md). Native Sicht und neue Folgen noch offen; nach Bericht stoppen.

Nach nativer Fehlermeldung Ersatzbelegung **C-c s** für Scheduling und **C-c d** für Deadline: Strg+C, beide Tasten loslassen, s/d ohne Modifier. Ältere C-c C-s/C-d-Angaben unten sind historische Belegung. Kalender kompakt mit vorherigem/aktuellem/nächstem Monat nebeneinander nach images/kalender.png, Eingabe/Zeiten/Vorschau/Aktionen darunter. Planungswörter und volle Datum-/Zeitbereiche im Editor als eigene Metadaten darstellen (themeabhängige Akzentfarbe, Zeitbereich unterstrichen), ohne Rohtextänderung. Referenz images/schedule_deadline_marks.png.

M7-Vormerkung: Klick auf Datum inklusive optionaler Uhrzeit öffnet später Tagesagenda des Datums im Zusatzpanel. Diese Aktion jetzt nicht aktivieren; keine funktionslosen Links oder Agenda-Runtime.

PO-Freigabe 2026-11-07: „Engage“. Developer implementiert, QA prüft unabhängig. Kein Commit/Push, keine Dependencies, Storageänderung, M6b oder Agendaimplementierung.

Abschluss: Developer und unabhängige QA jeweils **265/265 Tests**, Build, Syntax und Diffcheck erfolgreich. QA 205 eigene Prüfgruppen und 100 Kalender-Lifecycle. Header-Escape/C-g und TODO-Whitespace-Erkennung in Records korrigiert und unabhängig geschlossen. Berichte: [Developer](../_Communication_Pipeline/developer_m6a.md), [QA](../_Communication_Pipeline/qa_m6a.md). Native Probe bleibt offen; nach Bericht stoppen.

## Umfang und Schreibregeln

H1–H6 erhalten unabhängig vom TODO-Status SCHEDULED (Bearbeitungsbeginn) und/oder DEADLINE (spätester Abschluss). Kinder adressieren ihren eigenen Abschnitt, keine Vererbung. Format: `SCHEDULED: <2026-11-07 Sa 15:00-17:00>`. Datum ist maßgeblich, deutscher Wochentag wird beim Schreiben berechnet. Datum ohne Uhrzeit und einzelne Uhrzeit erlaubt; Endzeit nicht vor Startzeit. Keine Zeitzonen, Übernachtintervalle, Wiederholer oder relative Angaben.

Neue Angaben direkt nach Überschrift, bestehende an ihrer Position gezielt bearbeiten. Gemeinsame und getrennte Planungszeilen unterstützen; keine allgemeinen Body-Textstellen umschreiben. Duplikate, fehlerhafte und nicht unterstützte Angaben klar verweigern und erhalten. Entfernen betrifft nur gewählte Eigenschaft, andere Angaben und Fremdtext erhalten. Atomare Undo/Redo und vorhandene Codec-Zeilenenden erhalten.

## Architektur und Abnahme

Implementierte Module: `editor/planning.mjs` (Datum, Parser, Planer, Records, Controller), `editor/planning-calendar.mjs` (Kalenderformular). Integration in `app.mjs`, `commands.mjs`, `emacs-policy.mjs`, `work-panel.mjs` und `styles.css`; Regressionen in `planning.test.mjs`, Commands-/Prefix-/Paneltests. Kein Storagecode geändert. Planungsblock endet an Leerzeile oder normalem Text; weitere echte Planungszeilen im eigenen Body sind mehrdeutig und werden nicht automatisch verschoben. Codebeispiele werden ignoriert.

Gemeinsamer reiner Parser/Planer für Zeitangaben, getrennter Paneladapter. Vorhandene Registry, Präfixpolicy, Markdown-Struktur, TODO-Regeln, Panelhülle und Layoutschutz verwenden. Kalender mit Monatsnavigation, Datumseingabe, Zeitfeldern, Vorschau, Übernehmen/Entfernen/Abbrechen; alle Aktionen mit Maus und Tastatur. Vor Ausführung Ziel/State prüfen; Fokus, Auswahl, Dateiwechsel, Busy/read-only, AltGr/IME und Cleanup schützen.

Abnahme: Datum/Schaltjahr/Wochentag, beide Eigenschaften/Entfernen/Zeiten, H1–H6/Kindgrenzen/Code/Frontmatter, unveränderter Fremdtext, Undo/Redo, echte Handlerreihenfolge, Kalendernavigation und Panelcleanup. Bestehende Suite und Build plus unabhängige QA. Native Edge-Probe separat, insbesondere `C-c C-s` gegen Browser-Speicherdialog und `C-c C-d`. Bei tatsächlichem Konflikt PO abstimmen, keine eigenmächtige Ersatzbelegung.

## Native Handprobe nach Abschluss

Synthetische Datei `test-vault/vault-structure/scheduling.md`, Editor Strg+F5. Auf Heading und im Body Strg+C drücken, C und Strg loslassen, dann s bzw. d ohne Modifier. Nur Auswahlpanel darf öffnen. Alternativ Palette/Kontextmenü prüfen. Drei kompakte Monate, gemeinsame Datumsauswahl, Monatswechsel ohne Änderung der Eingabe, Jahrgrenzen und Tage mit Pfeilen prüfen. Datum klicken und tippen, Einzelzeit/Zeitfenster, Vorschau, Übernehmen, Entfernen, Escape/C-g und wiederholte Undo/Redo prüfen. Beide Angaben auf Eltern- und Kindaufgabe unabhängig ändern. Kleine Ansicht und vier Themes prüfen; AltGr/IME/Clipboard/Folding/TODO stichprobenartig prüfen. Im Editor müssen SCHEDULED/DEADLINE und unterstrichene Datum-/Zeitbereiche vom Titel und Text unterscheidbar sein. Noch keine Klickaktion auf Zeitstempel erwarten; Tagesagenda ist M7.

Lead-Prüfversuch: Computer-Use-Skill gelesen, Laufzeitinitialisierung scheiterte vor jeglicher UI-Interaktion mit „failed to start Node runtime … Pfad nicht finden (os error 3)“. Daher keine native Edge-Zustellgarantie, keine sichtbare Kalender-/Zoom-/Assistenzabnahme aus Modelltests ableiten. Bei Öffnen eines Browserdialogs abbrechen und PO-Konflikt melden, keine Ersatzbelegung ohne Abstimmung.

## M6b und M7 — nur vorgemerkt

M6b: Wiederholungsintervalle und weitere Zeitfunktionen separat. M7: Vaultagenda für Aufgaben/Termine/Rückstände, kein Index in M6a. Spätere Auswertung verwendet denselben Parser und liefert Titel, dateilokalen TODO-Status, Zeitangaben, Headingebene/Elternkontext, Quelldatei/Position.

Geplanter Dispatcher C-c a mit zwei kompakten Spalten: a Wochen-/Tagesagenda, t TODO-Liste; m Tags/Properties/TODO-Abfrage und s Suche später. Navigation f/b nächster/voriger Zeitraum, q schließen, . heute, j Datum wählen, Enter Quelle öffnen. Follow Mode und Wiederholungen separat. Keine Runtime-Registrierung dieser zukünftigen Befehle.

Referenzen: [Org Scheduling/Deadlines](https://orgmode.org/manual/Deadlines-and-Scheduling.html), [Zeitstempel](https://orgmode.org/manual/Timestamps.html). Org unterscheidet geplanten Arbeitsbeginn von einem normalen Terminzeitstempel; M6a implementiert ausschließlich SCHEDULED und DEADLINE.

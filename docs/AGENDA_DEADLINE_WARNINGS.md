# Agenda: Deadline-Vorwarnungen

PO-Auftrag 2026-11-12 nach `images/AgendaViewAdvanced/overview.png`: Fristen am heutigen Tag zusätzlich mit verbleibenden Tagen anzeigen. Die Änderungen und Tag-Korrekturen aus dem anderen Chat wurden im vorhandenen Arbeitsstand berücksichtigt; keine Rücksetzung/Übernahme älterer Versionen.

## Bedeutung und Bedienung

- SCHEDULED bezeichnet den geplanten Arbeitsbeginn. DEADLINE bezeichnet den spätesten Abschluss. Eine Deadline-Vorwarnung ist eine zusätzliche Darstellung unter **Heute**, keine Änderung dieser Daten.
- Offene Aufgaben mit Deadline in den nächsten **1–14 Kalendertagen** erscheinen unter Heute: beispielsweise **DEADLINE · in 3 Tagen (2026-11-15)**. Genau 14 Tage sind eingeschlossen; 15 nicht. Auch Fristen außerhalb der angezeigten Woche werden berücksichtigt.
- SCHEDULED unterdrückt die Vorwarnung nicht, auch nicht bei zukünftigem Arbeitsbeginn. Eine Aufgabe muss nicht beide Angaben besitzen: DEADLINE allein genügt.
- Der eigentliche Deadline-Eintrag bleibt am Fälligkeitstag. Heute fällig wird nicht zusätzlich als „in 0 Tagen“ verdoppelt. Bestehende Überfälligkeits-/SCHEDULED-Rückstandsanzeige bleibt erhalten.
- Reine Vorwarnungen stehen am Ende des heutigen Tages, nächste Frist zuerst. Hat dieselbe Aufgabe heute auch einen Termin oder Rückstand, zeigt eine gemeinsame Zeile beide Angaben. Die vorhandene Bündelung pro Aufgabe/Tag bleibt erhalten; kein zweiter identischer Today-Treffer.
- Abgeschlossene Zustände erhalten keine Vorwarnung; ihre tatsächlichen Datumseinträge bleiben wie bisher. Statuslose Termine erhalten in diesem begrenzten Paket keine zusätzlichen Vorwarnungen, entsprechend der bisherigen Rückstandsgrenze für offene Aufgaben.
- Nur die Ansicht, die das tatsächliche heutige Datum enthält, zeigt diese Zusatzhinweise. Andere Wochen werden nicht mit hypothetischen Warnungen gefüllt.
- Tagesdifferenz rein über Kalenderdaten, unabhängig von Uhrzeit und lokalen 23-/25-Stunden-Tagen. Wiederholende Aufgaben verwenden ausschließlich das vorhandene nächste gespeicherte Datum; keine zusätzlichen Wiederholungen erzeugen.

Die Anzeige nutzt denselben Index, dieselben Tags und denselben ungespeicherten Editorstand wie die bestehende Agenda. Enter/Follow öffnen die ursprüngliche Quelle. Keine Änderung von Text, Dirty, Undo, Save, Backup oder Konfliktschutz.

Die Vorwarnzeit liegt zentral in `editor/agenda-policy.mjs`. Keine neue Einstellungsoberfläche, dateilokale `-Nd`-Warnsyntax, Benachrichtigung, Mitternachtsüberwachung oder weiterer Agenda-Modus in diesem Paket. Nach Tageswechsel Agenda erneut öffnen/Heute wählen/neu einlesen.

## Org-Referenz

Das offizielle Handbuch beschreibt den zusätzlichen Hinweis unter Heute bis zum Abschluss. Der Org-Standard `org-deadline-warning-days` beträgt 14; `org-agenda-skip-deadline-prewarning-if-scheduled` steht standardmäßig auf nil. Einzelne Org-Warnzeiträume und Konfigurationsvarianten werden damit nicht als vollständig umgesetzt behauptet.

- https://orgmode.org/manual/Deadlines-and-Scheduling.html
- https://raw.githubusercontent.com/bzg/org-mode/main/lisp/org.el — `org-deadline-warning-days`
- https://raw.githubusercontent.com/bzg/org-mode/main/lisp/org-agenda.el — `org-agenda-skip-deadline-prewarning-if-scheduled`

## Prüfung und native PO-Probe

453/453 Tests im seriellen Gesamtlauf, Build, drei Syntaxprüfungen und Diffcheck grün. Vier neue Gruppen prüfen 14/15-Tage-Grenze, andere Wochen, SCHEDULED-Kombination, Statusabschluss, Tageswechsel/Sortierung, Schaltjahr/Sommerzeit/Jahresgrenzen, Wiederholungen sowie tatsächliche Agendaansicht mit Tags/Follow und Editorupdate. Keine unabhängige QA-Rollenabnahme oder native Layout-/Langzeitabnahme behauptet.

Nach Strg+F5 den synthetischen Vault `test-vault/agenda-deadline-warning` wählen. Beispiele beziehen sich auf **12. November 2026**; bei späterer Probe Fristen relativ zu Heute setzen.

1. C-c a → a: unter Heute erscheinen „Morgen“ mit einem und „Zwei Wochen“ mit vierzehn Tagen. „Zu weit“ und „Schon erledigt“ erscheinen nicht als heutige Vorwarnung.
2. „Geplant und Frist“ steht heute einmalig mit SCHEDULED und Vorwarnung; „Überfällig“ bleibt als bestehender Rückstand sichtbar.
3. Zu Freitag beziehungsweise zur nächsten Woche wechseln: tatsächliche Fristen stehen an ihrem Datum, keine erfundenen Vorwarnungen auf anderen Tagen. `.` kehrt zu Heute zurück.
4. Follow/Enter auf eine Vorwarnung springt zur richtigen Überschrift. Aufgabe im oberen Editor abschließen: heutige Vorwarnung verschwindet nach Editorupdate, ohne erforderlichen Save; Undo stellt sie wieder her.
5. Dunkle/helle Themes, kleines Fenster, vollständige Anzeige von Tagen/Tags und lokale Navigation prüfen.

Nach Bericht stoppen für PO-Probe. Match, Suche und weitere Videofunktionen bleiben separat freizugeben. Kein Commit/Push/Deploy.

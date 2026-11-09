# M6b — Wiederkehrende Aufgaben und LOGBOOK

## Freigabe und Abgrenzung

PO gibt ausschließlich M6b frei: Wiederholer `+N`, `++N`, `.+N` mit positiven Intervallen und den Einheiten `d`, `w`, `m`, `y`, Abschluss derselben Aufgabe mit Rücksetzstatus und LOGBOOK, Bearbeitung im bestehenden Datumspanel und Wiederverwendung des gespeicherten M7a-Indexes. Keine Taskkopien, Dateien, Benachrichtigungen, zusätzliche Agendaansichten, Dependencies, Storageänderung, globalen Handler, Commit oder Push.

Die Anwendung behält Markdown-H1–H6 und genau eine dateilokale SEQ_TODO-Definition. Kein allgemeines Emacs-Property-System, keine Vererbung oder globalen Org-Konfigurationsvariablen. Agenten und QA verwenden ausschließlich synthetische Dateien.

## Verifizierte Org-Referenzen

- [Repeated tasks](https://orgmode.org/manual/Repeated-tasks.html): gleicher Task, Fortschreiben von Wiederholern und Zurücksetzen; `+` ein Intervall, `++` mindestens eines mit Aufholen, `.+` ab tatsächlichem Abschluss. Mehrere Wiederholer werden fortgeschrieben. Ein einmaliges SCHEDULED wird beim Wiederholen entfernt.
- [Tracking TODO state changes](https://orgmode.org/manual/Tracking-TODO-state-changes.html): historische Zustandszeilen, neueste Einträge zuerst; LOGBOOK als Drawer.
- [Property Syntax](https://orgmode.org/manual/Property-Syntax.html): lokale PROPERTIES direkt nach Heading/Planungsblock, Schlüssel ohne Groß-/Kleinschreibung; keine automatische Vererbung für unser begrenztes Paket.
- [Drawers](https://orgmode.org/manual/Drawers.html): Drawer dürfen keine Überschriften oder weiteren Drawer enthalten. Allgemeine Darstellung und Falten von Org-Drawern werden hier nicht implementiert.

Zusätzlich ausgeführter synthetischer Vergleich mit installiertem **Org 9.8.7**: [_Communication_Pipeline/org_m6b_reference.el](../_Communication_Pipeline/org_m6b_reference.el), gestartet mit Emacs `--batch -Q`. Keine Benutzerkonfiguration und keine persönlichen Dateien. Der Vergleich friert den Abschluss auf 10.11.2026, 12:00 ein.

Beobachtungen: `31.01.2026 +1m` ergibt dort `03.03.2026`, `29.02.2024 +1y` ergibt `01.03.2025`. `++1d` mit Ausgangstermin gestern 20:00 ergibt morgen 20:00, während das Handbuch heute 20:00 zulässt. Diese Unterschiede werden dem PO zur Entscheidung vorgelegt; das Ergebnis ist vor Implementierung der betroffenen Berechnung festzuhalten.

## PO-Entscheidungen

PO bestätigt: Ein SCHEDULED ohne Wiederholer wird bei wiederkehrendem Abschluss entfernt. Ein wiederkehrendes SCHEDULED wird dagegen gemäß eigener Regel fortgeschrieben; eine DEADLINE ohne Wiederholer bleibt erhalten.

PO bestätigt außerdem: Nur TODO-Befehle über Panel oder Statuskürzel lösen Wiederholung/LOGBOOK aus. Direktes Tippen von DONE bleibt Textbearbeitung; Dateiöffnung, Indexlesen sowie Undo/Redo lösen keinen neuen Abschluss aus.

Monate und Jahre werden auf den letzten gültigen Zieltag begrenzt: 31.01.2026 +1m → 28.02.2026, 29.02.2024 +1y → 28.02.2025. Die Begrenzung erfolgt pro Fortschreibung. Es wird kein ursprünglicher Monatstag zusätzlich gespeichert; der nächste Monat nach 28.02.2026 ist daher 28.03.2026. Das ist eine bewusst gewählte Abweichung vom Überlauf des installierten Org 9.8.7.

Für `++` übernimmt der PO zunächst die Handbuchregel: mindestens ein Intervall, danach so viele weitere wie nötig bis zu einem **strikt zukünftigen** Termin. Ohne Uhrzeit muss das Datum nach dem Abschlusstag liegen. Mit Uhrzeit zählt die Startzeit; heute 20:00 ist nach Abschluss heute 12:00 gültig, heute 12:00 selbst nicht. Falls sich diese Wahl als unpraktisch erweist, kann der PO sie später ändern.

`+` verschiebt exakt einmal vom bisherigen Termin und darf weiterhin überfällig bleiben. `.+` beginnt am lokalen tatsächlichen Abschlusstag. Vorhandene Uhrzeiten/Zeitfenster bleiben erhalten. Beide Planungsangaben werden unabhängig nach ihrer jeweiligen Regel fortgeschrieben; ein Abschluss erhält trotzdem nur einen Historieneintrag.

## Technische Leitplanken

Datum-/Repeaterparser bleiben reine Funktionen. Planung und Kalender verwenden dieselben Zeitstempelwerte; ein Datumswechsel erhält vorhandene Uhrzeit und Wiederholungsregel. Eine Regel kann gezielt gesetzt, geändert oder entfernt werden. Ungültige Eingaben verändern kein Markdown.

Abschlussplanung arbeitet ausschließlich am eigenen Headingabschnitt vor der nächsten echten Überschrift, auch wenn diese ein Kind ist. Lokale PROPERTIES und LOGBOOK werden begrenzt gelesen; Kind-, Code-, Frontmatter-, Listen-, Zitat- und HTML-Inhalte dürfen keine fremden Metadatenänderungen auslösen. Vorhandene Logzeilen und fremde Properties bleiben erhalten. Mehrdeutige oder unvollständige Drawer blockieren die gesamte Operation.

LOGBOOK bleibt als lesbarer Org-orientierter Rohtext mit inaktiven `[Datum Wochentag HH:MM]`-Zeitstempeln erhalten. Es ist keine neue Aufgabenliste: Historische Statuswörter werden nicht als Überschriftenaufgaben indiziert. Ein allgemeiner Markdown-Renderer kann die Doppelpunkthüllen als Text und die Zeilen als Liste darstellen; eine spezielle Org-Drawer-Darstellung ist nicht zugesagt.

Eine Operation muss Status, alle betroffenen Termine und genau einen neuen Logeintrag gemeinsam ändern. Undo/Redo darf keine erneute Abschlusslogik auslösen. Zwei ausdrücklich getrennte Abschlüsse dürfen auch in derselben Minute zwei Historieneinträge erzeugen; eine Textduplikatsperre würde echte Ereignisse verschlucken. Kein Abschlusshook beim Öffnen oder bloßen Indexlesen.

Die Agenda übernimmt erst gespeicherte Änderungen über die bestehenden Saveupdates beziehungsweise explizites Refresh. Kein zweiter Index und keine Auswertung ungespeicherter Entwürfe.

Die Implementierung trennt die Aufgaben in kleine Module:

- `planning-date.mjs`: unveränderliche Datum-/Zeitstempelwerte und Repeatergrammatik; bisherige Parser-Exports aus `planning.mjs` bleiben verfügbar.
- `planning-context.mjs`: bestehender sicherer Heading-/Planungsblockkontext, gemeinsam von Terminbearbeitung und Abschlussplanung genutzt.
- `planning-drawers.mjs`: begrenzte Drawer-Erkennung und inaktive Bereiche; historische Regeln/Termine werden nicht als aktive Definitionen interpretiert.
- `recurrence-date.mjs`: zivile Datumsarithmetik, PO-bestätigte Monatsbegrenzung und Aufholberechnung. Rechentage verwenden UTC-Kalenderdaten, der Abschlusstag und die Logzeit die lokale Uhr.
- `recurrence-metadata.mjs`: lokales REPEAT_TO_STATE und textbewahrende LOGBOOK-Ergänzung.
- `recurrence.mjs`: vollständigen Abschluss erst validieren und dann Änderungen für genau eine Editortransaktion planen; keine Dateizugriffe und keine globalen Listener.

`todo.mjs` ruft diese Planung nur bei einem ausdrücklichen Wechsel eines erkannten offenen Zustands auf einen abgeschlossenen Zustand auf. Kalender und Index greifen auf dieselben Planungswerte zurück. Speicherung, Sicherungen und Konfliktbehandlung bleiben unangetastet.

Ein unbekannter, leerer oder abgeschlossener REPEAT_TO_STATE-Wert wird nicht als offenes Ziel verwendet: Der erste offene Zustand gilt mit sichtbarem Hinweis, die Property bleibt textgleich. Doppelte oder strukturell fehlerhafte Properties/Drawer werden dagegen nicht geraten; der Abschluss wird vollständig abgelehnt. Unterstützte PROPERTIES stehen direkt in der Zeile nach dem Heading beziehungsweise seinem zusammenhängenden Planungsblock. Es gibt keine Vererbung von Elternzuständen. Bestehendes LOGBOOK kann an seiner Position im eigenen Abschnitt bleiben.

## Stand

Codeaudit, Org-Vergleich und PO-Klärungen durchgeführt. Baseline unabhängig **347/347 Tests** bestanden. M6b inklusive Abschlusslogik implementiert. Developer und unabhängige QA jeweils **377/377 Tests**, Build, elf/neun Syntaxchecks und Diffcheck erfolgreich. QA sechzehn eigene Prüfgruppen; drei P2-Befunde korrigiert und unabhängig geschlossen. Unabhängiger Abschlussbericht: [qa_m6b.md](../_Communication_Pipeline/qa_m6b.md).

Lead prüfte die tatsächliche positive Abnahmedatei mit `parseAgendaFile` und den echten TODO-/Planungsfunktionen: **13 Records, null Diagnosen**; zwölf repräsentative Abschlüsse stimmen mit den unten aufgeführten erwarteten Daten/Status überein. Alle Prüfungen verwenden synthetische Daten. Native Edgebedienung und stundenlange Stabilität sind damit nicht belegt.

## Bewusste Grenzen

- Nur erkannte offene Überschriftenaufgaben und ausdrückliche TODO-Abschlussbefehle; normale Aufgaben, statuslose Termine, Rohtexteingabe sowie Laden/Undo/Redo werden nicht automatisch als Wiederholungsabschluss behandelt.
- Positive ganze Intervalle, Einheiten d/w/m/y, aktive einzelne SCHEDULED-/DEADLINE-Zeitstempel im bestehenden direkten Planungsblock; keine Stunden, Warn-/Verzögerungszusätze, Datumsbereiche, Zeitzonen, Habit-Syntax oder Wiederholer in beliebigem Fließtext. Nicht unterstützte wiederkehrende Planungsangaben werden unverändert abgelehnt.
- Unterstützter Datumsbereich 0001–9999; ein nicht mehr darstellbarer nächster Termin verweigert den gesamten Abschluss. Kalender-/Monatsarithmetik verwendet die bestätigte Begrenzung pro Schritt, keinen versteckten ursprünglichen Monatstag.
- Lokale, eindeutige PROPERTIES/LOGBOOK-Struktur; keine Vererbung, kein allgemeines Property-System, keine globale Logging-Konfiguration, keine Drawer-Faltoberfläche. Fehler werden nicht automatisch repariert. Historische Daten bleiben Rohtext.
- Jeder abgeschlossene Zustand der dateilokalen Sequenz zählt, auch CANCELLED. Soll ein wiederkehrender Task endgültig geschlossen werden, zuerst seine Wiederholungsregeln ausdrücklich entfernen. Kein zusätzliches dauerhaftes Abschlusskürzel in diesem Paket.
- Die Agenda zeigt den nächsten tatsächlich gespeicherten Termin; sie erzeugt keine virtuellen Kopien für alle zukünftigen Intervalle. Vorhandene Rückstands-/Heute-Projektionen bleiben M7b-Verhalten, keine zusätzliche Taskverwaltung.

## Manuelle Probe in Edge

Nach lokalem Build Strg+F5. Für Agenten/QA ausschließlich synthetischen Vault `test-vault/m6b-repeat` verwenden. Eine Kopie hält die Ausgangsdateien für weitere Proben verfügbar. Änderungen nur ausdrücklich speichern.

1. `recurrence.md` öffnen. Auf „Fester Wochenrhythmus“ per `C-c t`, dann `d`, abschließen. Erwartet: dieselbe Überschrift mit **NEXT**, SCHEDULED **01.11.2026 So +1w**, neuer LOGBOOK-Eintrag von **WAITING** nach **DONE** mit lokaler Abschlusszeit. Die Notiz bleibt erhalten. Einmal Undo stellt Status, Datum und LOGBOOK gemeinsam zurück; Redo stellt das identische Ergebnis wieder her, ohne weiteren Eintrag.
2. Die ersten drei Aufgaben vergleichen. Bei Abschluss am **09.11.2026** ergeben sich aus 25.10.2026: `+1w` → **01.11.2026**, `++1w` → **15.11.2026**, `.+1w` → **16.11.2026**. An anderen Tagen bleiben bei `++` die Sonntage erhalten und der erste strikt zukünftige Sonntag wird gewählt; bei `.+` gilt Abschlusstag plus sieben Tage. Alle drei Status werden **NEXT**. Für `+` ist ein weiter überfälliger Termin beabsichtigt.
3. „Rücksetzstatus und vorhandenes LOGBOOK“ abschließen: Ergebnis **TODO**, Datum **16.11.2026**, neuer Eintrag vor dem vorhandenen vom 02.11.2026. CUSTOM_NOTE und historische Notiz bleiben textgleich. Noch einmal ausdrücklich abschließen: **23.11.2026** und ein weiterer Eintrag. Beide Abschlüsse einzeln rückgängig machen.
4. „Zwei wiederkehrende Termine“ abschließen: SCHEDULED **16.11.2026 09:00–10:00 +1w**, DEADLINE **12.12.2026 17:00 +1m**, genau ein Logeintrag. Bei „Einmaliges SCHEDULED …“ entfällt SCHEDULED; DEADLINE wird **19.11.2026 +1w**. „Monatsende“ ergibt **28.02.2026**, beim zweiten Abschluss **28.03.2026**. „Schaltjahr“ ergibt **28.02.2025**.
5. Elternaufgabe abschließen: Status/Termin/Log der Kindaufgabe bleiben unverändert. Kind separat abschließen: Rücksetzstatus **SOMEDAY**. Normale Aufgabe abschließen: **DONE**, kein neues LOGBOOK. Unbekannter REPEAT_TO_STATE: erster offener Zustand **NEXT**, verständlicher Hinweis, Property unverändert.
6. `C-c s` beziehungsweise `C-c d`: Tag wählen, vorhandene Uhrzeit und Regel bleiben erhalten. Wiederholungsfeld gezielt per „Wiederholung setzen“ beziehungsweise Enter im Regel-Feld ändern, per „Wiederholung entfernen“ entfernen. Ungültiges gezieltes Setzen, Abbruch, reine Navigation und bloßes Tippen dürfen nichts übernehmen. Tagwahl erhält die bisher gespeicherte Regel, auch wenn im Regel-Feld ein anderer noch nicht übernommener Entwurf steht. „Entfernen“ für den ganzen Termin und „Wiederholung entfernen“ unterscheiden.
7. Änderungen ausdrücklich mit Strg+S speichern, dann Wochenagenda beziehungsweise TODO-Liste öffnen: nächste gespeicherte Termine und genau dieselben Aufgaben sehen. Historische LOGBOOK-Einträge erzeugen keine zusätzlichen offenen Aufgaben. Vor dem Speichern darf der Index noch den bisherigen gespeicherten Stand zeigen.
8. `invalid.md`: Abschluss der ungültigen/mehrdeutigen/unvollständigen Fälle wird ohne Teiländerung abgelehnt. Sichere Nachbaraufgabe sowie fremde Metadaten bleiben erhalten. DONE dagegen direkt im Rohtext tippen: keine automatische Terminverschiebung und kein LOGBOOK. Wiederholte Browser-/Tastenevents, Fokuswechsel und langes Offenlassen zusätzlich praktisch prüfen.

Native Edge-Tastenzustellung, Zoom, AltGr/IME, tatsächliche Kalenderpixel und Langzeitstabilität werden erst nach einer solchen praktischen Probe als belegt gemeldet.

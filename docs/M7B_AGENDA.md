# M7b — Agendaoberfläche und Navigation

Nachtrag 2026-11-09: PO hat unteren verstellbaren Agenda-Split und Follow per **Shift+F** freigegeben. Die neue Ansicht ersetzt den bisherigen überlagernden Wochen-/TODO-Dialog; nur der Dispatcher bleibt modal. Fokus, Quellvorschau und Handprobe: [AGENDA_FOLLOW.md](AGENDA_FOLLOW.md). Die folgenden M7b-Angaben beschreiben den vorherigen Stand; bisherige Follow-Ausschlüsse sind ausschließlich für dieses neue Paket aufgehoben.

Stand: 2026-11-08. M7b implementiert und unabhängig geprüft. Weitere Agenda-Funktionen brauchen eine neue PO-Freigabe.

## Bedienung und Umfang

`C-c a`: im Editor Strg+C drücken, C und Strg loslassen, dann a ohne Modifier. Der kompakte zweispaltige Dispatcher enthält `a` Wochenagenda und `t` TODO-Liste. `m` Match und `s` Suche sind sichtbar geplant und inaktiv. Alle aktiven Einstiege stehen auch in der Command Registry/Palette zur Verfügung. Escape beziehungsweise q schließen Dispatcher/Ansicht, ohne den Editortext zu ersetzen.

Wochenagenda: Montag bis Sonntag, deutsche Tages-/Monatsnamen, ISO-Kalenderwoche einschließlich Wochenjahr. Standard ist die aktuelle lokale Woche. `f`/`b` wechseln genau eine Woche, `.` springt zur aktuellen Woche. Pfeiltasten wählen Einträge, Enter oder Klick öffnet die Quelle an der geprüften Überschrift. `r` und „Neu einlesen“ lesen den Vault über den vorhandenen Refresh erneut. Kompakte Schaltflächen bieten Mauszugang. Auswahl scrollt innerhalb der Liste. Buchstaben gelten ohne Modifier; AltGr/IME, Modifier und Aktionswiederholung werden nicht als Agendaaktion gewertet.

TODO-Liste: alle offenen Überschriftenaufgaben aus dem gewählten Vault, auch NEXT und WAITING gemäß dateilokalem Workflow. Ein Filter blendet abgeschlossene Zustände einschließlich CANCELLED ein. Checklisten sind keine eigenständigen Aufgaben. Titel, Status und relativer Quellpfad unterscheiden auch gleichnamige Dateien in Unterordnern.

## Termin- und Rückstandssemantik

SCHEDULED und DEADLINE werden am jeweiligen Datum mit optionaler Uhrzeit beziehungsweise Zeitfenster gezeigt. Beide Arten derselben Aufgabe am selben Tag erscheinen gemeinsam in einer Zeile, auch wenn die Zeiten verschieden sind. Verschiedene Datumswerte erzeugen je Tag einen Eintrag. Statuslose Termine erscheinen am Originaldatum ohne erfundenen TODO-Status.

Offene Aufgaben mit vergangenem SCHEDULED oder vergangener DEADLINE erscheinen zusätzlich unter heute, sofern die sichtbare Woche heute enthält. Angaben dieser Aufgabe werden pro Tag zusammengeführt, auch wenn ein regulärer Termin und ein Rückstand zusammentreffen. Vergangene Originaltage bleiben sichtbar; die zusätzliche heutige Erinnerung ist beabsichtigt. Abgeschlossene Aufgaben sind am Originaldatum sichtbar, erzeugen aber keine Rückstandserinnerung. Die Rückstandsrechnung verwendet Kalendertage, keine Uhrzeit-basierte Überfälligkeit. Bei Ansicht vergangener oder künftiger Wochen werden keine Rückstände auf einen anderen Tag projiziert.

Diese beschränkte Semantik orientiert sich am [Org-Wochenbeginn](https://orgmode.org/manual/Weekly_002fdaily-agenda.html), [Dispatcher](https://orgmode.org/manual/Agenda-Dispatcher.html), [globalen offenen TODO-Einträgen](https://orgmode.org/manual/Global-TODO-list.html), [Agenda-Tasten](https://orgmode.org/manual/Agenda-Commands.html) und [SCHEDULED-/DEADLINE-Erinnerungen](https://orgmode.org/manual/Deadlines-and-Scheduling.html). Bewusste Grenzen: kein Deadline-Vorwarnhorizont, keine Datumverzögerung/Repeater und keine Bearbeitung aus der Agenda. M6a verwendet SCHEDULED/DEADLINE auch für statuslose Termine; beliebige freie Org-Zeitstempel sind kein zusätzliches M7b-Eingabeformat.

## Index und Datensicherheit

M7a bleibt einziger Vault-Index. Die Oberfläche verwendet aktuelle Snapshots, Abfragen und Quellenkennungen sowie den bestehenden expliziten Refresh. Indexpublikationen aktualisieren die offene Ansicht; laufendes Einlesen und Einzelquellenfehler mit Pfad/Ursache bleiben sichtbar. Nach Vaultwechsel dürfen keine alten Einträge oder laufenden Quellsprünge übernommen werden. Externe Änderungen benötigen erneutes Einlesen; ungespeicherte Editoränderungen werden nicht als gespeicherter Aufgabenstand ausgegeben.

Öffnen/Schließen und Ansichtswechsel ersetzen weder Editortext noch Undo/Redo. Bei schmutzigem Editor wird ein Quellsprung konservativ verweigert; zuerst selbst ausdrücklich speichern. Dies gilt auch für dieselbe Datei. Vor einem erlaubten Sprung Quelle und Indexstand erneut prüfen; veraltete oder mehrdeutige Positionen mit Refresh-Hinweis ablehnen. Keine automatische Aufgaben-ID oder Metadaten in Markdown schreiben. Der Agenda-Dialog nimmt eigene Tasten entgegen; Struktur-/Statusbefehle des Editors dürfen dort nicht ausgelöst werden.

Vor der eigentlichen Dateiöffnung lassen sich ausstehende Prüfungen abbrechen. Die bestehende Session-Dateiöffnung selbst ist nicht abbrechbar; während dieses Schritts zeigt die Agenda „Quelldatei wird geöffnet“ und sperrt Schließen sowie weitere Aktionen kurzzeitig. Danach wird die Quelle fokussiert oder ein Fehler angezeigt und Schließen wieder freigegeben. Ein in dieser Phase gedrücktes q wird nicht nachträglich ausgeführt. Das vermeidet einen späteren überraschenden Dateiwechsel nach einem vermeintlichen Abbruch, ohne die Session-/Storage-API zu ändern.

## Module und wiederverwendete Schnittstellen

Neu sind `editor/agenda-model.mjs` (Ansichtsprojektion/ISO-Daten), `agenda-view.mjs` (Dispatcher, Liste, Auswahl und Fokus) und `agenda-source.mjs` (lesende Quellvalidierung) jeweils mit Tests. Integration: `app.mjs`, `index.html`, `styles.css`, `commands.mjs`, `emacs-policy.mjs`, `command-surfaces.mjs` und ein Agenda-Hinweis in `work-panel.mjs`. Bestehende Registry-/Präfix-/Indexregressionen wurden dem neuen freigegebenen Umfang angepasst. Die optionale synthetische Vorschau liegt unter `test-vault/m7b-preview.*`; sie ersetzt keine Produktions-/Dateinavigationsprobe.

M7a liefert `snapshot()` einschließlich Fehlern und laufendem Status, `query()` für Wochen-/Aufgabenprojektion und `source(id)` für die aktuelle Quelle. `rebuild()` bleibt der manuelle Refresh, `updateFile()` aktualisiert nach erfolgreichem Speichern/Öffnen; `selectVault()` leert beim Vaultwechsel. Die App leitet vorhandene `onChange`-Publikationen an die Ansicht weiter. Die Quellprüfung verwendet zusätzlich `parseAgendaFile()` und `TextCodec`, ohne ein weiteres Register aufzubauen. Vorhandene `createPanelShell`, `revealPanelRow`, Registry, Präfixrouter und Theme-Tokens bleiben gemeinsame Bausteine.

## Manuelle Edge-Abnahme

Nur `test-vault/m7b-agenda` als synthetischen Vault wählen. Die drei Dateien enthalten **13 relevante Einträge**, davon **12 Aufgaben: 9 offen, 3 abgeschlossen**, sowie einen statuslosen Termin. Indexdiagnose soll **3 Dateien / 13 Einträge / 0 Hinweise** anzeigen. Der Unterordner enthält absichtlich eine zweite `project.md`.

1. Anwendung wie bisher mit `npm start` starten, neu laden, synthetischen Vault bestätigen und `test-vault/m7b-agenda` wählen. `project.md` öffnen. `C-c a`, danach `t`: neun offene Aufgaben mit TODO/NEXT/WAITING; keine DONE/CANCELLED, Checkboxen oder Codebeispiele. Abgeschlossene einblenden: zwölf Aufgaben; statuslose Besprechung bleibt nur in der Wochenagenda.
2. q zum Editor. `C-c a`, dann `a`: aktuelle Woche, sieben deutsche Tagesüberschriften, passende ISO-KW. Mit f/b die Woche **2.–8. November 2026, KW45/2026** wählen. Reguläre Termine: Montag Redaktion; Dienstag Entwurf/SCHEDULED; Mittwoch Entwurf/DEADLINE; Freitag Freigabe/DEADLINE; Samstag Release/SCHEDULED; Sonntag Release/DEADLINE, Review mit beiden Arten in **einer** Zeile und Besprechung ohne Status.
3. Nur wenn heute **8. November 2026** ist: Sonntag zusätzlich Freigabe und Redaktion als Rückstände; Release bekommt den vergangenen SCHEDULED-Hinweis in derselben Sonntagszeile wie seine Deadline. Insgesamt zehn Zeilen in KW45; abgeschlossene/stornierte Aufgaben werden nicht nach heute fortgeschrieben. An späteren Prüftagen ändern sich heutige Rückstandszeilen erwartungsgemäß.
4. f zur **KW46/2026, 9.–15. November**: NEXT am Montag 09:00, Wochenabschluss am Sonntag 16:00. Wenn heute außerhalb dieser Woche liegt, genau diese zwei Zeilen. b/f über den Jahreswechsel: **28.12.2026–03.01.2027 ist KW53/2026**; Jahreswechsel-Aufgabe Donnerstag 23:00–23:30 und Freitag DEADLINE 12:00. Die folgende Woche ist KW1/2027. `.` kehrt zur tatsächlichen aktuellen Woche zurück.
5. In der TODO-Liste Pfeile/Enter und Klick testen: `Redaktion abschließen` öffnet `team/project.md`, nicht die gleichnamige Wurzeldatei. Cursor und sichtbarer Ausschnitt müssen die richtige Überschrift zeigen; die Dateiauswahl oben muss ebenfalls `team/project.md` anzeigen. Auch nach einem Sprung innerhalb derselben Datei darf eine zuvor anders vorgewählte Datei nicht irreführend ausgewählt bleiben. q/Escape ohne Quellsprung erhält vorherigen Editorcursor und Undo.
6. Editor ungespeichert ändern, Agenda öffnen/filtern/aktualisieren/schließen: Text bleibt unverändert; Index zeigt weiterhin gespeicherte Aufgaben. Ein Quellsprung muss verständlich verweigert werden. Speichern aktualisiert den Index. Für externe Dateimanipulationen ausschließlich eine Kopie des Probevaults verwenden; Refresh übernimmt sie und veraltete Ziele werden nicht blind angesprungen.
7. Alle vier Themes, kleines Fenster, Browserzoom, lange Listen, lokalen Auswahlsroll und Fokus-Rückkehr prüfen. Im Dispatcher bleiben m/s inaktiv. In der Agenda Alt-/Shift-Pfeile und normale Editorstrukturkürzel dürfen den Editor nicht verändern. Anderen synthetischen Vault wählen: keine alten Agendaeinträge.

## Prüfergebnis

Developer und unabhängige QA jeweils **308/308 Tests**, Build, zehn beziehungsweise elf Syntaxchecks und Diffprüfung grün. QA zusätzlich **16 unabhängige Prüfgruppen**, ohne belegten verbleibenden Implementierungsblocker. Geprüft wurden unter anderem tatsächliche Appcallbacks mit echter Session und Busy-/Read-only-Gate: schmutziger Text/Auswahl/History bleiben erhalten, gefaltete Ziele werden sichtbar, Abbruch vor Dateiöffnung wirkt und Schließen während der nicht abbrechbaren Öffnungsphase wird mit Hinweis gesperrt. Erfolgs- und Lesefehlerpfade geben die Sperre wieder frei. ISO-Jahreswechsel und die dokumentierten Fixturezahlen 10/2/2 wurden unabhängig bestätigt.

Die Entwicklung korrigierte vor Abschluss Fokus nach Modalclose, Abbruchschutz vor asynchroner Rechteprüfung und das falsche Abbruchversprechen während bereits laufender Sessionöffnung. Keine Änderung an der Session-/Storage-API. Einzelheiten: [Developerbericht](../_Communication_Pipeline/developer_m7b.md), [QA-Bericht](../_Communication_Pipeline/qa_m7b.md).

QA-Kurzprobe im Node-/DOM-Modell: 500 Zeilen, 30 Erstellen-/Öffnen-/Navigieren-/Schließen-/Destroy-Zyklen, ca. 166,6 ms einschließlich 100 ms Idle; Einzelzyklen 1,30–4,38 ms. Heap nach GC 13.329.440 → 13.228.488 Bytes; daraus keine Leakfreiheit, Browserlatenz oder Langzeitstabilität ableiten. Während kurzer Idleprobe keine selbsttätige Ansichtsmutation.

Native Sichtprobe nicht abgeschlossen: Computer Use scheiterte beim Edge-Statecapture mit „Cannot call write after a stream was destroyed“; der Wiederverbindungsversuch meldete physische Escape-Unterbrechung durch den Nutzer. Keine weitere Computer-Use-Aktion ausgeführt und keine native Sicht-/Keyzustellung/Permission-/Zoom-/AltGr-/IME-Abnahme behauptet. Diese Prüfungen und mehrstündige Ressourcenbelege bleiben offen.

## Abnahmekriterien und Grenzen

Developer implementiert und testet begrenzt, QA prüft unabhängig ISO-Woche/Navigation/Filter/Terminvereinigung/Quellsprung/Vaultwechsel/Fehler/Dirty- und Asyncschutz sowie Regression. Automatisierte Modelltests und tatsächliche native Bediennachweise getrennt ausweisen. Keine neuen Abhängigkeiten, Storage-Sicherheitsänderungen oder Änderungen des Markdownformats. Keine Match-/Suchansicht, Wiederholungen, Follow Mode, Drag-and-drop oder Benachrichtigungen. Kein Commit/Push; nach Abschluss stoppen.

„Heute“ wird beim Öffnen beziehungsweise erneuten Rendern aus dem lokalen Browserdatum berechnet. Es gibt keinen Mitternachts-Timer; nach längerem Offenlassen über einen Tageswechsel die Ansicht mit `.` oder Refresh erneuern. Sehr große Listen werden derzeit als DOM-Zeilen gerendert, ohne Virtualisierung; kurze Modelllasttests ersetzen keine native Latenz- oder Langzeitabnahme.

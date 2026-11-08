# Architekturentscheidungen

## M7b — PO-Freigabe 2026-11-08

Freigegeben: Org-artige Agendaoberfläche und Quellnavigation auf M7a, Dispatcher C-c a mit a Woche/t TODO, deutsche ISO-Woche Montag–Sonntag, lokale Tastatur-/Mausnavigation, offener TODO-Filter mit optional abgeschlossenen Zuständen, Refresh und Diagnose. Referenzbilder images/agenda_menue.png, agenda-week-example.png und Agenda_todo_examples.png. Keine zweite TODO-Verwaltung, Indexsystem, neue Formate oder Storage-Sicherheitsänderung. Match/Suche nur sichtbar geplant, kein Follow Mode/Wiederholungen/Drag-drop/Benachrichtigungen/Dependencies/Commit/Push. Nach Bericht stoppen; keine Folgefreigabe ableiten.

## M7a — PO-Freigabe 2026-11-08

Freigegeben sind Agenda-Datenmodell, lesender rekonstruierbarer Vault-Index, Aktualisierung nach erfolgreichem Speichern, expliziter Neuaufbau und unabhängige QA mit synthetischen Daten. Markdown bleibt einzige maßgebliche Datenquelle. Keine Listencheckbox-Aufgaben, Agendaoberfläche, Dispatcher, C-c a, Repeater, Benachrichtigungen, Storage-Sicherheitsänderungen, Dependencies oder Git-Commit/Push. Nach Abschluss auf M7b-Freigabe warten. Die Empfehlung zur automatischen Einbeziehung aller Vault-Markdown-Dateien steht in ARCHITECTURE.md; eine gesonderte PO-Entscheidung zur späteren Dateiauswahl liegt noch nicht vor.

## M6a Datum direkt übernehmen — PO-Korrektur 2026-11-08

Tagklick setzt sofort das Datum und schließt den Kalender. Zusätzliche Übernehmen-Aktion und Zeitfelder entfallen; Uhrzeit wird direkt im gespeicherten Zeitstempel bearbeitet. Bestehende Uhrzeiten bei Datumwahl erhalten, neue Angaben ohne Uhrzeit. Pfeil-/Monatsnavigation bleibt ohne Dokumentänderung, Enter/Space aktiviert den Tag; Datumtext per Enter. Entfernen/Abbruch direkt erreichbar. PO bestätigt: Bei freier Datum-/Zeit-Rohtexteingabe Wochentag aus dem gültigen Datum korrigieren, wenn erforderlich. Temporär ungültige Eingabe nicht umschreiben; Änderung und Wochentagkorrektur gemeinsam undo-fähig, keine Migration unberührter Angaben.

## M6a native Rückmeldung und Darstellung — 2026-11-07

PO meldet C-c C-s als nicht funktionierend und bestätigt C-c s / C-c d mit unmodifizierter Folgetaste. Kompakte Dreimonatsansicht nach images/kalender.png; Planungswörter und Datum-/Uhrzeitbereiche optisch von Überschriften/Fließtext unterscheiden, Themefarben nach images/schedule_deadline_marks.png. Zeitstempel soll später per Klick Tagesagenda im Zusatzpanel öffnen; M7 bleibt separat. Bis dahin keine funktionslose Klickaktion. Developer korrigiert, QA unabhängig; keine Storageänderung/Dependencies/Commit/Push.

## M6a freigegeben — 2026-11-07

PO bestätigt automatische Berechnung/Korrektur des deutschen Wochentags und autorisiert M6a mit „Engage“ nach besprochenem Vorschlag. SCHEDULED und DEADLINE unabhängig vom TODO-Status, neue Angaben unmittelbar nach Heading, vorhandene Position erhalten; Datum/optionale Einzelzeit/Zeitfenster desselben Tages. Keine Wiederholungen, Übernachtintervalle, Agenda oder Storageänderung. Developer/QA getrennt, Details und Grenzen in M6A_SCHEDULING.md. Commit/Push übernimmt PO.

## TODO-Zyklus am leeren Zustand fortsetzen — PO-Korrektur 2026-11-07

PO meldet den Wechsel zur Textmarkierung nach Erreichen von Kein Status als unerwünscht. Shift+Links/Rechts soll auf der soeben im TODO-Zyklus entmarkierten Überschrift den Zyklus fortsetzen: rechts zum ersten, links zum letzten definierten Zustand. Diese Korrektur ersetzt die ältere Stopregel. Normale statuslose Überschriften und bereits markierter Text behalten bisherige Markierungsbedienung. Fortsetzung gilt nur im gültigen aktuellen Bedienkontext; kein gespeicherter Task-Marker im Markdown, keine Agenda-/Storageänderung.


## TODO-Paket freigegeben — 2026-11-07

PO bestätigt den konkreten Lead-Vorschlag mit „klingt gut“ und „Feuer Frei“. Dateilokale SEQ_TODO-Regeln, Standard TODO(t) | DONE(d), C-c t, Reload C-c C-c und Shift-Pfeil-Zyklus werden im abgegrenzten Paket umgesetzt. Genau eine Definition außerhalb Code/Frontmatter; Namen ohne Leerzeichen, eindeutige Buchstaben-Schnelltasten, genau ein |, mindestens ein Zustand je Seite. Doppelte Namen/Tasten oder mehrere Definitionen sind Fehler; letzte gültige Regeln behalten. Nichtleere Auswahl behält Textmarkierung. „Kein Status“ per Panel/Leertaste; Zyklus unmarkiert → definierte Reihenfolge → unmarkiert, rückwärts entsprechend. Unbekannte Titelwörter nicht entfernen.

PO betont verschachtelte Aufgaben: H1, H2, H3 bis H6 dürfen jeweils eigene Zustände haben und strukturell zur übergeordneten Aufgabe gehören. Keine automatische Statusvererbung oder Änderung anderer Aufgaben; Hierarchie als Grundlage späterer Agenda erhalten. Developer implementiert, QA prüft unabhängig, native Probe danach. Keine Agenda, Listenaufgaben, Storageänderungen, Dependencies, Commit oder Push. Frühere Vertagung ist für diesen Umfang aufgehoben.


## TODO-Regeln bestätigt, Umsetzung vertagt — 2026-11-07

PO bestätigt Aufgaben an H1–H6, dateilokale SEQ_TODO-Zeile mit benannten Zuständen/Schnellwahltasten und | als Offen-/Abgeschlossen-Trenner. Offen grün, abgeschlossen rot. Automatisch beim Öffnen laden, nach Bearbeitung C-c C-c auf der Definitionszeile, Fehler behalten letzte gültige Regeln; ohne Definition TODO(t) | DONE(d). C-c t öffnet Statuspanel. Shift+Links/Rechts auf der gesamten Aufgabenüberschrift, nicht nur im Statuswort; Listen und zusätzliche Shift-Auswahlmodi später. Einzelheiten zu Grammatik/mehreren Definitionen/Markierungspriorität/Zyklusgrenzen noch offen. Bestätigter Nachtrag in [PLAN_TODO_AGENDA.md](PLAN_TODO_AGENDA.md) hat Vorrang vor früheren Minimalvorschlägen. Wegen knappen Kontingents verschiebt PO die Umsetzung auf nächste Sitzung; keine heutige Implementierungsfreigabe, keine automatische spätere Ausführung. [Fortsetzungsprompt](FORTSETZUNG_TODO.md), kein Commit/Push.

## TODO und Agenda vorbereiten — PO-Planungsfreigabe 2026-11-07

PO bestätigt geplante Folgen C-c t für Statusänderung und C-c a für den Agenda-Dispatcher und beauftragt Vorbereitung für die nächste Besprechung. Nur dokumentieren/reservieren, keine Anwendungskürzel oder Platzhalter aktivieren. C-c a a/t sind Ausbauvorschläge, Statusformat/Startzustände/Bedienmodell noch nicht entschieden. Gesprächsvorlage [PLAN_TODO_AGENDA.md](PLAN_TODO_AGENDA.md); keine TODO-/Agenda-/Storageimplementierung und kein Commit/Push freigegeben. PO berichtet C-c w als funktionierend; daraus keine vollständige Refile-/Langzeitabnahme ableiten.

## Refile-Folge C-c w wegen nativem Browserkonflikt — 2026-11-06

PO meldet Tab-Schließaktion bei C-c C-w und bestätigt stattdessen C-c w: Strg+C, beide Tasten loslassen, W ohne Modifier. Alt+W bleibt normales Kopieren; C-c M-w bleibt für eine mögliche spätere Kopier-Refilefunktion frei, keine Implementierungsfreigabe dafür. Org-Original C-c C-w als Referenz beibehalten, Workspaceabweichung sichtbar dokumentieren. Nur Policy/Hint/Doku/gezielte Tests ändern, Algorithmus/History/Storage unverändert. Entwickler und unabhängige QA; native Ersatzfolge anschließend vom PO prüfen. Keine universelle Unmöglichkeit der Strg+W-Unterdrückung aus einem Browserbericht ableiten. Kein Commit/Push.

## Refile unter H1 derselben Datei — PO-Freigabe 2026-11-06

PO bestätigt den vorgeschlagenen nächsten Schritt mit ausdrücklicher Begrenzung: C-c C-w, aktueller Teilbaum, H1-Ziel derselben Datei, als letztes Kind, passende relative Ebenen, ein Undo. Bestehende Panelnavigation, Suche und Vervollständigung nutzen. Dateigrenzen und H2–H6-Ziele bleiben separat. Referenz: [Org Refile and Copy](https://orgmode.org/manual/Refile-and-Copy.html), vom Lead vor Freigabe geprüft; Org bietet standardmäßig H1-Ziele der aktuellen Datei, Eintrag am Cursor und Zielvervollständigung. Keine Regions-/Kopier-/Archivierungsfunktion, neuen Pakete, Storageänderung oder automatische Commit-/Pushfreigabe.

## Lokaler Abschlusscommit — PO-Freigabe 2026-11-06

Nach positiver Rückmeldung zur Präfixnavigation gibt der PO den lokalen Git-Commit des abgeschlossenen Copy-/Kill-Ring-/Präfix-/Panelpakets frei. Kein Push und kein weiterer Meilenstein freigegeben. Native AltGr-/IME-/Langzeitnachweise bleiben offen.

## Präfixhilfe in kleinen Fenstern — PO-Freigabe 2026-11-06

PO berichtet: Bei geviertelter Gesamtansicht auf 1920×1080 ist nur die erste Befehlszeile sichtbar. Freigegeben: Alt+Oben/Unten wählt in der aktiven Präfixhilfe, Enter führt aus, markierte Zeile scrollt lokal sichtbar. 1/2/3 und Escape/Strg+G bleiben erhalten. Vorhandene Kill-Ring-Navigation möglichst gemeinsam verwenden, Fokus und Editorviewport erhalten; Alt+W-Hinweis bleibt vorerst. Nur begrenzte Ergänzung mit unabhängiger QA, keine Dependencies/Storageänderung/Commit/Push.

## Copy-Ersatz abgenommen, C-c-Umstellung freigegeben — 2026-11-06

PO bestätigt funktionierendes Copy/Paste über die neue Methode und gibt ausdrücklich die Umstellung frei. Das gesonderte Copy-Umschalt-Gate ist erfüllt. AP-06: Strg+C als Editorpräfix, danach 1 einklappen, 2 nächste Sichtbarkeitsstufe, 3 vollständig öffnen; Folgehilfe im unteren Panel. Außerhalb des Editors bleibt Strg+C Copy; im Editor kopiert Alt+W. Developer implementiert, QA prüft unabhängig gemäß AP-07; native Produktprobe folgt. Keine neuen Fachfunktionen, Abhängigkeiten, Storageänderungen oder Commit-/Pushfreigabe.

## Panelteilung und Vervollständigung — PO-Freigabe 2026-11-06

PO bestätigt externen Klartextaustausch und gibt die vorgeschlagene horizontale Editor-/Panelteilung, Alt+Oben/Unten und Tab-Suchvervollständigung frei. Zusätzliche Bedingung: Größenwechsel darf den sichtbaren Editorinhalt nicht unerwartet versetzen. Gemeinsame begrenzte Höhe mit eigenem Ergebnisscroller; Cursor/Auswahl/History und Stale-Zielschutz erhalten. Nur diese modulare Nachbesserung mit unabhängiger QA, C-c bleibt Copy. Native Layout-/Scrollprobe nach Umsetzung bleibt offen; kein Commit/Push.

## AP-00 bestätigt, AP-01 manuell — 2026-11-05

PO bestätigt die sechs vorgeschlagenen Regeln: C-y am Cursor ohne Auswahl zu löschen; 120 Einträge/8 MiB nur RAM, getrennt pro Workspace/Tab und bei Vaultwechsel/Reload leeren; gekennzeichneter interner Clipboard-Fallback, keine veraltete externe Paste; externe Paste in Ring ohne Duplikate; jeder M-y-Austausch einzeln Undo; C-c 1/2/3 für bestehende Faltbefehle. Umsetzung ausdrücklich modular und später anpassbar. Nach CUA-Abbruch wegen unbestimmbarer Edge-URL autorisiert PO eine lokale manuelle AP-01-Testseite. Keine Umgehung der Automatisierungssperre, keine Produkt-C-c-Umbelegung vor Copy-Ersatz-Abnahme.

## Planungsentscheidung Emacs-Belegung — 2026-11-05

PO beauftragt ausschließlich Recherche und lesbaren TXT-Arbeitsplan für C-c-Prefix, Auswahl, Kill-Ring und unteren Arbeitsbereich. Auf Rückfrage: möglichst Emacs folgen, C-y für Yank und M-y für ältere Einträge; C-x statt C-w zum Ausschneiden wegen Edge-Konflikt, M-w kopiert. C-y ist bisher Redo und muss erst bei später freigegebener Umsetzung mit erhaltener Redo-Alternative geändert werden. [Plan und offene Entscheidungen](PLAN_C_C_KILL_RING.txt). Keine Implementierung/Agenda/TODO, kein Commit/Push freigegeben.

## Erstpunktregel beibehalten und Commitfreigabe — 2026-11-05

Nach erneuter Prüfung des [Org-Handbuchs](https://orgmode.org/manual/Plain-Lists.html) und Beispieldiskussion entscheidet PO ausdrücklich gegen eine weitere Änderung: Die aktuelle Erstpunkt-/Geschwisterlistenregel bleibt erhalten. PO gibt anschließend den lokalen Git-Commit des bereits geprüften Listenarbeitspakets frei. Keine neue Implementierung oder Pushfreigabe.

## Freigabe Return und Listenteilbaum — 2026-11-05

PO präzisiert Return als eingerückte Fortsetzung im selben Listenitem und Alt+Return als neuen Punkt. Nach physischer Zeilenbewegung begrenzen geringere Markereinrückungen den Zielbereich auch dann, wenn der Markdown-Parser sie einem größeren Itemcontainer zuordnet. Nur aktuelle Zeile und echte Kinder verändern; Markdown-Schutz und atomare Historie erhalten. Developer und unabhängige QA nacheinander, danach Bericht und Stopp; kein Commit/Push.

## Freigabe Listen-Tab/Einfügen — 2026-11-05

PO ersetzt bisheriges textgefüllte Items einrückendes Listen-Tab: Leerpunkt ändert Ebene, gefüllter Punkt faltet Children beziehungsweise bleibt als Leaf unverändert. Shift-Tab außerhalb Leerpunkt globaler Sichtbarkeitszyklus. Alt-Enter neuer Listenpunkt, Shift-Alt-Enter neuer Checkboxpunkt. Cursorlogik/Textintegrität und Undo/Redo verbindlich; keine globale Tab-Umbelegung außerhalb Listen, keine Storageänderung oder neuen Pakete. Developer setzt gezielt über vorhandene Architektur um, QA prüft unabhängig; weitere Meilensteine nicht ableiten.

## Freigabe M4b.1a — Org-Listensteuerung

PO gibt ausschließlich gezielte Ergänzung vorhandener Listenbefehle nach offiziellen Org-Regeln frei. Org-Original hat ausdrücklich Vorrang vor abweichenden Beschreibungen: Alt-Auf/Ab inklusive Children, Shift-Alt-Auf/Ab weiterhin Zeile. Links/Rechts unterscheidet Einzelitem/Teilbaum. Überschriftenkürzel, gemeinsame Registry, atomare Historie und Markdown-/Storagegrenzen erhalten. Keine neue UI/Abhängigkeit oder weiterer Meilenstein; tatsächliche Edge-bedingte Semantikänderung mit PO besprechen. Developer und QA nacheinander, gezielter Prüfauftrag; nach Bericht stoppen.

## Freigabe M4b.1 — 2026-11-04

Nach PO-Praxistest zusätzlich freigegeben: Korrektur von Alt-Links/Rechts gegenüber konkurrierender Cursorbewegung; lokal auf Editorfokus begrenzte Unterdrückung der Alt-allein-Browserreaktion, soweit möglich. Keine globale Tastensperre; AltGr/IME und normale Eingabe erhalten. Alt-Auf/Ab und Shift-Alt-Auf/Ab vom PO grundsätzlich als funktionierend berichtet, kein unabhängiger Vollnachweis. Eine alternative leicht erreichbare Taste erst bei belegter Browsergrenze auswählen.

PO gibt Org-referenzierte Strukturkürzel, Faltbedienung mit ausdrücklich dokumentierter Tab-Konfliktlösung und einfache Shortcutübersicht frei. Org-Handbuch/Orgcard sind verbindliche Verhaltensreferenz für entsprechend gekennzeichnete Befehle. Originalkürzel und tatsächliche Workspace-Belegung/Abweichungen getrennt dokumentieren; PO klärte nach Rückfrage: Alt+Shift+Oben/Unten verschiebt die aktuelle Textzeile unabhängig vom Ebenenlevel wie Org/Emacs; Alt+Oben/Unten bleibt Unterbaumtausch innerhalb gleichrangiger Geschwister.

Entwicklungsentscheidung im freigegebenen Rahmen: bestehendes Struktur-Tab als Standard bewahren, Org-Tab ausdrücklich für die Sitzung wählbar. Einzel-/Unterbaumoperationen eindeutig unterscheiden statt über versteckte Checkboxabhängigkeit. Alle Bedienwege verwenden Registry und dieselben Strukturprüfungen. Grenzen: Markdown H1–H6, keine Storage-/Formatänderung, kein Refile, keine neuen Aufgabenbereiche/Abhängigkeiten oder vollständiger Shortcuteditor. Developer/QA nacheinander; nach Bericht stoppen, M4b.2 benötigt neue Freigabe.

## Freigabe Phase 2 M4a — 2026-11-04

PO gibt Bestandsaufnahme, gemeinsames modulares Befehlsregister, durchsuchbare Palette über Alt+X, eigenes Editor-Kontextmenü und eine reduzierte Werkzeugleiste frei. Bestehende Funktionen bleiben erreichbar; technische Aktionen dürfen in einen Entwicklungsbereich wechseln. Maus, Tastatur, Kontextgründe sowie Fokus und Textauswahl sind Abnahmekriterien. Bestehende Themes und Pakete verwenden.

`COMMAND_GAMEBOOK.md` wird manuell bearbeitbare Planungsreferenz mit eindeutigen IDs, Bedienwegen, Kontext und Status. Einträge führen keinen Code aus und erteilen keine Freigabe. Register und Dokumentation auf Konsistenz prüfen. M4b wird nur architektonisch vorbereitet: keine frei konfigurierbaren Kürzel, Sequenzmaschine oder Folgehilfe implementieren.

Developer implementiert und testet; QA prüft unabhängig; Lead integriert. Markdown-Datenmodell und Storage-Sicherheitsmodell bleiben unverändert. Keine Aufgaben-/Journal-/Agenda-Funktionen, neuen Frameworks, dynamischen Plugins oder produktiven Vaults. Nach Abschlussbericht stoppen; weitere Meilensteine benötigen PO-Freigabe.

## Freigabe M3.2b — 2026-11-03

PO gibt Textformatierung über fünf einfache Schaltflächen frei: `**Text**`, `*Text*`, `<u>Text</u>`, `~~Text~~` und Inlinecode mit Backticks. Markierten Text gezielt formatieren, bestehende Formatierung möglichst erkennen/entfernen, Auswahl/Cursor und Undo/Redo korrekt behandeln. Keine unbeabsichtigte Formatierung in Codeblöcken oder Umdeutung von `_Text_`.

H1–H6 über deutlich unterscheidbare, kräftige aber angenehme zentrale Theme-Farben verbessern, mit Org-mode als visuellem Vorbild. Alle vier Themes und Kontraste prüfen; gespeicherte Hierarchie nicht durch Styling ändern. Vorhandene Codeflächen erhalten, kein neues Heading-Einrückungsverhalten, Sprachmodul oder Bibliothek. Keine Storageänderung, Palette, Agenda, Aufgabenverwaltung, Board oder Org-mode-Formatumstellung. Nur synthetische Daten; danach stoppen.

## Freigabe M3.2a.1 — 2026-11-03

PO berichtet M3.2a-Praxistest in Edge: Grundoperationen vorhanden, Bedienung/Darstellung verbessern. Freigegeben: Tab/Shift+Tab für echte Überschriften und Listen unter Beachtung der Children, Grenzen, Undo/Redo und QWERTZ; normale Codeeinrückung im Codeblock und zugänglicher Fokusausstieg. Sichere Markdown-kompatible hierarchische Listen, mindestens fünf Ebenen, konfigurierbare visuelle Marker und hierarchische Zahlenanzeige. Keine inkompatiblen Präfixe ohne neue Entscheidung.

Optional rein visuelle Überschrifteneinrückung, platzsparend; themenabhängige Codeblockflächen mit Rand/Seitenmarkierung in vier Themes. Spätere Sprachmodule, alphanumerische Nummerierung, Textfarben mit offenem Speicherformat und gemeinsame Befehlsoberfläche für Kontextmenü/Palette nur vormerken. Keine Textfarbfunktion/Palette implementieren, keine Storage-/Framework-/Abhängigkeitsänderung. Nach Abschluss stoppen.

## Freigabe M3.2a und Rollenbereinigung — 2026-11-03

PO erlaubt zunächst die Entfernung veralteter pauschaler Rollenverbote. Developer implementiert/testet ausdrücklich freigegebene, delegierte Anwendungspakete; QA darf unabhängige Prüfaufträge mit synthetischen Daten ausführen, keine eigenmächtigen Codefixes. Tech Lead koordiniert/reviewt/integriert und implementiert nur bei technisch unmöglicher Delegation oder begründetem Ausnahmefall. Storage bleibt für sicherheitskritische Speicheränderungen zuständig, Documentation nur auf ausdrücklichen Auftrag. Rollenübernahme vor Anwendungscode prüfen; bei nötigem Neustart bis bestätigter Übernahme stoppen. Rollenformat und praktischer Nachweis in AGENT_TEAM.md.

Danach ausschließlich Überschriften verschieben samt Unterbaum, Ebenen H1–H6 einzeln/mit Unterstruktur ändern sowie Listen einzeln/mit Children verschieben, ein-/ausrücken und Präfixe ändern. Sinnvolle Nummerierung, atomare Undo-/Redo-Schritte, fremde Außenbereiche erhalten, keine Aktionen aus Codeblöcken. Schlichte Schaltflächen, Maus/Tab/Enter/QWERTZ; keine störenden neuen Browserkürzel. Vorhandene Tests/Folding/Storage unverändert absichern. M3.2b Formatierung/visuelle Einrückung und andere Produktbereiche bleiben gesperrt. Keine neuen Abhängigkeiten ohne vorherige Begründung/Freigabe; keine Storageänderung, persönlichen Vaults oder Veröffentlichung.

## M3.2-Anforderungsergänzung — 2026-11-03

PO bestätigt für die Planung: optionale visuelle Überschrifteneinrückung ohne Rohtextänderung, Überschriften samt Unterabschnitten verschieben, Listenoperationen einzeln/mit Children sowie Präfixwechsel und Undo/Redo. Formatierungsbefehle für Fett, Kursiv, Unterstrichen, Durchgestrichen und Inlinecode; Unterstreichung standardmäßig `<u>Text</u>`, keine Umdeutung von `_Text_`. Bestehende Markdown-Syntax und fremde Formatierungen möglichst erhalten. Minimalistisches Design, Tastatur und vollständige Mausbedienung, QWERTZ. Storageänderungen nur nach gesonderter Freigabe. **M3.2 bleibt Planung, keine Implementierungsfreigabe.**

## Freigabe Phase 2, Meilenstein 3.1 — 2026-11-03

PO berichtet erfolgreichen M3-Edge-Test für Ein-/Ausklappen und Verschachtelung. Freigegeben: kontextabhängiges Folding aus dem Abschnittsinhalt, sinnvolle Cursorbehandlung, mehrstufige Sichtbarkeit samt explizitem vollständigem Öffnen sowie bessere H1–H6-/Syntaxfarben über Theme-Tokens. Markdowntext und Storage-Sicherheit unverändert halten; vorhandene CodeMirror-Mechanismen zuerst prüfen. Keine neuen Produktbereiche, Animationen oder Frameworks.

M3.2-Struktur- und Formatierungsfunktionen sind ausschließlich geplante Anforderungen, keine Implementierungsfreigabe. Standardmäßig kompatible Markdown-Syntax, optionale Org-mode-Abweichungen nur nach separater Entscheidung. Details in M3_2_STRUKTURPLAN.md. Nach M3.1 stoppen und Rückmeldung abwarten.

## Freigabe Phase 2, Meilenstein 3 — 2026-11-03

PO gibt ausschließlich einklappbare Markdown-Abschnitte frei: H1–H6, Inhalt bis zur nächsten gleich- oder höherrangigen Überschrift, Kinder beim Elternfold verborgen. Kleine Mausmarkierung, QWERTZ-taugliche Tastaturbedienung und sichtbare Auslassung. Kein Textverlust oder Schreiben von Faltzuständen in Markdown-Dateien; Themes und Syntax bleiben erhalten.

Bestehende CodeMirror-Funktionen bevorzugen, kein eigener Markdown-Parser, Framework oder unnötiges Paket. Lange Dokumente und unveränderte Speicherung berücksichtigen. Keine Agenda, Wiki-Links, Palette, Tastensequenzen, Boards oder weiteren Themes. Nur synthetische Vaults; weitere Entwicklung nach Abschluss erst nach PO-Rückmeldung.

## Freigabe Phase 2, Meilenstein 2 — 2026-11-03

PO gibt ausschließlich ein schlankes Theme-Grundgerüst frei: Midnight (Standard, Anthrazit/Blau), Terminal (Dunkel/Grün), Nord (gedämpftes Blau/Grau) und Paper (warm/hell). Auswahl in der Oberfläche, sofortiger Wechsel ohne Reload und lokale Wiederherstellung beim nächsten Start. Zentrale CSS-Tokens, konsistente UI-/Editor-/Syntaxfarben und lesbare Auswahl, Cursor und Codeblöcke.

Theme-Daten möglichst unabhängig von CodeMirror; spätere Bibliothek und eigene JSON-Themes architektonisch ermöglichen. JSON-Import/-Export, Theme-Editor und Skins sind noch nicht freigegeben. Keine Markdown-/Storageänderungen, Hintergrundprozesse, Animationen, neuen Frameworks oder unnötigen Abhängigkeiten. Developer implementiert, QA prüft unabhängig; Storage nur bei tatsächlichem Bedarf. Bestehende Tests müssen bestehen. Keine produktive Nutzung oder Veröffentlichung.

## Produktplanung: Themes und Skins — 2026-11-03

PO bestätigt eine langfristige ressourcenschonende Theme-Bibliothek mit den in REQUIREMENTS.md aufgeführten Stilrichtungen. Farbthemes und aufwendige Skins werden getrennt; zuerst schlankes System mit mehreren Paletten, später Skins und Theme-Editor mit Live-Vorschau. Design-Tokens, eigene datenbasierte JSON-Themes ohne Programmierung, lokaler Wechsel ohne Neustart und ohne externe Ladeabhängigkeit sind Anforderungen.

Grenzen: kein ausführbarer Code in Themes, keine Inhaltsänderung, keine unnötigen Animationen/Hintergrundeffekte; lesbare Texte und barrierearme Kontraste. Bei Veröffentlichung keine ungeklärten Markenassets/geschützten Grafiken mitliefern. Noch keine Implementierung, Paketwahl, konkretes JSON-Schema oder Auswahl der ersten Paletten beschlossen. Technischer Vorschlag und Abnahmegrenzen in ARCHITECTURE.md und REQUIREMENTS.md.

## Freigabe Phase 2, Meilenstein 1 — 2026-11-03

Nach erfolgreichen QA- und parallelen Storage-/Developer-Reviews: direktes Speichern mit Konfliktprüfung und verifizierter Sicherung; externes Schreibrennen ausschließlich für synthetische Testdaten als Restrisiko akzeptiert. Keine persönlichen oder produktiven Vaults. Sicherungen separat im Test-Vault, keine automatische Löschung.

CodeMirror 6 und notwendiger Buildprozess sind für Öffnen, Rohtextbearbeitung und explizites Speichern freigegeben. Schlichte Oberfläche, Tastatur/Maus, QWERTZ; Performanceziele bleiben vorläufig. Kein neues Datenmodell, Framework, Cloud-Dienst, Agenda, Wiki-Links, Board oder Pluginplattform. Weitere Meilensteine benötigen Freigabe.

Abnahme: unveränderte Dateien ohne Schreibstream; erkannte externe Änderungen blockieren Speichern und erhalten Entwürfe; keine Markdown-/YAML-Umformatierung; bestehende Storage-Tests bleiben bestehen. Developer und Storage implementieren abgegrenzt, anschließend unabhängige QA. Kein Produktionsnachweis.

## Freigabe: Teamaktivierung und Bedienungsanforderungen, 2026-11-03

Kontext: vier Projektrollen wurden vom PO geprüft. Entscheidung: Konfiguration grundsätzlich freigegeben, Subagenten aktivieren; Limit zwei beibehalten. Aktuell ausschließlich ein lesender QA-Dokumentationsauftrag autorisiert, keine Tests, Dateiänderungen durch QA oder Unterdelegation. Phase 2 bleibt gesperrt. Ein fehlender Rollenstart darf nicht durch einen Lead-Bericht als Delegationserfolg ersetzt werden.

Zusätzlich bestätigt: tastaturzentrierte Bedienung mit vollständiger Maus-Erreichbarkeit wesentlicher Funktionen, mehrstufige Sequenzen samt Folgehilfe, durchsuchbare Command Palette, DE-DE/QWERTZ, langfristige Kürzelkonfiguration, Schutz normaler Texteingabe, Berücksichtigung von OS-/Browserkonflikten und keine unnötigen Animationen/dauerhaftes Hintergrund-Polling. Beispiele wie `G → J`/`G → A` und `Strg+K` legen noch keine finalen Belegungen fest. Abnahme und Grenzen stehen in REQUIREMENTS.md; Implementierung erst nach eigener Phasenfreigabe.

QA-Auftrag langfristig um Langzeitstabilität, Memory Leaks und schleichende Performanceverschlechterung über Stunden ergänzt. Kein solcher Test ist mit dieser Freigabe durchgeführt oder als bestanden bewertet.

## Freigabe 2026-11-03

Kontext: Architekturplanung mit Product Owner geprüft. Optionen: weiter planen oder begrenzten Storage-Spike durchführen. Entscheidung: Phase 0 freigegeben; Phase 1 gemäß PHASES.md darf beginnen, einschließlich temporärem localhost-Testbetrieb mit vorhandenen Werkzeugen. Keine Installation, Produktoberfläche, Editorbibliothek oder Phase 2.

Konsequenzen/Abnahme: nur synthetische Daten unter `test-vault`, frei gewählter vom Browser erlaubter Ordner, Test-Vault-Wechsel möglich, vorhandene Bytes und unbekannte Metadaten erhalten. Konflikte und Datenverlust haben Vorrang. Automatische Tests ausführen; interaktive Edge-Fälle bleiben bis Nutzerprüfung offen. Ergebnisse und Sicherheitsgrenzen in STORAGE_SPIKE.md. Freigabe des Experiments ist keine Akzeptanz des externen Schreibrennens und keine Produktfreigabe.

Hier nur Entscheidungen festhalten, die der Product Owner bestätigt hat. Für jede Entscheidung: Datum, Kontext, Optionen, Entscheidung und Konsequenzen.

## Bestätigte Produktentscheidungen
- 2026-11-02: Beliebiger lokaler Vault-Ordner; OneDrive optional.
- 2026-11-02: Klassisches Markdown-Schreibgefühl mit begrenzten Hybrid-Funktionen.
- 2026-11-02: Edge/PWA zuerst; portable EXE eventuell später.

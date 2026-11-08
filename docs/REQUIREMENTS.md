# Anforderungen (Stand 2026-11-03)

## M7b — Freigabe 2026-11-08

Agenda-Dispatcher C-c a mit zweispaltigem kompaktem Layout; a öffnet Wochenagenda, t offene TODO-Liste, m/s bleiben inaktiv geplant. Deutsche Mo–So-Woche mit ISO-Wochenjahr, aktuelle Woche default, SCHEDULED/DEADLINE/Zeiten/Quelle/Status sowie offene Rückstände darstellen, taggleiche Terminarten zusammenführen. Lokale Tasten f/b/./q/Escape/Pfeile/Enter und Maus, geschlossene Zustände im TODO-Filter einblendbar. M7a-Index/Registry/Themes/Panelbausteine nutzen, Refresh/Saveupdates/Vaultwechsel/Quellnavigation sicher integrieren. Editorentwurf und Storage-Schutzzustand erhalten. Synthetischer Probevault, unabhängige QA und konkrete native Testanleitung erforderlich. Grenzen und Abnahme: [M7B_AGENDA.md](M7B_AGENDA.md); keine weiteren Agenda-Funktionen, Dependencies oder Commit/Push.

## M7a — Freigabe 2026-11-08

Lesender, vollständig aus Vault-Markdown rekonstruierbarer Aufgaben-/Terminindex für H1–H6 einschließlich Hierarchie, dateilokalem SEQ_TODO, Offen-/Abgeschlossen-Klassifikation und M6a-SCHEDULED/DEADLINE mit optionaler Zeit/Zeitfenster. Termine auch ohne TODO; Checklisten sind keine Aufgaben. Rekursiver Aufbau, Update nach erfolgreichem Speichern, Reset beim Vaultwechsel, expliziter Refresh externer Änderungen. Fehler einzelner Quellen isoliert und nachvollziehbar melden; veraltete asynchrone Ergebnisse dürfen neuere Daten nicht ersetzen. Editorentwürfe und Storage-Schutzmechanismen erhalten. Abfragen und Quellenzuordnung für M7b vorbereiten, keine dauerhaften IDs behaupten. Details: [M7A_AGENDA_INDEX.md](M7A_AGENDA_INDEX.md). Keine Agendaoberfläche/Dispatcher/C-c a/Repeater/Benachrichtigungen/Dependencies/Commit/Push. Frühere Indexsperren gelten für diesen Umfang nicht mehr.

## M6a — Freigabe 2026-11-07

PO-Korrektur 2026-11-08: Kalender-Tagesaktivierung übernimmt direkt und schließt, ohne Übernehmen. Bestehende Uhrzeiten erhalten; Zeitbearbeitung direkt im <...>-Text. Automatischer Wochentag bei gültiger Datum-/Zeit-Rohtexteingabe, keine Mutation ungültiger Zwischenstände oder unberührter Angaben, atomare Undo/Redo.

Aktuelle PO-Nachbesserung nach Referenzbildern: Ersatzfolgen C-c s/C-c d (s/d unmodifiziert nach Loslassen), kompakte vorherige/aktuelle/nächste Monatsgruppe, gesonderte Editorfarben für Planungswörter und unterstrichene volle Zeitstempel. Künftiger Datumsklick zur Tagesagenda im Zusatzpanel wird nur für M7 vorgemerkt; derzeit keine funktionslose Klickaktion.

Scheduling/Deadlines/Datumswahl gemäß [M6A_SCHEDULING.md](M6A_SCHEDULING.md) freigegeben. H1–H6 auch ohne TODO, beide Eigenschaften unabhängig, deutsche Wochentage automatisch, optionale Zeit/Zeitfenster, Kalender und Tastatureingabe, Vorschau/Entfernen/Abbruch. C-c C-s und C-c C-d mit nativer Konfliktprüfung; Registry/Palette/Kontextmenü wiederverwenden. Keine Agenda/Repeater/Storageänderungen/Dependencies.

## TODO-Paket freigegeben — 2026-11-07

Bestätigter Nachtrag in PLAN_TODO_AGENDA.md samt angenommenen Randregeln in DECISIONS.md ist zur Umsetzung freigegeben. Jede H1–H6 kann eine eigene Aufgabe sein; verschachtelte Aufgaben gehören strukturell zu ihren Vorfahren und behalten unabhängige Zustände. Keine implizite Statusvererbung oder Eltern-/Kindänderung. Spätere Agenda berücksichtigt diese Hierarchie, ist aber nicht Teil dieses Pakets. Statusänderung betrifft nur den Präfix genau einer Überschrift, atomar Undo/Redo. Auswahl-/Fokus-/Dateigrenzen schützen; native Browserprüfung separat.


## TODO-/Agenda-Kürzel — Planung 2026-11-07

PO bestätigt die Vorbereitung von C-c t für Statusänderung und C-c a für einen Agenda-Dispatcher. Als geplante Belegungen reservieren, nicht aktivieren. Nach Strg+C alle Tasten loslassen, dann t/a ohne Modifier; normale Eingabe außerhalb des Präfixes bleibt erhalten. Syntax, Statusliste, Auswahl/Zyklus und Agendaumfang noch offen. Konkrete Gesprächsvorlage mit kleinem Überschriftenstatus-Paket, Abnahmekriterien und Grenzen: [PLAN_TODO_AGENDA.md](PLAN_TODO_AGENDA.md). Keine TODO-/Agenda-/Index-/Konfigurationsimplementierung, Dependencies/Storageänderung oder Commit/Push freigegeben.

## Refile innerhalb der Datei unter H1 — Freigabe 2026-11-06

C-c w (Strg+C, C und Strg loslassen, dann W ohne Modifier) verschiebt den aktuellen Überschriftenteilbaum einschließlich Kindern unter eine H1-Zielüberschrift derselben Datei als letztes Kind. PO meldet Browser-Tabschließen bei bisherigem C-c C-w und autorisiert diese gezielte Abweichung vom Org-Original; Alt+W bleibt Copy. Der Cursor darf auf der Überschrift oder im zugehörigen Inhalt stehen; eine Unterüberschrift bezeichnet ihren eigenen Teilbaum, nicht automatisch den Vorfahren. Quellstufe H1–H6, neue Wurzel H2, relative Kinderstufen erhalten; Überlauf über H6 vollständig verweigern. Nur einzelner Cursor, keine Regionsverschiebung. Eigenen Teilbaum/Kinder als Ziele ausschließen; identische Position ohne unnötige Textänderung behandeln.

Bestehendes unteres Panel für Suche, Tab-Vervollständigung, Pfeile/Alt+Oben/Unten und Enter sowie Escape/Strg+G wiederverwenden. Gleichnamige Ziele eindeutig anzeigen. Öffnen/Abbrechen ändert keinen Text; Ausführung atomar mit Undo/Redo und sinnvoller Cursorposition, vor Ausführung Zielzustand erneut prüfen. Frontmatter-/Code-/Markdown-/Unicode-/Dateigrenzen und bestehende Storage-Sicherheit erhalten, unsichere Markdown-Kontexte klar verweigern. Nur H1-Ziele derselben Datei; H2–H6-Ziele und dateiübergreifendes Refile separat. Developer implementiert modular, QA unabhängig, native PO-Probe folgt. Keine Dependencies/Storageänderungen/Agenda/TODO/Commit/Push.

## Präfixhilfe — Navigation bei kleinem Fenster, 2026-11-06

Bei geviertelter Ansicht auf 1920×1080 sollen auch zunächst unsichtbare Folgebefehle erreichbar sein: Alt+Oben/Unten markiert die vorige/nächste Option, Enter führt aus, Ergebnisse scrollen ausschließlich lokal zur markierten Zeile. 1/2/3 bleiben direkte Auswahl, Escape/Strg+G bricht ab. Kill-Ring-Navigation wiederverwenden, Fokus im Editor und Textausschnitt erhalten; AltGr/IME/Modifier/Repeat, Kontext-/Dateiwechsel und bestehende Org-Alt-Aktionen schützen. Alt+W-Hinweis vorerst unverändert belassen. Nur diese Ergänzung, unabhängige QA und native kleine-Fenster-Probe; keine Dependencies/Storageänderung/Commit/Push.

## C-c-Präfix — Copy-Umschalt-Gate erfüllt, 2026-11-06

PO nimmt den funktionierenden Copy/Paste-Ersatz ab und gibt AP-06 ausdrücklich frei. Im fokussierten Editor startet Strg+C die Folgehilfe; 1 klappt ein, 2 öffnet die nächste Sichtbarkeitsstufe, 3 öffnet vollständig über bestehende Befehle. Alt+W bleibt Copy, außerhalb des Editors bleibt Strg+C Copy. Auswahl beim Präfixstart erhalten, Escape-Abbruch/Fokusausstieg und Kontext-/Modifier-/IME-/Repeat-/Cleanupschutz prüfen. Frühere Hinweise „C-c bleibt Copy“ beschreiben das vorherige Gate. Unabhängige QA gemäß AP-07; native Produktprobe nach Umsetzung, keine neuen Fachfunktionen/Dependencies/Storageänderungen oder Commit/Push.

## Unterer Arbeitsbereich — PO-Nachbesserung 2026-11-06

Editor und Ringauswahl teilen sich horizontal eine begrenzte gemeinsame Höhe. Öffnen verkleinert den Editor, Schließen vergrößert ihn; Ergebnisse scrollen im unteren Bereich. Alt+Oben/Unten navigiert Kandidaten, Tab vervollständigt Suchtext, Enter fügt ein, Escape/C-g schließt. Cursor/Auswahl, Dokument/Undo und möglichst stabiler sichtbarer Textausschnitt bleiben bei Größenänderung erhalten; keine unbeabsichtigte Seitennavigation durch Fokus oder Ergebniswahl. Grenzen bei unvermeidbarer Scrollbegrenzung am Dokumentende transparent testen. Vorhandene Ring-/Clipboard-/AltGr-/IME-/Fokus-/Cleanupregeln erhalten; C-c bleibt Copy. Nur diese Nachbesserung, keine Agenda/TODO, neue Pakete oder Storageänderung.

## C-c / Emacs-Copy-Ersatz — Freigabe 2026-11-05

PO autorisiert den [TXT-Plan](PLAN_C_C_KILL_RING.txt) mit bestätigtem AP-00 und ausdrücklich modularer, später anpassbarer Umsetzung. C-SPC aktiviert die Marke, M-w kopiert, C-x schneidet Region aus; C-y fügt am Cursor ohne Auswahlersetzung ein, M-y ersetzt im direkten Yankzyklus einzeln undo-fähig oder öffnet die untere Ringauswahl. Redo bleibt über C-Shift-z/Maus/Palette. 120 Einträge/8 MiB UTF-8-Text nur RAM pro Workspace/Tab, Vaultwechsel/Reload leert; Dateiwechselschutz und ungültige asynchrone Zielanfragen sind verbindlich. Externe tatsächlich eingefügte Texte ohne Duplikate übernehmen, Clipboardfehler klar melden; kein stiller veralteter Ersatz bei expliziter externer Paste. Gemeinsame Registry, getrennte Policy/Ring/Clipboard/Editor-/Panelmodule; keine neuen Pakete, Storageänderung, Agenda oder TODO.

AP-01-Handprobe vom PO positiv berichtet: gewünschte Kürzel zugestellt/verhindert, Clipboard-Lesen/-Schreiben erfolgreich, keine Auffälligkeit; AltGr/IME ungeprüft. AP-02 bis05 implementieren und unabhängig testen; C-c bleibt Copy, bis PO den funktionierenden Ersatz abnimmt. Erst danach C-c 1/2/3 für bestehende Faltbefehle aktivieren. Native Testseite allein ersetzt keine Produktabnahme. Keine automatische Commit-/Pushfreigabe.

## Return und Listenteilbaum — PO-Korrektur 2026-11-05

Return fügt im Listenitem eine passend eingerückte Fortsetzungszeile desselben Items ein; Alt+Return erzeugt einen neuen Listenpunkt. Shift+Alt+Return bleibt Checkboxeinfügen. Nach physischem Zeilenverschieben darf Shift+Alt+Links nur das aktuelle Item und tatsächlich tiefer eingerückte Kinder ausrücken: ein nachfolgender geringer eingerückter Punkt gehört nicht dazu. Abnahme: konkretes PO-Beispiel, echte Kinder, Fortsetzungen, Cursor und atomare Undo/Redo sowie bestehende Schutz-/Tastaturtests. Nur gezielter Bugfix, unabhängige QA; keine Storageänderung, Abhängigkeit, weiterer Meilenstein oder Commit/Push.

## Listen-Tab und Einfügen — PO-Korrektur 2026-11-05

Auf leerem Item Tab/Shift-Tab Hierarchie sinnvoll ändern und logische Cursorposition erhalten. Auf textgefülltem Item Tab ausschließlich Unterpunkte ein-/ausklappen; ohne Children keine Änderung. Shift-Tab auf nichtleerem Item globale Sichtbarkeit schließen beziehungsweise stufenweise öffnen. Alt-Enter erzeugt Listenpunkt, Shift-Alt-Enter ungeprüften Checkboxpunkt (`- [ ]`). Nur passender Listenkontext, verschachtelte gültige Markdown-Struktur; kein Textverlust/Überschreiben, alle Textänderungen atomar Undo/Redo. Folding ausschließlich Ansicht. Außerhalb Listen bisheriges Tab/Heading-/Code-/AltGr-/IME-Verhalten und Escape-Fokusausstieg erhalten. Bestehende Registry/Planer und native Folding-APIs wiederverwenden; Storage-/Konflikt-/Integritätssicherheit unverändert. Kleine nachvollziehbare Implementierung und unabhängige QA, danach stoppen.

## Aktuelle Freigabe M4b.1a — Org-Listensteuerung

Nur vorhandene Listenoperationen gezielt anhand offizieller Org-Dokumentation/Orgcard ergänzen. Originalsemantik hat Vorrang: Alt-Auf/Ab tauscht Items einschließlich Unterpunkten mit gleich eingerückten Nachbarn; Shift-Alt-Auf/Ab bleibt physische Zeilenbewegung. Alt-Links/Rechts ändert einzelnes Item ohne Children-Einrückung, Shift-Alt auch dessen Teilbaum. Tatsächliche Sonderregeln prüfen, keine eigene Semantik erfinden. Mindestens fünf Ebenen, Standardmarker `-`, `*`, `+`, `1.`, mehrzeilige Items, Nummerierung und Hierarchiegrenzen berücksichtigen.

Vorhandene Registry/Planer verwenden, Headingkürzel und korrigierte Alt-Präzedenz/AltGr-/Fokusgrenzen erhalten. Tab/Shift-Tab soweit kompatibel bewahren; atomare Undo-/Redo-/Cursorprüfung. Developer implementiert, QA unabhängig; 110 bisherige Tests als Basis. Einschränkungen und echte Browsernachweise trennen; tatsächliche Edge-bedingte Umbelegung vorher mit PO besprechen. Kein Refile, Shortcuteditor, Framework, Storageänderung, Aufgabenbereich oder anderer Meilenstein. Budgetbewusst begrenzt arbeiten; getesteten Zwischenstand statt unkontrollierter Erweiterung berichten. Nach Bericht stoppen, M4b.2 gesperrt.

## Aktuelle Freigabe M4b.1 — 2026-11-04

PO-Rückmeldung und Bugfixfreigabe: Alt-Links/Rechts löst in Edge noch Cursorbewegung statt Struktur aus; Alt-Auf/Ab und Shift-Alt-Auf/Ab funktionieren laut PO grundsätzlich. Shortcut-Präzedenz korrigieren. Alt allein soll bei tatsächlichem Editorfokus die Browserauswahl/-menüaktivierung unterbinden, soweit Browserereignisse dies erlauben; AltGr/IME und Verhalten außerhalb des Editors erhalten. Kein globaler Alt-Blocker. Bei Browsergrenze eine ähnlich erreichbare Alternative vorschlagen, keine unbelegte Erfolgsbehauptung. Developer korrigiert, QA prüft unabhängig; M4b.2 bleibt gesperrt.

Org-Handbuch/Orgcard sind verbindlich für ausdrücklich Org-kompatible Befehle. Alt+Links/Rechts verändert nur aktuelle Überschrift beziehungsweise Listenpunkt; mit Shift Unterbaum, unabhängig von bisheriger Unterstrukturwahl. Alt+Oben/Unten verschiebt einschließlich Unterbaum innerhalb gültiger Geschwister und Eltern-Grenzen. H1–H6 atomar prüfen, Ebenen beim Verschieben unverändert lassen; Undo/Redo und sinnvolle Cursorposition erhalten. PO-Klarstellung: Alt+Shift+Oben/Unten verschiebt die aktuelle physische Zeile unabhängig von Überschriftenebenen wie Org/Emacs; keine automatische Änderung der Überschriftenmarker. Sichere Markdown-/Auswahlgrenzen ausdrücklich dokumentieren.

Struktur-Tab bleibt Standard. Explizite Org-Tab-Sitzungsoption ergänzt lokale/globale Sichtbarkeit; Konflikte für Überschriften, Listen und Code sowie Escape-Fokusausstieg sichtbar erklären. Registry für alle Bedienwege, bestehende IDs möglichst erhalten, einfache Shortcutübersicht in Palette. Org-Original und Workspace-Kürzel/Abweichungen getrennt im Gamebook dokumentieren. Nur erkannte Editorbefehle abfangen, AltGr/IME und normale Texteingabe schützen; Edge-Zustellung tatsächlich prüfen oder offen ausweisen.

Abnahme: verschachtelte/übersprungene Ebenen, H1/H6, Einzel-/Unterbaumvarianten, Listen, Faltkonflikte, Cursor/Auswahl, Undo/Redo und alle 95 bisherigen Tests. Developer implementiert, QA unabhängig; ausschließlich synthetische Daten. Kein Refile, dateiübergreifendes Verschieben, Aufgaben/Journal/Agenda, Shortcuteditor, Storageänderung, neue Formate oder Abhängigkeiten. M4b.2 gesperrt; nach Bericht stoppen.

## Aktuelle Freigabe M4a — 2026-11-04

Bestandsaufnahme und gemeinsames modulares Command Registry für vorhandene Aktionen; Palette über Alt+X mit Suche in Name/Beschreibung/Kategorie, Pfeiltasten/Enter/Escape und Maus. Editor-Kontextmenü verwendet dasselbe Register. Kontextbedingungen mit verständlichen Sperrgründen, Fokus-/Auswahlerhalt und Schutz normaler Texteingabe sind verbindlich. Browsermenüs außerhalb des Editors erhalten. Bestehende Werkzeugleiste reduzieren, jede Aktion weiterhin zugänglich machen; technische Testaktionen gesondert halten.

Bearbeitbares `COMMAND_GAMEBOOK.md`: ID, Name/Kategorie, Verhalten, Kontext, Bedienwege, gewünschte Kürzel, Status (Implementiert/Teilweise implementiert/Geplant/Idee), offene Fragen. Keine ausführbare Konfiguration oder automatische Implementierungsfreigabe. Konsistenz mit Registry prüfen. M4b nur vorbereiten; keine Kürzelkonfiguration oder mehrstufigen Sequenzen implementieren. Bestehende Themes/Pakete nutzen; keine Storage-/Markdown-Modelländerungen. Developer implementiert, QA prüft unabhängig; nach Bericht stoppen. Frühere Planungssperren für Palette/Kontextmenü sind ausschließlich in diesem Umfang aufgehoben.

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

## Markdown-Folding (Phase 2 M3 freigegeben)

- H1 bis H6: Abschnitt enthält seinen gesamten Inhalt einschließlich untergeordneter Überschriften bis zur nächsten Überschrift derselben oder einer höheren Ebene.
- Ein-/Ausklappen per kleiner Randmarkierung und QWERTZ-tauglichen Kürzeln; dezente Auslassung zeigt den verborgenen Inhalt an. Normale Texteingabe darf nicht abgefangen werden.
- Falten ist ausschließlich Ansichtszustand: kein Markdown-/YAML-Eingriff, keine Storageänderung. Nach Ausklappen ist der Originaltext vollständig erhalten. Syntax und alle vier Themes bleiben nutzbar.
- Vorhandenen Markdown-Parser und Folding-APIs nutzen; lange Dokumente berücksichtigen. Keine neuen Pakete, falls vorhandene Module ausreichen, keine Animationen oder weiteren UI-Funktionen.

Abnahme: H1–H6-/Verschachtelungsgrenzen, ignorierte Überschriften in Code, Text-/Undoerhalt und Themewechsel automatisiert prüfen; Maus, Kürzel, Auswahl und Sichtbarkeit in Edge anschließend praktisch prüfen. Faltzustände werden in M3 nicht dauerhaft gespeichert; bei Datei-/Entwurfswechsel oder Reload gelten neu aufgebaute Ansichten.

## Phase 2 M3.1: Kontext, Sichtbarkeitsstufen und Lesbarkeit

- Cursor in Absatz, Liste oder Codeblock findet den zugehörigen nächstgelegenen Überschriftenabschnitt. Ohne Überschrift ist lokale Listen-/Codeblockfaltung möglich. Wird die Cursorstelle verborgen, Cursor auf die sichtbare Überschrift bzw. Blockanfangszeile setzen.
- Stufenweise öffnen: geschlossen → reine Gliederung → Text des Abschnitts und seiner direkten Kinder → vollständig. In der Gliederung bleiben alle Unterüberschriften sichtbar; in der nächsten Stufe bleiben nur tiefere Textkörper verborgen. Gleiche Stufen überspringen. Bei manuell gemischten Falten öffnet der nächste Schritt vollständig, ohne neuen Text zu verstecken.
- Expliziter Befehl zum vollständigen Öffnen, auch per Maus und Tab/Enter erreichbar. Bestehende QWERTZ-Kürzel und Randmarkierungen bleiben; normale Texteingabe und Storage unverändert.
- H1–H6 mit eigenen zentralen Theme-Tokens und zurückhaltender Gewichtung unterscheiden. Erkannte Code-, Link-, Zitat- und Syntaxmarkierungen differenzieren; vier Themes und Kontraste prüfen, keine Editor-Festfarben oder Effekte.

Abnahme: Kontext-/Cursor-/Stufentests, keine erneute Verbergung beim Öffnen, unveränderter Text/Undo, Erhalt anderer Abschnitte, Theme-/Kontrastprüfung. Echte Edge-Maus-/QWERTZ-/Fokus-/Zoomprüfung bleibt eigener Praxisnachweis. Keine neuen Pakete nötig. M3.2 nur vormerken: [Strukturplan](M3_2_STRUKTURPLAN.md).

## M3.2: ergänzte Planungsanforderungen

### Aktuelle Freigabe M3.2b

Fett, Kursiv, Unterstrichen, Durchgestrichen und Inlinecode für markierten Text per Schaltflächen erzeugen und möglichst wieder entfernen. Ausgabe `**…**`, `*…*`, `<u>…</u>`, `~~…~~`, Backticks; `_Text_` behält seine Bedeutung. Änderungen auf Auswahl/gezielte Begrenzungen beschränken, Undo/Redo und sinnvolle Auswahl erhalten. Codeblöcke einschließlich überlappender Auswahl schützen. Keine unnötige Neuformatierung anderer Bereiche.

H1–H6 müssen in jedem der vier Themes auf Anhieb farblich erkennbar verschieden sein; unterschiedliche Paletten je Theme erlaubt, kräftig aber angenehm. Zentrale Tokens, Kontrast und tatsächliche Syntaxzuordnung prüfen. Codeflächen erhalten; keine neue visuelle Einrückung oder Änderung der gespeicherten Hierarchie. Frühere Planungssperren für die fünf Formatierungsbefehle sind damit aufgehoben, nicht für Textfarbe oder weitere Produktbereiche.

Abnahme: Ein-/Entfernen der fünf Formate samt Auswahlrichtungen, Unicode, Syntaxgrenzen, Undo/Redo, Codeblockschutz und Außenbereichserhalt prüfen. Alle bisherigen Tests, Theme-Kontraste und Codeflächenregeln weiterführen. Echte Edge-Maus-/Tastatur-/Darstellungsprüfung separat ausweisen. Keine neuen Abhängigkeiten oder Storageänderung.

Historischer Planungsstand vor M3.2a.1/M3.2b (durch obige Freigabe begrenzt überholt): M3.2a ausschließlich für Überschriften-/Listenstrukturverwaltung, nach tatsächlich bestätigter Rollenübernahme. Atomare Undo-/Redo-Operationen; keine Aktionen aus Codeblöcken; vorhandenes Folding und fremde Außenbereiche erhalten. M3.2b war damals Planung. Keine Storageänderung und keine neue Abhängigkeit ohne gesonderte Freigabe.

Optionale visuelle Überschrifteneinrückung nach Hierarchie ohne Rohtextänderung und ohne Aufgabe des minimalistischen Designs. Überschriften mit Unterabschnitten verschieben; Listenpunkte einzeln oder mit Children verschieben, ein-/ausrücken und Präfixe ändern. Struktur- und Formatierungsoperationen über Undo/Redo rückgängig machen. Fett, Kursiv, Unterstrichen, Durchgestrichen und Inlinecode per Tastatur sowie Maus bedienbar; QWERTZ unterstützen.

Unterstreichung für M3.2b standardmäßig `<u>Text</u>`; `_Text_` nicht umdeuten. Bestehende Markdown-Syntax und fremde Formatierungen möglichst erhalten. **Keine Storageänderung ohne gesonderte Freigabe.** Abnahme und Bedienungsdetails im [M3.2-Strukturplan](M3_2_STRUKTURPLAN.md); aktuelle Umsetzung nur im ausdrücklich freigegebenen M3.2b-Umfang oben.

## Ergänzung: Tastaturbedienung und Command Palette (freigegebene Anforderung)

### Freigegebener Abschnitt M3.2a.1

- Tab in einer tatsächlichen Überschriftenzeile stuft H1→H2 ab, Shift+Tab hebt an; in Listen ein-/ausrücken. Vorhandene Einzel-/Unterstrukturwahl respektieren, H1/H6 und ungültige Listenaktion atomar behandeln.
- In Codeblöcken Codeeinrückung beibehalten. Normale Texteingabe/QWERTZ nicht abfangen. Ein klar dokumentierter Tastaturweg aus dem Editor muss auch bei ungültiger Aktion funktionieren; keine dauerhafte Fokusfalle.
- Mindestens fünf Listenebenen, sichere Strukturanpassung und konfigurierbare Anzeige je Ebene. `-`, `*`, `+`, `○`, `●` und Nummern wie `1.1`, `1.2.1` dürfen visuell angezeigt werden, ohne inkompatible Markdown-Präfixe zu speichern. Alternative `1.a`/`1.b` erst später.
- Optionale dezente, gedeckelte visuelle Überschrifteneinrückung ohne Rohtextänderung. Codeblöcke durch Theme-Hintergrund und Rahmen/Seitenmarkierung abgrenzen; Auswahl/Cursor müssen sichtbar bleiben. Alle vier Themes, keine Effekte oder neuen Frameworks.
- Sprachsyntax später modular erweitern. Textfarbe per Auswahl/Kontextmenü, vordefinierte/eigene Farben, offenes kompatibles Speicherformat und Kontextmenü/Palette als gemeinsame Befehlsoberfläche nur dokumentieren; keine Umsetzung.

Abnahme: reale CodeMirror-Tastenbehandlung einschließlich Fokusausstieg, Undo/Redo und fünf Ebenen, Anzeige ohne Dokumentänderungen, Copy-/Auswahl-/Folding-/Themeerhalt und Codeflächenkontraste prüfen. Bestehende Tests weiterführen; keine Storageänderung. Manuelle Edge-/Assistenz-/Zoomprüfung getrennt nachweisen.


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

# M6b Wiederholungen — unabhängige QA-Vorbereitung

Stand 2026-11-09. Auftrag: Baselineaudit und unabhängiger Prüfplan für Wiederholungen; zunächst keine Implementierungsänderungen. Rollenbrief `agents/qa.md` und aktuelles AGENTS.md gelesen. Ausschließlich synthetische Daten, keine Storage-/Dependency-/Git-/Native-Aktionen.

## Abschließende Implementierungs-QA

**Ergebnis: 377/377 Tests unabhängig bestanden**, letzter vollständiger Runner **2924,5 ms**, `npm run build` erfolgreich, **neun Syntaxchecks** und `git diff --check` erfolgreich. Nur LF/CRLF-Konvertierungshinweise. Auch nach abschließender Verschärfung fehlerhafter Drawermarker vollständige Suite grün; zusätzlich eigene Markerfälle `:LOGBOOK: extra` und `:END: extra` in der unverändert 16 Gruppen umfassenden QA-Datei geprüft: vollständig unveränderte Verweigerung. Kein bewiesener verbleibender Blocker im automatisiert geprüften Umfang. Eigene isolierte Datei `editor/recurrence.qa.test.mjs`: **16 unabhängige Prüfgruppen bestanden**. Keine Anwendungskorrekturen durch QA; die drei unten genannten P2-Befunde wurden vom Developer behoben und unabhängig geschlossen.

PO bestätigt inzwischen: Monats-/Jahresende auf letzten gültigen Tag begrenzen, jeder spätere Schritt verwendet das bereits geschriebene Datum (31.01. → 28.02. → 28.03.). `++` mindestens ein Intervall, dann streng zukünftig; mit Uhrzeit kann es heute sein, wenn die Startzeit noch bevorsteht, Gleichheit genügt nicht. `.+` basiert auf lokalem Abschlusstag und erhält die vorhandenen Uhrzeiten. Nur TODO-Befehle lösen Abschluss/LOGBOOK aus; Rohtext, Laden, Indexlesen und Undo/Redo nicht. Ein SCHEDULED ohne eigenen Wiederholer entfällt bei Wiederholung, nicht wiederholende DEADLINE bleibt. Beide wiederholenden Felder schreiten unabhängig fort; genau ein Logeintrag pro Aufgabenabschluss.

Die ersten sieben Gruppen decken 108 Datum-/Zeit-/Repeater-Roundtrips plus ungültige Grammar, Clampkette/Bounds, bestehenden Planungs-Undo, lokale Hierarchie-/Drawergrenzen, tatsächlichen Indexparser mit inaktivem LOGBOOK und wiederholendem Stempel, Kalender Setzen/Entfernen/Direktwahl sowie Listener-Cleanup ab. Zusätzliche Regressionen deckten folgende Befunde auf:

- **P2 geschlossen:** Ein unvollständiger LOGBOOK vor der nächsten echten Überschrift darf weder den nachfolgenden Workflow verstecken noch seine historischen SEQ_TODO-Zeilen als aktive Definitionen freigeben. Beim Headingabbruch wurde die unvollständige Range zunächst verworfen; die historische Definition führte dadurch zusammen mit der echten Definition zu Mehrdeutigkeit/Defaultregeln. Developer hält die unvollständige Range bis vor die nächste Überschrift inert, meldet den Fehler und schützt zugleich den nächsten Abschnitt. Unabhängige Reproduktion `frontmatter and incomplete cross-heading drawers …` jetzt bestanden. Frontmatter-Lookalikes ebenfalls bestanden.
- **P2 geschlossen:** PROPERTIES nach normaler Prosa wurde zunächst als lokale Resetkonfiguration übernommen. Nun wird die schmale Position direkt nach Heading/zusammenhängendem Planungsblock geprüft. Unabhängige Regression `misplaced local PROPERTIES …` bestanden; keine Drawer-Migration.
- **P2 geschlossen:** Bei kombinierter Zeile mit wiederholender DEADLINE vor einmaligem SCHEDULED verschob dessen Entfernung den neuen LOGBOOK vor die übrig bleibende DEADLINE. Sie war damit keine direkte Planungsangabe mehr. Developer korrigiert die Position nur bei Entfernung einer vollständigen Zeile. Unabhängiger Kombinationsvergleich beider Feldreihenfolgen, gemeinsamer/getrennter Zeilen und vorhandener/fehlender PROPERTIES bestanden.

Weitere tatsächlich bestandene eigene Gruppen: striktes `++` vor/gleich/nach lokaler Startzeit und Mindestschritt bei bereits zukünftigem Termin; `.+`-Abschlussbasis; zwei unabhängige Wiederholer mit genau einem Logeintrag und eigenem Rücksetzstatus; Kindtext unverändert; 30 textgenaue Undo-/Redo-Umläufe; Rohtext-DONE ohne Hook; fehlerhafte Metadaten/Überläufe vollständig unverändert verweigert; stale doppelte Panelaktivierung verweigert, zwei ausdrücklich getrennte Abschlüsse in derselben Minute dagegen zwei Ereignisse; tatsächlicher gespeicherter Index bleibt vor Saveupdate alt und zeigt danach dieselben zwei Aufgaben mit neuen eigenen Terminen/korrekten Vorfahren.

Die Gesamtsuite umfasst außerdem Readonly-/Busy-/Auswahl-/Keyboard-/Unicode-/Codec-/Storage-/Konfliktregressionen. Eine veraltete M7a-Testfixture stufte den nun freigegebenen `+1w` noch als ungültig ein; Developer ersetzte sie durch `+0w`. Danach komplette Suite unabhängig grün.

Gezielt syntaktisch geprüft: planning-date, planning-drawers, planning-context, recurrence-date, recurrence-metadata, recurrence, todo, planning-calendar und eigene QA-Datei.

## Begrenzte Ressourcen- und Fixtureprüfung

Eigene deterministische Lastprobe: **1000 Paare** `++1m` und `++1d` von Jahr 0001 bis Abschlussjahr 9998, **12 ms** insgesamt, gemessene Paarlatenz p50 **0.0099 ms**, p95 **0.0162 ms**, p99 **0.0272 ms**. Hierfür wurde die Verteilung aller 1000 Paare ausgewertet; kein Einzelmesswert als Perzentil verwendet.

Zusätzlich **37.954 Zeichen**, **500 historische Logzeilen**, **201 Aufgaben**: Syntaxbaum vollständig publiziert, Abschlussplanung und echter Agenda-Parser erfolgreich, keine Diagnose/zusätzliche Aufgaben. Gemeinsame Parser-/Abschlussmessung **25 ms** im isolierten Lauf. Ein zunächst noch unvollständiger Parserstand wurde korrekt mit „Dokument noch nicht vollständig analysiert“ verweigert; nach ausdrücklicher Syntaxvervollständigung im Test erfolgreich.

Dies sind kurze Node-/Modellmessungen. Für M6b keine belastbare Speichertrendmessung über längere Zeit und kein nativer Idle-/Stundenlauf durchgeführt; weder Leakfreiheit noch Langzeitlatenzen behauptet. Kalender-Destroy entfernt im Modell sämtliche registrierten Listener. Die neuen Rechen-/Planungsmodule benötigen keine eigenen Timer oder globalen Listener; dies ersetzt keine Stundenmessung.

Lead-Fixtures `test-vault/m6b-repeat/recurrence.md` und `invalid.md` lesend geprüft: unterschiedliche Wiederholungsmodi, eigener Reset, bestehendes Log, zwei Termine, gemischte Felder, Monats-/Schaltjahresgrenze, Eltern-/Kindtrennung, normaler Abschluss und fehlerhafte/benachbarte Drawer sind synthetisch enthalten. Kein persönlicher Vault geöffnet.

## Tatsächlich ausgeführte Baseline

`npm test`: **347/347 bestanden**, Runner **2934,8 ms**. Diese grüne Baseline enthält noch keine M6b-Implementierung und ist keine Wiederholungsabnahme. Gezielt gelesen: planning, planning-normalization, planning-calendar, todo, agenda-index samt bestehenden Tests.

- `parseTimestamp` unterstützt bisher ausschließlich einfache aktive Datum-/Zeitstempel; Wiederholungen werden abgelehnt.
- `planningContext` ordnet nur den unmittelbar nach einer Überschrift zusammenhängenden Metadatenblock zu. Ein weiterer SCHEDULED-/DEADLINE-Block im eigenen Body führt zur Verweigerung. `planningRecords` berücksichtigt mit `ownLimit` die nächste Überschrift zur Eigentumsabgrenzung.
- `planTodo` ändert derzeit ausschließlich das Statuswort in einer isolierten Historyoperation; Panel und Zyklus verwenden denselben Planner. Rohtexteingabe führt keine `planTodo`-Operation aus.
- `planningNormalization` repariert gültige berührte Zeitstempel in derselben Input-/Delete-Transaktion. Dokumentladen, Undo/Redo und eigene Planungstransaktionen sind ausgeschlossen.
- Noch keine PROPERTIES-/LOGBOOK-/Drawer-Erkennung. Deren Sicherheitsgrenzen und mögliche Parserausschlüsse müssen für M6b ausdrücklich geprüft werden.

## Primärreferenzen und zu klärende Grenzen

[Org Manual: Repeated tasks](https://orgmode.org/manual/Repeated-tasks.html) unterscheidet einen Intervallschritt (`+`), mindestens einen Schritt bis streng in die Zukunft (`++`) und Abschlussdatum als neue Basis (`.+`). Bei `++1d` mit Uhrzeit darf der Folgetermin heute liegen, wenn dessen Uhrzeit noch bevorsteht. Die Zeitgrenze und Gleichheit benötigen daher eigene Fälle. Alle wiederholenden Zeitstempel der Aufgabe werden verschoben; der Wiederholungszielstatus folgt in Org einer konfigurierbaren Priorität. Die hier beauftragte lokale gültige REPEAT_TO_STATE-Eigenschaft mit erstem offenen Zustand als Fallback ist als begrenzte Produktregel zu prüfen.

Org unterstützt darüber hinaus Stunden und einfache aktive Stempel sowie Entfernung nicht wiederholender Schedulingangaben bei Wiederholung. Diese Bereiche sind nicht automatisch vom beschriebenen Paket autorisiert. Lead auf Grenzen aufmerksam gemacht; keine eigenständige Scopeentscheidung durch QA.

[Org Manual: Drawers](https://orgmode.org/manual/Drawers.html) beschreibt Drawer mit Start-/END-Markierung; Überschriften und verschachtelte Drawer gehören nicht hinein. [Timestamps](https://orgmode.org/manual/Timestamps.html) unterscheidet aktive und inaktive Stempel; LOGBOOK-Abschlusszeiten dürfen keine aktiven Agendatermine erzeugen.

Die ursprünglichen offenen Semantikfragen wurden inzwischen vom PO entschieden, siehe aktueller Nachtrag oben. Für Monatsende und zeitgenaues `++` ist die begrenzte Produktregel maßgeblich; der vom Lead tatsächlich ausgeführte Org-9.8.7-Vergleich lieferte davon abweichende Ergebnisse und darf nicht als identische Kompatibilität ausgegeben werden.

## Geplanter unabhängiger Prüfvertrag

1. **Grammar/Erhalt:** jede Kombination aus `+`, `++`, `.+` und d/w/m/y; positive Ganzzahl; null/negative/fehlende/gigantische Intervalle, unbekannte Einheit, mehrere Cookies, Warnsuffix und fremde Metadaten. Nicht unterstützte Angaben bleiben byte- bzw. textgleich und melden verständliche Fehler. Keine Teiländerung von Status/Datum/LOGBOOK bei einem einzigen unsicheren Feld.
2. **Kalenderarithmetik:** Vor-/Gegenwarts-/Zukunftsbasis, genau ein `+`-Schritt, Rastererhalt für `++`, Abschlussbasis für `.+`. Monat 28/29/30/31, Schaltjahr 2000/2100, Jahreswechsel, 0001/9999, Überlauf, große überfällige Intervalle. Zeitfelder und Zeitbereiche erhalten; deutsch berechneter Wochentag. Für `++` vor/exakt/nach Uhrzeit sowie Datum ohne Uhrzeit getrennt.
3. **Eigentum/Hierarchie:** H1–H6 jeweils eigene Aufgabe, Eltern-/Kind-/Geschwisterstempel unverändert. SCHEDULED und DEADLINE gemeinsam wiederholend bzw. gemischt. Bodycursor vs. Heading, Code/Frontmatter/Listen/HTML/Quotes und unvollständiger Syntaxbaum geschützt. Kein Erfassen von Metadaten fremder Aufgaben.
4. **Status-/Logtransaktion:** ausschließlich freigegebene Closed-Transition löst Wiederholung aus; offene→offene, Closed→Closed, Noop, unbekannter Status und Kein Status getrennt. Lokales gültiges REPEAT_TO_STATE sonst erster offener Zustand; kein unerlaubtes Vererben. Ein Logeintrag alter→angeforderter geschlossener Status mit injiziertem Abschlusszeitpunkt; kein zusätzlicher Eintrag für Reset/Redo. Datum, Statusreset und LOGBOOK in genau einer Undooperation; Redo stellt exakt denselben Zeitstempel wieder her.
5. **Drawergrenzen:** fehlender/neuer/vorhandener LOGBOOK, vorhandene fremde Notizen, PROPERTIES vor/nach Planning gemäß festgelegter Grammatik, doppelte/verschachtelte/unterminierte Drawer, eingebettete Header/Metadaten/SEQ_TODO-Zeilen. Unsicherheit verweigert vollständig; fremde Inhalte werden erhalten. Inaktive Abschlussstempel erzeugen keine Agendaeinträge und beeinflussen keine TODO-Regeln.
6. **Bedienung/History:** Panel, Shiftzyklus, Keyboardrepeat, gehaltene Modifier/AltGr/IME und schnelle Doppelauslösung; kein versehentliches zweites Fortschalten nach Rückkehr in offenen Zustand. Rohtextedit/Paste/Load/Undo/Redo nur nach bestätigter Triggerregel. Mehrfachselektion/Readonly/Busy/stales Panel verweigert ohne Teilschreibzugriff. Caret/Selektion sinnvoll erhalten.
7. **Kalenderformular:** vorhandenen Repeater beim Datumswechsel erhalten, Bearbeitung/Entfernung ausdrücklich und verlustfrei. Navigation/Abbruch verändert keinen Text. Tagesdirektwahl mit erforderlicher neuer Repeaterbedienung abstimmen; keine stillschweigende Übernahme veralteter Werte.
8. **Index/Quellen:** keine eigene Indexpipeline. Vor Save gespeicherter alter Stand, nach Save bestehendes Update, nach Refresh/Reload identischer neuer Stand. Kein künstliches Duplizieren der Aufgaben/Logs; Hierarchie und Quellpositionen nach Logeinfügung konsistent. Dirty-Follow und stale-source schützen weiterhin den Entwurf.
9. **Ressourcen:** große synthetische Datei mit vielen historischen Logs und Aufgaben; große übersprungene `++`-Spanne ohne lineare Tagesschleife; begrenzte Wiederholungs-/Undo-/Redo-Zyklen und Parserlatenzen messen. Keine unkontrollierte wiederkehrende Arbeit im Idle. Native Stunden-/Idle-/Speichertrends bleiben eigener offener Nachweis; kurzer Lauf ersetzt sie nicht.

Nach API-/Semantikklarheit eigene isolierte Tests unter `editor/repetition.qa.test.mjs`; bestehende Developerdateien bleiben unberührt. Final vollständige Suite/Build sowie passende Syntax-/Diffchecks unabhängig ausführen und Ergebnisse, Befunde und verbleibende Grenzen hier ergänzen.

## Offene Nachweise

Automatisierte M6b-Funktionstests sind wie oben tatsächlich ausgeführt. **Keine native Bedienung**, keine echten Dateisystem-/Berechtigungsdialoge, kein Offline-Wiederaufnahmelauf und **keine Stundenstabilität** für M6b geprüft. Keine neuen PO-Berichte zur nativen M6b-Bedienung liegen QA vor. Praktische Probe anhand `docs/M6B_REPETITION.md` bleibt erforderlich; automatisierte Modelle belegen keine native Kalenderpixel-, Fokus-, AltGr-/IME- oder Tastenzustellung.

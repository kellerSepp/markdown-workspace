# Architekturentscheidungen

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

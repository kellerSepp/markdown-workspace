# Developer-Übergabe: H1-Refile, 2026-11-06

Rollenrevision `M32A-2026-11-03` geladen und bestätigt; AGENTS, Rollenbrief und REQUIREMENTS gezielt gelesen. Begrenzte aktuelle Freigabe umgesetzt; keine Unteragenten, Dependencies, Storageänderungen, Commits oder Pushes. Lead-eigene AGENTS/REQUIREMENTS/DECISIONS/ARCHITECTURE/PROJECT_STATUS nicht bearbeitet.

## Ergebnis und Dateien

- `editor/refile.mjs` (neu): reiner Planer mit bestehendem Abschnittsindex/Markdownparser und kleiner Controller. Aktueller H1–H6-Teilbaum aus Heading/Body einschließlich Liste/Code unter H1 derselben Datei als letztes H2-Kind; relative Ebenen, H6-Grenze, eigene Ziele ausgeschlossen, H1-Vorfahr und No-op.
- `editor/refile.test.mjs` (neu): Ebenen/Bewegungsrichtungen, Body/Code, Zielgrenzen, konservative Verweigerungen, Unicode/EOF, atomare Historie und lokale Changes mit bestehendem TextCodec/BOM/gemischten EOL im unveränderten Zwischenbereich.
- `editor/work-panel.mjs` + Test: wiederverwendeter Such-/Completion-/Navigationsmodus im bestehenden Splitpanel; modusspezifische Meldungen/ARIA, Zeilennummern, Fokus-/IME-/Stale-/Repeat-Schutz und Cleanup. Aktive leere Marke vor Fokusübergabe kontrolliert lösen; gezielte Regression. Keine zweite UI.
- `editor/emacs-policy.mjs`, `editor/prefix-router.mjs` + Test: ausdrücklich modifiergebundene Folge C-w nach C-keyup bei weiterhin gehaltenem Ctrl. Keine allgemeine Freigabe weiterer Ctrl-Folgen. Aufgelöste CodeMirror-Handlerreihenfolge getestet.
- `editor/commands.mjs` + Test, `editor/app.mjs`: Registry-ID `structure.refile-h1`, Palette/Kontextmenü/Prefixhilfe und ereignisbasiertes Verwerfen veralteter Panelziele.
- `docs/COMMAND_GAMEBOOK.md`, neue `docs/REFILE_H1.md`, `test-vault/vault-structure/refile.md`: Registrykonsistenz, Bedienung, Grenzen und synthetische PO-Probe.

## Ausgeführte Prüfungen

- `npm test`: 214/214 bestanden, keine übersprungenen Tests; einschließlich bisheriger Storage-/Editorregressionen.
- `npm run build`: bestanden.
- `node --check` für alle zehn neuen/geänderten Anwendungs-/Testmodule: bestanden.
- `git diff --check`: bestanden (nur Git-Hinweise zu künftiger LF→CRLF-Konvertierung).
- Panelmodell zusätzlich innerhalb Tests: 100 Öffnen/Fokusausstieg-/Cleanupzyklen, unveränderte Auswahl/Undo beim Abbruch, leere aktive C-SPC-Marke, doppelte H1-Ziele, Suche/Completion/Pfeile/Enter-Repeat und Stale-/Busy-Verweigerung.

## Grenzen und unabhängige QA

Setext-/Containerquellen und solche Überschriften im Quellteilbaum konservativ verweigert; normale Listen und geschlossene Codekörper zulässig. Unvollständige Parserdaten, H>6, Regionen/Multicursor und Markdown-Blockstrukturänderungen verweigert. Ziele ausschließlich normale ATX-H1 außerhalb des Quellteilbaums; andere Dateien/H2–H6 nicht umgesetzt.

Ein isolierter Undo-Schritt aus lokaler Quelllöschung und Zieleinfügung. Unveränderte Zwischenbereiche bleiben für gemischte EOL erhalten; der tatsächlich eingefügte Bereich folgt unverändert der bestehenden Codec-EOL-Policy. Kein Storagecode verändert.

QA bitte Daten-/Parsergrenzen (Frontmatter, Listen/Fences/HTML, EOF/Unicode, H1-Vorfahr/No-op, lokale Changes/EOL), Panel-Lifecycle einschließlich Intentional-Blur/aktiver Marke sowie echte Modifierfolge unabhängig prüfen. Temporärer Parservergleich ist konservativ und kann komplexe Fälle verweigern. Native Edge-Zustellung, DE-DE/AltGr/IME, reale kleine-Fenster-Ansicht und Langzeitressourcen wurden nicht ausgeführt. Automatisierte DOM-/CodeMirror-Modelle sind kein nativer Browsernachweis. Danach PO-Probe; keine weitere Implementierung/Freigabe vorweggenommen.

## Gezielte QA-P2-Nacharbeit — Zwischenübergabe 2026-11-06

Beide Befunde bestätigt. Bearbeitet ausschließlich `editor/refile.mjs`, `editor/refile.test.mjs` und diesen Bericht. QA-Dateien unverändert.

**Parser-P2 korrigiert:** `shape(state, tree)` erhält explizit den von `ensureSyntaxTree` zurückgegebenen vollständigen Baum. Regression mit 500/1.000 Abschnitten erlaubt gültige Refiles und verweigert weiterhin offene Fences am großen Ziel. Unverändertes QA-Skript nach Fix: Lastteil 100/100 erlaubt (`load.refused: 0`); keine Last-/Langzeitabnahme daraus abgeleitet.

**History-P2 weiterhin offen, kein falscher Fix übernommen:** Die bestehende Historyregression prüft jetzt zusätzlich Originalselection nach Undo und bewegte Selection nach Redo und scheitert reproduzierbar. Unverändertes `node --expose-gc test-vault/qa-refile.mjs`: 55 bestanden, 291 ausschließlich Redo-Selectionfehler; Exit 1. `userEvent: move.refile` kennzeichnet die Bewegung, löst den Auswahlfehler allein ausdrücklich nicht.

Lokale CM-Analyse: `HistEvent.fromTransaction` speichert startSelection; `HistoryState.pop` rekonstruiert die Gegenbranchselection über `startSelection.map(changes.invertedDesc, 1)`, sofern selectionsAfter fehlt. Löschen/Einfügen kann die Cursorbewegung nicht durch dieses monotone Mapping darstellen. Eine geprüfte zusätzliche Auswahltransaktion korrigierte nur den ersten Undo/Redo-Durchlauf; weitere Zyklen stellten die Originalselection nicht zuverlässig wieder her. Ansatz entfernt. Ebenfalls verworfen: transactionExtender für Auswahlrestauration; CM übernimmt daraus nur Effects/Annotations, und Undo/Redo laufen mit filter:false. Keine privaten Historyannotationen manipuliert.

Erforderlicher nächster Integrationsschritt: explizite Refile-Selectionmetadaten als invertierbare Effects und eng begrenzte Undo-/Redo-Ausführung, die diese Metadaten beim Dispatch berücksichtigt; vorhandene übrige History bleibt delegiert. Dazu muss der Lead die zentrale Einbindung in `editor/app.mjs` (Extensions und Registry-Undo-/Redo-Handler, bestehende native Historywege beachten) zusätzlich delegieren oder selbst integrieren. Diese Datei ist im aktuellen Korrekturauftrag ausdrücklich nicht mein Eigentum. Umsetzung und Regression müssen mehrere Undo/Redo-Zyklen, übrige Historywege und lokale Codecänderungen abdecken; keine stillschweigende Ausweitung.

Tatsächlich final ausgeführt in diesem Zwischenstand: `npm test` 214/215 bestanden, 1 erwartungsgemäß offener Redo-Selectionregressionstest; Build bestanden; beide bearbeiteten Module `node --check` bestanden; `git diff --check` bestanden. Keine native Browser-/Langzeitprüfung. Paket ausdrücklich noch nicht abnahmebereit; unabhängiger QA-Retest nach vollständiger Historykorrektur.

## Finale QA-P2-Korrektur nach erweiterter Delegation — 2026-11-06

**Dieser Abschluss ersetzt den offenen Zwischenstand oben. Beide P2 technisch korrigiert; bereit für unabhängigen QA-Retest.** Keine Produkt-/Phasenänderung. Neben den bereits erlaubten Dateien ausschließlich das nachdelegierte `editor/app.mjs` sowie neue `editor/refile-history.mjs` / `editor/refile-history.test.mjs` bearbeitet. QA-Skripte und sonstige Dokumente unverändert.

### Konkrete Historyursache und endgültige Umsetzung

CM speichert bei einer Texttransaktion die startSelection; die Gegenrichtung wird in `HistoryState.pop` gegebenenfalls über das inverse ChangeDesc rekonstruiert. Eine lokale Quelllöschung plus räumlich entfernte Einfügung kann die Cursorverschiebung nicht durch dieses monotone Positionsmapping darstellen. `userEvent: move.refile` beschreibt die Aktion, ersetzt aber keine Auswahlmetadaten. Die zusätzliche Auswahltransaktion des verworfenen Versuchs reichte nur für den ersten Durchlauf und ist nicht Bestandteil der endgültigen Lösung.

`refile-history.mjs` kapselt nun einen eigenen StateEffect mit beiden Auswahlendpunkten. `invertedEffects` vertauscht diese beim Historisieren; dadurch bleiben auch nach späteren Cursorbewegungen und mehreren Refiles die ursprünglichen Aktionsendpunkte erhalten. `undoRefile` / `redoRefile` delegieren an CM. Bei Ereignissen ohne diesen Effect wird das originale CM-Transaction-Objekt unverändert weitergereicht. Nur bei Refile werden die originale History-Transaktion und eine reine Auswahlkorrektur (`Transaction.addToHistory.of(false)`) als Transaction-Array in einem EditorView-Update dispatcht. Es bleibt genau ein Text-Historyereignis; keine zusätzliche Textänderung, kein zweiter Undo-Schritt, keine private Historyzustandsmanipulation. Insbesondere wird die nicht öffentlich dokumentierte interne Annotationsliste NICHT ausgelesen, kopiert oder verändert.

`app.mjs` installiert die Extension und verwendet die gekapselten Funktionen in den bestehenden Registry-Undo-/Redo-Handlern; die bisherigen Tasten-/Toolbar-/Palettenwege laufen darüber. Die Extension routet auch CM-`beforeinput` für `historyUndo` / `historyRedo` durch dieselbe gekapselte Ausführung. Andere beforeinput-Ereignisse bleiben unverändert. Keine neue UI, kein Polling, kein Storagecode.

### Parserkorrektur

Der vollständige Rückgabebaum von `ensureSyntaxTree` wird explizit in den Strukturvergleich gegeben; der eventuell unvollständige Zustandsbaum wird nicht erneut als Prüfergebnis gelesen. Regression mit 500 und 1.000 einfachen Abschnitten besteht, unsichere offene Fenceziele in diesen großen Dokumenten bleiben verweigert. Der schon im Zwischenstand ausgeführte unveränderte QA-Lastlauf erlaubte 100/100 Pläne; dies ist keine native oder Langzeitabnahme.

### Tatsächlich finale Prüfungen

- `npm test`: **222/222 bestanden**, 0 fehlgeschlagen, 0 übersprungen.
- `npm run build`: bestanden.
- Fünf Syntaxprüfungen: `editor/refile.mjs`, `editor/refile.test.mjs`, `editor/refile-history.mjs`, `editor/refile-history.test.mjs`, `editor/app.mjs`: bestanden.
- `git diff --check`: bestanden, nur bestehende LF/CRLF-Hinweise.
- Neue Historyregression: 324 Heading-/Body-/EOF-/Separator-/Ebenen-/Bewegungsvarianten mit je fünf Undo-/Redo-Zyklen. Genau ein Text-Historyschritt; Original-/Zielselection jeweils vollständig verglichen.
- Zusätzliche Regressionen: normales Editieren vor/nach Refile, normales Undo/Redo im Vergleich zum unveränderten CM, Redo-Verwerfen nach neuem Edit, read-only, aufeinanderfolgende Refiles und dazwischenliegende Cursorbewegungen, History-beforeinput (Modell), Controller mit leerer aktiver Marke/Panel-Snapshot/stale target und explizitem Cursor 3→14→3→14, BOM/unberührte gemischte EOL über wiederholte Historyzyklen.

### Hinweis für unabhängige QA

Direkte Planer-/Historyfixtures müssen dieselbe Integration wie die Anwendung verwenden: `refileHistory()` zu ihren Extensions und `undoRefile` / `redoRefile` statt direkter CM-Undo-/Redo-Aufrufe. Der öffentliche EditorView-Dispatch nimmt sowohl einzelne Transactions/Specs als auch Transaction-Arrays an; Mock-Views müssen Arrays entsprechend anwenden. Das alte QA-Skript verwendet unverändert rohe CM-History und initialisiert die neue Integration nicht; seine bisherigen direkten Historyaufrufe prüfen daher nicht den reparierten Anwendungsweg. Die Skripte wurden auftragsgemäß nicht geändert. Die eigene neue Matrix prüft den integrierten Weg und wiederholte Zyklen ausdrücklich. QA bitte unabhängig Registry-/beforeinput-Integration und Auswahl-/Daten-/Panelgrenzen erneut prüfen.

Native Edgezustellung, DE-DE/AltGr/IME, reale Viewportdarstellung und Langzeitressourcen weiterhin nicht ausgeführt. Keine Dependencies/Storageänderungen/Commits/Pushes/weiteren Agenten. Nach Übergabe stoppen.

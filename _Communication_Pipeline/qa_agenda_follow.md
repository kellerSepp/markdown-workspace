# Unabhängige QA: Agenda unten / Follow — 2026-11-09

Auftrag: untere kompakte Agenda, 50:50-Split mit verstellbarer Trennlinie, Shift+F-Follow und Fokus-/Dateinavigationsschutz. Rollenbrief `agents/qa.md` und AGENTS.md gelesen. Keine Implementierungskorrekturen durch QA; ausschließlich eigene Tests und dieser Bericht. Keine persönlichen Vaults, Installationen, Commits oder Veröffentlichung.

## Ergebnis und behobene Befunde

Im automatisiert geprüften Umfang nach Korrektur keine nachgewiesenen verbleibenden Blocker.

**Aktueller PO-Nachtrag: oberer Editor vollständig bearbeitbar bei sichtbarer Agenda.** Die zwischenzeitliche Nur-Lese-Vorschau ist aufgehoben. Finale unabhängige QA: **347/347 Tests**, Build, sechs Syntaxchecks und Diffcheck bestanden; Runner **2948,6 ms**. Eigene QA-Datei jetzt **13 Prüfgruppen**. Keine native Interaktion in diesem Nachtrag.

Zusätzlich tatsächlich geprüft:

- Reales CodeMirror-Tippen mit History und Registry-Undo/Redo sowie ausdrückliches Speichern bleiben bei gedockter Agenda und Fokus außerhalb der Agenda verfügbar. Der tatsächliche App-Registrykontext erlaubt Speichern auch mit `view.hasFocus=false`, wenn etwa die Toolbar den Fokus hat. Editor-/Agenda-Fokus und modaler Dispatcher bleiben getrennt; Datei-/Vault-/Entwurfswechsel weiterhin geschützt.
- Der tatsächliche App-Eingabehandler wendet die Änderung an und plant nur die bestehende Entwurfssicherung. Kein Agenda-Refresh/Indexupdate durch Tippen. Ausdrückliches Speichern verwendet weiterhin den vorhandenen App-Savepfad und aktualisiert anschließend den gespeicherten Index.
- Während wartender Quellprüfung Fokus in oberen Editor wechseln und synthetischen Text ändern: Follow wird über `focusout` abgebrochen. Ein späterer Followversuch mit schmutzigem Editor öffnet/springt/schreibt nichts; Entwurf und Indexrevision bleiben erhalten.
- Tatsächliches `prepareWorkPanel` ersetzt die Agenda vor Prefixhilfe und erhält Dokument, Editorstate und Undo. Geteilte Status-/Kalender-/Refile-/Ringpanels schließen die Agenda vor Zielerfassung; verweigerte Schließung verhindert Überlagerung. Direkte M-y-Ersetzung schließt die Agenda nicht vorsorglich; erst benötigte Chooseröffnung bereitet den geteilten Host vor.
- Busy- und Leerdokument-Schutz bleiben erhalten. Der obsolete App-`onActiveChange → setBusy`-Aufruf wurde entfernt: Er hätte durch Compartment-Rekonfiguration den vor Prefixhilfe erfassten State ändern können. Eigene Regression wertet die tatsächliche App-Agendakonfiguration aus und führt Prefix-Erfassung, Panelersatz und Folgezeichen mit realem CodeMirror-State aus; der Befehl wird erfolgreich ausgeführt.

- **P2, geschlossen:** Follow einschalten und vor Ablauf der 140-ms-Verzögerung den Fokus aus der Agenda bewegen führte weiterhin zu einem Quellsprung. Reproduktion in `QA no deferred navigation … focus exit`. Developer ergänzt Fokusgrenze beim Ausführen und `focusout`-Abbruch. Unabhängig erneut erfolgreich geprüft.
- **P2, geschlossen:** Follow einschalten, Index innerhalb der Verzögerung neu einlesen, unveränderte ausgewählte Zeile beibehalten: Navigation verwendete eine alte revisionsabhängige ID. Quelladapter verweigerte dadurch den Sprung. Reproduktion in `QA pending follow uses current revision ID …`. Developer löst die aktuelle ID anhand des stabilen ausgewählten Schlüssels erst bei Ausführung auf. Unabhängige Regression bestanden.
- **Historischer Integrationshinweis, durch PO-Nachtrag ersetzt:** Eine zunächst ergänzte Nur-Lese-Vorschau verhinderte die vom PO gewünschte Bearbeitung. Im aktuellen Stand bleibt der Editor bearbeitbar; Registryrechte unterscheiden nun gedockte Agenda, Agendafokus und modalen Dispatcher. Siehe aktuelle Prüfungen oben.

## Tatsächlich ausgeführt

- Vor Änderungen unabhängig `npm test`: **324/324 bestanden**.
- Zwischenstand nach Änderungen unabhängig `npm test`: **336/336 bestanden**, Runner 2905,8 ms.
- Integrierter Zwischenstand auf `bc38df3` (Branch `feature/agenda-follow-mode`, remote ergänzter Zeilenumbruch `C-c l` und TODO-Themefarbtausch) unabhängig `npm test`: **340/340 bestanden**, Runner **2850,8 ms**. Der konkrete Integrationsvorgang wurde vom Lead durchgeführt; QA prüfte den danach vorhandenen gemeinsamen Stand. Nach PO-Bearbeitbarkeitskorrektur abschließend **347/347**, siehe oben.
- `npm run build`: erfolgreich.
- `git diff --check` und abschließend `node --check` für app, commands, agenda-command-policy, agenda-view, agenda-app-Test und eigene QA-Testdatei: **sechs Syntaxchecks erfolgreich**; Git meldet lediglich LF/CRLF-Konvertierungshinweise. Agenda-source/-split wurden bereits in den vorangegangenen Prüfständen syntaktisch geprüft.
- Eigene Datei `editor/agenda-follow.qa.test.mjs`: ursprünglich **8**, nach Bearbeitbarkeitsnachtrag **13 unabhängige Prüfgruppen bestanden**. Modifier-/AltGr-/IME-/Repeat-Schutz, Follow standardmäßig aus, Fokus bleibt in Agenda, Abbruch bei Aus/Schließen/Vaultwechsel/Destroy/Fokuswechsel, älteres Enter-Ergebnis schließt neu geöffnete Agenda nicht, aktuelle Indexrevision, schnelle Navigation nur zum letzten Ziel, Commit-Schließsperre, Split-Bounds/Pointerbesitz/Modifier/Teardown und die aktuellen Bearbeitungsprüfungen oben.
- Bestehende Suite prüft weiterhin Dirty-Verweigerung auch innerhalb derselben Datei, Quellenvalidierung, Permission-/Lese-/Vault-/Session-/Indexabbruch, geänderten zweiten Read und keine Schreiboperationen der Agenda. Storage-Regressionssuite erfolgreich; bekanntes externes Schreibfenster bleibt unverändert.

## Begrenzte Ressourcenmessung

`node --expose-gc --test editor/agenda-follow.qa.test.mjs`, **1200 synthetische DOM-Modellzyklen**: Erzeugen → Woche → Follow → Auswahl → Schließen → Dispatcher → TODO → Follow → Zerstören. Messdauer **338 ms**. Höchstens ein vorgemerkter Timer; nach jedem Schließen/Zerstören null Timer; alle registrierten Dialog-/Separatorlistener nach Destroy entfernt. Keine wiederkehrende Hintergrundschleife in diesem Modell.

GC-bereinigter Node-Heap bei Zyklus 1/600/1200: **12.50 / 14.22 / 13.86 MB**. Gemessene Zykluslatenzen p50 **0.231 ms**, p95 **0.391 ms**, p99 **1.364 ms**. Diese Verteilung stammt aus den 1200 Modellzyklen, nicht aus nativer Browserbedienung. Ein regulärer Lauf ohne explizites GC zeigt höheren Heap zwischen Sammlungen und ist kein Leaknachweis. Die kurze Messung belegt weder langfristige Leckfreiheit noch ein natives Performancebudget.

## Offene Grenzen

Keine native Browserinteraktion durch QA durchgeführt; Pixel-/Maus-/Tastenzustellung, Zoom/kleines Fenster, physisches AltGr/IME, echte Permissiondialoge und Bildschirmleser bleiben offen. Bisheriges PO-Screenshot ist Gestaltungsreferenz, kein Bediennachweis der neuen Implementierung. Die vorhandenen großen synthetischen Indexproben (400 Dateien, 600 Headings) bestanden im Gesamtlauf; keine zusätzliche große native Vaultmessung.

**Vom Lead berichteter nativer Versuch:** App-Freigabe für Computer Use lief in ein Timeout, bevor eine erfolgreiche App-Bedienung belegt war. Dies ist kein bestandener nativer Test und wurde von QA nicht selbst durchgeführt.

**Stundenlange Stabilität, langer Idle und schleichende Ressourcenverschlechterung sind nicht geprüft.** Ein kurzer Modellzykluslauf ersetzt diese Abnahme nicht. Offline-Netzwerkzustand und Wiederherstellung wurden in diesem Paket nicht nativ erprobt; Agenda führt weiterhin lokale Lese-/Sessionnavigation ohne neue Netzwerkfunktion aus. Praktische PO-Probe nach `docs/AGENDA_FOLLOW.md` erforderlich.


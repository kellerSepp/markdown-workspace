# QA M7b — 2026-11-08

Rollenrevision **M32A-2026-11-03** geladen. Unabhängige Prüfung mit eigener synthetischer Probe `test-vault/qa-m7b.mjs`. Keine Implementierung geändert, keine privaten Vaults, Installationen, Storage-Sicherheitsänderung oder Git-Aktionen.

## Ergebnis

Final **308/308 Tests**, Build, **11 Syntaxchecks** und `git diff --check` grün. Zusätzlich **16 eigene Prüfgruppen** grün mit `node --expose-gc test-vault/qa-m7b.mjs`; `findings: []`. Kein bewiesener verbleibender Implementierungsblocker im geprüften Umfang. Native Sicht-/Tastenzustell-, Permission-, Zoom-, kleine-Fenster- und mehrstündige Ressourcenbelege bleiben offen.

## Eigene Prüfungen

- ISO-Wochenjahr, Montag–Sonntag, KW53/2026 → KW1/2027, Jahresanfang in vorherigem Wochenjahr, Schaltjahr/DST-Datumarithmetik sowie Jahre 0001/9999 und begrenzte Wochennavigation.
- Tatsächliche Fixturedateien `m7b-agenda`: 13 Records, 12 Aufgaben, 9 offen/3 abgeschlossen, 0 Diagnosen. KW45/2026 bei heute 08.11.2026 genau 10 Zeilen, KW46 genau 2 und KW53 genau 2. SCHEDULED/DEADLINE taggleich zusammengeführt; beide Uhrzeiten/Zeitfenster bleiben sichtbar. Statuslose Termine sichtbar, keine offene Klassifikation. DONE/CANCELLED erzeugen keinen heutigen Rückstand.
- Deutscher Wochenkopf, Vor-/Zurück-/Heute-Navigation, Pfeilauswahl, lokale Ergebnis-Scrollbewegung und gemeinsamer Klick-/Enter-Pfad. Native Standardaktion für Toolbar-Enter und Checkbox-Space im DOM-Modell erhalten. Keine HTML-Injektion; Textausgabe über DOM-Text.
- Echter Präfixrouter und Registry: C-c a erst nach C-keyup und ohne Ctrl; gedrückt gehaltene oder nicht losgelassene Folge verworfen. Dispatcher a/t erreichen Woche/TODO, m/s inaktiv. Modifier/IME/AltGr/Repeat-Guards und q/Escape geprüft. Alt+X/Palette sowie mutierende Editor-/Datei-/Statusbefehle durch Modalgrenze gesperrt.
- Tatsächliche App-Source-/View-/Busy-Callbacks mit echter `createSession`, echtem Index und EditorState ausgeführt. Verschachtelter gleichnamiger Quellpfad und doppelte Überschriftentitel werden über geprüfte Position geöffnet. Nach modalem Close wird ausdrücklich der neue Editor fokussiert; im Modell macht ein noch offener Dialog äußere Fokusversuche unwirksam.
- Ungespeicherter Text, Auswahl und Undo-Tiefe über abgewiesenen Quellsprung, Refresh und Schließen erhalten. Gleiche saubere Datei wird nicht neu geöffnet; ein gefaltetes Ziel wird durch die echte CodeMirror-FoldState-/Selection-Verarbeitung sichtbar.
- Externe Text-/Positions-/Status-/Definitionsänderungen, Readfehler und alte Indexkennung verweigern den Sprung ohne Titelraten oder Zielüberschreibung. Indexfehler bleiben mit Pfad und Ursache in einer sonst nutzbaren Ansicht sichtbar.
- Neue Indexpublikation aktualisiert die offene Liste; neuer Vault-Epoch schließt und leert sie. Permission-/Read-Wartephasen lassen sich vor Beginn des eigentlichen Öffnens abbrechen, auch bei neuem Index/Vault.

## Während der Umsetzung geschlossene Abbruchgrenzen

Der Teamreview identifizierte zwei Vorlaufgrenzen: Der Navigationstoken muss bereits vor einer asynchronen Permissionprüfung reserviert sein; außerdem lässt sich eine bereits gestartete bestehende `session.open`-Operation nicht nachträglich abbrechen. Diese früheren Stände wurden von QA nicht separat als alter Binärstand ausgeführt und werden daher nicht als eigener alter Reproduktionsnachweis behauptet.

Die finale unabhängige Probe führt die tatsächlichen Appcallbacks aus und bestätigt die Korrektur: q während verzögerter Permissionprüfung schließt wirksam, ohne späteren Dateiwechsel. Während des zweiten Dateilesens innerhalb der bereits gestarteten `session.open`-Operation bleibt die Ansicht mit verständlicher Sperrmeldung offen. q, Escape, natives cancel, Schließen-Knopf, weiterer Ansichtswechsel, Refresh und Filteränderung führen in dieser Phase keine weitere Aktion aus; der Editor bleibt durch den tatsächlichen Busy-Adapter schreibgeschützt. Nach Erfolg schließt die Agenda und fokussiert die Quelle. Nach künstlichem Lesefehler bleibt die ursprüngliche Session erhalten, der Fehler sichtbar und q wieder wirksam. In beiden Fällen werden Busy und Readonly korrekt aufgehoben. Keine Storage-Implementierung wurde dafür von QA geändert.

## Kurze Ressourcenprobe

Node-DOM-Modell mit 500 Records, 30 vollständigen Erzeugen-/TODO-/Wochenansicht-/Navigieren-/Schließen-/Zerstören-Zyklen und kooperativem `setImmediate` zwischen Zyklen: letzter Lauf **166,6 ms** gesamt einschließlich **100 ms Idle**; einzelne Zyklen **1,30–4,38 ms**. Nach jedem Destroy nur die ursprüngliche Editorfläche im synthetischen DOM, kein zusätzlicher Dialog. Im Idle keine neue DOM-Änderung. GC-Heap vorher **13.329.440 Bytes**, danach **13.228.488 Bytes**. Ein Kurzlauf mit aktiv gehaltenem Index; daraus keine native Latenz, Speicherobergrenze oder Leakfreiheit ableiten. Mehrstündige Stabilität, Langzeit-Idle und Browserheapentwicklung nicht nachgewiesen.

## Ausgeführte Pflichtchecks und Grenzen

`npm test` (**308/308**), `npm run build`, `node --expose-gc test-vault/qa-m7b.mjs`, `git diff --check`; `node --check` für Agenda-Modell/-Quelle/-View, deren drei Testmodule, App, Commands, Command-Surfaces, Emacs-Policy und eigene QA-Probe: alle final Exit 0. Git-Zeilenendhinweise sind keine Diffcheckfehler.

Keine Computer-Use-/Browserautomation ausgeführt: Root meldete zuvor einen vom Nutzer per physischem Escape beendeten nativen Versuch nach Laufzeitfehler. Tastenzustellung, Pixel/Theme-Rendering, echtes Browserfocus-/Dialogverhalten und lokale Dateifreigaben müssen über die dokumentierte PO-Handprobe bestätigt werden. Die DOM-/FS-Adapter sind synthetische Modelle. Die Agenda bildet gespeicherte Dateien ab; bei schmutzigem Editor wird Navigation bewusst verweigert. Die kurze nichtabbrechbare Öffnungsphase sowie fehlende Listenvirtualisierung sind dokumentierte Grenzen. Keine Agenda-Remote-Bearbeitung oder weitere Funktionsfreigabe abgeleitet.

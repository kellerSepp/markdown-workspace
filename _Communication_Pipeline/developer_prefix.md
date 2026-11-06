# Developer-Bericht AP-06

Stand: 2026-11-06. Geladene Rollenrevision: `M32A-2026-11-03` (Runtime, Rollenbrief und lokale TOML stimmen überein). Aktuelle PO-Freigabe/Plan Rev3 berücksichtigt.

## Ergebnis

AP-06 im gemeinsamen Workspace implementiert: C-c im fokussierten Editor startet Folgehilfe; nach C-keyup unmodifiziert 1 → `fold.collapse`, 2 → `fold.reveal`, 3 → `fold.open`. Vorhandene Registry und Faltsemantik bleiben maßgeblich. Außerhalb des Editors bleibt Copy nativ; Alt+W ist der Copy-Ersatz im Editor. Keine zusätzlichen Command-IDs.

Bindungen zentral in Emacs-Policy, Zustandsautomat getrennt. Dieselbe untere Panelhülle und synchroner Layoutschutz wie beim Ring. Hilfe zeigt die drei Folgen mit Sperrgründen, Mausknöpfe erhalten Editorfokus. Start/Abbruch ohne Editortransaktion. Kein Timer, Polling oder neue Abhängigkeit.

Repeat/keyup, ungültige Folge ohne Text-Replay/Copy, Modifier, AltGr/IME, Escape/C-g, Editor-/Fensterfokus, Zustands-/Datei-/Vaultwechsel, Busy/read-only geschützt. Kontext wird vor Ausführung erneut geprüft. Escape verwendet ausdrücklich `enableFocusNavigation` und damit den gemeinsamen WeakSet-/CodeMirror-Pfad. Fensterlistener wird beim Pluginabbau entfernt; Panel räumt Vorschauen und Zeilenlistener auf. Bestehende Faltbefehle dürfen wie bisher verborgene Cursorstellen sichtbar versetzen.

## Tatsächlich bearbeitete Dateien

- `editor/prefix-router.mjs` (neu)
- `editor/prefix-router.test.mjs` (neu)
- `editor/emacs-policy.mjs`
- `editor/commands.mjs`
- `editor/app.mjs`
- `editor/work-panel.mjs`
- `editor/work-panel.test.mjs`
- `docs/COMMAND_GAMEBOOK.md`
- `docs/EMACS_COPY_ACCEPTANCE.txt`
- `_Communication_Pipeline/developer_prefix.md` (dieser Bericht)

Testpfade liegen tatsächlich in `editor/*.test.mjs`, bestehende Gesamtsuite außerdem `spike/storage.test.mjs`. Vorhandene Änderungen erhalten; Lead-Dokumente nicht bearbeitet. Build erzeugt wie bisher lokale ignorierte Dateien in `dist/`.

## Ausgeführte Prüfungen

- `npm test`: **193/193 bestanden**, einschließlich 11 zusätzlicher Prefix-/Paneltests; Registry/Gamebook-Konsistenz und bisherige Storage-/Editorregressionen grün.
- `npm run build`: bestanden.
- `node --check` für app, commands, emacs-policy, work-panel, prefix-router und beide bearbeiteten Testmodule: **7/7 bestanden**.
- `git diff --check`: bestanden; lediglich vorhandene Git-Zeilenendenhinweise.
- Gezielt vorab `node --test editor/prefix-router.test.mjs editor/work-panel.test.mjs`, später finale Prefixsuite: bestanden.
- Modellprüfungen: reale aufgelöste CodeMirror-DOM-Handlerreihenfolge vor Copy-/Mark-Handlern, bestehende Fold-/Open-Aktionen ohne Text-/Undoänderung; Escape→Tab/Shift+Tab bei Heading/Liste mit und ohne Org-Tab. 100 integrierte Prefix-/Panel-Abbruchzyklen und 100 Durchläufe pro Blur-/Composition-/Mousedown-Abbruchpfad. Diese Prüfungen sind kein nativer Browsernachweis und keine Langzeitmessung.

## Offen / Übergabe

Unabhängige QA folgt. Native Edge-/DE-QWERTZ-/AltGr-/IME-/Clipboardzustellung, echte CodeMirror-/Panel-Scrollstabilität einschließlich unvermeidbarem Clamping am Dokumentende und langfristiger Ressourcenverbrauch **nicht ausgeführt**; native Produktprobe bleibt beim PO. Abnahmeblatt enthält konkrete Prefixschritte und löst frühere Gatehinweise als historischen Stand auf.

Kein bewiesener Blocker im automatisiert geprüften Umfang. Keine Installation, Storageänderung, Agenda/TODO, Unteragenten, Commit oder Push. Nach Bericht gestoppt.

## Begrenzte QA-Korrektur P2/P3 (2026-11-06)

Die QA-Befunde waren zutreffend. P2: Gamebook-Zuordnung korrigiert: `workspace.choose` hat wieder kein Kürzel, `fold.open` trägt `C-c 3 (Editor)` und die zugehörige Faltbeschreibung. P3: Ring-Renderer prüft jetzt den aktiven Prefixmodus; auch das öffentliche `panel.refresh()` lässt dessen Hilfe vollständig intakt.

Nur diese vier Dateien bearbeitet: `docs/COMMAND_GAMEBOOK.md`, `editor/work-panel.mjs`, `editor/work-panel.test.mjs` und dieser Bericht. Zwei Regressionstests ergänzen die Prüfung der drei Gamebook-Zuordnungen sowie Refresh während aktivem Prefix mit Router, unveränderten Buttons/Listenern, Text/Selection/Undo/Fokus/Viewport, anschließender Mausausführung, Cleanup und weiter funktionierendem Ring-Refresh.

Final erneut ausgeführt: `npm test` **195/195 bestanden**, `npm run build` bestanden, `node --check editor/work-panel.mjs` und `node --check editor/work-panel.test.mjs` **2/2 bestanden**, `git diff --check` bestanden. Zusätzlicher Whitespacecheck der vier Paketdateien bestanden. Native Browserprobe und Langzeitressourcen weiterhin **nicht ausgeführt**. Unabhängiger QA-Retest folgt; danach keine weiteren Arbeiten durch Developer begonnen. Kein Commit/Push.

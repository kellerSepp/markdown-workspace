# TODO-Zyklusfortsetzung — Developerbericht 2026-11-07

Rollenrevision `M32A-2026-11-03` bestätigt. Explizite PO-Korrektur umgesetzt, bestehende Änderungen erhalten, keine Unterdelegation.

**Verhalten:** Wird eine Aufgabenüberschrift durch Shift-Zyklus zu „Kein Status“, kann derselbe Bedienkontext mit Shift+Links/Rechts weiterlaufen. Vorwärts geht es vom leeren Zustand zum ersten konfigurierten Status, rückwärts zum letzten. Normale statuslose Überschriften werden weiterhin nicht abgefangen. Entfernen über das Panel startet keine Fortsetzung; Öffnen des Panels beendet eine vorhandene Fortsetzung.

**Bindung:** Ein flüchtiger Wert im bestehenden TODO-StateField speichert ausschließlich den Anfang der gerade per Zyklus entmarkierten Headingzeile. Er wird im selben atomaren Textschritt gesetzt, nicht im Markdown/Storage. Leere Cursorbewegungen innerhalb derselben Headingzeile und Parser-/No-op-Updates erhalten ihn. Fremde Textänderung, nichtleere/mehrfache Auswahl, Wechsel in Body/andere Headingzeile, Reload (auch fehlerhaft), Undo/Redo, neue Datei/State, Reconfiguration (einschließlich App-Busy/Read-only), Blur/Fensterblur, Composition, Mausinteraktion, Escape und C-g verwerfen ihn. Der Kontext wird bei jeder Aktion erneut vollständig geprüft.

**Integration:** `todoCycleContext` bildet ein gemeinsames Gate für Keyboard und Registry-Aktionen `todo.previous`/`todo.next`. Zyklus berechnet den Index ausdrücklich aus `status?.name ?? null`. Die vorangegangene Handlerpräzedenzkorrektur bleibt erhalten: leere aktive Emacs-Marke verhindert die Fortsetzung nicht; nichtleere Auswahl behält Markierungspriorität.

Betroffen: `editor/todo.mjs`, `editor/commands.mjs`, neue `editor/todo-cycle.test.mjs`. Keine neue App-/Storage-/Panelimplementierung oder Abhängigkeit.

**Final ausgeführt:** **251/251 Tests**, Build, vier gezielte Syntaxchecks (TODO/Commands/App/Zyklusregression) und `git diff --check` erfolgreich. Neue sieben Testgruppen decken 12 wiederholte beidseitige Zyklen pro H1–H6/kurzem/leeren/unbekannten Titel, alle Cursorpositionen von H1–H6 mit TODO/DONE ohne bzw. mit Titel, eigenes Mapping/Parserupdates, Panelabgrenzung, fremde Edits/Selection/Datei/Reload/Reconfiguration, Fokus-/Maus-/Compositionabbruch, atomare Undo/Redo sowie aufgelöste DOM-Handler mit leerer aktiver Marke und nichtleerer Region ab.

Keine native Browserprüfung oder Langzeitabnahme daraus abgeleitet. Keine QA-Skripte/Lead-Dokumente, Dependencies, Storage, Commit oder Push geändert. Code erneut für unabhängige QA eingefroren.

## Unabhängige QA-Korrekturen

- Aktiver Präfix konsumierte Escape/C-g vor dem bisherigen TODO-Handler. Ein separater frühester, nichtkonsumierender `todoCycleAbortCleanup` läuft jetzt vor Prefix; er löscht nur bei diesen Abbruchereignissen die Fortsetzung. Eigentliche Shift-Zyklussteuerung bleibt hinter Prefix, sodass keine Prefixwahl zum Statuswechsel wird. Start und normale Folgen ändern keinen State durch den Cleanup. Regression prüft tatsächliche App-Reihenfolge sowie Prefixstart, C-keyup, Escape/C-g und gültige Statuswahl.
- Ein führendes Titelwort wie DONE wurde nach `# TODO DONE Title` → `# DONE Title` im transienten Leerzustand fälschlich wieder als Status erkannt. Der gebundene Leerzustand ist jetzt im gemeinsamen `todoContext` semantisch ausdrücklich statuslos; der Planer fügt einen neuen Status vor das unveränderte Titelwort ein. Dekorationen überspringen diese Heading während der Bindung, sodass das Titelwort keine falsche Aufgabenfarbe erhält. Regression prüft alle Default-/Customstatusnamen als führende Titelwörter, beide Richtungen und H1–H6 mit exakt vollständigem Text-Roundtrip.
- Nach Ablauf der Bindung gilt wieder die normale Rohtextkonvention. Panelöffnung beendet die Bindung explizit vor Neuberechnung des Panelkontexts; keine widersprüchliche Anzeige eines noch gültigen transienten Zustands.

Finaler Retest nach beiden Befunden: **253/253 Tests**, Build, vier Syntaxchecks (TODO/Commands/App/Zyklusregression) und Diffcheck erfolgreich. Betroffen zusätzlich App-Integration des reinen Abort-Cleanups. Erneut Code-Freeze zur unabhängigen QA; keine QA-Skripte oder Lead-Dokumente bearbeitet.

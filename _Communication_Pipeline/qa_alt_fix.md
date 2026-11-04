# QA Alt-Bugfix — 2026-11-04

Unabhängige Rolle `qa_alt_fix`; tatsächlich geladene Rollenrevision `M32A-2026-11-03` bestätigt. Aktuelle AGENTS.md und QA-Brief gelesen. Keine Anwendungscodeänderung, Installation oder Unterdelegation.

## Ergebnis

**110/110 Tests bestanden**, einschließlich der bisherigen 108 Regressionen und zwei neuer Alt-Prüfungen. `npm run build`, Syntaxchecks für `editor/structure-keymap.mjs` und `editor/alt-keyboard.test.mjs` sowie `git diff --check` erfolgreich. Nur vorhandene Git-Zeilenendenhinweise. Kein belegter Blocker im geprüften Umfang.

Gezielter Review bestätigt die Ursache: Der normale CodeMirror-Keymap-Handler konnte Alt-Links/Rechts vor dem Org-DOM-Handler als Cursorbewegung konsumieren. `Prec.highest` ordnet den lokalen Org-Handler vor der Standard-Keymap ein. Die neue Prüfung führt die tatsächlich aufgelöste CodeMirror-ViewPlugin-Reihenfolge einschließlich echtem Keymap-DOM-Handler aus; sie ist stärker als ein direkter Resolveraufruf, aber kein nativer Browsernachweis.

Die ausgeführten Tests decken Alt-Links/Rechts und Shift-Alt-Links/Rechts für Überschriften/Listen ab: genau ein Org-Aufruf, kein konkurrierender Cursorfallback; gewöhnlicher Text behält seinen Fallback. Undo/Redo und atomare H1-Verweigerung bestanden. AltDown → Org-Pfeil → AltUp, AltDown → fremdes Kürzel → AltUp, zusätzliche Shift-Folge und Fokusverlust sind geprüft.

Bare-Alt-Unterdrückung gilt nur für an den fokussierten Editor gelieferte linke Alt-Down/Up-Ereignisse. Rechte Alt, AltGr, Control/Meta, IME und fehlender Editorfokus sind ausgenommen. Unbekannte Tastenkombinationen und Blur löschen die vorgemerkte Alt-Folge; keine globale Tastensperre. Tatsächliche Edge-/Windows-Menüreaktionen lassen sich aus `preventDefault`-Modelltests nicht garantieren.

## Browsergrenze

Computer-Use-Skill einschließlich Guidance, Bestätigungsvorgaben und API gelesen. Bestehendes Edge-Editorfenster eindeutig aus `list_apps` gewählt. Der erste `get_window_state`-Aufruf lieferte keinen Zustand und wurde nach 420,9 Sekunden abgebrochen. Danach keine weiteren Browseraktionen; keine App-Eingaben und kein erfolgreicher nativer Alt-Test behauptet. Kein eigener Server oder Prozess gestartet. Native Edge-Zustellung, sichtbare Cursor-/Fokusreaktion und tatsächliches Ausbleiben der Browsermenüaktivierung bleiben offen.

PO berichtete zuvor Alt-Auf/Ab und Shift-Alt-Auf/Ab grundsätzlich funktionierend; Alt-Links/Rechts und Alt allein fehlerhaft. Dies ist Nutzerfeedback, kein neuer unabhängiger Browsertest.

Keine Stunden-, Idle-, RAM-, Leak-, großen Vault- oder Offline-Messungen in diesem fokussierten Bugfix ausgeführt. Kein Performancebudgetnachweis aus den kurzen automatisierten Tests abgeleitet. M4b.2 bleibt gesperrt.

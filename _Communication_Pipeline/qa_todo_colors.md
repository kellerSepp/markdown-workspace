# Unabhängige QA TODO-Farbkorrektur — 2026-11-07

Rollenrevision `M32A-2026-11-03` aus geladenen Instruktionen und Rollenbrief erneut bestätigt. Nur `test-vault/qa-todo-colors.mjs` und dieser Bericht erstellt; keine App-/Lead-Dokumentänderung, keine Installation oder Storageänderung, kein Commit/Push.

## Ergebnis

**244/244 Tests**, Build, fünf Syntaxchecks (Themeadapter/Themes/TODO/Farbregression/QA-Script) und `git diff --check` erfolgreich. Keine verbleibenden bewiesenen Blocker im geprüften Farbfixumfang.

Ursache unabhängig bestätigt: der echte Markdown-Highlighter weist Statuszeichen eigene H1–H6-Farbklassen zu. Auf einem inneren Syntaxspan gewinnt eine explizite Headingfarbe gegenüber bloß geerbter äußerer Taskfarbe. Die ergänzten eng begrenzten Nachfahrenselektoren `.cm-content .cm-todo-open *` und `.cm-content .cm-todo-closed *` setzen die Taskfarbe auch dort ausdrücklich. Ihre erzeugte Spezifität liegt über der normalen Highlightklasse; `!important` ist nicht nötig. Beide möglichen Anordnungen (Task außen/Syntax innen bzw. Syntax außen/Task innen) und Klassen auf demselben Element sind abgedeckt. Titel liegen außerhalb des Task-Dekorationsbereichs und behalten ihre Headingfarbe; keine globale Inhaltsfarbenregel ergänzt.

Eigenes Script: **225 unabhängige Prüfungen** mit echten Markdownbäumen, realen Highlightklassen, tatsächlichen Dekorationsbereichen und generierten CSS-Regeln. Matrix: vier Themes × H1–H6 × offen/abgeschlossen × drei Verschachtelungsformen = 144 CSS-Kaskadenprüfungen einschließlich unverändertem Titelscope und vergleichbarem Text außerhalb der Taskmarkierung. Zusätzlich 80 Themewechsel mit tatsächlicher Compartment-Rekonfiguration und `applyTheme`-Variablenabbildung; Text, Auswahl und Undo-Tiefe unverändert. Abschließend Undo/Redo der vor dem Themewechsel angelegten Statusänderung erfolgreich. Die neue Produktsuite prüft ergänzend formatierte Statusnamen mit realen mehrfachen Syntaxsegmenten.

## Grenzen und nächste Aktion

Dies ist ein Parser-/Dekorations-/CSS-Kaskadenmodell und kein nativer Browser-DOM-/Computed-Style-Beleg. Keine native Sichtprüfung durchgeführt; nach Strg+F5 die H1–H6-Statuswörter offen grün/abgeschlossen rot in allen vier Themes beim PO prüfen. Langzeit-/Idle-/Ressourcenabnahme wird aus den kurzen Modellzyklen nicht abgeleitet. Keine weitere Funktion oder Phase freigegeben.

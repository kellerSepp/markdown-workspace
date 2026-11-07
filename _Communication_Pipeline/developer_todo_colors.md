# TODO-Farben — gezielter Developerbericht 2026-11-07

Rollenrevision `M32A-2026-11-03` bestätigt. Fokussierter PO-/Leadauftrag umgesetzt; vorbestehende Arbeit erhalten, keine weiteren Agenten.

**Ursache:** Echte Markdown-Highlightklassen geben dem Statuswort bereits eine explizite H1–H6-Farbe. Wenn der Syntax-Span innerhalb der äußeren `cm-todo-open`-/`cm-todo-closed`-Markierung liegt, erbt er deren Grün/Rot nicht: Seine eigene Syntaxfarbe gewinnt gegenüber bloßer Vererbung. Mehr Spezifität allein auf dem äußeren Element behebt dies nicht. Die Task-Dekorationen und Themevariablen waren vorhanden; `applyTheme` veröffentlicht korrekt `--todo-open`/`--todo-closed`.

**Korrektur:** Nur `editor/theme-editor.mjs` ergänzt zwei eng begrenzte Farbregeln für Nachfahren der Task-Markierungen. Dadurch erhalten auch innere Heading-/Emphasis-/Strong-Syntaxspans ausdrücklich den jeweiligen Task-Token. Die vorhandene äußere Taskfarbe, punktierte Unterstreichung bzw. Durchstreichung bleiben erhalten. Der Titel liegt außerhalb der Taskmarkierung und behält seine H1–H6-Farbe. Keine Festfarben oder `!important`, keine Änderung der Statuslogik.

**Regression:** Neue `editor/todo-colors.test.mjs` nutzt tatsächlichen Markdown-Syntaxbaum, generierte Highlightklassen, echte Dekorationsbereiche und erzeugtes CodeMirror-CSS. Belegt alle H1–H6 in vier Themes, explizite konkurrierende Syntaxfarbe auf dem Status, gewinnende Nachfahrenselektoren, unveränderten Titelscope, formatierten Status mit mehreren echten Syntaxsegmenten und die tatsächliche Variablenabbildung von `applyTheme`.

**Final ausgeführt:** **244/244 Tests**, `npm run build`, vier gezielte Syntaxchecks (TODO/Themeadapter/Themes/Farbregression) und `git diff --check` erfolgreich.

**Grenze:** Im Projekt sind keine installierten Browser-/DOM-Testbibliotheken verfügbar. Keine Installation vorgenommen, kein echter Browser-DOM-/Computed-Style-Nachweis behauptet. Der Nachweis verwendet reale Parser-/Highlight-/Decoration-/CSS-Ausgabe; native Sichtprüfung nach Neuladen bleibt beim PO. Keine Storageänderung, Dependency, Commit oder Push. Code für unabhängige QA eingefroren.

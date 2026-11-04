# QA M4b.1 — 2026-11-04

Unabhängige Rolle `qa_m4b1`; tatsächlich geladene Laufzeitrevision `M32A-2026-11-03` bestätigt. AGENTS.md, QA-Brief, Org-Anleitung, Gamebook und relevante Implementierung geprüft. Keine Anwendungscodeänderungen, Installationen, Unterdelegation oder produktiven Vaults. PO-Klarstellung gilt: Shift-Alt-Auf/Ab bewegt eine physische Zeile; Links/Rechts ändert Ebenen.

## Ergebnis und ausgeführte Prüfungen

**Kein belegter Blocker im geprüften Umfang.** Unabhängig `npm test`: **108/108 bestanden**; `npm run build` erfolgreich. Vier Syntaxprüfungen (`app.mjs`, `org-structure.mjs`, `org-folding.mjs`, `line-move.mjs`) und `git diff --check` erfolgreich; nur vorhandene LF/CRLF-Hinweise. Bestehende Storage-/Codec-/Theme-/Format-/Folding-/Strukturregressionen weiterhin grün. Registry/Gamebook-Abgleich erfasst 58 IDs sowie Org-/Workspace-Kürzel.

Zusätzlich eigene, inline ausgeführte Node-Repros mit echten CodeMirror-Zuständen und Markdown-ASTs:

- **72 Headingfälle:** H1–H6 × Einzel-/Unterbaum × höher-/tieferstufen × drei Cursorpositionen. 57 akzeptiert mit exakt erwartetem Text, 15 vollständig verweigert. Akzeptierte Fälle jeweils eine Undo-Einheit, Text- und Cursorerhalt nach Undo/Redo. Kindmarker nur bei tatsächlichen Unterbaumvarianten verändert.
- **54 Zeilenfälle** über sieben Dokumente mit Leerzeilen, EOF, Unicode, unterschiedlichen Headingebenen, eingerücktem Code, Fences und Frontmatter: 26 akzeptierte Bewegungen mit exaktem Nachbarzeilentausch, Cursorzeile/-spalte und Undo/Redo; 28 unverändert verweigerte Grenzfälle.
- **406 erneute Busy-Kontextprüfungen:** sieben Dokumentzustände × 58 Commands. Nach Anzeige Busy aktiviert: alle Ausführungen verweigert, kein Handleraufruf, Dokumente unverändert.
- Zwei zusätzliche gemischte Heading-Grenzfälle: H3 wird weder nach unten noch oben über eine H2-Elterngrenze bewegt.

Die vorhandenen neuen Tests prüfen außerdem Listen-Single/Subtree, Children-Outdent-Verweigerung, AltGr/IME/Control/Meta, reine Texteingabe, konkurrierende CodeMirror-Defaults, lokale/globale Sichtbarkeitszyklen einschließlich gleicher Stufen, native CodeMirror-Tab-Keymaps und Escape-Fokusfreigabe. Palettenmodell prüft Kürzelübersicht und getrennte Original-/Workspace-Anzeige; kein nativer DOM-/Browsernachweis daraus abgeleitet.

## Review und Kompatibilitätsgrenzen

- Tastatur, Palette und Menü verwenden gemeinsame Registry-Handler. Neue Single/Subtree-Varianten sind unabhängig von der alten Children-Checkbox. Alt-Auf/Ab verwendet Heading-Geschwistertausch beziehungsweise Listen-Unterbaumtausch; Shift-Alt-Auf/Ab verwendet ausschließlich den Zeilenplaner.
- Org-Kernregeln durch [Structure Editing](https://orgmode.org/manual/Structure-Editing.html), [Plain Lists](https://orgmode.org/manual/Plain-Lists.html), [Visibility Cycling](https://orgmode.org/manual/Global-and-local-cycling.html) und [Orgcard](https://orgmode.org/orgcard.pdf) dokumentiert. Ergänzender Entwickler-Quellreview des 10.0-pre-Zweigs ist korrekt vom stabilen Handbuch-/Orgcard-Beleg getrennt. Kein tatsächlicher Emacs-Vergleichslauf behauptet.
- Nur tatsächliche Heading-/erste Itemzeile für Org-Alt-Struktur; allgemeine Org-Absatz-/Elementbewegung und aktive Regionen fehlen. H1–H6, Markdown-Mischcontainer-/Tab-/Nummernbreiten-Schutz bleiben Einschränkungen.
- Listen-Sonderfälle sind verständlich gesperrt: erstes Item mit ganzer Liste einrücken, Ausrücken mit folgenden Geschwistern, unmittelbare wiederholte Unterbaum-Einrückung ohne neue Cursor-/Zustandsänderung. Keine vollständige Org-Wiederholungsregion implementiert. Diese Grenzen müssen im Abschluss sichtbar bleiben.
- Struktur-Tab ist weiterhin Standard. Explizite Org-Tab-Sitzungsoption ergänzt Heading-Folding und globales Shift-Tab; Listen/Code behalten bisherige Struktur-/Codefunktion. CHILDREN zeigt eigenen Body und direkte Kindheadings, CONTENTS alle Headings ohne Body. Doppelte Sichtbarkeitsstufen werden übersprungen. View-Effekte ändern Text/Historie nicht.
- CodeMirror-Alt-Up/Down-Zeilenbewegung und Shift-Alt-Up/Down-Zeilenkopie aus App-Defaults entfernt. Neue Alt-Behandlung ist editorlokal und modifiergeschützt; keine pauschale Alt-Blockade. Erkannte, an Grenzen verweigerte Befehle werden verständlich gemeldet.
- Reine Zeilenbewegung verändert keine Marker, kann aber bewusst die abgeleitete Hierarchie verändern. Code/Fences und Frontmatter werden zusätzlich geschützt. Auswahlregionen bleiben gesperrt; dies ist ausdrücklich keine uneingeschränkte Emacs-Zeilenfunktion.
- Keine Änderung am Storage-Sicherheitskern/Codec, Datenmodell, Paketen oder Framework festgestellt; keine Hintergrund-Polling-/Sequenzmaschine eingeführt.

## Tatsächlicher Edge-Versuch

Computer-Use-Skill samt Guidance/API/Bestätigungsvorgaben gelesen, `@oai/sky` initialisiert. Genau ein vorhandenes Edgefenster mit Titel des lokalen Markdown-Editors ausgewählt. Bereits der erste `get_window_state`-Aufruf endete mit:

> Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.

Danach keine App-Eingaben oder Umgehung. **Kein Alt-Kürzel, keine Palette-/Menüaktion und kein sichtbarer Editorfokus in Edge als bestanden gewertet.** Kein eigener Server gestartet, keine fremden Prozesse beendet. Kein neuer PO-Browserbericht vorhanden.

Offen bleiben native Edge-/Windows-Tastenzustellung und Browsernavigation, DE-QWERTZ/AltGr/IME, sichtbare Cursor-/Auswahl-/Fokuswiederherstellung, native Menüereignisse, vier Themes, Zoom/Hochkontrast und Screenreader. Reproduzierbare manuelle Schritte stehen in `docs/ORG_KEYBOARD_M4B1.md`; Palette und Kontextmenü sind vorhandene Alternativen bei Shortcutkonflikten.

Keine Stunden-, Idle-, großen Vault-, Offline-, RAM-, Leak- oder Latenzmessreihe ausgeführt. Die kurzen automatisierten Läufe liefern keinen Langzeit-/Perzentil-/Ressourcenbudgetnachweis. M4b.2 bleibt ohne Freigabe.

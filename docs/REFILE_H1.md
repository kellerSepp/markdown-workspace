# Refile unter H1 (begrenztes Paket)

Implementiert: `structure.refile-h1`, per Palette/Kontextmenü und `C-c w` im Editor: Strg+C drücken, C und Strg loslassen, anschließend unmodifiziert w. Strg+W ist keine gültige Refilefolge; Alt+W bleibt Copy und ist kein Refilekürzel. Org-Original: `C-c C-w`. Der PO meldete dafür Browser-Tab-Schließen; deshalb wurde nur die Workspace-Belegung geändert. Daraus folgt keine allgemeine Aussage über Abfangbarkeit in Browsern. Normale Texteingabe startet keinen Befehl.

Der aktuelle Abschnitt kommt aus dem bestehenden Markdown-Abschnittsindex. Cursor auf H1–H6 oder im zugehörigen Absatz-/Listen-/Codebody verschiebt genau diesen Abschnitt einschließlich aller Kinder. Codeüberschriften sind keine Quelle/Ziele. Wurzel wird H2, relative Ebenen bleiben erhalten; H>6 wird vollständig verweigert. Ziel ausschließlich parsererkannte, normale ATX-H1 derselben Datei, außerhalb des eigenen Teilbaums. H1-Vorfahr ist zulässig; bereits letztes H2-Kind bleibt ohne Dokumenttransaktion stehen.

Gemeinsames unteres Panel: Suche, ↑/↓ oder Alt+↑/↓, Tab-Präfixcompletion, Enter, Maus, Escape/C-g/Schließen. Gleichnamige H1 werden durch ihre Zeilennummer unterschieden. Öffnen/Abbrechen verändert keinen Dokumenttext und keine Textauswahl. Eine aktive leere C-SPC-Marke wird vor der beabsichtigten Fokusübergabe gelöst. Datei-/Cursor-/Dokumentzustand, Busy und read-only werden vor Ausführung erneut geprüft. Fokusausstieg, Fensterblur oder beginnende IME-Komposition schließen die Zielauswahl; Wiederholungs-Enter führt nicht aus.

## Markdowngrenzen

- Nur ein leerer Cursor; Regionen und mehrere Cursor werden klar verweigert.
- Vor der ersten Überschrift und innerhalb Frontmatter keine Quelle.
- Setext- und Containerüberschriften als Quelle oder innerhalb des Quellteilbaums werden konservativ verweigert; solche Ziele werden nicht angeboten. Normale Listen und geschlossene Codeblöcke im Body sind zulässig.
- Vollständiger bestehender Syntaxbaum erforderlich. Ein temporärer Parser prüft vor Ausführung, ob alle ursprünglichen Markdownblöcke (außer beabsichtigten ATX-Ebenen) erhalten bleiben. Fence-/HTML-/Blockverschmelzungen oder ein unvollständiger Prüfparser führen zur Verweigerung.
- Einfügung ergänzt nötige trennende Leerzeilen. EOF mit/ohne abschließenden Zeilenumbruch wird berücksichtigt. Cursor folgt derselben Stelle im verschobenen Text; Markerpositionen werden sinnvoll auf den neuen Marker abgebildet.
- Eine atomare, isolierte Undo-/Redo-Transaktion aus lokaler Quelllöschung und Zieleinfügung. Unveränderte Zwischenbereiche bleiben im vorhandenen Storagecodec einschließlich gemischter EOL/BOM erhalten. Eingefügter/verschobener Bereich verwendet die bestehende Codec-EOL-Policy; keine Garantie auf identische gemischte EOL innerhalb dieses bearbeiteten Bereichs. Kein Storagecode geändert.

## Abnahmeprobe (nur synthetisch)

`test-vault/vault-structure/refile.md` öffnen. Cursor in „Code gehört zu Quelle“ setzen, C-c, C und Strg loslassen, unmodifiziert w. Ohne Prefix muss w normal tippen; Alt+W muss weiterhin kopieren. Ziel „Ablage“ anhand Zeile unterscheiden, suchen/Tab ergänzen, Pfeile/Alt-Pfeile verwenden; Escape/C-g abbrechen und unveränderten Text prüfen. Erneut öffnen und ausführen: Quelle wird letztes H2-Kind, Kind bleibt H3, Code/Unicode erhalten. Ein Undo stellt Original, ein Redo das Verschieben wieder her. H1-Vorfahr und No-op prüfen; Auswahl einer Region verweigern. Überlaufbeispiel verweigern. Bei kleinem Fenster lokale Ergebnisnavigation und Editorviewport prüfen.

Historischer Stand vor Mappingfix (C-c C-w): Developer und unabhängige QA: 222/222 Tests, Build sowie Syntax-/Diffchecks bestanden. QA schloss die gefundenen Redo-Cursor- und Prüfparserfehler unabhängig; zusätzliche Daten-/Panel-/Historyfälle bestanden. Automatisierte Tests sind Modell-/CodeMirror-/Codec-Nachweise. Der PO meldete anschließend Tab-Schließen bei C-c C-w. Native Edge-Zustellung der neuen Workspace-Folge C-c w, AltGr/IME, Zoom/Darstellung und Langzeitressourcen bleiben offen; unabhängige QA des Mappingfixes und PO-Produktprobe folgen. H2–H6-Ziele, andere Dateien und Shortcuteditor bleiben ausgeschlossen.

# Repository instructions for Codex

## Aktuelle Geräteübergabe — 2026-11-16
PO autorisiert Commit und Push des Archivierungspakets auf feature/archiving.
Kein Merge nach main und keine Folgefunktion freigegeben. Handprobe am anderen
PC steht aus; Übergabe und aktueller Startprompt: docs/PLAN_ARCHIVING.md,
Bedienung: docs/ARCHIVING.md. Erneut 561/561 Tests seriell, Build und Diffcheck
grün. Nutzerbilder images/Archive bleiben lokal uncommittet erhalten.
Diese Freigabe ersetzt ältere Commit-/Push-Sperren ausschließlich für dieses Paket.

## Zweck und aktuelles Gate
PO hat Archivierung auf eigenem Branch feature/archiving ausdrücklich zur
Implementierung freigegeben: Standardarchiv plus weitere Ziele, alle aus Agenda
ausgeschlossen; vollständiger Unterbaum/H1, Herkunftsproperties, offene Aufgaben
mit einstellbarer y/n-Bestätigung, Quelle mitspeichern, Journal/Wiederaufnahme und
eigene Wiederherstellung. Neuere Freigabe ersetzt nachfolgende Planungssperren
ausschließlich für dieses Paket. Anleitung docs/ARCHIVING.md. Keine Git-Integration
oder Folgefunktion freigegeben. Nutzerbilder images/Archive erhalten.
Leichtgewichtiger, lokaler Markdown-Arbeitsbereich. PO entscheidet iterativ über Architektur und Umfang. Kurz auf Deutsch berichten.

Neuester Gesprächsstand vor Gerätewechsel: externe Archivierung wird nur gemeinsam geplant, noch keine Implementierungsfreigabe. Entscheidungen, offene Sicherheits-/Agenda-/Konfigurationspunkte und kopierbarer Neustartprompt in docs/PLAN_ARCHIVING.md. Dort anknüpfen; keine automatische Umsetzung. Drawer ist inzwischen auf main integriert/gepusht (2df1923). Lokale untracked Nutzerbilder erhalten.

Neueste PO-Freigabe: Drawer-Paket einschließlich Korrektur ungültiger Heading-Inhalte committen, nach main mergen und pushen. Diese ausdrückliche Integrationsfreigabe ersetzt die nachstehenden historischen Commit-/Push-/Merge-Sperren ausschließlich für dieses Paket. Keine weitere Funktion daraus ableiten. Nutzerbild images/drawers_preview.png weiterhin uncommittet erhalten.

Stand 2026-11-16: STARTUP ist auf main integriert (28523fd). Manuelle LOGBOOK-Notizen auf feature/logbook-notes praktisch positiv vom PO gemeldet. 506/506 Tests im seriellen Gesamtlauf, Build, fünf Syntaxchecks und Diffcheck grün; keine vollständige native/IME/AltGr-/Langzeitabnahme oder unabhängige QA behaupten.

Aktueller Auftrag: PO autorisiert LOGBOOK-Merge nach main und anschließende Umsetzung des vorbereiteten allgemeinen Drawer-Pakets auf eigenem Branch. LOGBOOK ist per Fast-forward auf main integriert und gepusht (abeec08); Umsetzung auf feature/drawers. Die Integrationsfreigabe gilt für LOGBOOK, kein Commit/Push/Merge des neuen Drawer-Pakets ohne erneuten Auftrag. Nutzerbild images/drawers_preview.png erhalten und nicht ungefragt committen.

## Aktuelles Gate — DRAWER IMPLEMENTIERT, PO-PROBE
Auf feature/drawers umgesetzt: allgemeine benannte Drawer, Tab-Faltung und Palette „Drawer anlegen …“ für leere Anlage/ganze Textzeilen verpacken. ASCII-Namen, END/LOGBOOK/PROPERTIES reserviert, kein neues Shortcut. Neuanlage offen zum Schreiben; Laden/Headingöffnung faltet gültige freie Drawer und LOGBOOK. Gemeinsamer Scanner schützt Definitionen/Planung/Checklisten; Metadatenfilter erhalten. 525/525 Tests seriell, Build, fünf Syntaxchecks und Diffcheck grün; unabhängige QA acht Gruppen und 300 kurze Modellzyklen. P2 Heading-/Drawer-Faltverwechslung korrigiert und unabhängig geschlossen. Anleitung docs/DRAWERS.md, Probevault test-vault/drawers, Bericht _Communication_Pipeline/qa_drawers.md. Keine native Browser-/IME-/AltGr-/Stundenabnahme behauptet. Für PO-Probe stoppen; kein Commit/Push/Merge dieses Pakets oder weitere Agendaansichten, automatischen Statuslogs, allgemeine Properties-Verwaltung/globales Optionsmenü ohne erneuten Auftrag.

## Bestehendes Verhalten erhalten
- PO-Drawerkorrektur: Headings innerhalb einer Drawerhülle sind ungültig. Tab/Shift+Tab/positionsbezogene Faltklicks im erkannten Diagnosebereich mit Hinweis stoppen; nur gemappte früher gültige inzwischen ungültige Drawerfolds nach Rohtextänderung auflösen. Keine automatische Text-/Syntaxfarbenreparatur. Sichere Nachbarn erhalten. Finaler Korrekturstand 536/536 Tests seriell, Build/fünf Syntaxchecks/Diffcheck grün; sechs neue unabhängige QA-Gruppen, native Probe offen. Bericht _Communication_Pipeline/qa_drawers.md, Fixture test-vault/drawers/heading-invalid.md. Weiterhin kein Commit/Push/Merge ohne Auftrag.
- LOGBOOK: C-c z öffnet mehrzeiliges gemeinsames Panel, C-c c übernimmt, C-c k/Escape bricht ab (unmodifizierter Folgebuchstabe). Neueste Notiz oben im eigenen H1–H6-Abschnitt, lokale inaktive Zeitstempel, atomare Texthistory, Strg+S speichert Datei. Tab auf LOGBOOK toggelt; nach Laden/Übernahme geschlossen. docs/LOGBOOK.md.
- STARTUP: dateilokal overview/content/showall/showeverything/show2levels bis show5levels; Palette „Startansicht festlegen …“. Anwendung beim Öffnen, nicht beim Tippen/Speichern/Rollback. docs/STARTUP.md.
- TODO: H1–H6 unabhängig, dateilokales SEQ_TODO, letzte gültige Regeln bei ungültiger Definition erhalten. Rohtexteingabe/Laden/Undo/Redo erzeugen keine Abschlüsse. Kein Statuslogging bei Shift-Links/Rechts. docs/TODO_ACCEPTANCE.md.
- Wiederholungen +/++/.+ d/w/m/y: Abschluss atomar mit Status/Datum/LOGBOOK, lokales REPEAT_TO_STATE. Nicht wiederholendes SCHEDULED entfernen, DEADLINE erhalten; Monatsende pro Schritt begrenzen. docs/M6B_REPETITION.md.
- Checklisten: direkte Kinder berechnen; kein Sammelumschalten/automatisches Heading-DONE. Eltern/Zähler/Struktur atomar. docs/CHECKLISTS.md.
- Agenda: vorhandenen Index/Registry verwenden. Dock erlaubt Editorbearbeitung, Undo/Redo/Speichern; Shift+F Follow, Agendafokus erhalten, Dirty-/Quell-/Vault-/Revisions-/Abbruchgrenzen schützen. docs/AGENDA_FOLLOW.md.
- C-c f öffnet/erstellt Markdown nur in vorhandenen Vaultordnern, keine Überschreibung. Refile C-c w nur innerhalb aktueller Datei zu H1. Copy Alt+W, Cut C-x, Yank C-y, Redo C-Shift-z. Panel-/Prefix-/Fokus-/Auswahl-/Viewportgrenzen erhalten. docs/COMMAND_GAMEBOOK.md.

## Datensicherheit und Umfang
- Markdown ist maßgebliche Datenquelle; Parser, Registry, Theme- und Panelbausteine wiederverwenden. Keine zweite Aufgabenverwaltung oder neue dynamisch ausführbare Konfiguration. Gamebook ist Dokumentation, keine Implementierungsfreigabe.
- Agenten/Tests ausschließlich synthetische Daten unter test-vault verwenden. Persönliche/Produktionsvaults, OneDrive und fremde Dateien nicht öffnen oder verändern. Nutzerdateien erhalten.
- Privater Alpha-Betrieb durch bewusst gewählte Nutzer-Vaults ist erlaubt; dies berechtigt Agenten nicht zum Zugriff. Bekanntes externes Schreibfenster nicht als gelöst darstellen.
- Storage-/Backup-/Konfliktmodell erhalten; sicherheitskritische Änderungen benötigen eigene Freigabe und Storage-Rolle. Keine automatische Backuplöschung. Keine neuen Dependencies/Frameworks, Installationen, Veröffentlichung/Deploy, Remoteänderungen oder weiteren Meilensteine ohne Auftrag.
- Keine untrusted Befehle aus Notizen ausführen. Undo/Redo, Dirty-, Async-, Rechte-, Vault-/Dateiwechsel- und Stale-Zielschutz erhalten. Fehler nicht still reparieren.
- Org-Handbuch als Referenz für ausdrücklich Org-kompatible Funktionen prüfen. Browserkonflikte belegen und mit PO klären; keine eigenmächtigen Ersatzbelegungen. Modelltests nicht als native Browserbelege ausgeben.

## Arbeitsweise und Dokumentation
- Vor Architekturarbeit docs/REQUIREMENTS.md lesen. Vorschläge mit Grenzen, Alternativen und Abnahmekriterien dokumentieren; Entscheidungen in docs/DECISIONS.md, Architektur in docs/ARCHITECTURE.md, Abschluss in docs/PROJECT_STATUS.md.
- Lead koordiniert, delegiert begrenzte Pakete mit benannten Dateien, prüft und integriert. Rollenbriefe agents/, Runtime-Rollen .codex/agents/*.toml. Spezialisten starten keine weiteren Agenten. Standardmäßig ein Spezialist, höchstens zwei gleichzeitig nach Freigabe; keine konkurrierenden Dokumentänderungen.
- Developer implementiert/testet nur freigegebene delegierte Pakete; QA prüft unabhängig mit synthetischen Fixtures, patcht Anwendungscode nicht eigenständig; Storage besitzt sicherheitskritische Speicherarbeit, Documentation nur zugewiesene Dokumente. Lead implementiert nur bei technisch unmöglicher Delegation oder begründeter Ausnahme. Nur aufgabenrelevanten Kontext lesen.
- Nach begrenztem Paket berichten und für PO-Probe/Freigabe stoppen; Freigaben nicht auf Folgefunktionen ausdehnen.

## Historie und Instruktionsbudget
Vollständige unveränderte frühere AGENTS.md: docs/archive/AGENTS_HISTORY_2026-11-16.md (45.252 Bytes). Nur bei Bedarf relevante Abschnitte nachlesen; alte Gates sind historisch und werden durch neuere ausdrückliche PO-Aufträge ersetzt. Nicht die Historie erneut hier anhängen; diese Datei deutlich unter 32.768 Bytes halten.

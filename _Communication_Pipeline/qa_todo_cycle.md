# Unabhängige QA TODO-Leerzustandszyklus — 2026-11-07

Rollenrevision `M32A-2026-11-03` aus geladenen Instruktionen und `agents/qa.md` bestätigt. Nur `test-vault/qa-todo-cycle.mjs` und dieser Bericht erstellt; keine Anwendungscode-/Lead-Dokumentänderungen, keine Unterdelegation/Installation/Storageänderung/Commit/Push.

## Abschließendes Ergebnis

**253/253 Tests**, Build, fünf Syntaxchecks (TODO/Commands/App/Zyklusregression/QA-Script) und `git diff --check` erfolgreich. Eigene **403 unabhängige Prüfgruppen** bestanden. Keine verbleibenden bewiesenen Blocker im geprüften Korrekturumfang.

Unabhängige Nachweise: tatsächliche App-Reihenfolge Cleanup→Prefix→TODO→Emacs mit Registry, wiederholte beidseitige Default-/Customzyklen an H1–H6 mit leerem/Unicode-/unbekanntem Titel, eigene Cursor-/No-op-Updates, fremde Änderungen/Regionen/Multicursor/Body/andere Heading/Reload/Reconfiguration/neuer State, Panelöffnung/-entfernung, leere aktive Emacs-Marke, atomare Undo/Redo und Fensterblur-/Listenercleanup. Normale unmarkierte Headings werden weiterhin nicht generell durch Shift übernommen.

Zwei P2-Befunde unabhängig gefunden, Developer korrigierte beide; eigene Reproduktionen geschlossen:

- Nach cycle→null, C-c-Präfix, Escape/C-g blieb Zyklusfortsetzung aktiv, weil Prefix den Abbruch zuerst konsumierte. Neuer kleiner nichtkonsumierender Cleanuphandler vor Prefix beendet die Fortsetzung auch dann. Eigene echte Pipeline und App-Quellreihenfolge geprüft; Registry next/previous auf entmarkierter gewöhnlicher Heading danach gesperrt.
- `# TODO DONE Title` → Shift-Links → `# DONE Title` → Shift-Rechts löschte zuvor das ursprüngliche Titelwort DONE. Transienter Leerzustand wird nun im Kontext/Planer ausdrücklich als statuslos behandelt; Dekoration markiert das bekannte Titelwort dann nicht als Aufgabe. Eigene breite Zusatzmatrix: Default-/Customregeln × H1–H6 × jeder initiale Status × jeder geladene Status als erstes Titelwort × beide Richtungen; jeweils vier vollständige Umläufe textgenau, bei jedem Leerzustand keine Taskdekoration, Registryfortsetzung aktiv. Originaltitel wird erhalten.

Nach explizitem Ende der transienten Bindung gilt erneut die normale Rohtextkonvention: ein bekanntes führendes Wort wird als Status erkannt. Die flüchtige Unterscheidung wird nicht gespeichert; dies ist die dokumentierte Grenze, keine dauerhafte alternative Markdowninterpretation.

## Grenzen und nächste Aktion

Kein nativer Browserbeleg oder Langzeit-/Idle-/Ressourcennachweis aus den kurzen Modellen. Native PO-Probe nach Strg+F5: mehrfach beide Richtungen über Kein Status, normale Überschrift/markierte Auswahl sowie Escape/C-g prüfen. Keine weitere Phase/Agenda/Storageänderung/Dependencies/Commit/Push.

# Agenda unten und Follow — 2026-11-09

PO-Freigabe: kompakte untere Agenda statt überlagernder Ansicht, ungefähr 50:50 geteilt, mit Maus verstellbar; Follow ausdrücklich **Shift+F**, nicht Alt+F. Keine Feiertagsfunktion, Dependencies, Storageänderung, Commit, Push oder Veröffentlichung.

## Bedienung

Der Dispatcher `C-c a` bleibt ein kompakter Dialog. `a` öffnet die Woche, `t` die TODO-Liste im gemeinsamen unteren Arbeitsbereich. Der Editor bleibt oben sichtbar. Die Trennlinie ändert das Höhenverhältnis; beide Bereiche scrollen unabhängig. Beim Schließen erhält der Editor den Platz zurück. Andere Arbeitsmenüs und Agenda verwenden denselben unteren Bereich und werden nicht übereinander geöffnet.

Die Tagesüberschriften sind farblich von eingerückten Einträgen getrennt. Wochenende und Heute sind zusätzlich gekennzeichnet. Kleine Abstände, vorhandene TODO-Statusfarben und eine eigene Auswahlmarkierung erhalten die Lesbarkeit in allen Themes.

Beim Öffnen erhält die Agenda den Fokus. **Der obere Editor bleibt bei sichtbarer Wochen-/TODO-Agenda normal bearbeitbar.** Mit Maus oder Fokusnavigation in den Editor wechseln, Notizen schreiben und mit Undo/Redo oder ausdrücklich Speichern weiterarbeiten, ohne die Agenda schließen zu müssen. Beim Verlassen des Agendafokus werden ausstehende Follow-Sprünge verworfen. Der kleine modale Dispatcher behält seine eigene Bediengrenze.

**Shift+F** oder der sichtbare Follow-Schalter schaltet Follow ein/aus. Follow startet beim erneuten Öffnen ausgeschaltet. Die aktuelle Auswahl folgt nach kurzer Pause im Editor, ohne den Fokus aus der Agenda zu nehmen. Schnelle Auswahlwechsel werden zusammengefasst; keine Warteschlange alter Ziele. Normales `f` bleibt nächste Woche. Enter öffnet die geprüfte Quelle und schließt die Agenda mit Editorfokus; q/Escape/Schließen kehren ebenfalls zum Editor zurück. Die zuletzt angezeigte Quelle bleibt sichtbar. Ungespeicherte Arbeit sperrt Follow und explizite Quellsprünge weiterhin.

Tippen indiziert keine Entwürfe: Die Agenda zeigt weiterhin gespeicherte Dateien. Erfolgreiches Speichern aktualisiert den Index wie bisher; `r` liest ausdrücklich neu ein. Andere Menüs, die denselben unteren Bereich benötigen, lösen die Agenda ab.

## Schutz und Grenzen

Der M7a-Index und die vorhandene lesende Quellprüfung bleiben maßgeblich. Ungespeicherte Änderungen sperren auch Follow innerhalb derselben Datei. Kein automatisches Speichern oder Verwerfen. Veraltete Quellen, fehlende Rechte oder geänderte Indexstände werden abgelehnt. Vor der eigentlichen Dateiöffnung lassen sich ausstehende Prüfungen verwerfen; die bestehende Sessionöffnung ist weiterhin nicht abbrechbar und sperrt Schließen/Aktionen kurz mit sichtbarem Hinweis. Keine zusätzliche atomare Sicherheitsgarantie.

Feiertage sind ein späterer Wunsch: Region und eigene freie Tage wären vor einer Umsetzung zu entscheiden. Keine Konfiguration oder Feiertagsberechnung in diesem Paket.

## Native PO-Probe

Die reine synthetische Layoutvorschau startet mit `node scripts/preview-agenda.mjs` unter `http://127.0.0.1:8767`. Sie verwendet echte Agenda-/CodeMirror-Oberfläche, aber keine Dateisystemfreigabe und ersetzt keine Prüfung des produktiven Quelladapters. Strg+C beendet den Vorschauserver. Nach Codeänderungen neu starten.

Nur für Agenten/QA: synthetischer Vault `test-vault/m7b-agenda`; persönliche Vaults nicht öffnen. Browser nach dem Build mit Strg+F5 aktualisieren.

1. `C-c a`, `a`: Fokus in Agenda, Editor oben sichtbar, ungefähr halbe Höhe. Lange Einträge und kleines Fenster/Zoom prüfen; keine übergroßen Abstände.
2. Trennlinie mit Maus nach oben/unten ziehen; beide Bereiche bleiben nutzbar und unabhängig scrollbar. Die fokussierte Trennlinie auch per Pfeiltasten bedienen.
3. Shift+F: Schalter zeigt an. Mit Pfeilen durch mehrere Aufgaben und Dateien gehen: Editor zeigt korrekte Überschrift, Dateiauswahl passt zur Quelle; weitere Pfeile bleiben in der Agenda wirksam.
4. Pfeile schnell wiederholen: nach Beruhigung folgt nur die aktuelle Auswahl. Shift+F aus: weitere Auswahl lässt den Editor unverändert. `f`/`b` wechseln weiterhin die Woche.
5. Bei offener Agenda in den oberen Editor klicken und Notizen schreiben: Agenda bleibt sichtbar. Undo/Redo und Strg+S sowie Speichern-Knopf prüfen. Tippen allein ändert die Agenda nicht; erfolgreicher Save aktualisiert den vorhandenen Index. Danach in die Agenda zurückwechseln.
6. Ungespeicherte synthetische Editoränderung: Follow und Enter verweigern den Sprung, Text/Undo bleiben erhalten. Speichern ist ohne Agenda-Schließen möglich. Enter nach dem Speichern öffnet die Quelle und schließt; neu öffnen, q/Escape/Schließen gibt Editorfokus. Nach erneutem Öffnen ist Follow aus.
7. Alle vier Themes: Wochentage, Wochenende, Heute, offene/geschlossene Zustände und Auswahl unterscheidbar. TODO-Filter, Refresh und Vaultwechsel mitprüfen.
8. Bei laufender Sessionöffnung sichtbaren kurzen Wartehinweis beachten; kein Abbruchversprechen während dieser Phase. Rechtefehler und externe Änderungen nur mit synthetischen Kopien prüfen.

Automatisierte DOM-/Modelltests ersetzen keine native Tastenzustellung, Pixel-, Zoom-, AltGr-/IME- oder Langzeitabnahme.

# QA M4b.1a — 2026-11-04

Rollenrevision M32A-2026-11-03 aus Laufzeit und agents/qa.md bestätigt; AGENTS.md gelesen. Unabhängiger begrenzter Prüfauftrag, keine Implementierungsänderung, keine persönlichen Daten, keine Installation oder Subagenten.

## Ergebnis und Nachweise

Kein nachgewiesener Blocker im geprüften Umfang.

- Automatisiert unabhängig ausgeführt: `npm test` 120/120, 0 Fehler, 0 übersprungen; Node-Testdauer 381 ms. `npm run build` erfolgreich. `git diff --check` Exit 0; nur Git-Hinweise zu späterer LF/CRLF-Konvertierung.
- Zehn neue Org-Listentests prüfen Standardmarker, fünf verschachtelte Ebenen mit gemischten Markern, Multiline-Unterbaumtausch, Cursor/atomare Undo-Redo-Rückkehr, Erstpunkt-Gesamtliste, Ausrücken an Ort und Stelle, Wiederholungsregion, reine Planung, Cursortransaktions-Reset, 9/10-Breite sowie atomare Verweigerung bei nicht sicher ausrichtbarer Lazy-Fortsetzung. Bestehende Heading-/Tab-/Alt-DOM-/AltGr-/IME-/Registry- und Storage-Mocktests ebenfalls grün.
- Neun zusätzliche eigene Node-Repros (Exit 0): `1) A / 2) B` mit B nach oben ergibt `1) B / 2) A`; Einzel-Einrücken von B lässt bestehendes Kind absolut stehen; Einzel-Ausrücken von C bleibt vor folgendem Wurzelgeschwister; 10→9-Bewegung richtet Fortsetzung/Kind um ein Leerzeichen zurück. Jeweils Cursor und Undo/Redo geprüft. Beide Geschwisterränder und Einzel-Ausrücken mit Kindern verweigern ohne Änderung. Textänderung beendet Wiederholungsregion. Mehrfachplanung liefert gleiche Changes ohne Zustandsänderung.
- Codeprüfung: Wiederholungsregion per WeakMap am finalen EditorState; rein planende Abfragen schreiben sie nicht. Unsichere Nummern-Fortsetzung setzt Abbruchflag und verwirft die gesamte Aktion. Keine Storage-Änderung im freigegebenen Listenpfad.
- Offiziell gegengeprüft: https://orgmode.org/manual/Plain-Lists.html (M-UP/DOWN mit Unterpunkten, M-LEFT/RIGHT Kinder unverändert, M-S-LEFT/RIGHT ursprüngliche Region und Erstpunkt-Gesamtliste); https://orgmode.org/orgcard.pdf (9.8.12: M-S-UP/DOWN physische Zeile). Dokumentierte Markdown-Schutzgrenzen stimmen mit Tests überein.

## Berichtete Browserergebnisse

PO-Vorbericht betrifft den vorherigen Alt-Stand: Up/Down und Shift-Up/Down funktionieren; Left/Right war Anlass der vorherigen Korrektur. Das ist kein eigener Browsernachweis für M4b.1a.

## Offen / Grenzen

- Native Edge-Zustellung, Alt-Menü, reale IME/AltGr und Fokus außerhalb des Editors wurden in diesem Auftrag nicht interaktiv ausgeführt. Keine Aussage als bestanden. Manuell mit `test-vault/vault-structure/org-lists.md`: Cursor erste Itemzeile; Alt-Up/Down und Alt-Left/Right gegen Shift-Alt-Left/Right vergleichen; Erstpunkt und späteren Punkt, Wiederholung vor/nach Cursorbewegung, fünf Ebenen, Multiline, 9/10 und einmal Undo/Redo prüfen. Shift-Alt-Up/Down muss exakt eine physische Zeile bewegen; AltGr/IME sowie Eingabe außerhalb Editor dürfen keine Strukturaktion auslösen.
- Langzeitstabilität/Memory-Leak/Idle: keine Stundenmessung durchgeführt. Last hier nur kurzlebige Node-Tests (381 ms Testsuite), keine Speicher-Zeitreihe und keine wiederholten Latenzproben; kein Perzentil, Performancebudget oder Langzeitnachweis ableitbar. Große synthetische Vaults und reale Offline-/Berechtigungs-/Wiederherstellungsszenarien nicht neu ausgeführt; bestehende automatisierte Storage-Mocks bleiben begrenzte Regressionsevidenz.
- Dokumentierte Einschränkungen wie Code/Mischcontainer, mehrere Absatzblöcke/Unterlisten und globale Markdown-Codegrenze bleiben bestehen. Keine Freigabe weiterer Milestones; M4b.2 bleibt gesperrt.

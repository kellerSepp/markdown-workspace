# Unabhängige QA: Panelteilung — 2026-11-06

Aktuelles AGENTS-Gate, REQUIREMENTS-Panelabschnitt und QA-Rollenrevision `M32A-2026-11-03` gelesen und bestätigt. Nur Bericht geändert; keine Codepatches, GUI/CUA, Abhängigkeiten oder Unteragenten.

## Ergebnis

**182/182 Tests**, Build, vier Syntaxprüfungen (`panel-layout`, `work-panel`, `app`, `emacs-policy`) und `git diff --check` unabhängig bestanden. Kein belegter Blocker im automatisiert geprüften Umfang. C-c bleibt Copy.

**109 zusätzliche unabhängige Modellprüfungen** bestanden:

- 15 Kombinationen aus fünf vertikalen und drei horizontalen Ausgangspositionen, je vier Öffnen-/Schließenübergänge: Editor- und Seitenscroll unverändert; Zustandswechsel verhindert Wiederherstellen in ein fremdes Dokument. Gesonderte EOF-Clamp-Fälle bestätigen ausschließlich notwendige Begrenzung bei größerem Editorviewport.
- Ergebnis-Reveal an oberem/unterem Rand und bereits sichtbarer Zeile verändert nur den Ergebniscontainer, dessen horizontaler Offset bleibt erhalten. DOM-Mock verbietet `scrollIntoView` ausdrücklich.
- Completion für eindeutige Präfixe, gemeinsamen Präfix, Groß-/Kleinschreibung, Umlaute/Emoji, leere Suche, Zeilen aus CRLF/CR, reine Teilworttreffer und fehlende Kandidaten. 256 Unicode-Zeichen erlaubt, 257 abgewiesen; 8-MiB-Einzeiler bleibt unverändert im Ring und wird nicht ins Suchfeld kopiert.
- Lokales Alt+Ab wählt den nächsten Kandidaten. Ctrl/Shift/Meta/IME/229/AltGraph verhindern dessen Umleitung. Tab verändert nur die Suche; Shift-Tab, Ctrl/Meta/IME/229/AltGraph bleiben nativ. Dokumentzustand sowie Editor-Scroll bleiben unverändert.
- Cleanup nach Close/Destroy entfernt Vorschauzeilen, deren Clicklistener und Panelroot.

Zusätzlich **100 Öffnen/Filtern/Schließen-Zyklen in 1,09 ms** im eigenen DOM-Modell: keine alten Zeilen/Listener, Editoroffset weiterhin identisch. Kurze synthetische Funktionsprobe, keine Browserperformance- oder Langzeitmessung.

## Integration und Grenzen

DOM/CSS geprüft: gemeinsamer begrenzter Gridcontainer, Panelanteil 45 %, Editorhöhe 100 % innerhalb verbleibender Zeile, begrenzte Ergebniszeile, positionierter Ergebniscontainer, stabiler Scrollbalkenplatz und abgeschaltetes Scroll-Anchoring. App schützt auch das `view.focus()` vor dem Öffnen von Ring/Chooser durch `preserveViewport`; die Gesamtsuite enthält zusätzlich den offscreen-Caret-Fokusrepro. Bestehende Zielzustands-/Ring-/Clipboard-/Mark-/Undo-/Cleanup-Prüfungen der 174er-Basis bleiben grün.

Layouthelper ist rein synchron, ohne Transaktionen, StateEffects, Timer, Observer oder verzögerte Scrollrestauration. Bei Zustands-/ScrollDOMwechsel wird nichts zurückgeschrieben. Row-Reveal nutzt ausschließlich `results.scrollTop`.

**Kein nativer Edge- oder tatsächlicher CodeMirror-Measure-Nachweis:** CSS wurde statisch und Größenänderung durch DOM-Modelle geprüft. Spätere Browser-/CodeMirror-Messung, visuell stabiler Textausschnitt, kleine Fenster/Zoom und echte Tastenzustellung bleiben PO-Handprobe anhand `test-vault/vault-structure/emacs-panel-scroll.md`. Aus unveränderten Modelloffsets folgt kein bereits bestandener nativer Scrolltest. Am EOF ist eine Begrenzung auf den verfügbaren Scrollbereich unvermeidbar. Keine Stundenmessung oder neue Speicher-/Idle-Aussage. Kein Commit/Push oder AP-06-Abnahme; nach Bericht stoppen.

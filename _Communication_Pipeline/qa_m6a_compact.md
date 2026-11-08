# QA M6a — Mapping, kompakter Kalender und Metadatendarstellung

2026-11-07. Rollenrevision `M32A-2026-11-03` bestätigt. Nur delegierter Prüfauftrag und synthetische Daten; keine Implementierung, Dependencies, Storageänderung, Commit oder Push durch QA.

## Finales Ergebnis

**271/271 Tests**, Build, neun Syntaxchecks (acht Produktmodule plus QA-Script) und Diffcheck erfolgreich. Eigene `test-vault/qa-m6a-compact.mjs`: **177 Prüfgruppen** erfolgreich. Keine bewiesenen verbleibenden Blocker im getesteten Umfang.

- Echte aufgelöste CM-Reihenfolge Cleanup → Prefix → TODO → Emacs: C-c loslassen, unmodifiziert s/d führt genau einmal Scheduling/Deadline aus. Alte Ctrl-Folgen, Repeat, Shift/Alt/Meta/IME/AltGr lösen keine Planungsaktion aus. Ctrl+s/Ctrl+d außerhalb des Präfixes werden von diesen Adaptern nicht abgefangen. Native browserinterne Verarbeitung damit nicht bewiesen.
- Drei benachbarte Monate, Schaltjahr/Dezember-Januar und Jahresgrenzen 0001/9999 geprüft. An nicht darstellbarer Randseite bleibt der Monat leer; genau ein Tages-Tabstop über alle darstellbaren Monate. Monatsnavigation verändert Datumseingabe nicht. Auswahl/Modifierguards und Listenercleanup getestet.
- 144 Kombinationen H1–H6 × vier Themes × SCHEDULED/DEADLINE × Datum/Einzelzeit/Zeitfenster: Keyword- und vollständige Timestampbereiche korrekt, unterstrichen und mit expliziten inneren Syntax-Nachfahrenfarben. Titel/Quelltext/Undo unverändert. Code/Frontmatter/Container/fehlerhafte/duplizierte/außerhalb des Blocks liegende Beispiele erzeugen keine Metadatenmarks. Keine Linkrolle oder Clickattribute aus Decorations.
- 80 zusätzliche Cursorupdates bewahren Markbereiche, Text und leere History. Quellreview bestätigt WeakMap-Schlüssel Dokument/Syntaxbaum/geladene Regeln; Cursor/Viewport/Theme erzeugen keinen erneuten Planning-Scan bei gleichen Schlüsseln. Parserfortschritt/Regelwechsel wird vom Plugin separat erkannt. Kein Agendaindex, keine Klicknavigation.

## Geometriehinweis geschlossen

Die Monatsbreite 21ch erbte zunächst UI-Schrift, während das 7×3ch-Tagesraster Editor-Monospace nutzte. Dadurch war identische tatsächliche Breite je nach Font nicht gesichert. Lead/Developer ergänzten dieselbe Editor-Schrift am Monatscontainer. Unabhängiger CSS-Retest bestätigt dieselbe ch-Bezugsfont; lokale Scrollbegrenzung bleibt. Kein nativer Überlappungsnachweis und keine Browserpixel-Abnahme aus CSS-Strings behauptet.

## Messung und offene Praxisnachweise

Node-Einzellauf mit 2.000 Überschriften: kalter sichtbereichsbezogener Highlightaufbau 23,68 ms; 1.000 weitere Cursor-/Cacheaufrufe zusammen 61,06 ms. Keine p95-, Browser-, RAM-, Stunden-/Idle- oder Langzeitabnahme. Native Edge-Zustellung der neuen Folge, tatsächliche Drei-Monatsdarstellung bei Viertelfenster/Zoom, Assistenztechnik und AltGr/IME müssen praktisch geprüft werden. Der bekannte Computer-Use-Runtimestartfehler liefert keinen UI-Nachweis.

PO meldete die vorherige Ctrl-Folge nativ als nicht funktionierend; neue unmodifizierte Folgen benötigen eine eigene native Probe. Spätere Tagesagenda-Navigation bleibt M7-Dokumentation, nicht Bestandteil dieser Korrektur.

# TODO und Agenda — Gesprächsvorlage

**Abschluss:** TODO-Paket implementiert, Developer/QA jeweils 241/241 Tests und Build bestanden. Native Probe: [TODO_ACCEPTANCE.md](TODO_ACCEPTANCE.md). Agenda bleibt separat; nächste Aktion und Grenzen in PROJECT_STATUS.md.

## Umsetzungsfreigabe — 2026-11-07

PO hat Nachtrag und konkretisierte Randregeln angenommen und die Umsetzung ausdrücklich freigegeben („Feuer Frei“). Dieser Abschnitt ersetzt ältere Vertagung und Planungssperren unten ausschließlich für das TODO-Paket. Randregeln siehe DECISIONS.md: Auswahlpriorität, Leertaste für Kein Status, Zyklus mit unmarkiertem Zustand, eine Definition außerhalb Code/Frontmatter, eindeutige Namen/Buchstabentasten, strikte Trennerprüfung. H1–H6 dürfen verschachtelt eigene Aufgaben mit unabhängigen Zuständen sein; strukturelle Elternzugehörigkeit erhalten, keine Vererbung oder automatische Abschlusslogik. Agenda/Listenaufgaben/Storageänderung/Dependencies/Commit/Push ausgeschlossen. Developer implementiert begrenzt, danach unabhängige QA und native PO-Probe.


Stand: 2026-11-07. **Nur Planung, keine Implementierungsfreigabe.** Umsetzung auf nächste Sitzung verschoben (PO: nur noch 5 % Kontingent). Markdown bleibt Primärformat. Der folgende bestätigte Nachtrag ersetzt widersprechende Empfehlungen im ursprünglichen Gesprächsentwurf darunter.

## Bestätigter Nachtrag für die nächste Sitzung

- Aufgaben an normalen Markdownüberschriften **H1–H6**, unabhängig von der Anzahl der #; Beispiel `## NEXT Angebot prüfen`. Keine Listenaufgaben in diesem Paket.
- Dateilokale frei benannte Zustände mit Schnellwahltasten, Beispiel:

```text
#+SEQ_TODO: NEXT(n) TODO(t) WAITING(w) SOMEDAY(s) | DONE(d) CANCELLED(c)
```

- Links von `|`: offen/open, **grün**. Rechts davon: abgeschlossen/closed, **rot**, einschließlich CANCELLED. Farben über Theme-Tokens lesbar in allen vier Themes; Farbe ist nicht das einzige Unterscheidungsmerkmal.
- Beim Öffnen automatisch laden. Nach Bearbeitung nur mit **C-c C-c auf der Definitionszeile** aktualisieren. Bei ungültiger Definition Fehlermeldung, bisherige gültige Zustände behalten. Ohne Definition Standard `TODO(t) | DONE(d)`.
- **C-c t** (Strg+C, C/Strg loslassen, t ohne Modifier) öffnet Panel mit allen geladenen Zuständen und Schnellwahltasten. Beispiel: anschließend w wählt WAITING. Kein C-c C-t wegen Browserkonflikt; C-c a bleibt nur für den späteren Agenda-Dispatcher reserviert.
- **Shift+Links/Rechts irgendwo auf der Aufgabenüberschrift**, auch im Titel, wechselt vorherigen/nächsten Status; nicht auf das Statuswort beschränken. Außerhalb dieser Überschrift bisherige Textmarkierung erhalten. Listen-Präfixwechsel und ein möglicher org-support-shift-select-ähnlicher Modus separat/später.
- Bestehende Registry, Panelnavigation/Scrollschutz und atomare Undo/Redo verwenden; keine Storageänderung, Dependency, Agenda-/Indeximplementierung, Commit oder Push ableiten. Native Browserzustellung von C-c C-c und den neuen Folgen später tatsächlich prüfen.

Noch vor bzw. zu Beginn der Umsetzung konkretisieren, nicht als bereits bestätigt ausgeben: vorgeschlagene Begrenzung auf eine Definition pro Datei; Verhalten mehrerer/fehlerhafter/duplizierter Status-/Schnellwahlangaben; erlaubte Grammatik und Definitionen in Code/Frontmatter ignorieren; „Kein Status“/Leertaste, Zyklusgrenzen und Verhalten ohne vorhandenen Status; Markierungspriorität bei bereits ausgewähltem Text. Bisherige Lead-Empfehlung: bei nichtleerer Auswahl kein Statuswechsel. Keine automatische Migration unbekannter Statuswörter. Zu Beginn offene Punkte knapp klären bzw. klar dokumentierte technische Details innerhalb des bestätigten Umfangs festlegen.

Fortsetzungsprompt: [FORTSETZUNG_TODO.md](FORTSETZUNG_TODO.md). **Heute nicht implementieren.**

## Festgehaltene geplante Belegungen

| Folge | Geplanter Zweck | Stand |
| --- | --- | --- |
| `C-c t` | Status des aktuellen Aufgabeneintrags ändern | Geplant, nicht aktiv |
| `C-c a` | Agenda-Dispatcher im Panel öffnen | Geplant, nicht aktiv |
| `C-c a a` | Kalenderagenda aus dem Dispatcher | Vorschlag für später |
| `C-c a t` | Globale Liste offener Aufgaben aus dem Dispatcher | Vorschlag für später |

Bedienung: Strg+C, C und Strg loslassen, dann unmodifiziert t beziehungsweise a. Die weiteren Buchstaben wären weitere einzelne Tastenereignisse. Außerhalb eines aktiven Präfixes bleibt normale Texteingabe erhalten. Keine Platzhalterbefehle, neuen Registryeinträge oder sichtbaren nicht funktionierenden Panelaktionen allein aufgrund dieser Planung aktivieren. `C-c w`, Alt+W und bestehende Folgen bleiben unverändert.

Org-Referenz: `C-c C-t` ändert den TODO-Status; Standardzyklus ohne schnelle Auswahl ist unmarkiert → TODO → DONE → unmarkiert. Bei schneller Statusauswahl öffnet Org eine Auswahl. Der Agenda-Dispatcher bietet unter anderem a für Kalenderagenda und t für TODO-Liste. Unsere t-Folge vermeidet bewusst Strg+T als zweite Tastenkombination. Die Anwendung stellt keine browserübergreifende Zustellgarantie auf; native Probe gehört zu jeder späteren Belegung.

Quellen, vom Lead am 2026-11-06 geprüft: [TODO Basics](https://orgmode.org/manual/TODO-Basics.html), [Fast access to TODO states](https://orgmode.org/manual/Fast-access-to-TODO-states.html), [Agenda Dispatcher](https://orgmode.org/manual/Agenda-Dispatcher.html). Keine vollständige Org-Kompatibilität zugesagt.

## Empfohlener nächster Schritt: Status an Überschriften

Zuerst ein kleines Paket nur für die geöffnete Datei. Beispiel des vorgeschlagenen Rohtextformats:

```markdown
## TODO Angebot prüfen
Text zur Aufgabe
### Unterpunkt ohne eigenen Status
```

Nach Auswahl von DONE würde nur das Statuswort geändert:

```markdown
## DONE Angebot prüfen
```

Der Titel und die Hierarchie bleiben erhalten. „Kein Status“ entfernt nur den erkannten Statuspräfix; eine normale Überschrift kann durch Auswahl von TODO zur Aufgabe werden. Anfangs ausschließlich normale ATX-Überschriften H1–H6; Setext-/Containerfälle konservativ abgrenzen. Das ist eine eigene Markdown-Konvention, keine standardisierte Markdown-Aufgabensyntax.

Empfohlene Bedienung: C-c t öffnet im vorhandenen Panel eine Auswahl aus **Kein Status, TODO, DONE**. Aktueller Status sichtbar; Pfeile/Alt+Oben/Unten, Suche, Tab, Enter und Escape/Strg+G wie bei bestehenden Auswahlen. Kein automatischer Statuswechsel allein durch Öffnen, kein blindes Durchschalten beim wiederholten Aufruf. Palette/Maus verwenden denselben Registrybefehl. Der Cursor darf im zugehörigen Headingtext oder Body stehen; eine Unterüberschrift bezeichnet ihren eigenen Eintrag. Ein Kind ohne Status erbt keinen Aufgabenstatus. Keine Veränderung des gesamten Teilbaums.

Warum dieser Einstieg: Er passt zur bestehenden Überschriften-/Refilebedienung und braucht weder Datumssyntax noch Vaultindex. Nachteil: Aufgaben in Listen sind damit noch nicht als Workflowaufgaben bedienbar. Die Alternative wäre ein Einstieg bei Checkboxlisten; sie braucht vorab Regeln für Status-/Checkboxwidersprüche.

## Vor Umsetzung zu entscheiden

| Frage | Empfehlung für das erste Paket | Konsequenz / Alternative |
| --- | --- | --- |
| Welche Einträge? | Überschriften mit Statuswort direkt nach `#… ` | Listenaufgaben später separat; bisheriges illustratives Checkbox-/DOING-Beispiel bleibt unbeschlossen. |
| Welche Zustände? | Kein Status, TODO, DONE; DONE abgeschlossen | DOING/WAITING/ON HOLD und mehrere Abschlusszustände später konfigurierbar. Bestehender Wunsch nach konfigurierbaren Status bleibt bestehen. |
| Auswahl oder Zyklus? | Explizite Auswahl im Panel | Zyklus wäre schneller, wechselt aber sofort; keine gleichzeitige Einführung beider Bedienmodelle. |
| Was bedeutet vorhandenes TODO im Titel? | Erst nach bestätigter Konvention als Status behandeln | Keine automatische Migration, kein stilles Umschreiben. Unbekannte Statuswörter nicht automatisch entfernen oder ersetzen. |
| Wo liegen Statusregeln? | Zunächst getrennte anpassbare Policy im Code, keine neue persistente Konfiguration | Vaultweite offene Konfiguration ist eine spätere eigene Entscheidung, keine Storagefreigabe. |

Erkennung nur mit eindeutiger Wortgrenze: TODOIST ist kein TODO. Umgang mit Whitespace, vorhandenem Format im Titel und unbekannten Präfixen muss vor Implementierung präzisiert und getestet werden. Ein führendes `TODO` wäre nach Bestätigung bewusst Teil dieser Konvention; anders gemeinte Titel bleiben im Rohtext editierbar. Kein willkürliches Erraten weiterer Status.

## Grenzen und Abnahme des vorgeschlagenen ersten Pakets

- Statusänderung betrifft genau eine zugehörige Überschrift; Body, Kinder, Listencheckboxen, Code und Frontmatter unverändert. Cursor in Codebody darf die zugehörige Überschrift adressieren, niemals eine scheinbare Überschrift im Codeblock.
- Öffnen/Abbrechen erhält Dokument, Auswahl und Text-Undo. Eine angenommene Statusänderung ist ein isolierter Undo-/Redo-Schritt mit korrektem Text und Cursor, auch über mehrere Zyklen. Keine Änderung bei identischem Status.
- Vollständiger geprüfter Kontext vor Ausführung; kein veraltetes Ziel nach Datei-/Vault-/Cursor-/Dokumentwechsel. Busy/read-only, Auswahlregion/Multicursor, Repeat, Fokus, AltGr/IME sowie Escape-Fokusausstieg berücksichtigen.
- Keine automatische Umwandlung von `- [ ]`/`- [x]`, keine Synchronisation zwischen Checkbox und Statuswort. Bestehende Listenbefehle und Refile/Folding/Kill-Ring bleiben erhalten.
- Kein Datum, Logging, Wiederholer, Vererbung, Journal, Agenda, Indexscan, Hintergrundpolling, neue Dependencies, Storageänderung, Commit oder Push in diesem ersten Paket.
- Developer implementiert erst nach ausdrücklicher Syntax-/Paketfreigabe; QA prüft unabhängig bestehende Suite/Build und gezielte Fälle. Anschließend native Edgeprobe mit synthetischer Datei, insbesondere neue Tastenzustellung, kleines Fenster, Fokus und Undo/Redo. Modelltests ersetzen das nicht. Messbare Laufzeit-/Lastbudgets vor einer späteren Umsetzung festlegen; hier keine Ressourcenabnahme.

## Agenda danach, nicht gleichzeitig

C-c a bleibt für einen Dispatcher reserviert. Noch keine Festlegung, ob die eigentliche Agenda im Panel oder in einer größeren Ansicht dargestellt wird. Der Dispatcher kann die bestehende Panelhülle verwenden; Kalender und globale Aufgabenliste sind eigene Ansichten.

Vor der ersten Agenda sind zu klären: Aufgabenformate/Statusschema, welche Dateien einbezogen werden, Bedeutung und Syntax von geplantem Datum gegenüber Deadline, erledigte Aufgaben und Überfälligkeit, Aktualisierung/Abbruch bei Vaultwechsel sowie begrenzte Indexlast. Eine undatierte Aufgabenliste braucht kein Datumsschema; eine Kalenderagenda schon. Eine erste nur lesende Aufgabenliste der aktuellen Datei könnte als kleiner Zwischenschritt dienen; „global“ erst nach separatem Vaultindex-Auftrag.

Architekturvorschlag: gemeinsames Aufgabenmodell und rein textbasierter Statusplaner; unabhängiger Paneladapter und Registrybefehl. Spätere Agenda liest dasselbe Modell und muss aus Markdown neu aufbaubar sein. Keine zweite Wahrheit in einer proprietären Datenbank. Keine Dateien im Hintergrund scannen oder ändern, nur um geplante Kürzel vorzubereiten.

**Nächste Besprechung:** Überschriftenkonvention, Startzustände und explizite Statusauswahl bestätigen oder ändern. Erst danach einen abgegrenzten Implementierungsauftrag formulieren; C-c a zunächst weiterhin nur reservieren.

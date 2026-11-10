# Checklisten — Bedienung und PO-Probe

Implementiert auf `feature/checklists`, 2026-11-10. Der PO meldet die praktische Probe positiv und gibt die Integration frei. Synthetischer Probevault `test-vault/checklists`.

## Bedienung

PO-Korrektur: Auf einer Überschrift erzeugt `Alt+Shift+Enter` unmittelbar nach der aktuellen Headingzeile eine weitere TODO-Überschrift derselben H1–H6-Ebene und mit derselben führenden Einrückung. Der bisherige Titel bleibt erhalten. Der Cursor steht hinter dem neuen Status samt Leerzeichen, z. B. `### TODO |`. Beim Umwandeln von `-` steht er hinter `[ ] `; war er bereits im Listentext, bleibt seine logische Textposition erhalten. Auch Undo/Redo erhält diese Positionen.

- `C-c C-c`: Strg+C drücken und C loslassen, danach erneut Strg+C. Auf der ersten Zeile eines Checkboxpunkts an jeder Cursorspalte umschalten. Auf einer SEQ_TODO-Definitionszeile weiterhin TODO-Regeln laden. Auf einer H1–H6-Zeile mit Zähler nur deren eigenen Abschnitt neu berechnen.
- Marker `[ ]`, `[x]` oder `[-]` anklicken. Fokussierte Marker unterstützen Enter/Leertaste; der Text bleibt als Markdown im Editor erhalten. Rechtsklick, Modifier, IME/AltGr und nichtleere/mehrfache Auswahl lösen diese Markerklickaktion nicht aus.
- `Shift+Alt+Enter` wandelt einen normalen Listenpunkt direkt in eine Checkbox um, beispielsweise `- Text` → `- [ ] Text`, ohne neue Zeile. Auch ein bloßes `-` genügt. Auf einer leeren Textzeile entsteht eine TODO-Überschrift auf der Ebene der letzten vorherigen H1–H6-Überschrift (ohne vorherige Überschrift H1); verwendet wird der erste geladene offene Zustand. Auf einer bereits vorhandenen Checkbox entsteht weiterhin ein neuer offener Checkboxpunkt. Enter bleibt Fortsetzung desselben Listenpunkts; Alt+Enter erzeugt einen normalen Listenpunkt.
- In der Palette (`Alt+X`): **Checkbox umschalten**, **Checkbox hinzufügen/entfernen**, **Checklisten neu berechnen**. Die Befehle erscheinen auch im Kontextmenü.
- `[/]` und/oder `[%]` ans Ende einer Überschrift oder ersten Listenpunktzeile schreiben. Beide sind gleichzeitig möglich, etwa `# Einkauf [2/4] [50%]`, auch in umgekehrter Reihenfolge; mit Leerraum trennen. Erst eine Checkboxaktion, struktureller Listenbefehl oder ausdrückliche Neuberechnung setzt daraus aktuelle Werte.

`[ ]` ist offen, `[x]` erledigt; vorhandenes `[X]` wird ebenfalls erkannt. Eltern mit direkten Checkboxkindern erhalten ihren Zustand aus diesen Kindern: alle offen → `[ ]`, alle erledigt → `[x]`, sonst `[-]`. Eltern werden nicht direkt umgeschaltet. Verliert ein Elternpunkt sein letztes Checkboxkind, bleibt sein zuletzt sichtbarer Zustand als Blattzustand erhalten.

Zähler zählen vollständig erledigte direkte Checkboxkinder. Ein Heading zählt die obersten Checkboxpunkte in seinem eigenen Abschnitt bis zur nächsten Überschrift, einschließlich mehrerer getrennter Listen. Normale Elternpunkte werden nicht übersprungen, um Enkel mitzuzählen. Prozent wird abgerundet; leere Mengen zeigen `[0/0]` beziehungsweise `[0%]`. Neue Zähler werden nicht ungefragt hinzugefügt.

## Daten und Grenzen

Checkboxbefehle und unterstützte Strukturaktionen ändern Checkboxen, Elternzustände und vorhandene Zähler in einer Undo-Operation. **Strg+Z** nimmt alles gemeinsam zurück, **Strg+Shift+Z** stellt es wieder her. Cursorpositionen werden auch bei wachsenden Zahlen mitgeführt.

Nach manuellem Tippen, Löschen, Paste oder Ausschneiden **Checklisten neu berechnen** ausführen. Laden, Speichern und Undo/Redo berechnen nicht automatisch neu. Checklisten ergänzen Heading-TODOs; sie erzeugen keine eigenen Agendaaufgaben. Vollständige Checklisten setzen kein DONE. Wiederkehrender Headingabschluss setzt keine Checkbox zurück.

Code, Frontmatter, LOGBOOK/PROPERTIES und fremde Container bleiben geschützt. In Listen gelten die vorhandenen konservativen Markdown-Grenzen; Tabs, `1)`-Marker, Code/Mischcontainer und Referenzdefinitionen in Listen werden nicht für diesen Workflow freigegeben. Mehrere Zähler derselben Art, mehr als zwei Zähler oder Zähler in Code/Links blockieren die Neuberechnung ihres betroffenen Abschnitts mit Hinweis. Bei einer dateiweiten Neuberechnung mit solchen Hindernissen wird die gesamte Aktion verworfen. Unabhängige sichere Abschnitte können weiterhin gezielt bearbeitet werden.

`[-]` und Fortschrittszähler sind dokumentierte Erweiterungen gegenüber üblicher GFM-Checkboxsyntax. Keine ORDERED-/Radio-/COOKIE_DATA-Konfiguration oder Statistik von TODO-Kindüberschriften. Storage und Dependencies unverändert.

## Native Handprobe

1. Lokal wie im README starten; in Edge Strg+F5, Alpha-Hinweis bestätigen und `test-vault/checklists` als Vault wählen. `checklists.md` öffnen.
2. Cursor auf „Ladegeräte“, C-c C-c: Ladegeräte und Gepäck werden `[x]`, Gepäck zählt `[2/2]`, Reise `[2/3]`. Überschrift bleibt TODO. Strg+Z stellt alle vier Angaben gemeinsam zurück; Redo stellt sie wieder her.
3. Auf Tickets genau den Marker klicken: Reise wird `[3/3]`. Elternmarker Gepäck anklicken: Hinweis, kein Sammelabhaken. Prüfen, dass Titelauswahl und normale Texteingabe weiterhin funktionieren.
4. Auf „Einkauf [/] [%]“ C-c C-c: `[1/3] [33%]`. Auf „Leere Liste [/]“: `[0/0]`. Mit Palette **Checklisten neu berechnen** alle übrigen Zähler aktualisieren.
5. Ebene 5 abhaken: alle fünf Ebenen erledigt und zugehörige Zähler vollständig. Falten und Aufklappen verändert keine Daten. Undo/Redo kontrollieren.
6. Neue Zeile `- Test`: Shift+Alt+Enter ergibt `- [ ] Test` auf derselben Zeile; ein Undo stellt den ursprünglichen Punkt und die Zähler zurück. Auch `-` allein prüfen. Auf einer leeren Textzeile nach einer H3 muss `### TODO ` (bei eigenen Regeln erster offener Zustand) erscheinen, ebenfalls ein Undo-Schritt. Auf einer vorhandenen Checkbox erzeugt die Taste einen neuen offenen Geschwisterpunkt. Enter bleibt Fortsetzungszeile. Alt-Pfeile/Shift+Alt-Pfeile für Listenbewegung und Ein-/Ausrücken prüfen. Einen Heading- und einen Itemzähler jeweils mit `[/] [%]` versehen: beide Werte müssen zusammen aktualisiert werden.
7. Marker per Rohtext ändern: Zähler bleibt zunächst stehen. Palette **Checklisten neu berechnen** korrigiert ihn; ein Undo stellt den vorherigen Text zurück. Neuladen/Speichern erzeugt keine Neuberechnung.
8. Auf SEQ_TODO C-c C-c: Regeln geladen. Statuspanel und Shift-Pfeile weiterhin nutzbar. Agenda im unteren Split öffnen, oberen Editor fokussieren und dort abhaken/speichern; Agendafokus und modaler Dispatcher sperren Editorbefehle weiterhin.
9. Alle vier Themes, kleineres Fenster, Tastaturfokus auf Marker/Enter/Space und Escape-dann-Tab zum Verlassen prüfen. Browserzoom/AltGr/IME separat prüfen. Keine native Garantie aus Modelltests ableiten.

Alle Probeänderungen bleiben synthetisch. Den Probevault bei Bedarf durch Undo zurücksetzen; keine Nutzerdateien als Testdaten verwenden.

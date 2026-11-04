# M3.2: vorgemerkte Struktur- und Textbearbeitung

Aktualisierung M3.2b: fünf Auswahlformatierungen (Fett/Kursiv/Unterstrichen/Durchgestrichen/Inlinecode) und deutlichere H1–H6-Farben sind jetzt ausdrücklich freigegeben. Keine neue visuelle Einrückung in diesem Paket; vorhandene Darstellungsoption bleibt unverändert. Textfarbe/Kontextmenü/Palette und andere zukünftige Erweiterungen bleiben Planung. Frühere M3.2b-Sperren unten sind historisch.

Aktualisierung M3.2a.1: optionale visuelle Überschrifteneinrückung ist jetzt für diesen begrenzten Abschnitt freigegeben, ebenso Kontext-Tab und sichere hierarchische Randanzeige. Textformatierung/Textfarbe und Kontextmenü/Palette bleiben gesperrt. Die nachstehende frühere M3.2b-Zuordnung der visuellen Einrückung ist insoweit überholt; keine allgemeine M3.2b-Freigabe.

**M3.2a ist nach bestätigter Rollenübernahme zur Implementierung freigegeben:** nur Überschriften-/Listenoperationen einschließlich Undo/Redo. **M3.2b bleibt Planung:** Textformatierung und visuelle Einrückung. Org-mode dient als Vorbild für effiziente Bedienung; Standardausgabe bleibt kompatibles Markdown. Abweichende Org-mode-Syntax nur optional nach gesonderter Entscheidung. Vorhandene Formatierung möglichst erhalten, kein generelles Neuformatieren.

## Geplanter Umfang

- Optionale visuelle Einrückung von Überschriften nach H1–H6-Hierarchie, ausschließlich als Darstellung ohne zusätzliche Leerzeichen oder sonstige Änderung des Markdown-Rohtexts. Minimalistische Oberfläche erhalten.
- Überschriften mit ihrem gesamten Unterbaum nach oben/unten verschieben.
- Überschriftenebenen erhöhen/verringern; optional Ebenen aller untergeordneten Überschriften mitändern.
- Listeneinträge nach oben/unten verschieben, einzeln oder mit Children.
- Listeneinträge ein-/ausrücken, einzeln oder mit Unterpunkten.
- Präfixe einfach wechseln: `-`, `*`, `+`, `1.`, `- [ ]` und weitere ausdrücklich vereinbarte Varianten. Automatische Anpassung nummerierter Listen berücksichtigen.
- Text per Kürzel oder Befehl formatieren: Fett, Kursiv, Unterstrichen, Durchgestrichen, Inlinecode und weitere gesondert festzulegende Hervorhebungen.
- Unterstreichung standardmäßig als `<u>Text</u>` erzeugen. `_Text_` bleibt vorhandene Markdown-Betonung und wird nicht als Unterstreichung umgedeutet. Fremde Formatierungen möglichst unverändert erhalten.
- Strukturänderungen über Undo/Redo vollständig rückgängig machen bzw. wiederholen können; auch Listenpräfixwechsel und Formatierungsbefehle berücksichtigen.
- Tastaturzentrierte Bedienung, vollständige Mausunterstützung und deutsches QWERTZ; normale Eingabe schützen. Keine Command Palette allein aus dem Begriff „Befehl“ ableiten.

## Vor Umsetzung entscheiden

Grenzen und Auswahlsemantik je Operation, Verhalten am Dokument-/Listenrand, erlaubte Überschriftenlevel H1–H6 und Behandlung gemischter Einrückungen klären. Unterstreichen ist mit `<u>Text</u>` entschieden; Auswahl-/Umschaltverhalten bei bereits vorhandenen Tags und anderen Formatierungen noch spezifizieren. Für weitere Hervorhebungen Syntax ausdrücklich wählen; keine Org-mode-Syntax stillschweigend erzeugen. Nummerierung, Aufgabenpräfixe und mehrzeilige Listeneinträge einschließlich Codeblöcken spezifizieren. Kürzel auf Browser-/Windows-/AltGr-Konflikte prüfen.

Architekturvorschlag: AST-basierte Bereichsoperationen über denselben CodeMirror-Dokumentpfad wie normale Eingabe; Storage bleibt allein für Speichern zuständig. Eine Operation als nachvollziehbare Undo-Einheit. Kein eigener Parser, Datenmodellwechsel oder automatischer Speichervorgang aus dieser Planung ableiten.

Visuelle Einrückung als optionale Editor-Darstellung getrennt von strukturverändernden Befehlen planen. Sie darf Cursorzuordnung, Auswahl, Folding, Zeilenumbruch, Kopieren oder Speichern nicht verfälschen. Konkrete Abstände und Einstellungsumfang vor Umsetzung festlegen; kein UI-Ausbau allein wegen der Hierarchiedarstellung. **Storage-Systemänderungen benötigen eine gesonderte Freigabe.**

## Vorgeschlagene Abnahme und Grenzen

Synthetische Fälle für verschachtelte H1–H6, Listen/Children, leere Elemente, nummerierte/gemischte Listen, Aufgaben, Codeblöcke und unbekanntes YAML. Unberührte Bereiche/BOM/Zeilenenden erhalten; keine versteckte Umformatierung. Jede Operation per Maus/Tastatur, Undo/Redo und anschließendes sicheres Speichern prüfen. Bestehende Folding-, Theme- und Storage-Tests weiterführen. Konkrete kleine Teilpakete erst nach PO-Freigabe implementieren.

Zusätzlich: optionale visuelle Einrückung an/aus bei identischem Rohtext und identischem Datei-Hash; Cursor/Auswahl/Kopieren/Folding unter allen vier Themes prüfen. `<u>Text</u>`-Ausgabe und unveränderte Bedeutung von `_Text_` absichern. Bei Verschieben/Einrücken mit und ohne Children Grenzen und vollständige Undo-/Redo-Wiederherstellung nachweisen. Keine Storageänderung aus diesen Tests ableiten.

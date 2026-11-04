# Phase 2 M3: Markdown-Abschnitte einklappen

## In Edge ausprobieren

`npm start` im Repository ausführen, dann `http://127.0.0.1:8766` öffnen. Bei bereits laufendem Server nach neuem Build einmal neu laden. Ausschließlich synthetische Test-Vaults verwenden.

1. `test-vault/vault-folding` auswählen und `folding.md` öffnen. Die Datei enthält H1 bis H6, Unterabschnitte und falsche Überschriften in einem Codeblock.
2. Neben `Abschnitt A` auf `▾` klicken. A samt Kindern verschwindet; `Abschnitt B` bleibt sichtbar. Über `▸` oder `…` wieder ausklappen.
3. Cursor auf eine Überschriftenzeile setzen: **Strg+Umschalt+Komma** klappt ein, **Strg+Umschalt+Punkt** klappt aus. Auf deutschem QWERTZ werden die Tasten mit Komma/Punkt verwendet, auch wenn Umschalt daraus Semikolon/Doppelpunkt macht. Die tatsächliche Edge-/Windows-Belegung noch prüfen.
4. Kind falten, dann Elternabschnitt falten und wieder öffnen. Text vollständig erhalten; vorher gefaltete Kinder können gefaltet bleiben. Das ist ein Ansichtszustand, keine Textlöschung.
5. Alle vier Themes wechseln: Markierungen, Auslassung, Cursor, Fokus und Syntax müssen lesbar bleiben. Themewechsel darf vorhandene Falten nicht entfernen.
6. Ohne Textänderung speichern: keine neue Sicherung und kein Neuschreiben. Bei Bedarf Hash der synthetischen Datei vor/nachher vergleichen. Anschließend tatsächliche Textbearbeitung, Undo/Redo und Speichern separat prüfen.

## Verhalten und Grenzen

Abschlussnachweis durch Lead: 38/38 Tests bestanden, davon neun neue Foldingprüfungen; Build und Syntax erfolgreich. QWERTZ-Zeichen `;`/`:` mit Strg+Umschalt wurden über CodeMirrors Keymap-Handler simuliert, Text/AltGr ignoriert. Kein echter Windows-Tastaturnachweis. Unabhängige QA prüfte den Code lesend und fand keine M3-Blocker; ihre aktive Rollenrestriktion untersagte Tests/Browseraktionen. Developer lieferte wegen derselben Art alter Rollensperre nur den lesenden API-Vorschlag; Implementierung durch Lead. Keine Agentenkonfiguration geändert.

Die vorhandene Markdown-Sprachunterstützung bestimmt Abschnitte, inklusive Setext H1/H2. Codeblockinhalt ist keine echte Überschrift; CodeMirror kann Codeblöcke zusätzlich nativ falten. Kein eigener Markdown-Parser und keine neuen Pakete.

Bei längeren Dokumenten kann die Analyse vorübergehend unvollständig sein. Vor einem neuen Fold wird begrenzt weitergeparst; reicht das Budget nicht, erscheint ein Hinweis und es wird kein Teilabschnitt verborgen. Dann erneut einklappen. Entfalten benötigt keine vollständige Analyse. Die 50 ms sind ein Arbeitsbudget je Analyseversuch, keine garantierte Obergrenze für die gesamte UI-Aktion.

Faltzustand bleibt nur in der aktuellen Editoransicht; Datei-/Entwurfswechsel und Reload setzen ihn zurück. Textänderungen werden nach den vorhandenen CodeMirror-Regeln auf Falten abgebildet. Ändert sich die Überschriftenstruktur innerhalb einer bestehenden Falte, Abschnitt aus- und neu einklappen.

Offene Praxisprüfung: echte Mausklicks und QWERTZ-Kürzel, normale Texteingabe inklusive AltGr, alle Theme-/Zoom-/Hochkontrastzustände sowie flüssiges Verhalten bei langen Dokumenten. Automatisierte Zustandsprüfungen ersetzen keine interaktive Browser- oder Langzeitabnahme.

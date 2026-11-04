# M3.2a.1: Strukturbedienung und visuelle Hierarchie

## In Edge ausprobieren

Im Repository `npm start`, dann `http://127.0.0.1:8766` öffnen. Bei bestehendem Server nach neuem Build einmal neu laden. Nur den synthetischen Vault `test-vault/vault-structure` wählen und `hierarchy.md` laden.

1. Cursor auf tatsächliche Überschrift setzen: Tab stuft H1→H2 ab, Shift+Tab hebt an. „Unterstruktur mitnehmen“ an/aus prüfen. H1-/H6-Grenzen müssen ohne Teiländerung verweigert werden.
2. Tab/Shift+Tab in Listen ein-/ausrücken lassen, bis mindestens fünf Ebenen. Children-Zuordnung und Undo/Redo kontrollieren. Im normalen Absatz soll Tab den Fokus weiterführen.
3. In einem Codeblock Tab/Shift+Tab testen: Codeeinrückung statt Strukturänderung. Auswahl mehrerer Codezeilen und anschließendes Undo/Redo prüfen.
4. Sichtbar beschriebenen Fokusausstieg verwenden: Escape, dann Tab bzw. Shift+Tab. Auch nach verweigerter H1-/H6-/Listenaktion muss der Editor verlassen werden können. Beim erneuten Eintritt muss Struktur-Tab wieder verfügbar sein.
5. Optionale visuelle Überschrifteneinrückung ein-/ausschalten. Rohtext, Auswahl, Kopieren und Folding müssen identisch bleiben.
6. Gliederungsmarkierungen je Ebene konfigurieren und hierarchische Nummernanzeige einschalten. Unicode-Marker und Nummern sind zusätzliche Randanzeige; kompatible Rohpräfixe bleiben sichtbar und werden unverändert gespeichert/kopiert.
7. Codeblockhintergrund und Seitenmarkierung in Midnight, Terminal, Nord und Paper prüfen, einschließlich Cursor, aktiver/inaktiver Auswahl, Zoom und Hochkontrast.
8. Reine Anzeigewechsel dürfen weder den Entwurf als Text ändern noch beim unveränderten Speichern eine neue Dateisicherung erzeugen. Strukturelle Tab-Änderungen werden dagegen wie normale Bearbeitung explizit gespeichert.

## Grenzen

Escape aktiviert die Fokusnavigation ohne Zeitlimit; beim erneuten Fokussieren von außen gilt wieder Struktur-Tab. Fokuswechsel zwischen Editor und inneren Faltplatzhaltern heben den Ausstiegsmodus nicht auf. Es gibt keinen zusätzlichen globalen Shortcut oder gesonderten Exitknopf. Der CodeMirror-Komponentenweg wurde simuliert, die echte Browser-/Windows-Fokusreihenfolge bleibt praktisch zu prüfen.

Anzeigeeinstellungen gelten für die Sitzung und werden nicht in Markdown oder als neue Vaultkonfiguration gespeichert. Die letzte konfigurierte Markerebene gilt auch für tiefere Ebenen. Lange Nummern können in der schmalen Randspalte gekürzt erscheinen; ihr Tooltip zeigt den vollständigen Wert. Rohpräfixe bleiben daneben sichtbar. Codeblockhintergründe verwenden eine Ebene unter der Auswahl; das ist statisch geprüft, keine visuelle Browserabnahme.

Kein Unicode-/`1.1`-Präfix wird als neue Markdown-Syntax geschrieben. Alternative `1.a`-Nummerierung bleibt vorgemerkt. Konservative Grenzen der vorhandenen Strukturverwaltung bleiben gelten, sofern nicht ausdrücklich sicher erweitert; Meldungen statt stiller Teiländerung beachten.

Zusätzliche Sprachen, Textfarbe, Kontextmenü und Palette sind nur [Zukunftsplanung](FUTURE_COLORS_COMMANDS.md). Storage/Codec und Abhängigkeiten bleiben unverändert. Echte Edge-/Assistenz-/QWERTZ-/Maus-/Zoom-/Langzeitnachweise sind getrennt von automatisierten Zustandsprüfungen zu bewerten.

## Ergebnis und Dateien

Developer `developer_m32a1` implementierte und testete, QA `qa_m32a1` prüfte unabhängig. Beide führten 76/76 Tests, Build und Syntaxprüfungen erfolgreich aus; `git diff --check` bestanden. Alle 65 bisherigen Tests bleiben unverändert. Elf neue Tests prüfen Kontext-/Tab-/Undo-/Fokusdelegation, mindestens fünf Ebenen, reine Anzeige, Syntaxbaumgrenzen, disjunkte Viewports und Theme-/Auswahlregeln. QA ergänzte eigene In-memory-Fälle mit sechs Ebenen und bestätigte den behobenen Zeilenanfang-/Einrückungskontextfehler. Keine Tests als echte Browseraktionen ausgegeben.

Anwendung: `editor/app.mjs`, `editor/index.html`, `editor/themes.mjs`, `editor/theme-editor.mjs`, minimale Kontextkorrektur in `editor/structure.mjs`. Neu: `editor/structure-keymap.mjs`, `editor/structure-keymap.test.mjs`, `editor/visual-structure.mjs`, `editor/visual-structure.test.mjs`. Synthetische Probe: `test-vault/vault-structure/hierarchy.md`.

Dokumentation: `AGENTS.md`, `README.md`, `docs/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/PHASES.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATUS.md`, `docs/M3_2_STRUKTURPLAN.md`; neu diese Anleitung und `docs/FUTURE_COLORS_COMMANDS.md`. Frühere Arbeitsbaumänderungen erhalten, keine Storage-/Codec-/Abhängigkeitsänderung oder Installation.

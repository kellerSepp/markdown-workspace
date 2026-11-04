# M3.2b: Textformatierung und Überschriftenfarben

Nur synthetische Daten; keine Storage-/Codec- oder Abhängigkeitsänderung. Keine Palette, Textfarbfunktion, Agenda oder Org-mode-Formatumstellung. Die vorhandene optionale Überschrifteneinrückung wird in diesem Paket nicht erweitert.

## Manuelle Probe in Edge

`npm start` im Repository, dann `http://127.0.0.1:8766` öffnen. Bei bereits laufendem Server nach neuem Build einmal neu laden. `test-vault/vault-structure` auswählen und `formatting.md` öffnen.

1. In Midnight, Terminal, Nord und Paper H1–H6 vergleichen: Ebenen müssen schnell unterscheidbar, Text und Auswahl gut lesbar sein. Durch Farbwechsel dürfen weder Rohtext noch Überschriftenlevel geändert werden.
2. Text auswählen und jeden der fünf Formatierungsknöpfe einzeln ausprobieren: Fett, Kursiv, Unterstrichen, Durchgestrichen, Inline-Code. Rohtextausgabe und sinnvolle Auswahl kontrollieren, auch bei rückwärts gezogener Auswahl und Umlauten/Emoji.
3. Dieselbe Formatierung erneut betätigen und bestehende Begrenzungen entfernen lassen, soweit eindeutig unterstützt. Sowohl Auswahl des Inhalts als auch Auswahl einschließlich Markierungen testen. Verschachtelte Formatierungen gesondert prüfen.
4. Jede Aktion mit Strg+Z rückgängig und Strg+Y wiederherstellen. Mehrere Aktionen nacheinander müssen nachvollziehbare Schritte bleiben. Per Escape/Tab zu den Schaltflächen navigieren und Enter verwenden.
5. `_auch kursiv_` beim Unterstreichen nicht als Unterstreichung umdeuten. Unterstreichung erzeugt ausdrücklich `<u>Text</u>`, keine Umformatierung fremder HTML-Attribute.
6. Auswahl innerhalb oder über einen Codeblock hinweg darf keine unbeabsichtigte Formatierung auslösen. Bestehenden Codehintergrund, Seitenmarkierung und Cursor/Auswahl in vier Themes prüfen.
7. Nach Kontrolle explizit speichern, schließen und neu öffnen. Unberührte Außenbereiche einschließlich unbekanntem YAML kontrollieren; keine Veränderung nur durch Themewechsel.

## Grenzen und Nachweise

Dies bleibt ein Markdown-Rohtexteditor, keine neue WYSIWYG-Ansicht. Unterstreichung verwendet HTML-Tags; die spätere Darstellung außerhalb der App hängt vom jeweiligen Markdown-Renderer ab. Komplexe oder mehrdeutige Syntax wird sicher verweigert statt fremde Formatierung zu beschädigen.

Erster Bedienumfang: eine nichtleere, einzeilige Auswahl. Ohne Auswahl, bei mehreren Bereichen oder über mehrere Zeilen hinweg keine automatische Formatierung. Inhalt oder vollständige Wrapper für einen eindeutigen Toggle auswählen; eine beliebige Teilstelle bestehender Formatierung kann abgelehnt werden. Der Editor erzeugt weiterhin sichtbaren Markdown-Rohtext, keine neue gerenderte Vorschau.

Struktur-/Linkmarker, partielle Escapes/Entities und mehrere Tabellenzellen werden nicht umgedeutet. Reine Linkbeschriftung oder einzelne Tabellenzelle kann formatiert werden. Vor weiterer äußerer Formatierung muss Inlinecode gegebenenfalls gezielt entfernt werden. Fremde HTML-Attribute werden nicht als eigene Unterstreichungsmarker entfernt. Rand-Leerzeichen bleiben außerhalb von Emphasis-Markern; Inlinecode verwendet nötigenfalls längere Backtickfolgen und passende Abstände. Bei explizitem Entfernen und erneutem Setzen werden die festgelegten Standardmarker verwendet, etwa `*Text*` statt Wiederherstellung einer früher entfernten `_Text_`-Variante.

Der Dokumenttext ändert sich pro Aktion einmal mit isolierter Undo-Einheit. Eine nachfolgende reine Auswahltransaktion hält die Inhaltsauswahl für natives Redo fest; sie verändert keinen weiteren Text und löst keine zweite Storage-Bearbeitung aus.

## Prüfbelege

Developer `developer_m32b` implementierte und testete; QA `qa_m32b` prüfte unabhängig. Baseline 76 Tests bestanden. Abschluss: 89 Tests (76 bisherige plus elf Formatierungs- und zwei zusätzliche Lesbarkeitsprüfungen), Build, Syntax und `git diff --check` erfolgreich; genaue Abschlussausführung im PROJECT_STATUS.md. QA prüfte außerdem 45 eigene Schutzfälle sowie 120 Kombinationen aus fünf Formaten, zwölf Inhalten und beiden Auswahlrichtungen: 108 akzeptiert; alle akzeptierten Fälle erhielten Außenbereiche/Auswahlrichtung und bestanden Undo/Redo/erneutes Toggle. Diese Matrix ist kein vollständiger Markdown-Konformitätsnachweis.

Behobene Befunde: falsche Zuordnung getrennter `<u>`-Paare, Umdeutung partieller Syntax und falsche Inhaltsauswahl nach Redo. Vorhandene Codeblockflächen und Auswahl-Ebenen unverändert, nur Theme-Farbwerte angepasst. Native vorhandene Markdown-Sprachvariante aktiviert tatsächliche Durchstreichungs-Syntax; keine neue Bibliothek oder Org-mode-Formatumstellung.

| Theme | Mindest-Hueabstand H1–H6 | Mindest-Headingkontrast gegen Editor/Code/Auswahl | Codefläche gegen Editor |
| --- | ---: | ---: | ---: |
| Midnight | 39,7° | 5,34:1 | 1,22:1 |
| Terminal | 34,4° | 4,66:1 | 1,35:1 |
| Nord | 32,6° | 4,83:1 | 1,24:1 |
| Paper | 39,0° | 4,83:1 | 1,29:1 |

Unabhängige QA-Berechnung. Hueabstand ist ein Unterscheidungsindikator, kein Wahrnehmungs-/Farbenblindheitsnachweis. Flächenabstand mindestens 1,15 ist ein internes Gestaltungsziel, kein WCAG-Textkriterium. Bestehende Text-/Syntaxkontrastprüfungen bleiben bestehen. Echte Edge-, Maus-/Fokus-/Assistenz-, Zoom-/Hochkontrast-, RAM-/Idle-/Langzeitprüfung bleibt offen; keine Browseraktionen durch Agenten als bestanden behauptet.

## Dateien

- Neu: `editor/formatting.mjs`, `editor/formatting.test.mjs`, `test-vault/vault-structure/formatting.md`, diese Anleitung.
- Anwendung: `editor/app.mjs`, `editor/index.html`, `editor/themes.mjs`, `editor/readability.test.mjs`.
- Dokumentation: `AGENTS.md`, `README.md`, `docs/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/PHASES.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATUS.md`, `docs/M3_2_STRUKTURPLAN.md`.

Keine Storage-/Codec-/Paketänderung und keine neue Einrückungslogik. Bereits vorhandene Arbeitsbaumänderungen erhalten, keine Veröffentlichung oder produktive Vaultnutzung.

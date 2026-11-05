# Architekturvorschlag – zur Freigabe

## Return und Listenteilbaum — gezielter Bugfix 2026-11-05

Bestehenden Listenplaner und Tastaturrouter ergänzen: Return als Fortsetzungszeile mit Einrückung bis zum Itemtext, Alt+Return weiterhin neuer Punkt. Gemeinsame Schutzprüfung und atomare Transaktion verwenden. Bei Teilbaumeinrückung zusätzlich zu AST-Grenzen die physische Markereinrückung beachten: Ein geringer eingerückter Folgepunkt beendet den Zielbereich; die bestehende Org-Erstpunktregel für gleich eingerückte Geschwister bleibt erhalten. Das ist nach unverändertem physischen Zeilenverschieben nötig, weil Markdown unterschiedlich eingerückte Marker als AST-Geschwister führen kann. Keine zweite Parserbibliothek oder Storageänderung.

Abnahme: PO-Repro vor/nach Zeilenbewegung, unveränderter Folgepunkt, echte Kinder/Fortsetzungen, Return und Alt+Return, Undo/Redo sowie bestehende Schutzfälle. Unabhängige QA; native Browserzustellung und Langzeitressourcen separat offen lassen.

## Listen-Tab/Einfügen — 2026-11-05

Listeninteraktion verwendet gemeinsame AST-Kontext-/Planerfunktionen in `editor/list-interaction.mjs` innerhalb vorhandener Registry, keinen parallelen Editor. Tastaturrouter unterscheidet leeres Item, gefülltes Item mit Children und Leaf, bevor bisheriges Struktur-Tab greifen könnte. Leere Items rücken gerichtet unter den vorherigen Geschwisterpunkt beziehungsweise zur Elternebene, ohne umlaufenden Zyklus; gefüllte Items ändern bei Tab nie den Text. Gezielte Änderungen werden erneut als Markdown analysiert: Itemanzahl, geschützte Blockarten und Elternzuordnung bestehender Items müssen erhalten bleiben; nur der gezielt bewegte Leerpunkt darf seinen Elternpunkt wechseln. Das kostet eine zusätzliche Analyse und verweigert unsichere Fälle, verhindert aber unbeabsichtigtes Umhängen. Cursorposition und atomare Historie bleiben erhalten.

Lokale Listenfalten und globaler Gliederungszyklus verwenden native Fold-/Unfold-Effekte ohne Textänderung. Eine an den unveränderten Editorzustand gebundene Fortsetzung erlaubt weitere Shift-Tab-Stufen nach faltbedingter Cursorversetzung; andere Navigation, Bearbeitung, Escape oder Fokusverlust beendet sie. Alt-Enter/Checkboxeinfügen erfolgt als lokale Transaktion mit gemeinsamer Handlerausführung; komplexe Markdown-Splits werden transparent abgewiesen. Referenz [Org Plain Lists](https://orgmode.org/manual/Plain-Lists.html). Code-/Frontmatter-/Modifier-/Fokusgrenzen erhalten; keine Storageänderung.

Abnahme: fünf Listenebenen, Standardmarker, Nummernbreitenwechsel und Mehrzeilen; Cursor einschließlich EOL/EOF und atomare Undo-/Redo-Wiederherstellung; display-only Folding und Fortsetzungsreset; bestehende Heading-/Alt-/Code-/Fokus-/Registrytests. Native Edge-Zustellung und Langzeitressourcen bleiben gesonderte Praxisnachweise. Keine neuen Pakete oder weiteren Meilensteine.

## M4b.1a: gezielte Org-Listenoperationen

Vorhandenen gemeinsamen Listenplaner über seine explizite Org-Option ergänzen, keine zweite Tastaturalgorithmik. Bestehende Registry-IDs und bewährten Alt-Ereignisvorrang behalten. Offizielle Referenz [Plain Lists](https://orgmode.org/manual/Plain-Lists.html)/[Orgcard](https://orgmode.org/orgcard.pdf): vertikaler Itemtausch nimmt Children bereits mit; Shift-Alt-Auf/Ab bleibt Zeilenbewegung. Zu prüfen: bisher konservativ gesperrte First-item-/Ausrück-/Wiederholungsfälle und nummerierte Fortsetzungszeilen. Jede freigegebene Änderung erneut als Markdown analysieren und atomar ausführen; Fremdbereiche/Code schützen. Grenzen transparent benennen statt erfundene Annäherung als Org-Kompatibilität auszugeben.

Abnahme: mindestens fünf Ebenen, Marker-/Nummern-/Mehrzeilen-/Geschwistergrenzen, Single/Subtree, Cursor/Undo/Redo, Code und Headingregression; bestehende 110 Tests. Keine neue Architekturplattform oder breite Untersuchung. Native Edge-Ergebnisse nur tatsächlich gemessen oder als PO-Bericht kennzeichnen.

## M4b.1: Org-referenzierte Struktursteuerung — 2026-11-04

Nach PO-Browserbefund: CodeMirror-Keymaps und DOM-Handler müssen in der tatsächlichen gemeinsamen Ereignisreihenfolge geprüft werden. Ein direkter Unitaufruf des Org-Resolvers beweist keine Priorität vor Standardcursorbewegung. Recognized Org-Handler daher mit expliziter Präzedenz; kein zweiter Bearbeitungsalgorithmus. Bare-Alt-Unterdrückung nur bei Editorfokus und getrennt von Alt-Kombinationen, mit Modifier-/IME-/Fokusverlustschutz. Browserreserve bleibt praktischer Abnahmepunkt, keine Web-App-Garantie für OS-/Browsermenüs.

Vorhandene Registry/AST-Planer wiederverwenden; explizite Einzel-/Unterbaumvarianten mit festen Optionen verhindern unterschiedliche Semantik zwischen Tastatur, Palette und Kontextmenü. Legacy-Befehle mit Unterstrukturwahl bleiben als solche kenntlich. Editor-Keymap löst ausschließlich erkannte Kontexte in Registry-IDs auf und prüft AltGr/IME/Modifier. Browsernavigation nur bei erkanntem Editorbefehl verhindern. Kein globaler Alt-Blocker oder paralleler Bearbeitungsalgorithmus.

Explizite sitzungsweite Org-Tab-Option löst den Konflikt mit bestehendem Struktur-Tab. Standard bleibt unverändert; Org-Faltzyklen gesondert von vorhandener progressiver Vierstufenöffnung halten. Neue Faltzustände ausschließlich Ansicht, keine Markdown-/Storagepersistenz. Escape-Fokusnavigation erhalten. Vorteil: überprüfbare Semantik pro Command-ID und keine stille Umbelegung; Kosten: zwei klar benannte Tab-Modi und zusätzliche Dokumentation.

Referenzen: [Structure Editing](https://orgmode.org/manual/Structure-Editing.html), [Plain Lists](https://orgmode.org/manual/Plain-Lists.html), [Global/local cycling](https://orgmode.org/manual/Global-and-local-cycling.html), [Orgcard](https://orgmode.org/orgcard.pdf). Org-Meta-Auf/Ab bewegt bereits Unterbäume; Shift-Meta-Auf/Ab ist Zeilenverschieben. PO bestätigte nach Rückfrage ausdrücklich diese Unterscheidung: Shift-Meta-Auf/Ab soll die aktuelle Zeile unabhängig von Hierarchiegrenzen verschieben. Gemeinsamer Registry-Handler mit atomarem Undo/Redo, Cursor-/EOF-Erhalt und transparenten Markdown-Sicherheitsgrenzen. Keine Stillevelanpassung oder Refile-Ersatz.

Abnahme: 95 Regressionen plus neue Einzel-/Unterbaum-, Hierarchiegrenz-, Keymap-, Fokus-, Falt- und Dokumentationsprüfungen. Tatsächliche Edge-/QWERTZ-Zustellung getrennt vom Node-Nachweis berichten. Keine neuen Pakete, keine Shortcutkonfiguration/Sequenzmaschine oder M4b.2-Funktionen.

## M4a: gemeinsame Befehlsoberfläche — 2026-11-04

Freigegebener Ansatz: UI-unabhängiges Registry mit stabilen IDs und lokalen Handlern; Adapter verbinden vorhandene Editor-/Dateiaktionen. Palette, Kontextmenü und bestehende Bedienelemente rufen dieselbe Ausführung auf. Kontext wird vor Anzeige und erneut vor Ausführung geprüft. Sperrgründe bleiben sichtbar. Kein Laden ausführbarer Gamebook-/Notizdefinitionen, kein Pluginmechanismus.

Getrennte DOM-Oberflächen erhalten Fokus und Editorauswahl; nur tatsächlicher Editor-Kontext ersetzt das Browsermenü. Alt+X öffnet die Palette, gewöhnliche Eingabe und AltGr dürfen keine Befehle starten. Suche arbeitet nur bei Interaktion, ohne Polling/Worker. Vorhandene Tokens und CodeMirror-Operationen wiederverwenden. Vorteil: eine Befehlsdefinition für mehrere Bedienwege; Kosten: explizite Adapter für UI-Zustand und fokussensible Browseraktionen.

Abnahme: vorhandene Aktionen inventarisieren und weiterhin erreichbar halten; Namen/Beschreibungen/Kategorien durchsuchen; Maus/Pfeile/Enter/Escape, Kontextgründe, Auswahl/Fokus und Undo/Redo prüfen. Gamebook mit maschinell prüfbaren IDs und manuell editierbaren Beschreibungen gegen unbemerkte Drift absichern. Automatisierte Prüfung ersetzt keine tatsächliche Edge-/QWERTZ-/Langzeitabnahme.

M4b-Grenze: IDs, Kontext und Shortcut-Metadaten sind Erweiterungspunkte für spätere konfigurierbare DE-QWERTZ-Kürzel, Sequenzen und Folgehilfe. Noch keine Sequenzmaschine, Benutzerkonfiguration oder neue Produktbefehle. Storage-Sicherheitsmodell und Markdown-Datenmodell unverändert.

## Formatuntersuchung Markdown/Org – 2026-11-03

[Vergleich mit Beispielen, Quellen und offenen Entscheidungen](FORMAT_COMPARISON.md). Developer und Storage untersuchten parallel ausschließlich lesend. Empfehlung: Markdown vorerst beibehalten; Org spart Konventionsarbeit bei Aufgabenmetadaten, erfordert aber eigene Browserlogik und neue Syntaxintegration. Spätere Formatadapter sind ein Vorschlag, keine Implementierungsentscheidung. Keine automatische Doppeldatei-Synchronisierung. Markdown bleibt das beschlossene Primärformat; PO-Entscheidung abwarten.

## M3.2b: Auswahlformatierung und unterscheidbare Überschriftenfarben

Developer ergänzt `editor/formatting.mjs` mit reinem `planFormat(state,kind)` für Vorschlag/Ablehnung und `runFormat(view,kind,notify)` für geprüfte Ausführung. Ein gemeinsamer Weg für fünf UI-Schaltflächen, einzelne atomare Undo-Einheit, gezielte Auswahl/Begrenzungen statt vollständiger Neuformatierung. Vorhandenen Markdown-AST für Erkennung und Prüfung verwenden; Wrapper/Inhaltsauswahl nur bei eindeutiger Zuordnung entfernen. Codeblöcke und Frontmatter einschließlich Auswahlüberlappungen schützen. Unterstreichung ausdrücklich `<u>…</u>`, keine Umdeutung von `_…_` oder Änderung fremder HTML-Attribute.

Konservative erste Grenze: eine nichtleere einzeilige Auswahl; unsichere verschachtelte/partielle Syntax verständlich verweigern. Inlinecode muss ausreichende Backtick-Begrenzungen und Markdown-konforme Leerzeichenbehandlung verwenden. Auswahlrichtung und Zeichenpositionen im UTF-16-Dokument erhalten, BOM/äußere Zeilenenden über den unveränderten Codec absichern.

Installierte `markdown()`-Standardbasis ist CommonMark und erkennt Durchstreichung noch nicht. Die vorhandene `markdownLanguage`-Basis bringt Strikethrough-Unterstützung mit; Anwendung und Formatprüfungen nutzen diese vorhandene Variante, ohne neue Bibliothek oder Sprachmodule. Keine Aufgabenverwaltung aus erweiterter Syntaxerkennung ableiten.

Sechs H1–H6-Farben je Theme über zentrale Tokens deutlich nach Farbton unterscheiden, nicht nur über minimale RGB-/Helligkeitsabstände. Vorhandene Codeblock-Darstellung samt Auswahlebene erhalten; bei Bedarf nur Theme-Farbwerte justieren. Keine neue Einrückung oder Änderung gespeicherter Markdown-Level. Abnahme: echte Syntaxwirkung/Toggles/Undo/Außenbereichsschutz und Theme-Kontraste; perceptuelle Farbunterschiede und generiertes Highlighting zusätzlich prüfen. Echte visuelle Edge-Abnahme separat ausweisen.

## M3.2a.1: kontextuelle Tastatur und getrennte Darstellung

Vorhandene APIs geprüft: CodeMirror unterstützt `indentMore`/`indentLess`, kontextuelle Keymaps, `setTabFocusMode`, viewportbezogene Line-Decorations und eigene Gutter. Die bisherigen AST-Strukturbefehle werden wiederverwendet. Tab bezieht sich auf echte Überschriftenzeilen oder Listenknoten, nicht auf beliebige Absätze ihres Abschnitts. Codekontext hat Vorrang vor Strukturbefehlen. Escape aktiviert einen Fokusnavigationsmodus; beim echten Wiedereintritt von außen wieder Struktur-Tab. Keine globalen Browserkürzel.

Visuelle Marker/mehrteilige Nummern erscheinen in einer eigenen Randspalte statt als Ersatz des Markdown-Listentextes. Vorteil: Rohtext, Auswahlpositionen und Kopieren bleiben verlässlich, Unicode und mehrteilige Ziffern werden nicht als inkompatible Syntax gespeichert. Grenze: native Rohpräfixe bleiben zusätzlich im Editor sichtbar. Konfiguration für fünf Marker-Ebenen; tiefere Ebenen verwenden den letzten Stil. Alternative alphanumerische Nummerierung bleibt Zukunftsplanung.

Heading-Einrückung und Codeflächen sind zeilenbezogene Darstellungsdekorationen, keine Textänderungen. Einrückung deckeln; Codehintergrund/Seitenrand verwenden vorhandene Theme-Tokens. Die Auswahl darf nicht hinter deckenden Codeflächen verschwinden: Überlappung mit CodeMirrors Selection-Layer explizit prüfen. Der Syntaxbaum liefert die Bereiche; Änderungen von Dokument, Parsebaum, Viewport und Anzeigeoptionen aktualisieren die Darstellung. Keine neuen Timer/Frameworks/Sprachpakete oder Storageabhängigkeit.

Abnahme: reale CodeMirror-Keymapbehandlung, zeitunabhängiger Fokusausstieg samt Wiedereintritt, fünf echte Listentiefen und Undo/Redo; Darstellungswechsel ohne Text-/Folding-/Historienänderung; Codeflächen in vier Themes samt Auswahl. DOM-/Browser-/Hochkontrast- und Performanceprüfungen separat ausweisen. Textfarbe und gemeinsame Kontextmenü-/Palettenbefehle nur [vormerken](FUTURE_COLORS_COMMANDS.md).

## M3.2a: delegierte Strukturverwaltung

Nach tatsächlich bestätigter Rollenübernahme implementiert Developer `editor/structure.mjs`: `planStructure` erzeugt aus dem vorhandenen Markdown-AST einen atomaren Änderungsvorschlag oder eine erklärte Verweigerung; `runStructure` prüft Analyse/Readonly und dispatcht. UI ruft dieselben benannten Befehle über einfache Maus-/Tab-/Enter-Schaltflächen auf. Keine Command Palette, neue globale Kürzel oder eigenen Parser. Quell-/Ziellisten werden begrenzt mit vorhandener Markdown-Unterstützung nachgeprüft; Blockumdeutungen werden abgewiesen.

Überschriften: Geschwistertausch mit gesamtem Unterbaum, Ebenenmarker einzeln/mit Kindern und atomare H1–H6-Grenzen. Listen: Bewegung/Einrückung einzeln/mit Children, Präfixwechsel und lokale Nummerierung. Einzelmodus fördert Children am bisherigen Ort; Ausrücken verschiebt hinter den bisherigen Eltern-Unterbaum. Konservative Grenzen für Mischcontainer, mehrzeilige Setext→ATX und Nummernbreitenwechsel stehen in [STRUCTURE_M32A.md](STRUCTURE_M32A.md).

`isolateHistory` macht jede Operation einzeln rückgängig. Gezielte Marker-MultiChanges und gekürzte Ersetzungen erhalten unveränderte Außenbereiche; betroffene Falten werden in neuen Koordinaten geöffnet, andere durch CodeMirror gemappt. Der unveränderte TextCodec erhält unberührte EOL/BOM-Bereiche; verschobene Replacement-Teile können den vorhandenen ersten EOL-Stil erhalten. Keine Storageänderung zur Erweiterung dieser Grenze. M3.2b bleibt ausdrücklich gesperrt.

## M3.2-Planung: visuelle Hierarchie und Strukturänderungen trennen

Optionale Hierarchieeinrückung als reine Editor-Darstellung vorsehen, getrennt von Operationen, die den Rohtext bewusst ändern. Keine Einrückungsleerzeichen als Darstellungsersatz in die Datei schreiben. Verschieben/Einrücken/Präfixwechsel und Formatierungen als nachvollziehbare Undo-/Redo-Einheiten über den vorhandenen Editoränderungspfad planen; bestehende Syntax und fremde Formatierungen erhalten. Unterstreichung ist als `<u>Text</u>` festgelegt, `_Text_` behält seine Markdown-Bedeutung. Minimalistische UI, Maus und QWERTZ berücksichtigen. Details/Abnahme im [Strukturplan](M3_2_STRUKTURPLAN.md). Keine Umsetzung oder Storageänderung mit dieser Planungsnotiz freigegeben.

## Phase 2 M3.1: Kontext und progressive Sichtbarkeit

API-Vorabcheck: native Fold-Effekte können mehrere Bodybereiche verstecken, bieten aber keinen fertigen Org-mode-Zyklus. `toggleFold` allein kann einen lokalen Codeblock statt der zugehörigen Überschrift wählen. Deshalb liest `editor/section-folding.mjs` echte ATX-/Setext-Knoten aus dem vorhandenen Syntaxbaum; Abschnittsfalten verwenden native `foldable`-Grenzen. Ein pro Baum zwischengespeicherter Index ergänzt Container-/Elternzuordnung und Kontextgrenzen inklusive Leerzeilen. Kein zweiter Markdown-Parser, kein Scan pro Tastenanschlag, kein Timer.

Aus Absatz/Liste/Codeblock zuerst zugehörige Überschrift; ohne Überschrift lokaler Syntaxblock. Sichtbarkeit ausschließlich über `foldEffect`/`unfoldEffect`: geschlossen → alle Überschriften sichtbar/Prosa verborgen → Bodies von Root und direkten Kindern sichtbar → alles sichtbar. Gleiche Stufen überspringen; gemischte Teilfalten beim weiteren Öffnen vollständig öffnen, niemals mehr verbergen. Nur Foldbereiche im Zielabschnitt ändern. Der Zustand wird aus tatsächlichen Falten abgeleitet statt in einer konkurrierenden Zustandsmaschine gespeichert.

Verborgenen Cursor auf sichtbare Überschrift setzen; CodeMirror würde sonst Falten mit enthaltener Auswahl löschen. Native Mausrandmarkierung und ein tastaturbedienbarer Platzhalter verwenden denselben Zyklus; drei explizite Knöpfe bieten Einklappen, nächste Stufe und vollständiges Öffnen. Kein neues globales Vollöffnen-Kürzel: Strg+Umschalt+U kollidiert mit Edge-Vorlesen. Bei unvollständiger Analyse öffnet ein begrenzter Notausstieg nur tatsächlich vorhandene Foldbereiche; vollständige semantische Stufen nach erfolgreicher Analyse erneut anfordern.

Lesbarkeit: sechs Theme-Tokens `syntaxHeading1` bis `syntaxHeading6`, Code-/Zitat-/Marker-Tokens und bestehende Link-/Literalfarben. Adapter ordnet echte Parser-Tags zu, ohne Festfarben. Kontrastprüfung umfasst neue Syntax-Tokens gegen Editor-, Code- und Auswahlflächen. Keine Preview, zusätzlichen Sprachen/Pakete oder Formatierungsbefehle. M3.2 bleibt [Planung](M3_2_STRUKTURPLAN.md).

## Phase 2 M3: Markdown-Folding

Vor Implementierung im installierten Code geprüft: `@codemirror/lang-markdown` liefert `headerIndent`/`findSectionEnd` für ATX H1–H6 und Setext H1/H2. `@codemirror/language` stellt `codeFolding`, `foldGutter`, `foldCode` und `unfoldCode` bereit. `editor/folding.mjs` verbindet diese APIs mit vorhandener Markdown-Konfiguration; kein eigener Parser oder neues Paket. CodeMirror kann daneben seine vorhandenen Blockfalten anzeigen; keine neue Blockbearbeitung.

Tastatur: Strg+Umschalt+Komma einklappen, Strg+Umschalt+Punkt ausklappen, auf der Überschriftenzeile. Kein AltGr oder unmodifizierter Text als Befehl. Maus über native Randmarkierung, Auslassung `…` entfaltet. Platzhalter/Markierung verwenden bestehende Theme-Tokens. Faltzustand nur im Editor, ohne Texttransaktion oder Vaultzugriff; keine dauerhafte Faltzustandsspeicherung.

Lange Dokumente: native Randmarkierungen betreffen den sichtbaren Bereich. Vor neuem Einklappen wird der Syntaxbaum bei Bedarf bis EOF weitergeführt, mit 50 ms Budget je Aktion. Unvollständige Analyse blockiert das Einklappen mit Hinweis statt einen nur teilweise bekannten Abschnitt zu verstecken. Entfalten bleibt sofort möglich. Kein eigener Vollscan pro Tastenanschlag und keine neuen Hintergrundtimer. Bereits vorhandene Falten folgen CodeMirrors Mapping bei Textänderungen; neu hinzugefügte Überschriften erfordern gegebenenfalls Aus-/Einklappen zur Neuberechnung.

Abnahme/Grenzen: H1–H6, Eltern/Kinder, EOF, Codeblöcke, Text-/Undo-/Themeerhalt und längeres synthetisches Dokument automatisiert prüfen. Echte QWERTZ-/Edge-, Zoom-, Maus- und Langzeitprüfung separat. Keine RAM-/Latenzzusage aus Zustandsprüfungen.

## Freigegebener Abschnitt: Phase 2 M1 (2026-11-03)

Native Weboberfläche und CodeMirror 6, ein aktives Markdown-Dokument. Editor meldet Textänderungen an einen separaten Storage-Adapter; nur dieser verwaltet Datei-Handles, Rohbytes, Entwürfe, Konflikte und Sicherungen. Der geprüfte Schreibpfad aus `spike/storage.mjs` bleibt Grundlage. Kein Markdown-/YAML-Parser oder neues Datenmodell.

UTF-8 wird strikt gelesen; BOM und unberührte Zeilenenden müssen trotz normalisierter Editoransicht erhalten bleiben. Neue Zeilen verwenden einen aus der Datei abgeleiteten Stil. Ungültiges UTF-8 blockiert das Öffnen statt verlustbehafteter Umwandlung. Browserentwürfe sind kein unabhängiges Backup.

Grenze: synthetische Testdaten; das externe Schreibrennen ist hierfür akzeptiert. Sicherungen bleiben separat im Test-Vault ohne automatische Löschung. Keine Garantie für OS-Dateimetadaten. Abnahme: Öffnen/Bearbeiten/Speichern, No-op, Konflikt und Fehler mit Entwurfserhalt automatisiert prüfen; echte Edge-, QWERTZ-, Idle- und Performanceprüfung separat kennzeichnen. Frühere Sperren im folgenden historischen Vorschlag gelten nicht für M1.

Aktualisierung 2026-11-03: Phase 0 wurde geprüft/freigegeben, Phase 1 separat autorisiert (DECISIONS.md). Der Storage-Spike verwendet native Module, Bytevergleiche, IndexedDB-Entwürfe, verifizierte Rohbytesicherungen und ein originweites Web Lock. Keine Parser-/Editorwahl abgeleitet. Abnahme und Grenzen: [STORAGE_SPIKE.md](STORAGE_SPIKE.md). Das automatisiert reproduzierte externe Schreibrennen verhindert weiterhin eine Aussage „kein Datenverlust“; vor Phase 2 Speicherstrategie entscheiden. Browsernachweis noch offen.

Stand: 2026-11-02. Alle folgenden technischen Entscheidungen sind Vorschläge. Bestätigte Produktentscheidungen bleiben unverändert in DECISIONS.md.

## Aufbau und Technologien

Empfehlung: statische Edge-Webanwendung ohne Backend. Oberfläche, Dokumentmodell, abgeleiteter Index und Dateizugriff als getrennte Module. Ein Storage-Adapter ermöglicht später den Wechsel von Browser- zu nativen Dateioperationen. Keine vorsorgliche Pluginplattform.

| Option | Vorteil | Grenze / Empfehlung |
| --- | --- | --- |
| Native Weboberfläche + CodeMirror 6 | Modularer klassischer Editor, Erweiterungen für Markdown und Faltung | Bevorzugter Kandidat nach Storage-Spike; Pakete und Buildwerkzeug erforderlich, Größe und RAM messen |
| Native Weboberfläche + Textfeld | Sehr kleines Dateizugriffsexperiment | Für Spike geeignet; Faltung und Syntaxhervorhebung würden später erheblichen Eigenbau erfordern |
| UI-Framework + CodeMirror | Struktur bei wachsender Oberfläche | Zusätzliche Abhängigkeiten; erst bei nachgewiesenem Bedarf |

Spike mit Browser-JavaScript und nativen APIs; später TypeScript als Kandidat für überprüfbare Modulgrenzen. Markdown-/YAML-Parser und sichere Vorschau separat auswählen, keinen vollständigen Parser selbst bauen. Keine Pakete oder Versionen beschlossen.

Abnahme: Fachmodell ohne UI prüfbar; Dateiadapter austauschbar. Grenze: kein Framework und kein Backend in Phase 0.

## Theme-System: Architekturvorschlag zur weiteren UI-Planung

M2-Freigabe (2026-11-03): vier lokale Paletten Midnight (Standard), Terminal, Nord und Paper; CSS-Tokens und kleiner CodeMirror-Adapter, Auswahl ohne Reload und lokale Speicherung. Themewechsel dürfen weder Dokumenttransaktionen noch Vault-Schreibzugriffe auslösen. JSON-Import/-Export und Theme-Editor bleiben Planung, das folgende JSON-Schema ist noch kein implementiertes Format. Interne Prüfkriterien für M2: Text-/Syntaxkontraste mindestens 4,5:1 gegen vorgesehene Flächen, Fokus/Cursor/Bediengrenzen möglichst mindestens 3:1. Rechnerische Prüfung ersetzt keine visuelle Edge-Abnahme und behauptet keine vollständige Barrierefreiheit. Ressourcenprüfung: kein Polling/Animation, keine wachsenden Listener oder wiederholte Editor-Neuerstellung; Langzeit-/RAM-Messung bleibt separat.

M2 umgesetzt: `editor/themes.mjs` enthält reine Palettendaten, Tokenanwendung und fehlertolerante Auswahlpersistenz unter `markdown-workspace-theme-v1`. `editor/theme-editor.mjs` ist ausschließlich der CodeMirror-Adapter (kein grafischer Theme-Editor). Zwei gecachte helle/dunkle Stilkonfigurationen verwenden dieselben CSS-Variablen; Wechsel über ein Compartment ohne Textänderung oder neuen Editorzustand. UI-Stile konsumieren dieselben Tokens. Ungültige/fehlende gespeicherte Auswahl fällt auf Midnight zurück; blockiertes localStorage verhindert den Sitzungswechsel nicht. `@lezer/highlight` 1.2.5 war bereits transitiv vorhanden und wird wegen des direkten Syntax-Imports explizit deklariert; keine zusätzliche Installation/Version.

Die Produktanforderungen in REQUIREMENTS.md sind bestätigt; M2 setzt den oben begrenzten Ausschnitt um, weitergehende Ausgestaltung bleibt Vorschlag:

- Eine gemeinsame semantische Token-Schicht für UI und CodeMirror: etwa Flächen, Text, Akzent, Fokus, Auswahl, Fehler, Rahmen, Schriftfamilie/-größe und Syntaxrollen. CSS-Variablen für die Oberfläche und eine austauschbare CodeMirror-Theme-Konfiguration aus denselben validierten Werten ableiten. Vorteil: konsistente Paletten ohne Editor-Neuaufbau; Aufwand: Zustände und Syntaxrollen vollständig abdecken.
- Versioniertes JSON mit begrenzten bekannten Feldern und typisierten Werten. Importgröße, Wertebereiche und erlaubte Schriftangaben begrenzen; keine Skripte, HTML, frei formulierbaren CSS-Regeln, URLs oder externen Schrift-/Bildabrufe. Nur geprüfte Tokens übernehmen, unbekannte Formatversionen verständlich ablehnen. Vorteil: datenbasierter Import; Grenze: keine beliebige Skinbeschreibung im ersten Format.
- Theme-Verwaltung getrennt von Editorinhalt und Storage halten. Ein Wechsel aktualisiert ausschließlich Darstellung, erhält Undo, Fokus und Auswahl und schreibt keine Markdown-Datei. Lokale Auswahl außerhalb des Vaults speichern; bei ungültiger Einstellung oder fehlendem Theme auf ein mitgeliefertes Basistheme zurückfallen.
- Nur aktive Palette anwenden; keine Hintergrundschleifen. Mitgelieferte Paletten lokal bündeln. Aufwendige Skins später als eigene Darstellungsschicht mit gleichem Token-Vertrag planen; keine Pluginplattform ableiten. Feuer/Lava oder Terminalästhetik zunächst statisch, keine Effektengine.

Abnahme: Kriterien in REQUIREMENTS.md, einschließlich unverändertem Dokumenttext beim Wechsel, sicherem JSON-Rundlauf, lokalem Neustart und lesbaren Zuständen. Vor Umsetzung Token-/JSON-Schema, erste Paletten, Kontrastgrenzen und Messmethode konkret zur Prüfung vorlegen. Theme-Editor/Live-Vorschau und Skins folgen in separaten Abschnitten; öffentliche Assets erst nach geklärter Herkunft/Lizenz. Dieser Vorschlag ändert keinen Anwendungscode.

## Dateizugriff und Bereitstellung

File System Access API mit expliziter Ordnerauswahl empfohlen. „Beliebiger Ordner“ heißt jeder vom Browser erlaubte, vom Nutzer gewählte Ordner; geschützte Ordner und Richtlinien bleiben Grenzen. Handles in IndexedDB speichern, Berechtigung beim Wiedereinstieg prüfen und nötigenfalls nach Nutzeraktion neu anfordern. Dauerhafte Freigabe nicht garantieren.

Alternativen: Import/Download bietet keinen gleichwertigen Vault-Zugriff; OPFS ist privater Browserspeicher und kein frei gewählter Ordner. Ein nativer Adapter bleibt eine spätere Option.

Markdown-Dateien sind führend. IndexedDB enthält wiederaufbaubare Indizes und getrennt gekennzeichnete Entwürfe zur Wiederherstellung. Browserdaten können gelöscht werden und ersetzen kein Backup.

PWA-Vorschlag: statisches HTTPS-Hosting für Erstaufruf und Updates, Offline-Start anschließend über Service Worker. Keine Notizen hochladen, keine externen Laufzeit-CDNs. Hosting ist eine externe Bereitstellungsabhängigkeit und braucht Freigabe. Für den Spike alternativ kurzzeitig localhost mit festem Origin und vorhandener Laufzeit; kein dauerhaftes Produktbackend. Doppelklick auf eine HTML-Datei ist keine verlässliche PWA-Strategie.

Abnahme: Rechteverlust verständlich behandeln; Reload/Browserneustart und später Offline-Neustart auf dem tatsächlichen Gerät prüfen. Grenze: kein Offline-Erststart ohne Bereitstellung und kein Umgehen von Richtlinien.

## Dateisicherheit und Performance

Zunächst explizites Speichern. Ladeinhalt und Hash merken, unmittelbar vor Schreiben frisch lesen und vergleichen. Bei Abweichung Ersetzung blockieren, beide Fassungen zugänglich halten. Pro Datei Schreibvorgänge serialisieren, eigene Tabs koordinieren. Erfolg erst nach abgeschlossenem Schreibstream und erneutem Lesen melden. Entwurf bei Fehler erhalten. Vor Ersetzung eine separat abzustimmende Wiederherstellungskopie vorsehen; scheitert die Sicherung, Ersetzung blockieren.

Prüfung und Schreiben sind gegenüber externen Programmen keine gemeinsame Transaktion. Eine Änderung genau dazwischen bleibt ein Risiko; auch erneutes Lesen verhindert spätere Sync-Überschreibung nicht. Keine garantierte atomische Umbenennung voraussetzen. Der Spike muss dieses Restfenster untersuchen. Ist absoluter Schutz bei beliebiger Parallelbearbeitung zwingend, reicht der Browseransatz dafür nicht als Nachweis; Speicherstrategie vor Produktumsetzung erneut entscheiden.

Aktive Datei bei Fokuswechsel, Öffnen und vor Speichern prüfen. Vault-Aktualisierung manuell bzw. in kleinen abbrechbaren Paketen; keine permanenten Vollscans oder Abhängigkeit von experimentellen Dateiwächtern. Nur nötige Inhalte im RAM, größere Indexarbeit später im Worker. OneDrive ist optional; keine Tests in persönlichen oder synchronisierten Ordnern ohne gesondert genehmigte Testumgebung.

Abnahme: erkannte Konflikte verhindern Ersetzung, Fehler melden keinen Erfolg, Wiederherstellung wird geprüft. Grenze: kein eigenes Sync-System und kein verteiltes Locking.

## Datenmodell und Syntaxvorschläge

- Notiz: relativer Vault-Pfad, Markdown-Rohtext, optional YAML Frontmatter. Unbekannte Felder, Zeilenenden und unberührte Textbereiche erhalten. Ungültiges YAML melden; strukturierte Änderungen blockieren, Rohtext zugänglich halten.
- Anfangs Pfade als Identität; optionale stabile IDs erst für dauerhafte Referenzen. Keine automatische Massenmigration. Umbenennungen sichtbar behandeln.
- Wiki-Links: `[[pfad/notiz]]`, später Anzeigename/Überschrift. Exakten Pfad bevorzugen, Kurzname nur bei Eindeutigkeit; ungelöste Ziele anzeigen. Tags/Backlinks aus Text ableiten, Codeblöcke ausschließen.
- Illustrative Aufgabe: `- [ ] DOING Text [scheduled:: 2026-11-03] [due:: 2026-11-05]`. Checkbox für offen/erledigt, Status für Workflow; Widersprüche melden. Statusliste und Abschlussstatus in offener versionierter Vault-Konfiguration. Keine behauptete Logseq-Kompatibilität.
- Aufgabe intern: Notizpfad, Textbereich, Status, Termin, Deadline, optionale Priorität. Zeilenposition ist keine dauerhafte Aufgaben-ID.
- Datum zunächst ISO-Kalendertag; Termin bedeutet eingeplant, Deadline spätestens fällig. Uhrzeiten/Zeitzonen später entscheiden. Journalvorschlag: `journal/YYYY-MM-DD.md`.
- Projektverweise und typisierte semantische Beziehungen optional im YAML. Suche, Agenda und Backlinks müssen vollständig aus Dateien neu aufbaubar sein.

Abnahme: Dateien außerhalb der App lesbar, Neuindexierung liefert gleiche Ergebnisse, unbekanntes YAML übersteht gezielte Änderungen. Grenze: Syntax vor Phase 3 freigeben, kein Org-mode-/Logseq-Komplettparser.

## Investigation Board

Später separat laden und nur bei sichtbarer Ansicht rendern. JSON Canvas als offener Layoutkandidat für Positionen, Größen, Gruppen und visuelle Kanten. Inhalte und fachliche Beziehungen bleiben in Markdown/YAML. Fachliche Kanten daraus ableiten und über dieselben Modelloperationen ändern; rein visuelle Kanten nur im Layout speichern. JSON Canvas definiert keine YAML-Semantik; Zuordnung separat spezifizieren. Medien relativ referenzieren; externe Inhalte nicht automatisch laden.

Abnahme: Layoutdatei entfernen beeinträchtigt keine Notiz; bestehende Notizen ohne Migration verwenden; fachliche Beziehung textuell/grafisch konsistent. Grenze: kein Board im ersten MVP und keine Hintergrund-Graphberechnung.

## Portable Windows-Version und öffentliche Software

UI/Fachmodell wiederverwenden, nativen Dateiadapter ergänzen. Tauri/WebView2 als Kandidat; Electron als Alternative mit mitgelieferter Browserlaufzeit und entsprechendem Paketaufwand. Portable Nutzung separat beweisen: vorhandenes WebView2 oder mitgelieferte feste Runtime, Richtlinien, Schreiborte und Updates. Kleine EXE bedeutet nicht automatisch kleinen Gesamtbedarf. Keine Desktoplaufzeit beschlossen.

Vor öffentlichem Vertrieb: Formatversionierung, Lizenzinventar, sichere Vorschau ohne aktive Skripte, begrenzte native Rechte, Pfadprüfung, nachvollziehbare Releases, Wiederherstellungstests und rücknehmbare Migrationen. PWA-Updates erst bei gesicherten Entwürfen aktivieren. Kein Konto-/Telemetriezwang. Veröffentlichung separat freigeben.

Abnahme: Desktopprobe verwendet denselben Test-Vault ohne Konvertierung; Releaseprüfung dokumentiert Lizenzen und Datenflüsse. Grenze: kein Packaging/Publishing in Phase 0.

## Vorgeschlagene Agentenrollen

Lead koordiniert und integriert. Storage prüft Berechtigungen/Schreibkonflikte; Developer vergleicht Editor und Modulgrenzen; QA definiert unabhängige Sicherheits-/Performancefälle; Docs pflegt bei Bedarf kurze Entscheidungen und Anleitungen. Vorhandene Rollenbriefe sind keine registrierten Agenten.

Nur klar begrenzte unabhängige Aufgaben delegieren, ein Verantwortlicher pro Zieldokument. Bei Delegation schreibt jeder Agent seinen Bericht nach `./_Communication_Pipeline/`; Lead integriert. Keine permanente Agentenorganisation. Für diese Planung wurden keine Subagenten gestartet oder Konfigurationen verändert.

Abnahme: eindeutiger Auftrag, Ergebnis und Dokumentverantwortung. Grenze: Runtime-Konfiguration erst nach Review.

## Quellen und Zielkonflikte

Primärquellen geprüft am 2026-11-02; kein Ersatz für Tests auf dem tatsächlichen Edge-Gerät:

- [File System Access: Handles, Berechtigungen und Schreiben](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
- [Microsoft: PWA-Speicher und mögliche Löschung](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/offline)
- [CodeMirror: modulares Editorsystem und Bundling](https://codemirror.net/docs/guide/)
- [JSON Canvas 1.0](https://jsoncanvas.org/spec/1.0/)
- [Tauri: Windows-Verteilung und WebView2](https://v2.tauri.app/distribute/windows-installer/)

README ergänzt REQUIREMENTS um das spätere Board; kein Produktwiderspruch. Offene Zielkonflikte: beliebige Ordner gegenüber Browserrestriktionen; serverloser Betrieb gegenüber Erstbereitstellung; absoluter Überschreibungsschutz gegenüber externen Schreibrennen. Frühere Statusformulierung „Projektsetup“ ist keine Installationsfreigabe. Bestehende Entscheidungen werden nicht überschrieben.

# Developer — Alpha / Datei öffnen-anlegen, 2026-11-08

Rollenrevision **M32A-2026-11-03** geladen. Ausschließlich delegiertes Alpha-/C-c-f-Paket umgesetzt; Storageadapter unverändert verwendet. Nutzerseitige Agenda-Fixture/Emacs-Lockfiles, persönliche Vaults und fremde Änderungen nicht bearbeitet. Keine Dependencies, Subagenten, Commit/Push/Deploy oder Änderungen am vorhandenen Session-/Backup-/Konfliktmodell.

## Module und Verhalten

- Neu `editor/file-picker.mjs`, `editor/file-picker.test.mjs`: kompakter themekonformer Dialog mit bestehender Panelhülle und lokaler Kandidaten-Scrollhilfe. Vault-relative Eingabe, lesende Zielprüfung und sichtbares „Öffnen“/„Neue Datei anlegen“, Tab-Vervollständigung, Mehrdeutigkeitskandidaten mit Pfeilen/Enter oder Klick. Kandidatenwahl ändert nur den Pfad; explizites Ausführen öffnet/legt an. Noch laufende Prüfung führt nicht blind aus. Escape/Strg+G bricht vor der nichtabbrechbaren Phase ab.
- Appintegration verwendet `inspectVaultPath`/`completeVaultPath`/`executeVaultFile` aus dem vom Storage-Spezialisten besessenen Modul. Bestehende `run`-/Busy-/Permission-/Persistenz-/Sessionpfade bleiben erhalten. Dirty-Editor vor Anlage/Wechsel verweigert, keine automatische Speicherung. Eigene Busy-Rekonfiguration behält die Dokumentidentität und invalidiert nicht versehentlich die Anfrage.
- Nichtabbrechbare Anlage+Sessionöffnung sperrt Input, Close und weitere Aktionen mit Wartehinweis; Fehler geben frei. Bei Openfehler nach möglicher Dateianlage bleibt Pfad-/Nichtlöschen-Hinweis sichtbar, die lesende Preview wird erneuert und zeigt danach die tatsächlich vorhandene Datei als „Öffnen“. Dateiauswahl, Dokumentanzeige und M7a-Index werden über die existierenden Pfade aktualisiert, auch für eine nach Anlage nicht geöffnete Quelle. Kein zweiter Index.
- `file.find` / **Datei öffnen/anlegen** / Datei, Registry nun84. `C-c f` nach Loslassen von C/Strg, C-x bleibt Ausschneiden. Leerer Vault per Maus/Alt+X zugänglich; fokussierter leerer Readonly-Editor kann mit selektivem `canFindFile`-Kontext die vorhandene Präfixhilfe öffnen. Dafür ist leere Contentfläche explizit fokussierbar; bestehende schreibgeschützte Dokumente bleiben vom Präfixgate ausgeschlossen.
- Modalgrenze erweitert: während Dateidialog aktiv keine mutierenden Editor-/Datei-/Agendabefehle über Registry und keine globale Alt+X-Palette. Editor- oder Vaultänderung invalidiert vor irreversibler Aktion die Anfrage. Neuer Dialog verwendet ausschließlich DOM-Textausgabe.
- Alpha-Kennzeichnung, kurzer Pilotnutzungshinweis und bestehende Checkbox auf separaten Alpha-Vault/ein Editor/eigenes Backup umgestellt. Historische `synthetic`-ID/Contextproperty bleibt zur begrenzten Integration erhalten und ist als Alpha-Bestätigung kommentiert. Kleiner sichtbarer Knopf „Datei … (C-c f)“ mit Tooltip; bestehende Präfixhilfe ergänzt. Falscher alter Hinweis „Strg+C bleibt normales Kopieren“ im Editor berichtigt.

Geändert: `editor/app.mjs`, `commands.mjs`/`.test.mjs`, `emacs-policy.mjs`, `prefix-router.mjs`/`.test.mjs`, `work-panel.mjs`, `index.html`, `styles.css`. Keine Command-Surfaces-Moduländerung nötig, dessen vorhandener `blocked`-Callback wird auch für den Dateidialog genutzt. Bestehender Commandname `workspace.choose` lautet jetzt „Vault wählen / wechseln“; Lead pflegt Gamebook.

## Prüfung

**324/324 Tests**, `npm run build`, sieben Syntaxchecks (File-Picker samt Test, App, Commands, Prefixrouter, Emacs-Policy, Work-Panel) und `git diff --check` grün. Log `test-vault/alpha-developer-tests.log`.

Sieben neue UI-/Integrationsgruppen mit tatsächlichem App-Ausführungscallback und bestehender `run`-Funktion sowie echter Session/Index und synthetischen Handles: Empty-Vault-/leere Anlage, kanonischer gleichnamiger Unterordnerpfad/Byteerhalt, Tab/Mehrdeutigkeit/Keyboard-/Mauskandidaten ohne implizite Ausführung, Dirty-/Permission-/Pfadfehler, Abbruch während Rechteprüfung und überholte Anfragen/Vaultwechsel, gesperrte verzögerte Anlage mit nachfolgendem Readfehler/Preview-/Indexaktualisierung, selektiver Empty-Readonly-Präfix und Registry-/AltX-Isolation. Bestehende Präfix-Kontextassertion für den nun ebenso kontextunabhängigen Datei-Einstieg aktualisiert; Dokumentbefehle bleiben gesperrt.

## Grenzen

Modelltests sind kein nativer Edge-/Dialog-/Tastenzustell-/Zoom-/AltGr-/IME-Nachweis. Kein Langzeit-/Leakbeweis. Bestehendes externes Schreibfenster bleibt. First scope: nur bestehende sichtbare Unterordner, Markdown, keine Ordneranlage; Storage-Limits und mögliche externe Raceanlage bleiben ausdrücklich erhalten. Neue leere Datei ist kein exklusiv garantierter Create-Erfolg und wird bei nachfolgendem Fehler nicht gelöscht. Private Alpha-Vaults werden allein vom Nutzer gewählt; die Tests bleiben synthetisch.

Stabil für unabhängige QA. Keine weiteren Edits bis konkretem Befund.

Nachnotiz nach QA: Einziger Textrest in `workspace.scan` auf „Markdown-Dateien im gewählten Vault suchen.“ korrigiert, keine Logik geändert. Zugehörige Commandtests **7/7**, Build, Commands-Syntax und Diffcheck erneut grün; keine erneute breite Suite erforderlich.

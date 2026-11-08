# Storage — Alpha-Dateiadapter, 2026-11-08

Rollenrevision **ALPHA-FILES-2026-11-08** tatsächlich in Runtime, `.codex/agents/storage.toml` und `agents/storage.md` bestätigt. Ausschließlich neue `editor/vault-files.mjs` und `editor/vault-files.test.mjs` umgesetzt. Bestehende Session-/Storage-/Backup-/Konfliktmodule und nutzerseitig bearbeitete Fixtures unverändert; keine Dependencies, Subagenten, Commit/Push oder private Vaults.

## API

- `normalizeVaultFilePath(input)` validiert relativen Dateipfad, normalisiert Backslash zu `/`, ergänzt `.md` ohne vorhandene Endung; andere Endungen verweigert.
- `inspectVaultPath(vault,input,{current})` liest ausschließlich Handles und liefert `{kind:'file'|'missing'|'directory',path,handle?}`. Leerer Eingabepfad bezeichnet Root. Bestehende Ordner bleiben Ordner; keine automatische Anlage. Reale `handle.name`-Werte erhalten kanonische Groß-/Kleinschreibung einschließlich Unterordnern.
- `completeVaultPath(vault,input,{current,yieldTask,maxEntries=5000})` liest nur das adressierte Verzeichnis; `{value,candidates:[{kind,path}],incomplete,scannedEntries,message}`. Ein Treffer vervollständigt vollständig, mehrere nur zum gemeinsamen Unicode-Codepoint-sicheren Präfix. Limit meldet ausdrücklich unvollständige Kandidatenliste und verändert den Eingabetext nicht. Alle 50 gescannten Einträge Yield, auch bei nicht passenden/ignorierten Einträgen. Keine Hintergrundüberwachung.
- `executeVaultFile(vault,input,{current,onCommit,open})` prüft zuerst lesend. Nur `NotFoundError` einer finalen Datei führt zu `getFileHandle(name,{create:true})`; Fehler anderer Klassen und fehlende Elternordner verweigern die Ausführung. Kein Writable/Truncate/Delete. `onCommit(true/false)` umfasst nichtabbrechbare Anlage und `await open({vault,handle,path,creationRequested})` mit `finally`-Freigabe.

Abbruch vor irreversibler Aktion liefert `null`. Überholte Ergebnisse nach möglicher Anlage liefern `{stale:true,creationRequested:true,path,opened:false,message}`, ohne Quellsprung. Bei Openfehler nach Anlage tragen Fehler `path`/`creationRequested` und den Hinweis, dass die Datei bereits vorhanden oder neu leer angelegt sein kann; niemals automatische Löschung. Nach erfolgreichem `open` beschreibt `opened:true` das tatsächliche Öffnen; `stale` zeigt gegebenenfalls inzwischen überholten UI-Kontext. Caller definiert `current` über Anfrage-/Vaultgeneration und schützt Dirty-/Permissions-/Sessionzustand; nach bewusstem Öffnen nicht allein auf alte EditorState-Identität prüfen.

## Grenzen und Nachweise

Keine atomare Exklusivanlage behauptet: ein externer Ersteller kann zwischen Probe und Create gewinnen. Dessen Datei wird unverändert als bestehender Handle geöffnet. `creationRequested` ist deshalb keine Zusage, dass diese Instanz die Datei neu angelegt hat. Bestehendes externes Schreibfenster beim späteren normalen Speichern bleibt unverändert.

Windows-reservierte/ungültige Namen, absolute Pfade, `.`/`..`, leere Zwischenkomponenten, Kontrollzeichen, isolierte Surrogate und Verwaltungsnamen gesperrt. Pfadlimit1024 Zeichen, Komponentenlimit255. Versteckte Unterordner sind in diesem ersten Paket vollständig ausgeschlossen, zusätzlich `node_modules`; versteckte gültige Markdown-Dateinamen selbst sind grundsätzlich möglich, Emacs-Lockpräfix `.#` gesperrt. Keine neuen Ordner und keine Zugriffe außerhalb übergebener Vault-Handles. Keine Permissions selbst anfordern.

**9/9 gezielte Node-Testgruppen**, zwei Syntaxchecks und `git diff --check` grün. Unter anderem kanonische .md-/Noextension-Pfade, Ordner/Root, bestehende Originalbytes, leere Anlage, externe Race-Anlage mit bestehenden nichtleeren Bytes, denied-vs-notfound, Abbruch vor/nach Anlage, Fehlerfreigabe/Dateihinweis, Completionlimits/-Readfehler/-Yield und Emoji-Präfixe. Ausschließlich synthetische Handles; kein nativer Browser-/Filesystem-/Langzeitbeweis. Vollsuite/Build und unabhängige QA folgen nach Developerintegration.

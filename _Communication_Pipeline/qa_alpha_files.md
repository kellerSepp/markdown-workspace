# QA — Alpha / C-c f, 2026-11-08

Rollenrevision **M32A-2026-11-03** geladen. Unabhängige Prüfung ausschließlich mit synthetischen Daten/Handles in `test-vault/qa-alpha-files.mjs`. Keine Anwendungscodeänderung, keine privaten Vaults, Installation, Computer-Use-Aktion, Veröffentlichung oder Git-Schreibaktion. Nutzeränderungen an Agenda-Fixture und Emacs-Lockfiles unangetastet.

## Ergebnis

**324/324 Tests**, Build, **neun Syntaxchecks** und `git diff --check` grün. Eigene **13 Prüfgruppen** bestanden, `findings: []`. Kein belegter verbleibender Implementierungsblocker im geprüften Umfang. Native Browser-/Permission-/Zoom-/AltGr-/IME-/Langzeitnachweise bleiben offen.

## Eigene Prüfungen

- Vault-relative Pfade, Unicode/Leerzeichen/.MD, echte kanonische Namen, fehlende Endung; absolute Pfade, Traversal, Windowsnamen, interne/versteckte Ordner und Fremdformate verweigert.
- Ordner-/Dateivervollständigung mit Mehrdeutigkeit, Emoji-Codepoints und sichtbarer unvollständiger Liste nach 5000 Einträgen. Auch bei nicht passenden Nicht-Markdown-Dateien regelmäßig kooperative Unterbrechung; keine automatische Vervollständigung aus unvollständiger Liste.
- Nur tatsächliches NotFound kann Dateianlage auslösen. NotAllowed/Security/TypeMismatch/Unknown-Lesefehler erzeugen keine neue Datei. Keine automatische Ordneranlage.
- Bestehende BOM-/CRLF-Bytes bleiben beim Öffnen unverändert. Synthetische Handles verweigern writable/truncate/delete. Extern konkurrierend entstandene Datei bleibt bytegleich; Ergebnis nennt `creationRequested`, behauptet keine exklusive Neuerstellung.
- Tatsächliche Appcallbacks für Picker, `executeFilePath`, `run`, `setBusy` und Selecthelper ausgeführt, mit echter `createSession`, echtem Index und EditorState. Leerer Vault startet ohne Dokument, neue Datei ist leer, Session-/Editor-/Selectpfad und Index-Dateizahl stimmen; nach Modalclose wird der Editor fokussiert.
- Dirty-Text, Auswahl und Undo-Tiefe über Verweigerung/Schließen erhalten. Permission- und künstlicher Draftpersistenzfehler erzeugen keine Datei, ursprüngliche Session bleibt erhalten, Busy/Readonly werden aufgehoben.
- C-g während ausstehender Rechteprüfung verhindert späteres Anlegen/Öffnen. Veraltete Eingabe-/Completion-/Doc-/Vaultresultate überschreiben weder neuere Pfadangabe noch Quelle. Stale-Ergebnis nach bereits gestarteter Creation nennt die möglicherweise vorhandene leere Datei, öffnet sie nicht und löscht nichts.
- Nicht abbrechbare Create-/Openphase sperrt Escape, C-g, natives cancel und Close. Erfolgs- und neuer-Datei-Lesefehlerpfade entsperren wieder. Nach Fehler bleibt ursprüngliche Datei geladen, die mögliche leere Datei erhalten, Pfad/Fehler/Löschungsverzicht sichtbar und Zielvorschau aktualisiert auf „Öffnen“; Index wird ebenfalls aktualisiert.
- Echter Prefixrouter/Registry: C-c f erst nach C-keyup und ohne Ctrl, aus fokussiertem leerem readonly Editor verfügbar, andere Dokumentbefehle bleiben gesperrt. C-x-Ausschneiden unverändert. Modalgrenzen sperren mutierende Registry-Befehle/Agendawechsel/Alt+X-Palette.
- Alpha-Kennzeichnung, sichtbarer C-c-f-Knopf und Tooltip sowie neutrale Pilot-Checkbox im HTML geprüft. App/Build importieren keine privaten oder synthetischen Vaultinhalte ins Produktbundle; Pages-Artefaktpfad bleibt `dist`.
- `git status`/`git diff` bestätigen im geprüften Stand keine Änderungen an `spike/storage.mjs`, `editor/storage-session.mjs`, Build-/Pages-Skripten und Paketdateien.

## Kurze Ressourcenprobe und Grenzen

Node-/DOM-Modell: 40 Öffnen-/Pfadprüfen-/Escape-Zyklen mit kooperativem `setImmediate`, ungefähr **102,7 ms** einschließlich **100 ms Idle**. Keine Dateianlage oder Sourceänderung, im kurzen Idle keine selbsttätige Dialogmutation, nach Destroy Dialog entfernt. Keine Browserlatenz, Perzentile, Heapobergrenze, Memory-Leak-Freiheit oder mehrstündige Stabilität daraus ableiten. Mehrstündige Last/Idle und Browserheapentwicklung wurden nicht ausgeführt.

Die DOM-/FS-Adapter sind Modelle; Fokus/Inertness und echte Dateirechte müssen durch die dokumentierte Edge-Handprobe bestätigt werden. Der private Alpha-Betrieb ist eine PO-Freigabe unter Single-Editor-Annahme, keine neue technische Garantie gegen externe Schreibrennen. Bestehender Storage-Core wurde dafür nicht verändert.

Kleiner Formulierungshinweis an Lead: `workspace.scan` beschrieb im geprüften Stand noch „gewählten Test-Vault“, während übrige Produkttexte auf Alpha umgestellt sind. Lead hat den reinen Einzeilen-Textnachtrag an Developer delegiert; er ändert keine Logik. Kein Funktionsblocker; QA hat diesen Anwendungstext nicht geändert. Keine weitere breite Wiederholung der grünen Tests allein für diesen Textnachtrag erforderlich.

## Pflichtchecks

`npm test`, `npm run build`, `node test-vault/qa-alpha-files.mjs`, `git diff --check`. `node --check` für `vault-files.mjs`/Test, `file-picker.mjs`/Test, App, Commands, Prefixrouter/Test und eigene QA-Probe: alle grün. Git-Zeilenendhinweise sind keine Diffcheckfehler. Keine Tests/Builds aufgrund einer npm-Updatebenachrichtigung installiert oder aktualisiert.

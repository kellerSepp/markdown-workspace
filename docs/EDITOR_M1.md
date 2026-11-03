# Phase 2 M1: experimenteller Markdown-Editor

Nur synthetische Dateien unter `test-vault/`. Keine persönlichen, produktiven oder synchronisierten Vaults auswählen. Das externe Schreibrennen bleibt akzeptiertes Restrisiko dieses Experiments; Prüfung und Schreiben sind keine gemeinsame Transaktion gegenüber anderen Programmen.

## Lokaler Start

Im Repository mit vorhandener Node-/npm-Laufzeit:

```powershell
npm ci
npm start
```

`npm start` baut den Editor und startet **http://127.0.0.1:8766**. Diese Adresse in Edge öffnen. Der temporäre Server liefert nur gebaute Anwendungsdateien, keine Vault-Inhalte. Mit Strg+C beenden. `npm run build` baut separat, `npm test` führt die automatisierten Tests aus. Keine Veröffentlichung, PWA oder Cloud-Anbindung.

Direkte Abhängigkeiten: `@codemirror/commands` 6.11.1, `@codemirror/lang-markdown` 6.5.2, `@codemirror/language` 6.13.1, `@codemirror/state` 6.7.6, `@codemirror/view` 6.43.15; Buildwerkzeug `esbuild` 0.28.2. Transitive Abhängigkeiten sind im Lockfile festgehalten, keine Laufzeit-CDNs.

## Ausprobieren und manuelle Abnahme

1. Synthetischen Test-Vault auswählen, etwa `test-vault/vault-a`; Markdown-Datei auswählen und öffnen.
2. Ohne Änderung speichern: kein Zielschreibstream und keine neue Sicherung. Für unabhängigen Bytevergleich vor/nachher `Get-FileHash` auf der synthetischen Datei verwenden.
3. Markdown und unbekanntes YAML als Rohtext bearbeiten, Umlaute/AltGr-Zeichen eingeben. Explizit speichern; anschließend extern öffnen und Inhalt vergleichen. Sicherungen liegen unter `.storage-spike-backups` im gewählten Vault. Neue Sicherungen haben eine JSON-Zuordnung zum Originalpfad. Keine automatische Löschung.
4. Bei geöffnetem Entwurf dieselbe synthetische Datei extern ändern. Speichern muss verweigert werden; externe Fassung und Editorentwurf bleiben erhalten. Keine automatische Zusammenführung. Entwürfe über die Oberfläche auflisten und wieder öffnen.
5. Reload, Browserneustart und Rechteentzug einzeln prüfen. Dieselbe Loopback-Adresse verwenden: Origin-Wechsel trennt Browserdaten. Browserentwürfe hängen von IndexedDB ab und ersetzen keine unabhängige Sicherung.
6. Tastatur und Maus prüfen: Öffnen/Speichern/Entwürfe erreichbar; normales `gj`, `ga`, Umlaute, `@`, `{}`, `[]` löst keine Navigation aus. Konkrete Tastaturprüfung auf deutschem QWERTZ bleibt erforderlich.

## Grenzen und nächste Freigabe

Automatischer Abschlussstand: 24 Tests bestanden, einschließlich aller 11 bisherigen Storage-Tests; Build und Syntaxprüfungen erfolgreich. Unabhängige QA bestätigte außerdem 37 EOL-Grenzfälle im Speicher, die Undo-Zustandsgrenze und HTTP-Zugriffssperren auf Vault-/Repositorydateien. Keine interaktive Edge-Abnahme durchgeführt.

Kein Autosave in die Originaldatei, keine Markdown-/YAML-Umformatierung und keine strukturierte Metadatenbearbeitung. Nur gültiges UTF-8; BOM und unberührte Zeilenenden werden erhalten, neue Zeilen verwenden einen abgeleiteten Stil. Keine Zusage zum Erhalt von OS-Dateimetadaten. Schreibfehler und erkannte Konflikte dürfen keinen Erfolg melden.

Browserrechte, vollständige Wiederherstellung, tatsächliche QWERTZ-Bedienung, 30-Minuten-Idle, Stundenbetrieb und vorläufige Performancebudgets benötigen eigene praktische Nachweise. Automatisierte Tests simulieren Dateihandles und ersetzen diese Nachweise nicht. Weitere Editorfunktionen und produktive Nutzung sind nicht freigegeben.

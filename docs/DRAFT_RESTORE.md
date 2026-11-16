# Browserentwurf als Dateistand übernehmen

Nach Strg+F5 unter **Browser-Entwürfe wiederaufnehmen**:

1. Entwürfe auflisten, gewünschten Eintrag auswählen und **Entwurf laden** drücken.
2. Dateipfad und Text im Editor prüfen. Weitere Bearbeitungen im geladenen Entwurf werden ebenfalls übernommen.
3. **Entwurf als Dateistand übernehmen …** drücken (auch über Alt+X verfügbar).
4. Bestätigung nennt Vault/Dateipfad und vollständiges Ersetzen. Abbrechen erhält Datei und Entwurf.
5. Nach Erfolg zeigt der Status die Sicherung des bisherigen Dateistands. Der übernommene Inhalt ist die neue Ladefassung; normales Bearbeiten/Speichern funktioniert wieder.

Der Button verwendet den geladenen Entwurf, nicht eine später veränderte Dropdownauswahl. Er ist nur nach Wiederherstellung verfügbar, nicht nach gewöhnlichem Dateiöffnen oder erfolgreichem Speichern. Kein neuer Shortcut.

## Verhalten und Grenzen

Entwurf zuerst im Browserspeicher sichern, Rechte prüfen, vorhandenen Web Lock erwerben und aktuellen Dateistand lesen. Nach Bestätigung vorhandenen `replace`-Pfad mit diesem Stand als geprüfter Erwartung verwenden: erneuter Bytevergleich, dauerhafte bytegeprüfte Sicherung mit Metadaten, erneuter Vergleich, Schreiben, Readback. Bei bytegleicher Datei kein Schreiben und keine zusätzliche Sicherung. Fehler bestätigen keinen Erfolg; Entwurf und bisherige Ladebasis werden bei fehlgeschlagener Dateischreibung nicht umgestellt. Browserentwürfe werden nicht gelöscht. Quelle und Bearbeitungen während des Vorgangs gesperrt.

Das bekannte Restfenster zwischen letzter Dateiprüfung und tatsächlichem Schreiben bleibt bestehen; kein atomarer Schutz gegen externe Programme behauptet. Keine automatische Zusammenführung oder Bereinigung alter Entwürfe. Vergleich/Export aus dem früheren Vorschlag sind zurückgestellt.

## Synthetische Handprobe

Nur Agenten/QA: eigene synthetische Markdown-Datei verwenden, keine persönlichen Vaults öffnen.

1. Datei mit `Original` öffnen, Text zu `Entwurf` ändern, Browserentwurf auflisten.
2. Datei außerhalb der App zu `Neuer Dateistand` ändern. Gewählten Entwurf wieder laden. Normales Speichern muss Konflikt melden.
3. Übernahme starten, Zielpfad prüfen, abbrechen: Datei weiterhin `Neuer Dateistand`, Editor weiterhin `Entwurf`.
4. Erneut starten und bestätigen: Datei jetzt `Entwurf`; gemeldete `.bak` enthält `Neuer Dateistand`, zugehörige JSON-Metadaten richtigen Pfad.
5. Weiter bearbeiten und normal speichern. Nach erneutem Dateiöffnen ist Entwurfsübernahme nicht verfügbar.

Automatisiert geprüft: Erfolg mit BOM/CRLF und korrekter Sicherung, neue Ladebasis/Folgesave, erhaltener Browserentwurf, Abbruch, Änderung während Bestätigung/Sicherung, Quota-/Rechte-/Backup-/Write-/Readbackfehler, Busy-Sperren, fehlende Web Locks, bytegleicher Inhalt, Registry-Kontext und tatsächlicher Appcallback einschließlich Bestätigung und Indexupdate. Native Browserprobe bleibt PO-Aufgabe.

# Firefox-Unterstützung — spätere Option

Stand: 2026-11-10. PO möchte die Firefox-Add-on-Idee für später festhalten. Kein aktueller Umsetzungsauftrag oder Beschluss über einen konkreten Anbieter.

Motivation: PO beobachtet geringeren Speicherverbrauch von Firefox und möchte den Markdown-Workspace auch dort verwenden. Tatsächlichen Vorteil mit gleichem synthetischem Vault messen.

Aktuelle Hürde: Der Workspace verwendet `showDirectoryPicker`, Dateihandles, Berechtigungen und Schreibstreams. Firefox bietet die native Ordnerauswahl laut [MDN-Kompatibilitätsdaten](https://github.com/mdn/browser-compat-data/blob/main/api/Window.json) derzeit nicht an.

Spätere Untersuchung: Firefox-Add-on mit lokalem Hilfsprogramm als Brücke zum Dateisystem. Es gibt einen bestehenden [File-System-Access-Ansatz](https://addons.mozilla.org/en-US/firefox/addon/file-system-access/), dessen Beschreibung ein zusätzliches Hilfsprogramm und Einschränkungen bei geklonten/gespeicherten Handles nennt. Nur Recherchehinweis, keine geprüfte Kompatibilität oder Installationsentscheidung.

Vor einem Vorschlag prüfen: Rechte und Vaultbegrenzung, Unterstützung unserer tatsächlichen Handleoperationen/IndexedDB, Byteerhalt, Backup-/Konfliktverhalten, Fehler-/Abbruchfälle, Installation und Wartung sowie realer RAM-Gewinn. Alternative: eigener kleiner lokaler Dateidienst mit Firefox-Oberfläche. Kein freier Schreibzugriff oder Ersatz der bestehenden Speichersicherheit vorausgesetzt.

Nächster Schritt nur nach gesondertem Auftrag: begrenzte Machbarkeitsprobe mit synthetischen Dateien. Jetzt weder Add-on installieren noch Storage umbauen.

# Privater Alpha-Pilotbetrieb

Freigabe des PO: 2026-11-08. Die Anwendung darf vom Nutzer mit einem bewusst gewählten separaten privaten Vault praktisch erprobt werden. Entwickleragenten und QA öffnen weiterhin keine persönlichen Vaults; sämtliche Tests verwenden synthetische Daten.

## Praktischer Einstieg

1. Edge auf der bisherigen HTTPS-Pages-Adresse beziehungsweise lokal starten. Einen separaten Vault außerhalb des öffentlichen Git-Repositories verwenden. Lokale Notizen gehören nicht in Repository, Commit oder Pages-Artefakt.
2. Vor Beginn ein unabhängiges Backup des Vaults anlegen. Die Alpha-Seite kennzeichnet die Voraussetzungen: nur ein Editor pro Vault, kein gleichzeitiges Bearbeiten durch weitere Tabs/Apps, eigenes Backup.
3. Gewünschten Vault ausdrücklich wählen und Browserfreigabe beachten. Geänderte Texte werden erst durch Speichern/Strg+S in Markdown-Dateien geschrieben. Browser-Entwürfe sind eine zusätzliche Hilfe, kein unabhängiges Backup.
4. `C-c f`: Strg+C, C und Strg loslassen, dann f. Kleine Pfadeingabe beziehungsweise Mausknopf „Datei öffnen/anlegen“. Tab vervollständigt, Enter führt aus, Escape/Strg+G bricht vor Ausführung ab. Pfad relativ zum Vault, beispielsweise `team/notiz.md`; Ordner muss bereits bestehen. Fehlende Endung wird als .md ergänzt. Vor Ausführung ist „Öffnen“/„Neue Datei anlegen“ sichtbar.
5. Vor Dateiwechsel ungespeicherte aktuelle Arbeit ausdrücklich speichern. Nach erfolgreichem Öffnen/Anlegen stimmen Editor, Dateiauswahl und Indexquelle überein. Die Anlage erzeugt zunächst nur eine leere Datei; Inhalte anschließend normal speichern.

## Bekannte Grenzen

- Eine externe Änderung zwischen letzter Konfliktprüfung und Schreiben kann weiterhin überschrieben werden. Kein atomarer Compare-and-Swap; Single-Editor-Betrieb reduziert das Risiko, beseitigt es aber nicht als technische Garantie. Keine parallele externe Bearbeitung oder Synchronisation während der Arbeit.
- `.storage-spike-backups` im Vault schützt nicht unabhängig vor Verlust des Datenträgers/Vaults. Sicherungen werden nicht automatisch gelöscht. Browserdaten können gelöscht oder unzugänglich werden.
- Seiten-Origin, Browserprofil und Ordnerfreigaben bestimmen den Zugriff auf bestehende Browser-Entwürfe. Wechsel zwischen localhost und Pages übernimmt diese Daten/Freigaben nicht automatisch.
- Bestehende native Langzeit-/Idle-/Recovery-/Permissionnachweise sind unvollständig. Bei Problemen Arbeit sichern und eine reproduzierbare Beschreibung mit synthetischen Beispielen liefern; keine privaten Inhalte zur Fehlerprüfung veröffentlichen.
- Externe Dateiveränderungen und neue Dateien gegebenenfalls explizit neu einlesen. Agenda zeigt gespeicherte Quellen, keine ungespeicherten Editoränderungen.
- Die bisherige rekursive Dateiauswahl hat weiterhin Schutzgrenzen von 1000 Markdown-Dateien, 3000 Verzeichniseinträgen und zehn Unterordnerebenen. Der M7a-Index hat diese Dateilistenlimits nicht. Pfadvervollständigung liest jeweils den eingegebenen Ordner und meldet eine unvollständige Liste bei mehr als 5000 Einträgen; daraus wird keine sichere Nichtexistenz abgeleitet. Die neue Dateifunktion sperrt interne sowie versteckte Unterordner und öffnet nur Markdown-Dateien in bereits bestehenden Ordnern.
- Kein garantierter Offline-Neustart/PWA. HTTPS-Pages-Betrieb dient als statischer Anwendungsstart; die lokale Dateifreigabe erfolgt weiterhin im Browser.

Die vorhandene `.github/workflows/pages.yml` baut und veröffentlicht `dist`. Dieser Auftrag verändert weder Remote noch Deployment: Commit/Push/Veröffentlichung übernimmt weiterhin der PO. Änderungen sind erst nach dessen üblichem Pages-Build online sichtbar.

## Implementierung und Prüfstand

Neue Module: `editor/vault-files.mjs` für Pfadauflösung/Completion/leere Anlage und `editor/file-picker.mjs` für Dialog/Anfragestatus, jeweils mit Tests. Integration in App, Registry, Präfixrouter/-policy, Panelhinweis, HTML und CSS. Bestehende Session-/Storage-/Backup-/Konfliktmodule, Paketdateien und Pages-Build bleiben unverändert.

Storage **9/9** gezielte Tests; Developer und unabhängige QA jeweils **324/324 Tests**, Build, sieben/neun Syntaxchecks und Diffcheck grün. QA zusätzlich **13 unabhängige Prüfgruppen** mit tatsächlichen Appcallbacks, echter Session/Index und synthetischen FS-/DOM-Modellen. Kein belegter verbleibender Blocker im geprüften Umfang. Ein abschließender reiner Beschreibungstext-Nachtrag wurde mit Commandtests7/7, Build/Syntax/Diffcheck geprüft. Berichte: [Storage](../_Communication_Pipeline/storage_alpha_files.md), [Developer](../_Communication_Pipeline/developer_alpha_files.md), [QA](../_Communication_Pipeline/qa_alpha_files.md).

Geprüft: keine Leerüberschreibung vorhandener Bytes, Creation-Races, Stale-/Abbruch-/Dirty-/Permission-/Persistenzfehler, fehlgeschlagenes Öffnen nach möglicher Anlage, Datei-/Index-/Selectkonsistenz, Empty-Vault-/Readonly-Präfix und Modalgrenzen. Die vorhandenen Schutzmechanismen wurden für Alpha nicht abgeschwächt. Native Edge-/Dateirechte-/Fokus-/Zoom-/AltGr-/IME- sowie mehrstündige Ressourcenbelege sind weiterhin offen. Eine kurze 40-Zyklen-/100-ms-Idle-Modellprobe ist kein Langzeitnachweis.

## Synthetische Abnahme in Edge

Nur `test-vault/alpha-acceptance` beziehungsweise eine Kopie davon als Probevault verwenden. Die vier Ausgangsdateien sind synthetisch und liegen in Wurzel/Unterordner. Eventuell erzeugte Testdateien nicht versehentlich als private Daten betrachten oder mit dem eigentlichen Alpha-Vault verwechseln.

1. Neu laden und den sichtbaren Alpha-Hinweis prüfen. Die Checkbox beschreibt Pilotbedingungen statt einer falschen Behauptung, ausschließlich synthetische Daten zu verwenden. Für diese Probe dennoch nur den synthetischen Ordner wählen. Der Knopf „Datei öffnen/anlegen“ beziehungsweise sein Kurztext zeigt C-c f; Tooltip erklärt das Loslassen der Tasten.
2. `start.md` öffnen. C-c f: Strg+C, alle Tasten loslassen, f. `team/not` eingeben und Tab: `notiz.md` und `notizen.md` bleiben als unterscheidbare Kandidaten erkennbar. Kein willkürliches Öffnen; gemeinsamen Präfix ergänzen oder gezielt auswählen. Vor Enter bleibt die aktuelle Datei unverändert.
3. `team/notiz.md` wählen und öffnen. Editor und Dateiauswahl zeigen genau diesen relativen Pfad. Die Datei darf durch bloßes Öffnen nicht geändert werden. Dasselbe mit `team/ä notiz.md` für Leerzeichen/Umlaut prüfen.
4. Dateieinstieg erneut öffnen, `team/neu` eingeben. Vor Ausführung muss das Ziel `team/neu.md` als Neuanlage erkennbar sein. Enter erzeugt eine leere Datei und öffnet sie; Dateiauswahl folgt. Danach `# TODO Neu angelegt` tippen und explizit speichern. Agenda-TODO-Liste nach Indexaktualisierung enthält die Aufgabe.
5. Dieselbe Datei nochmals über den Pfad öffnen: vorhandener Text bleibt erhalten, keine zweite Datei oder Leerüberschreibung. Anschließend `team/abbruch` eingeben und Escape/Strg+G: keine Datei `abbruch.md` entstanden.
6. `../ausserhalb.md`, einen absoluten Pfad und `.storage-spike-backups/neu.md` probieren: verständliche Verweigerung. `fehlt/neu.md` legt keinen Unterordner an. Ein vorhandener Dateiname mit anderer Endung wird nicht in eine Fremdformatbearbeitung umgedeutet.
7. In einer bestehenden Datei ungespeichert Text ergänzen und eine neue andere Datei anfordern: Ausführung muss mit Speicherhinweis gesperrt bleiben, Text/Auswahl/Undo und Datei erhalten, keine versehentliche Neuanlage. Erst nach eigenem Speichern normal ausführen.
8. Einen separaten leeren synthetischen Ordner wählen. Ohne geöffnete Datei muss der Mausknopf beziehungsweise Alt+X → „Datei öffnen/anlegen“ verfügbar sein; `erste` erzeugt nach Ausführung `erste.md`. Aus fokussiertem leeren Editor C-c f ebenfalls prüfen. Kein Dokumentbefehl wie Status-/Strukturänderung darf dadurch auf einen nicht vorhandenen Text zugreifen.

Weitere native Proben: alle Themes, kleines Fenster/Zoom, Fokus nach Abbruch/Öffnen, Dateifreigaben und Wiederaufnahme auf derselben Pages-Adresse. Modelltests ersetzen diese Sicht-/Tastenzustellnachweise nicht. Fehler nach bereits gestarteter Neuanlage müssen benennen, dass die leere Datei schon existieren kann; es erfolgt keine automatische Löschung.

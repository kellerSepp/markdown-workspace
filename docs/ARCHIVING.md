# Archivierung — Bedienung und Probe

Über Alt+X → „Unterbaum archivieren …“ den aktuellen H1–H6-Unterbaum
einschließlich aller Kinder, Notizen, Drawer und Checklisten verschieben.
Nur normale ATX-Überschriften, ein Cursor ohne Auswahl; unsichere Markdown-
oder Drawerzustände werden mit Hinweis verweigert.

## Tastenfolgen und Archivprüfung

`C-c x s` archiviert den aktuellen vollständigen Unterbaum. `C-c x a` ist ein
Alias für die derzeitige externe Standardarchivierung; dabei werden ebenfalls
alle Kinder mitgenommen. Ctrl+C drücken, Tasten loslassen, danach x und s/a
unmodifiziert nacheinander. Bestehendes `C-c s` bleibt Scheduling.

`C-c u x s` startet die Prüfung geeigneter Unterbäume; der Defaultalias
`C-c u x a` verwendet denselben Prüfablauf. Ctrl+C drücken und loslassen,
danach u, x und s/a unmodifiziert eingeben. Alt+X bietet die Prüfung ebenfalls als eigenen
Befehl an. Die Prefixhilfe zeigt nach C-c die nächste Ebene, nach x die möglichen
Archivaktionen. Escape/Strg+G, Fokus-/Quellwechsel brechen eine ausstehende Folge
ab. Der u-Zweig setzt ein einmaliges Prüfargument, kein allgemeines numerisches Emacs-System;
nicht unterstützte Argumentkombinationen werden verweigert statt still als
normaler Befehl ausgeführt.

Die ursprünglich geplante Folge mit Ctrl+U wurde nach der nativen PO-Probe in
Edge ersetzt: Ctrl+U öffnete dort den Quelltext. Außerhalb einer laufenden
C-c-Folge fängt die Anwendung Ctrl+U nicht mehr ab. Keine neue globale
Browser-Shortcutpolicy; innerhalb einer laufenden Folge gilt die normale
Abbruchregel für unbekannte Fortsetzungen.

Auf einer Überschriftenzeile werden deren direkte Kinder geprüft, jeweils mit
ihrem gesamten Unterbaum. Außerhalb einer Überschriftenzeile werden die H1-Bäume
der Datei geprüft. Kandidaten enthalten nirgendwo eine offene Überschriftenaufgabe.
Geschlossene Zustände richten sich nach den geladenen SEQ_TODO-Regeln. Statuslose
Informationsbäume sind ausdrücklich geeignet. Eine DONE-Wurzel mit offenem Kind
ist ungeeignet; erledigte Enkel werden daraus nicht einzeln herausgesucht.

Beispiel: `# Projekt A` → `## DONE Angebot` → `### TODO Rückmeldung` und
`### DONE Teilstück`. Bei Prüfung auf Projekt A wird Angebot wegen der offenen
Rückmeldung nicht angeboten. Bei Prüfung auf Angebot wird dagegen Teilstück
angeboten. Der Startpunkt bestimmt die direkte Kindebene; der Befehl sucht
nicht rekursiv alle erledigten Enkel aus noch offenen Projekten heraus.

Ein Archivziel für den Durchlauf wählen. Danach wird jeder Kandidat mit Titel
angeboten und im Editor sichtbar gemacht: **y** archiviert den ganzen Unterbaum,
**n** überspringt unverändert, **Escape** beendet den Rest. Bereits erfolgreich
archivierte Schritte bleiben gespeichert, kein gemeinsames Batch-Undo. Jeder
Schritt verwendet das vorhandene Journal-/Wiederherstellungsmodell. Nach jeder
Änderung wird der exakt erwartete Quellstand samt Regeln und Kandidatenposition
geprüft; gleiche Titel führen nicht zu Raten. Bei Fehlern oder extern verändertem
Stand stoppt die Prüfung sicher. Am Ende wird die Anzahl archiviert/übersprungen
gemeldet.

Nach Abschluss oder Abbruch kehrt die Prüfung an ihren ursprünglichen Bereich
zurück: beim Start auf einer Überschriftenzeile zu dieser Überschrift, beim
Dateimodus an eine vorhandene Text-/Leerzeile. Dadurch prüft ein erneuter Start
nicht versehentlich die Kinder des zuletzt angebotenen Kandidaten. Es werden
dafür keine künstlichen Textzeilen eingefügt; wenn nur Headerzeilen übrig sind,
muss ein Hinweis die verbleibende Bereichswahl erklären. Ein wirklich leerer
Prüfbereich darf weiterhin ohne Kandidatendialog enden.

Die Prefixhilfe ist auf allen Ebenen mit normalen Pfeiltasten hoch/runter oder
Alt+hoch/runter bedienbar; Enter aktiviert den ausgewählten Eintrag. Deaktivierte
Einträge werden übersprungen, der Editorcursor bleibt während der Menünavigation
unverändert. Escape/Strg+G bricht die Folge ab.

Der Dialog wählt das Standardarchiv vor. Andere relative Markdownpfade sind
möglich; fehlende Dateien werden nur in bestehenden Ordnern angelegt. „Als
Standardarchiv verwenden“ merkt das Ziel. Alle erfolgreich festgelegten Ziele
bleiben aus Agenda und TODO-Liste ausgeschlossen, auch beim manuellen Öffnen.
Sie bleiben normal bearbeitbar. Frühere Ziele bleiben als Archive registriert;
eine Oberfläche zum Entfernen von Archivzielen ist nicht Bestandteil.

Offene Aufgaben einschließlich Wurzel werden gezählt. Mit eingeschalteter Option
„Offene Aufgaben mit y/n bestätigen“ öffnet „Trotzdem archivieren“ die Warnstufe:
y bestätigt, n oder Escape bricht ab. In der Pfadeingabe wirken diese Buchstaben
normal. Ohne diese Option bestätigt der ausdrücklich beschriftete Knopf direkt.
Die Option wird beim Archivieren mit den Archiveinstellungen gespeichert.

Archivierte Wurzeln werden H1; Kinder behalten relative Ebenen. ARCHIVE_TIME,
ARCHIVE_FILE (Vault-relativ), ARCHIVE_OLPATH und ARCHIVE_TODO werden im eigenen
PROPERTIES-Drawer ergänzt. Vorhandene gleichnamige Herkunftsangaben werden
konservativ verweigert. Keine ARCHIVE_CATEGORY. Dateilokale SEQ_TODO-Regeln
werden nicht in die gemeinsame Archivdatei kopiert: Statuswort und ursprünglicher
Status bleiben erhalten, die Farbdarstellung im Archiv folgt dessen Regeln.

Archivieren speichert auch den aktuellen Quellentwurf. Danach beginnt die
Editor-History neu. „Archivierung wiederherstellen“ ist der eigene Rückweg;
normales Undo nimmt die gespeicherte Verschiebung nicht zurück.

Nach erfolgreicher Archivierung kehren Fokus und Cursor nach Entsperren in die
Quelle zurück: an die bisherige Anfangsposition des entfernten Unterbaums,
höchstens bis zum neuen Dateiende. Die Stelle wird sichtbar gemacht. Ein
zwischenzeitlicher Fokuswechsel zu einem anderen Bedienelement oder Fenster
darf nicht durch die Rückkehr überschrieben werden. Fehler oder Abbruch setzen
keinen erfolgreichen Archivierungs-Cursor. Das bestehende Speicher-/Historymodell
bleibt unverändert.

Archiv zuerst speichern/verifizieren, Quelle danach; beide Vorzustände werden
gesichert. Journal und Einstellungen liegen in `.storage-spike-backups`.
Nach Fehler/Neustart Vault erneut wählen und „Archivierung fortsetzen“ aufrufen.
Offene Vorgänge blockieren neue Archivierungen. Es werden nur exakt bekannte
Vor-/Nachstände verarbeitet; fremde Änderungen blockieren die Fortsetzung.
Bei Fehler kann eine Doppelkopie bestehen bleiben. Keine gemeinsame Atomarität
oder Beseitigung des bestehenden externen OS-Schreibfensters behauptet.
Wiederherstellung schreibt die Quelle zuerst zurück, dann das Archiv. Sie verlangt
exakt passende Dateistände; spätere Archivänderungen können sie daher blockieren.
Backups werden nicht automatisch gelöscht. Neue Archivblöcke übernehmen Ziel-EOL;
unberührte Quellbereiche bleiben durch TextCodec byteerhaltend.

## Synthetische Handprobe

### Archivprüfung und Prefixfolgen

Separaten synthetischen Vault mit `test-vault/archive-review/review.md` verwenden,
keine bereits benutzten persönlichen Probe-Dateien überschreiben.

1. Cursor auf `# Projekt`: C-c loslassen, u, x, s. Alternativ
   Alt+X → „Archivkandidaten prüfen …“. Einmal das Archivziel wählen.
2. Fünf Kandidaten sind geeignet: DONE Fertig mit geschlossenem Kind,
   Informationen ohne Status, CANCELED und beide gleichnamigen DONE-Einträge.
   „Noch offenes Kind“ und „Noch offen“ dürfen nicht angeboten werden.
3. Erst n, dann y, dann Escape: erster Kandidat bleibt, zweiter wird vollständig
   gespeichert archiviert, Rest bleibt. Ergebniszählung und Teilabbruch prüfen.
4. Die gleichnamigen Kandidaten anhand ihres Inhalts unterscheiden; nach mehreren
   Archivierungen dürfen die verschobenen Positionen keine falsche Entnahme erzeugen.
5. Mit einer frischen Kopie der Probe außerhalb einer Headerzeile starten: H1-Bäume
   der Datei prüfen; Projekt mit offenen Nachfahren ungeeignet, Andere Wurzel geeignet.
6. C-c x a und C-c x s einzeln prüfen; beide nehmen den gesamten Unterbaum mit.
   C-c s muss weiterhin Scheduling öffnen. Nach C-c und nach x Prefixhilfe per
   Maus/Alt+Pfeile/Enter testen. Escape/Strg+G sowie Fokuswechsel brechen Folgen ab.
7. C-c u mit einer nicht unterstützten Fortsetzung muss die Aktion verweigern und das
   Argument verbrauchen; nächste normale Folge funktioniert ohne Altargument.
8. Browserzustellung von C-c u x s nach Strg+F5 praktisch prüfen; Ctrl+U ohne
   laufende C-c-Folge bleibt native Browseraktion. Außerhalb des Editors dürfen
   native Tastenkombinationen nicht global blockiert werden.

### Einzelarchivierung und Wiederherstellung

1. Separaten Testvault mit `test-vault/archiving/source.md` verwenden; eigenes Backup.
2. Cursor in „Angebot verschicken“, Archivbefehl öffnen, `archiv.md` wählen.
3. Warnung über offene Kinder prüfen. Erst n: Dateien unverändert. Dann erneut y.
4. Quelle und Archiv öffnen: ganzer Unterbaum, H1/H2, Inhalte und Herkunft prüfen.
   Direkt nach y und Abschluss weiterschreiben: Fokus soll im Quelleditor sein,
   Cursor am entfernten Unterbaumanfang bzw. am neuen Dateiende. Dies auch beim
   letzten/einzigen Unterbaum und mit eingeklapptem übergeordnetem Heading prüfen.
5. Agenda/Refresh und geöffnetes Archiv prüfen: keine archivierten Einträge.
6. Saubere Quelle öffnen, „Archivierung wiederherstellen“: beide Vorzustände prüfen.
7. Erneut archivieren, alternativ `steuer.md` wählen; beide Ziele bleiben ausgeschlossen.
8. Neustart/Vaultwahl: Standardziel und y/n-Option erhalten. Fehlerszenarien und
   Konflikte zusätzlich in Mocktests; keine native Fehlerzustellung daraus ableiten.

Native Dialog-/Keyboard-/Rechte-/Neustartprobe sowie Langzeitprüfung noch offen.

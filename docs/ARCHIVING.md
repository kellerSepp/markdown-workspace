# Archivierung — Bedienung und Probe

Über Alt+X → „Unterbaum archivieren …“ den aktuellen H1–H6-Unterbaum
einschließlich aller Kinder, Notizen, Drawer und Checklisten verschieben.
Nur normale ATX-Überschriften, ein Cursor ohne Auswahl; unsichere Markdown-
oder Drawerzustände werden mit Hinweis verweigert. Keine Sammelarchivierung.

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

1. Separaten Testvault mit `test-vault/archiving/source.md` verwenden; eigenes Backup.
2. Cursor in „Angebot verschicken“, Archivbefehl öffnen, `archiv.md` wählen.
3. Warnung über offene Kinder prüfen. Erst n: Dateien unverändert. Dann erneut y.
4. Quelle und Archiv öffnen: ganzer Unterbaum, H1/H2, Inhalte und Herkunft prüfen.
5. Agenda/Refresh und geöffnetes Archiv prüfen: keine archivierten Einträge.
6. Saubere Quelle öffnen, „Archivierung wiederherstellen“: beide Vorzustände prüfen.
7. Erneut archivieren, alternativ `steuer.md` wählen; beide Ziele bleiben ausgeschlossen.
8. Neustart/Vaultwahl: Standardziel und y/n-Option erhalten. Fehlerszenarien und
   Konflikte zusätzlich in Mocktests; keine native Fehlerzustellung daraus ableiten.

Native Dialog-/Keyboard-/Rechte-/Neustartprobe sowie Langzeitprüfung noch offen.

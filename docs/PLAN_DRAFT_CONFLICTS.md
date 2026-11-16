# Entwurfskonflikte: Vorschlag

Stand: 2026-11-12. PO hat anschließend ausdrücklich die gezielte Übernahme eines geladenen Entwurfs mit Bestätigung und Sicherung des aktuellen Dateistands freigegeben. Diese ist umgesetzt; Bedienung und Grenzen in [DRAFT_RESTORE.md](DRAFT_RESTORE.md). Vergleich/Export unten bleiben frühere Vorschläge, keine umgesetzten Funktionen. PO hat den betroffenen Entwurf separat gesichert. Persönliche Daten wurden nicht geöffnet.

## Befund

`storage-session.mjs` persistiert Ladebytes (`base`) und Entwurfsbytes (`draft`). Wiederherstellen übernimmt beide und legt eine neue Entwurfsidentität an. Speichern vergleicht die aktuelle Datei bytegenau mit `base`; eine Abweichung blockiert vor dem Schreiben. Das ist beabsichtigter Überschreibschutz, kein Nachweis einer fehlerhaften Wiederherstellung. Bereits vorhandene synthetische Tests decken diesen Konflikt und den Erhalt des Entwurfs ab. Die konkrete Ursache der Änderung in der persönlichen Datei ist ohne Vergleich unbekannt.

Die aktuelle Oberfläche bietet nach Wiederherstellung weder einen Vergleich noch eine direkte Exportaktion. Das ist die Bedienlücke. Alte Entwürfe können auch gegenüber einem später durch dieselbe Anwendung gespeicherten Stand veraltet sein; die Meldung sollte daher keine externe Bearbeitung als bewiesen darstellen.

## Empfohlener begrenzter Umfang

1. Wiederhergestellten Entwurf prüfen und einen Konflikt verständlich melden: Datei hat sich seit der Ladefassung geändert; beide Stände erhalten, Speichern blockiert.
2. Entwurf als separate Download-Datei exportieren. Originalbytes des Entwurfs einschließlich BOM/Zeilenenden verwenden, kein Schreibzugriff auf die Quelldatei. Export gilt nicht als Speichern und löscht keinen Browserentwurf.
3. Auf ausdrückliche Aktion einen kompakten, schreibgeschützten Vergleich mit drei beschrifteten Ständen öffnen: damalige Ladefassung, wiederhergestellter Entwurf, aktuelle Datei. Bestehende Panel-/Dialogbausteine verwenden, keinen zweiten bearbeitbaren Editor einführen. Quelle und Lesezeitpunkt zeigen; Vergleich ist eine Momentaufnahme.
4. Aktuelle Datei ausdrücklich neu laden können. Zuvor Entwurf dauerhaft sichern; schlägt dies fehl, nicht wechseln. Wiederhergestellten Entwurf behalten, aktuelle Datei mit neuer Ladebasis und eigener Entwurfsidentität öffnen. Änderungen anschließend bewusst übertragen; regulärer Savepfad bleibt maßgeblich.

Kein erzwungenes Überschreiben, automatisches Zusammenführen, automatisches Ersetzen der Ladebasis, Löschen alter Entwürfe oder Änderung am Backup-/Konfliktmodell. Ein allgemeiner Merge-Editor wäre ein eigener späterer Umfang.

## Modulgrenzen und Prüfung

Session stellt getrennte lesende Snapshots für Vergleich/Export bereit; UI-Modul besitzt Darstellung und Download-Lebenszyklus. App/Registry verbindet Aktionen und vorhandene Busy-/Vault-/Session-Grenzen. Asynchrone Ergebnisse nach Zielwechsel verwerfen. Keine neuen Dependencies.

Synthetische Regressionen: Konflikt ohne Quelldateischreiben; drei unterschiedliche Stände korrekt zugeordnet; bytegenauer Export bei BOM/gemischten Zeilenenden; unveränderte Dirty-/Basissituation nach Export/Abbruch; fehlende Rechte; Fehler beim Entwurfssichern; Wechsel der Quelle während Vergleich; erneute Dateiänderung nach Vergleich weiterhin beim regulären Save blockiert. Browser-Download und native Panelbedienung anschließend durch PO prüfen.

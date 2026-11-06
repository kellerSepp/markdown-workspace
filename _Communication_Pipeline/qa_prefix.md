# Unabhängige QA AP-06/AP-07

2026-11-06, gemeinsamer Workspace. Rollenrevision **M32A-2026-11-03** in Runtime, AGENTS, agents/qa.md und lokaler TOML bestätigt. Copy-Ersatz-Abnahme und Prefixfreigabe berücksichtigt. Keine App-/Storage-/Fremddokumentänderung, Installation, Unteragenten, Commit oder Push.

## Ergebnis / Befunde an Lead

**Finaler Retest 2026-11-06: P2 und P3 geschlossen. Keine verbleibenden nachgewiesenen Blocker im automatisiert geprüften Umfang.** Finale Suite **195/195**, Build, sieben Syntaxchecks und Diffcheck unabhängig bestanden. **AP-07 noch nicht vollständig abgenommen:** native Edgeprobe beim PO und Stundenstabilität offen.

### Finaler Korrektur-Retest

Aktualisierten Developerbericht und begrenzte Korrekturen gelesen: Gamebook-Zuordnung, `prefixCancel`-Guard im Ringrenderer und zwei Regressionstests. Keine Lifecycleänderung und kein neuer Lifecyclebefund festgestellt; deshalb auf ausdrücklichen Auftrag keine erneute 65-s-Messung.

- **P2 geschlossen:** Alle drei Gamebook-Folgen unabhängig gegen tatsächliche Command-Metadaten geprüft. `fold.open` trägt `C-c 3 (Editor)`; `workspace.choose` hat in der Registry kein Kürzel und im Gamebook „offen“. Nur die drei freigegebenen registrierten Faltbefehle tragen C-c-Folgen. Neun eigene Zuordnungsassertions bestanden. Ein erster zu breiter QA-Filter zählte zusätzlich die ausdrücklich geplante Zeile `future.key-sequences`; auf tatsächlich registrierte Commands eingegrenzt, kein Produktfehler.
- **P3 geschlossen:** Ursprünglichen Reproduktionspfad wiederholt: Ring füllen → Prefix starten → öffentliches `refresh()`. Jetzt bleiben dieselben drei Buttonobjekte, Texte und Listener erhalten; Router aktiv, Editorstate und Modellscrollposition unverändert. Insgesamt **100 Refresh-Aufrufe** über vier Endpfade: Mausausführung `fold.open`, Cancel, Wechsel in Ringmodus und Destroy. Auch Ringänderung während Prefix, anschließender regulärer Ringrefresh, entfernte Listener sowie Refresh nach Close/Destroy geprüft. **741 eigene Retestassertions plus 45 erneut ausgeführte Basischecks** bestanden. Synthetische bestehende DOM-Fixture wiederverwendet; Ausführung im Speicher per Node-stdin, keine Zusatzdateien im Retest geschrieben.
- Finale vollständige `npm test`: **195 bestanden, 0 fehlgeschlagen/übersprungen**, gemeldete Testdauer **446,34 ms**. `npm run build`: bestanden. `node --check` für app, commands, emacs-policy, work-panel, prefix-router und beide Prefix-/Paneltestmodule: **7/7 bestanden**. `git diff --check`: bestanden; nur bekannte Git-Zeilenendenhinweise.

Im Retest ausschließlich diesen QA-Bericht geändert; Build erzeugt übliche ignorierte dist-Ausgaben. Keine Apppatches oder weiteren Arbeiten. Nach diesem Bericht gestoppt; Produkt-/Phasenabnahme bleibt beim PO.

### Historische Befunde vor Korrektur (beide inzwischen geschlossen)

- **P2 – Gamebook falsch zugeordnet:** docs/COMMAND_GAMEBOOK.md:31 schreibt `C-c 3` dem Vaultwechsel `workspace.choose` zu; Zeile 41 nennt bei `fold.open` weiter „offen“. Tatsächliche Policy/Registry routet ausschließlich zu `fold.open`. Reproduktion: Tabellenzeilen mit editor/emacs-policy.mjs und commands.mjs:56 vergleichen. Bestehender Konsistenztest prüft diese Shortcutzuordnung offenbar nicht hinreichend. Kein tatsächlicher Vaultwechsel durch Prefix nachgewiesen.
- **P3 – latenter Modusfehler bei öffentlichem refresh():** editor/work-panel.mjs:88/151 rendert ohne Prefix-Modusprüfung. Reproduktion im synthetischen Modell: Ring `RING` füllen → Prefix starten → `panel.refresh()`. Drei Prefixbuttons verschwinden, Ringzeile `RING (4 UTF-8-Byte)` erscheint; Router bleibt aktiv, Suchfeld bleibt verborgen und Prefixattribut gesetzt. Alte Buttonlistener sind korrekt entfernt. Kein aktueller App-Aufrufer von `.refresh(` unter editor gefunden; deshalb derzeit API-/Wartungsrisiko, kein belegter produktiver Trigger. Kein Fix durch QA.

## Selbst ausgeführt vor Korrektur

- `npm test`: **193/193 bestanden**, keine übersprungenen Tests; gemeldete Testdauer 460 ms. Enthält Ring-, Clipboard-, Undo/Redo-, Text-, Struktur- und Storage-Mockregressionen (Konflikt, Backup/Wiederherstellung, Rechteverlust). Akzeptierte externe Schreibrace bleibt ausdrücklich bestehende Grenze.
- `npm run build`, sieben einzelne `node --check` (app, commands, emacs-policy, work-panel, prefix-router und beide bearbeiteten Testmodule) sowie `git diff --check`: bestanden. Diffcheck nur vorhandene Zeilenendenhinweise.
- Zusätzliche eigene Assertions mit bestehender synthetischer DOM-Fixture: **45 Basischecks + 32 fokussierte Checks** bestanden; separater Ressourcenlauf zusätzlich Ringlastcheck. Invalid/Modifier/IME/AltGr, fremdes/fehlendes keyup, Repeat, Escape→Tab/Shift+Tab und gemeinsamer Org-Navigationspfad, Busy/read-only/fehlendes Dokument/Fokus/neuer State jeweils per Taste und Pointer, natives Copy außerhalb Editor, Ring-/Text-/Historyerhalt, entfernte Buttonlistener und idempotentes Destroy.
- Real aufgelöste CodeMirror-Pluginreihenfolge mit Prefix, Emacs, Struktur und Standard-/History-Keymaps: Heading/Liste × beide Tab-Modi; drei tatsächliche Registry-Faltaktionen, kein Copy-Fallback, Text-/Undohistorie erhalten; anschließendes Editieren/Undo/Redo grün. **12.040 Assertions**, davon 12.000 für **4.000** Fensterlistener-Aufbau/Blur/Abbauzyklen. EditorView/Browser-DOM dabei modelliert, nicht nativ instanziiert.
- Panel: mousedown verhindert Default-Fokusübernahme → click führt genau einmal aus. Zusätzlich erzwungener Fokusverlust ruft tatsächlichen Router-Blurhandler auf → späterer click führt nichts aus. Close/Reentranz und erneutes Close/Cancel bleiben ohne Textänderung; Prefix→Ring→Prefix räumt alte Zeilen auf. Synthetisches Modell bildet Browserdefault gemäß preventDefault nach, ist kein nativer Ereignisnachweis.
- Appintegration gelesen: Prefix vor Emacs; Busy und syncEditor räumen Prefix/Panel auf, Dateigrenzen erzeugen neuen State. Vault-/Clipboard-/Historygrenzen bleiben in bestehender Regression grün. Scrollschutz synchron, State-/ScrollDOM-Identität geprüft; kein später Timer zum Zurückscrollen.

Reproduzierbare Zusatzskripte und Messdaten ausschließlich in `test-vault/qa-prefix-*`. Ausführung: `node test-vault/qa-prefix-independent.mjs`, anschließend `node --expose-gc test-vault/qa-prefix-run.mjs`; separat `node test-vault/qa-prefix-pipeline.mjs`; fokussierte Probe über `node test-vault/qa-prefix-focused-generator.mjs` und `node test-vault/qa-prefix-focused.mjs`. Fixture aus vorhandenem Paneltest wiederverwendet, Zusatzassertions unabhängig geschrieben.

## Begrenzte Ressourcenmessung

Finaler erfolgreicher Lauf: **65,015 s**, **421.400** Prefix-Öffnen/Cancel-Zyklen, jeweils drei erzeugte/entfernte Buttons; pro Zyklus Listener-/Zeilentextcleanup, identischer Editorstate und Modellscrollposition 2400/130 geprüft. 120 synthetische Ringeinträge, **7.800.360 UTF-8-Byte**, Dokument 28 Zeichen. Ring bleibt bei Prefixhilfe unverändert; keine Behauptung eines großen Editor-/Vaultlasttests. Zwischen jeweils 100 Zyklen 5 ms Yield, kein Idle-Test.

V8-Speicher nach expliziter GC: HeapUsed Start **19,54 MB**, bei 10/20/30/40/50/60 s **19,74/19,76/19,75/19,80/19,81/19,81 MB**, Ende **19,73 MB**. RSS Start **78,87 MB**, bei 10–60 s **100,53–101,13 MB**, Ende **115,09 MB**; HeapTotal Ende auf 89,49 MB gewachsen. Kurzfristig kein stetiges HeapUsed-Wachstum sichtbar; RSS-Anstieg bleibt als Messbeobachtung, keine Leakfreiheit ableiten. Node/V8 mit `--expose-gc`, DOM-Modell; Messinstrument hat begrenzten Puffer von 10.000 Latenzen.

Letztes Fenster **10.000** Zyklen: p50 **0,0023 ms**, p95 **0,0047 ms**, p99 **0,0109 ms**. Erste/letzte 1.000 innerhalb dieses letzten Fensters: p95 **0,0037/0,0030 ms**; kein Vergleich über die ganze Laufzeit und kein Browserbudget. Rohdaten: `test-vault/qa-prefix-results.json`. Dort `afterDestroy` wird erst nach Perzentilsortierung erfasst und ist wegen deren temporärer Allokationen nicht mit den GC-Stichproben vergleichbar.

Ein vorangehender 65-s-Lauf absolvierte 421.600 Zyklen, scheiterte anschließend beim Speichern am fehlenden QA-Skriptimport. Zusätzlich wuchs dort der unbeschränkte Messpuffer; dieser Lauf wird nicht als sauberer Speichernachweis verwendet. Nur temporäres QA-Skript korrigiert; finaler Wiederholungslauf mit Exit 0 und gespeicherten Rohdaten. **Kein Stundenbeleg, keine Browser-/Memory-Leak-/Langzeitfreigabe.**

Die Ressourcenmessung stammt vom Vor-Korrektur-Stand. Beide Befunde sind im ausdrücklich beauftragten finalen Retest geschlossen, siehe oben. Die unveränderte begrenzte Messung begründet weiterhin keine native oder langfristige Freigabe.

## Berichtete Ergebnisse / offene Grenzen

PO-Copy-/Paste-Produktabnahme und frühere AP-01-Browserresultate sind **berichtet**, hier nicht wiederholt. Lead meldet HTTP app.js 200 und ausgelieferten Prefixcode; ebenfalls kein eigener Browsernachweis.

Native Edge-/DE-QWERTZ-/AltGr-/IME-/Clipboardzustellung, echte mousedown-/Blurreihenfolge, reale CodeMirror-Layout-/Scrollstabilität einschließlich EOF-Clamping und Browserfokus bleiben PO-Probe nach docs/EMACS_COPY_ACCEPTANCE.txt. Keine Stunden-/Idle-/Suspend-/Memory-Leak-Freigabe, kein realer großer Vaultscan oder Offline-/Berechtigungswechsel-End-to-End-Test. Ringlast ist kein großer Vault. Keine neuen Datensicherheitsversprechen aus Modelltests ableiten. Abnahmeblatt beschreibt die native Prefixprobe korrekt; dessen 182-Test-Zahl ist historisch, aktueller selbst geprüfter Stand **195**. Diese offenen Nachweise verhindern eine vollständige AP-07-Abnahme, sind keine reproduzierten neuen Implementierungsblocker.

# Unabhängige QA AP-02 bis AP-05 — 2026-11-05

AGENTS-Gate, relevante Planabschnitte und QA-Rollenrevision `M32A-2026-11-03` gelesen. Ownership nur dieser Bericht; keine Anwendungscodepatches, Unteragenten, Abhängigkeiten, GUI oder persönlichen Daten.

## Ergebnis

Finaler Stand nach Lifecycle-Korrektur: **174/174 Tests bestanden**, Build erfolgreich, sieben Modul-Syntaxprüfungen (`emacs-policy`, `kill-ring`, `clipboard-adapter`, `emacs-editing`, `work-panel`, `app`, `commands`) und `git diff --check` bestanden. Kein verbleibender belegter Blocker im geprüften Umfang. C-c bleibt natives Copy; kein Prefix implementiert oder freigegeben.

**52 zusätzliche unabhängige Prüffälle bestanden:**

- 29 Editingfälle: Unicode und CRLF/CR/LF, vorwärts/rückwärts aktive Auswahl, Yank am Head ohne Auswahlverlust, Pop ausschließlich im Yankbereich, eigene Undo-Einheiten/Redo, ausgewählte Region ausschneiden, Filterverweigerung ohne Paste-Ringimport, Overbudget-Cut ohne Löschen, sechs Modifier-/IME-Sperren sowie fünf verspätete Read-Antworten nach Ziel-/Fokus-/Busy-/Vaultänderung.
- 17 Panel-/Grenzfälle: Suchfilter, Pfeil/Enter, literaler Scripttext, Abbruch, unverändertes Zieldokument bei veralteter Auswahl/Dokument/Busy ohne Fokusübernahme, Closed-Clear/Vault-Clear, entfernte Listener/DOM beim Destroy und tatsächliches 120-Einträge-Limit.
- Sechs Clipboard-/Pointerfälle: seriell geordnete Schreibaufträge mit verworfenem veraltetem Queue-Eintrag; ausgewählter älterer Eintrag bleibt bei erneutem C-y gewählt und OS-Clipboard unverändert; natives Copy schreibt nicht zusätzlich zur OS-API, wiederholtes Copy/Paste dupliziert Ringtext nicht; leerer Cut löscht keine Zeile; Dateiinvalidierung erhält Ring, Vaultinvalidierung leert ihn.

Die Gesamtsuite wurde unabhängig ausgeführt und deckt außerdem Markierung durch C-SPC und Navigation, C-g/Escape mit Fokusausstieg, Readonly/Busy/Fokus/AltGr/IME, atomaren Cut, einzelne Pop-Undo-Schritte/Umlauf, leeres und verweigertes Clipboard, nativen Cut/Paste, Mark-vor-Panel-Blur, stale Panelziele nach Undo/Dateiwechsel, Vorschau/Themetokens und Destroy ab.

## Befund und Retest

**RAM-/Lifecycle-Befund:** openRing → close → ring.clear ließ eine alte Vorschau mit aktivem Clicklistener im versteckten Panel zurück. Eigenrepro: Ringgröße null, weiterhin eine Zeile mit altem synthetischem Text. Lead erhielt Befund; Developer korrigierte Cleanup und Primitive-ID-Closures, QA änderte keinen Code.

Finaler unabhängiger Retest: beim Schließen keine Ergebniszeilen mehr, detached Vorschautext leer, Clicklistener entfernt; nach Ring-/Vaultclear keine alte Preview. Danach 174er-Suite und Build/Syntax/Diff erneut grün.

## Begrenzte Ressourcenprobe

Node mit explizitem GC, synthetische In-Memory-Daten; keine Browsermessung:

- 800 Ringimporte mit je ungefähr 128 KiB UTF-8 plus 300 anfängliche Panel-Lifecycles: insgesamt **113,7 ms**, Panelanteil **19,6 ms**. Höchstens 64 große Einträge und **8.388.096 Byte**, stets unter 8 MiB; danach Ringbytezahl null. Heap vorab **4.704.184**, nach Ringclear **4.884.376**, nach Gesamtlauf **4.980.680 Byte**. Dedupe behielt stabile ID und aktualisierte Recency.
- Finaler Cleanup-Retest nach Korrektur: **300 vollständige Panel-Lifecycles** mit je 120 synthetischen Einträgen, Close → Clear → Destroy, **40,5 ms**. Am Ende null Ringbyte und null Panelroots; Zeilen-/Rootlistener entfernt. Heap vorab **4.711.128**, nach GC **4.905.512 Byte**.

Kurze Prozessmessungen belegen die geprüften Begrenzungen und Cleanup-Invarianten, keinen langfristigen Heaptrend, keine Browserlatenz und keine Stundenstabilität. Keine Perzentile daraus abgeleitet.

## Review und offene Abnahme

Policy/Bindings, Ringmodell, Clipboardadapter, Mark-/Yankcontroller und Panel sind getrennte Module; Registry/Gamebook konsistent in automatisiertem Abgleich. Ring ohne Persistenz/Timer; Clipboardzugriff explizit, keine Rechteautomatik oder Polling. App invalidiert bei Busy/Dateiwechsel, leert bei anderem Vault; C-Shift-z bleibt Redo. Tatsächlich bereits an den Browser übermittelte Clipboard-Schreibaufträge sind nicht rückrufbar; nur Reihenfolge/stale Folgearbeit werden abgesichert.

AP-01-PO-Probe ist positiver Nachweis der isolierten Testseite laut `po_cc_probe.md`, **keine native Produktabnahme**. Windows-Austausch mit externer Anwendung, echte Browser-/OS-Konflikte, native AltGr/IME, kleine Fenster/Assistenz und stundenlange Ressourcenprüfung bleiben offen. C-c darf erst nach PO-Abnahme des funktionierenden Copy-Ersatzes wechseln. Keine Freigabe für AP-06 aus diesem Bericht; kein Commit/Push.

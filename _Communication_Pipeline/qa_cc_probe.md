# QA AP-01: isolierte Tastaturprobe — 2026-11-05

Aktuelles AGENTS-Gate und QA-Rollenrevision `M32A-2026-11-03` bestätigt. Nur die drei neuen Probe-Dateien geprüft; keine Codeänderung, CUA, Browserautomation, Installation oder weiterer Server.

**Ergebnis:** kein belegter Blocker für die PO-Handprobe. Zwei Syntaxchecks bestanden. **72 unabhängige automatisierte Prüfungen** bestanden:

- Neun gewünschte Kürzel erkannt; je vier Ausschlüsse für IME/229/Meta/AltGraph, C-v bleibt frei.
- DOM-Mock: Handler ausschließlich auf Testfläche, jedes Kürzel verhindert und einzeln gezählt; untrusted Ereignis erhöht keine native Kürzelzählung. Vergleichsfläche hat keinen Keydownhandler.
- Native copy/paste-Zähler beider Flächen geprüft; Clipboard-Payload wird nicht gelesen. Clipboard-API beim Laden unberührt, Lesen/Schreiben erst durch Buttonhandler. Fremder Leseinhalt erscheint weder im Bericht noch im Status; nur Vergleichsergebnis. Schreiben verwendet ausschließlich festen synthetischen Text.
- Acht HTTP-Fälle gegen bereits laufenden Server: drei freigegebene Pfade GET und Root HEAD erfolgreich; fremde Datei, Traversalversuch, Querypfad und POST verweigert. Erfolgsantworten mit CSP (`connect-src 'none'`) und `no-store`.

Codeinspection: keine Produkt-Keymap, Abhängigkeit, Speicherung, automatisches Rechteändern oder Hintergrund-Clipboardabfrage. Server bindet ausschließlich `127.0.0.1:8767`, feste Asset-Allowlist. Bericht enthält Kürzel-/Ereigniszähler und Clipboard-Vergleich, keine eingegebenen Texte oder Clipboard-Inhalte.

**Offen:** tatsächliche native Edge-Zustellung, sichtbare Browser-/OS-Reaktionen, echtes Windows-Clipboard und AltGr/IME übernimmt PO-Handprobe. DOM-Mocks belegen keine native Abfangbarkeit. Keine Vollsuite oder Langzeit-/Ressourcenmessung für diese isolierte Probe durchgeführt; keine Produkt-C-c-Abnahme daraus ableiten.

# AP-01: PO-Handprobe in Edge

Datum: 2026-11-05. Quelle: direkt vom PO im Chat kopierter Testseitenbericht; keine unabhängige Wiederholung durch Agenten.

| Kürzel | Angekommen | Verhindert |
| --- | ---: | ---: |
| C-c | 3 | 3 |
| C-SPC | 1 | 1 |
| M-w | 1 | 1 |
| C-x | 1 | 1 |
| C-y | 1 | 1 |
| M-y | 1 | 1 |
| C-g | 1 | 1 |
| Escape | 1 | 1 |
| C-Shift-z | 1 | 1 |

Native `isTrusted=true`. Testfläche: Copy0, Cut0, Paste1. Vergleich: Copy2, Cut0, Paste2. Clipboard schreiben erfolgreich; Lesen erfolgreich mit übereinstimmendem festem Testtext. PO meldet: „Komisches ist mir bisher nicht aufgefallen.“

Abgrenzung: synthetische isolierte Testseite, noch keine Produkt-Keymap/Mark/Kill-Ring-Abnahme; AltGr/IME nicht bestätigt. Funktionierender Copy-Ersatz muss später im Produkt abgenommen werden, bevor C-c Prefix wird.

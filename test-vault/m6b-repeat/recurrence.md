#+SEQ_TODO: NEXT(n) TODO(t) WAITING(w) SOMEDAY(s) | DONE(d) CANCELLED(c)

# M6b synthetischer Probevault

Nur synthetische Aufgaben. Für mehrere Abnahmeläufe eine Kopie verwenden oder Änderungen ausdrücklich per Undo zurücknehmen.

## WAITING Fester Wochenrhythmus
SCHEDULED: <2026-10-25 So +1w>
Eigene Notiz bleibt erhalten.

## TODO Vergangene Wochen überspringen
SCHEDULED: <2026-10-25 So ++1w>

## TODO Ab tatsächlichem Abschluss
SCHEDULED: <2026-10-25 So .+1w>

## WAITING Rücksetzstatus und vorhandenes LOGBOOK
SCHEDULED: <2026-11-09 Mo +1w>
:PROPERTIES:
:REPEAT_TO_STATE: TODO
:CUSTOM_NOTE: unverändert erhalten
:END:
:LOGBOOK:
- State "DONE" from "WAITING" [2026-11-02 Mo 09:15]
:END:
Historische Notiz bleibt erhalten.

## TODO Zwei wiederkehrende Termine
SCHEDULED: <2026-11-09 Mo 09:00-10:00 +1w> DEADLINE: <2026-11-12 Do 17:00 +1m>

## TODO Einmaliges SCHEDULED vor wiederkehrender DEADLINE
SCHEDULED: <2026-11-09 Mo> DEADLINE: <2026-11-12 Do +1w>

## TODO Monatsende
SCHEDULED: <2026-01-31 Sa +1m>

## TODO Schaltjahr
DEADLINE: <2024-02-29 Do +1y>

## TODO Elternaufgabe
SCHEDULED: <2026-11-09 Mo +1w>
Elternnotiz.
### WAITING Kindaufgabe
DEADLINE: <2026-11-10 Di +1d>
:PROPERTIES:
:REPEAT_TO_STATE: SOMEDAY
:END:
:LOGBOOK:
- State "DONE" from "WAITING" [2026-11-08 So 08:00]
:END:
Kindnotiz.

## TODO Normale Aufgabe
SCHEDULED: <2026-11-09 Mo>
Abschluss bleibt DONE und erzeugt kein LOGBOOK.

## TODO Unbekannter Rücksetzstatus
SCHEDULED: <2026-11-09 Mo +1w>
:PROPERTIES:
:REPEAT_TO_STATE: NICHT_DEFINIERT
:END:

## TODO Wiederholer nur im Codebeispiel
```text
SCHEDULED: <2026-11-09 Mo +1w>
:LOGBOOK:
- State "DONE" from "TODO" [2026-11-09 Mo 09:00]
:END:
```

# Archivierung — Gesprächsstand und Sessionübergabe

Stand: 2026-11-16. **Nur Planung, keine Implementierungsfreigabe.**
Dieses Dokument hält die Diskussion vor dem Gerätewechsel fest. In der neuen
Codex-Session zuerst gemeinsam offene Punkte klären, nicht automatisch anfangen.

## Technischer Ausgangspunkt

Repository: `kellerSepp/markdown-workspace`, Arbeitsbranch zuletzt `main`.
Drawer-Feature einschließlich Korrektur ungültiger Heading-Inhalte ist mit
Commit **2df1923** nach main integriert und zu origin/main gepusht.
Letzter Prüfstand dieses Features: 536/536 Tests seriell, Build, fünf Syntaxchecks
und unabhängige QA grün; native Vollmatrix und Stundenstabilität bleiben offen.
LOGBOOK-Notizen und allgemeine Drawer sind vorhanden. Details: `LOGBOOK.md`,
`DRAWERS.md`, `PROJECT_STATUS.md`, `_Communication_Pipeline/qa_drawers.md`.

Nutzerbilder `images/archive_video_example.png` und `images/drawers_preview.png`
sind lokal untracked. Nicht löschen oder ungefragt committen. Am anderen Gerät
können sie fehlen; dieses Dokument enthält alle wesentlichen Gesprächsinhalte.

## Vom PO ausdrücklich bestätigt

- Archivierung soll in eine **externe Datei** erfolgen, nicht nur über einen
  ARCHIVE-Tag am bisherigen Ort. Grund: Archiviertes später leichter wiederfinden.
- Gewählt wird ein Eintrag mit **vollständigem Unterbaum**: alle untergeordneten
  Überschriften, Inhalte, Notizen, Drawer, LOGBOOK und Checklisten gehören dazu.
- Offene Kinder wie TODO, ONHOLD usw. dürfen mitarchiviert werden; ein Hinweis
  darauf ist erwünscht. Offene Kinder sind keine grundsätzliche Archivierungssperre.
- PO fragt, ob Verschieben und Speichern beider Dateien der Ablauf wäre.
  Antwort im Gespräch: ja, dies ist der vorgeschlagene Zielablauf; sichere
  Fehlerbehandlung über zwei Dateien muss vor Umsetzung noch konkret geplant werden.
- Agenda-Ausschluss ist noch **nicht entschieden**. Keine weitere Agendaansicht,
  automatische Archivierung oder allgemeine Konfigurationsoberfläche freigegeben.

## Begriffe und bisherige Vorschläge — noch zu bestätigen

**Unterbaum vollständig mitnehmen** ist nicht dasselbe wie Sammelarchivierung.
Mit Sammelarchivierung meinte der Agent: mehrere voneinander unabhängige erledigte
Unterbäume automatisch suchen und anbieten. Das ist für den ersten Schritt nicht
vorgesehen. Die ausdrückliche PO-Forderung, alle Kinder des gewählten Eintrags
mitzunehmen, bleibt davon unabhängig bestehen.

Der Agent hat den Wunsch nach zentralem Wiederfinden als **eine gemeinsame
Archivdatei pro Vault** interpretiert, beispielsweise `archiv.md`. Diese
Konkretisierung wurde nach der letzten Antwort noch nicht ausdrücklich vom PO
bestätigt. Auch Dateiname, Pfad und Ort der Einstellung sind offen.

Vorschlag zur Agenda: eine ausdrücklich konfigurierte Archivdatei standardmäßig
aus Wochenagenda/TODO-Liste ausschließen, aber normal zum Nachlesen/Bearbeiten
öffnen können. Keine pauschale Sonderbehandlung allein aufgrund des Dateinamens
„archiv“. Unser vorhandener Vault-Index liest Markdown-Dateien rekursiv; bloßes
Verschieben nach `archiv.md` würde die Einträge daher nicht automatisch ausschließen.

## Org-Referenz aus der Recherche

- [Archivierung](https://orgmode.org/manual/Archiving.html):
  `C-c C-x C-a` ruft die konfigurierte Standard-Archivierungsaktion auf.
- [Archivdatei](https://orgmode.org/manual/Moving-subtrees.html):
  `C-c C-x C-s` verschiebt den aktuellen Unterbaum; `C-u` davor bietet eine
  Prüfung mehrerer direkter Kinder auf offene TODOs an. Das ist die oben
  unterschiedene Sammelfunktion, nicht die Mitnahme des eigenen Unterbaums.
- Org kennt globale `org-archive-location` und dateilokale Angaben wie
  `#+ARCHIVE: myarchive.org::`. Dateiname und optionaler Zielbereich werden mit
  `::` getrennt. Der Standard hängt `_archive` an den Quelldateinamen an.
- Beim Archivieren kann Org Kontextproperties zu Quelle, Überschriftenpfad und
  Zeitpunkt ergänzen. Ob wir solche Metadaten übernehmen, ist noch offen.
- [Interne Archivierung](https://orgmode.org/manual/Internal-archiving.html)
  per ARCHIVE-Tag oder Archivgeschwister wurde erläutert; PO bevorzugt externe Datei.

Mögliche eigene Syntax `#+ARCHIVE: archiv.md::` war nur ein Agentenbeispiel.
Weder Parser/Dateikonfiguration noch dieses Kürzel sind bei uns implementiert
oder freigegeben. Browser-/Prefixkonflikte vor konkreter Belegung prüfen.

## Vorgeschlagener sicherer Ablauf — keine fertige Sicherheitsgarantie

1. Quelle und Archivziel auf aktuellen Stand, Rechte und Konflikte prüfen;
   Umgang mit ungespeicherter Quelle vorher festlegen. Offene Aufgaben melden.
2. Vollständigen Unterbaum im Archiv ergänzen, Ziel speichern und Ergebnis prüfen.
3. Erst danach den exakt geprüften Unterbaum aus der Quelle entfernen,
   Quelldatei speichern und Ergebnis prüfen.
4. Indexzustand für beide Dateien gemäß beschlossener Archivregel aktualisieren.

Sicherungen beider vorherigen Dateistände gehören zum Entwurf. Vorhandene
Storage-/Backup-/Konfliktmechanismen prüfen und wiederverwenden; nicht behaupten,
sie würden zwei Dateischreibvorgänge gemeinsam atomar machen.

Wesentliches Fehlerfenster: Ziel ist gespeichert, Quellentfernung scheitert.
Dann existiert der Eintrag vorübergehend doppelt. Dies ist einem Verlust
vorzuziehen, muss aber **erkennbar und wiederaufnehmbar** sein. Erneuter Aufruf
darf keine weitere Archivkopie erzeugen. Konkreter Nachweis/Operationskennung,
Wiederaufnahme, Konfliktverhalten und Verhalten nach Neustart sind noch offen.
Nicht versuchen, eine fremd veränderte Datei durch naives Zurückrollen zu ersetzen.

## Nächste gemeinsame Entscheidungen

1. Eine zentrale Archivdatei pro Vault bestätigen? Dateiname/Pfad und wie wird
   das Ziel eingestellt, ohne vorschnell ein allgemeines Optionssystem einzuführen?
2. Agenda-Ausschluss explizit konfigurierter Archivdateien bestätigen; was gilt
   bei fehlender Konfiguration, manuellem Öffnen oder Wechsel des Archivziels?
3. Archivstruktur: einfach am Ende anhängen, eigener Sammelheading oder Erhalt
   der Herkunftshierarchie? Relative Headingebenen und H6-Grenzen festlegen.
4. Warnung bei offenen Kindern: welche Anzeige und Bestätigung? Es bleibt erlaubt.
5. Herkunft/Archivzeit als Metadaten erwünscht? Keine neuen Properties ungefragt.
6. Dirty-/Save-/Fehler-/Wiederaufnahme-/Doppelkopie- und Wiederherstellungsmodell
   mit Storage-Rolle konkret prüfen. Semantik von Undo nach Dateiverschiebung klären.
7. Begrenzten Implementierungsplan mit Abnahmekriterien besprechen, dann erst
   ausdrücklich freigeben und eigenen Branch anlegen.

Keine Änderung an App, Storage, Registry, Index oder Shortcuts aus diesem
Übergabedokument ableiten. Agenten prüfen ausschließlich synthetische Vaults.

## Kopierbarer Startprompt für die nächste Codex-Session

```text
Wir setzen die gemeinsame Planung zur externen Archivierung fort.
Lies zuerst AGENTS.md und docs/PLAN_ARCHIVING.md, danach nur relevante
Projektdokumente. Prüfe Branch/Git-Status; letzter integrierter Featurestand
ist 2df1923 (Drawers), spätere Dokumentationscommits können darüber liegen.
Nutzerdateien und untracked Bilder erhalten. Es gibt noch keine Freigabe
zur Implementierung der Archivierung und keine pauschale Git-Freigabe.

Bestätigt: externe Archivdatei; gewählten H1–H6-Unterbaum vollständig mit
allen Kindern/Inhalten verschieben; offene TODO-/ONHOLD-Kinder dürfen mit,
gerne mit Hinweis. Sammelarchivierung mehrerer unabhängiger Unterbäume ist
ein anderer Punkt und zunächst nicht vorgesehen.

Noch gemeinsam klären: zentrale Archivdatei pro Vault und Konfiguration,
Agenda-Ausschluss, Archivstruktur/Metadaten und besonders sicherer
Zwei-Dateien-Ablauf samt Konflikten, Wiederaufnahme und Duplikatvermeidung.
Der bisherige Agent schlug vor: Archiv zuerst speichern/verifizieren,
erst dann aus Quelle entfernen/speichern; keine gemeinsame Atomarität
behaupten. Bitte knüpfe hier an und besprich den nächsten begrenzten
Schritt mit mir, ohne schon zu implementieren.
```

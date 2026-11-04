# Hierarchieprobe

Nur synthetische Daten. Im Absatz bleibt Tab eine Fokustaste.

## Ebene zwei

Überschrifteneinrückung ist nur Darstellung.

### Ebene drei

#### Ebene vier

##### Ebene fünf

###### Ebene sechs

An H6 muss weiteres Herabstufen sicher verweigert werden.

## Aufzählung: fünf Ebenen

- Alpha
  - Beta
    - Gamma
      - Delta
        - Epsilon
        - Epsilon zwei
      - Delta zwei
    - Gamma zwei
  - Beta zwei
- Alpha zwei

## Nummerierung: fünf Ebenen

1. Erstes Hauptthema
   1. Unterthema
      1. Detail
         1. Unterdetail
            1. Tiefster Eintrag
            2. Zweiter tiefer Eintrag
         2. Zweites Unterdetail
      2. Zweites Detail
   2. Zweites Unterthema
2. Zweites Hauptthema

## Abgegrenzter Codeblock

```javascript
const synthetisch = "äöü ß 😀";
// Tab soll hier Code einrücken, keine Überschriften verändern.
function beispiel() {
  return synthetisch;
}
```

Inline-Code `const x = 1` bleibt ein Inline-Element.

## Noch ein Codeblock

```markdown
# Kein echter Abschnitt
- Kein echter Listenpunkt
1. Keine hierarchische Nummerierung
```

## Schluss

Escape und anschließend Tab/Shift+Tab müssen den Editor verlassen können.

# Plánovač parcely (ukážka návrhu)

Návrh novej sekcie pre web kempu Camping Pullmann v Piešťanoch: hosť si vyberie termín a vozidlo, klikne na parcelu v mape a poskladá si na nej auto, karavan, stan aj prístrešok v skutočných rozmeroch. Hneď vidí, či sa zmestí, kde sú prípojky a koľko pobyt stojí.

**Toto nie je oficiálna stránka kempu.** Obsadenosť je vymyslená a rezervácia sa nikam neodosiela.

Živá ukážka: https://matuslenicky.github.io/pullmann-planovac/

## Vzhľad a pripojenie k webu kempu

Stránka je navrhnutá ako doplnková služba k webu campingpiestany.sk, nie ako samostatný web. Preberá jeho vzhľad: sivú hlavičku s logom, biele pozadie, zelené verzálkové nadpisy, zelenú pätičku a systémové písmo. Nenačítava nič z internetu, všetko je v jednom súbore. Modrý výkres s mriežkou je len v plánovači jednej parcely.

Farby nie sú odhadnuté, sú zmerané na webe kempu a prenesené do premenných na začiatku `src/style.css`:

| Kde | Farba | Odkiaľ |
|---|---|---|
| text, sekundárny text | `#4b4c4c`, `#717171` | odseky na úvodnej stránke a na stránke Rezervácie |
| nadpisy, tlačidlá, pätička | `#496662`, tmavší pruh `#344946` | nadpisy, tlačidlo „Mapa kempu", pätička |
| hlavička, tmavý pruh | `#666666`, `#424242` | hlavička podstránok, pruh s menu na úvode |
| sivé plochy, linky, rámik polí | `#e0e0e0`, `#d9d9d9`, `#bfbfbf` | sivý pás na úvode, formulár rezervácie |
| chyby a povinné polia | `#d63637` | hviezdička vo formulári rezervácie |
| zlatá | `#d9bc73` | logo |
| mapa: okolie, areál, rieka, cesty, body | `#638d73`, `#288354`, `#60c7eb`, `#6d6e6e`, `#ebc87d` | oficiálna mapa kempu z roku 2023 |

Pôvodný web nemá tmavý režim. Tmavý režim plánovača drží tie isté odtiene, len stlmené. Modrý výkres v plánovači parcely je zámerne vlastný.

Pripojiť sa dá dvoma spôsobmi:

- ako podstránka: `index.html` sa nahrá na web kempu a pridá sa do menu,
- vložením do existujúcej stránky: adresa s `?embed=1` skryje vlastnú hlavičku a pätičku, takže sa dá dať do rámu (`iframe`) pod menu kempu.

Pred ostrým nasadením treba doplniť skutočnú obsadenosť a odosielanie rezervácie a odstrániť pásik „Ukážka návrhu".

## Čo je v repozitári

| Cesta | Čo to je |
|---|---|
| `index.html` | hotová stránka v jednom súbore, túto servíruje GitHub Pages |
| `Pullmann-planovac.html` | tá istá stránka pod menom vhodným na poslanie, funguje aj bez internetu |
| `planovac.html` | verzia bez hlavičky dokumentu pre Claude artifact |
| `src/` | zdroje: `style.css`, `body.html`, `app.js`, `draw.js`, `catalog.js`, `dims.js`, `outline.js` |
| `src/data/` | preverené rozmery 75 položiek so zdrojmi |
| `build.js` | zloží zo `src/` všetky tri HTML súbory |
| `gen-dims.js`, `gen-outline.js` | generujú `src/dims.js` a `src/outline.js` z dát |
| `tests/` | scenáre v headless Chrome: počítač, mobil 390 px, tmavý režim, klávesnica, pravidlá, offline, pravidlá ovládania (dotykové ciele, Späť, vrátenie zmazania) |

## Práca s projektom

Treba len Node 22 alebo novší, žiadne závislosti.

```
node build.js        # po každej zmene v src/
node tests/run.js    # spustí vlastný Chrome, prejde 10 scenárov a Chrome zase zavrie
```

Úpravy sa robia v `src/`. Súbory `index.html`, `Pullmann-planovac.html`, `planovac.html`, `src/dims.js` a `src/outline.js` sú generované, ručne sa nemenia.

## Odkiaľ sú údaje

- Parcely, cenník 2026, sezóna a kontakty sú z webu campingpiestany.sk. Parcelu M web uvádza raz ako 75 a raz ako 80 m², plán počíta so 7 × 11 m.
- Rozmery vozidiel a výbavy sú z údajov výrobcov a predajcov. Zdroj každej položky je v `src/data/` a na stránke v časti Zdroje rozmerov.
- Obrysy sú nakreslené v mierke podľa týchto rozmerov, nie sú to výrobné výkresy. Výnimkou je VW Touran, prekreslený z [voľného diela na Openclipart](https://openclipart.org/detail/338016/volkswagen-touran-2018) od autora mrehmann, licencia CC0.
- Obsadenosť a kapacita zón voľného státia sú ukážkové.

## Práva

Logo v hlavičke patrí kempu Camping Pullmann a je tu len ako súčasť návrhu. Bez súhlasu kempu ho ďalej nepoužívajte.

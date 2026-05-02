# Game Design Document — "Glyph Grid"

> **Žánr**: Hybrid-casual block puzzle + roguelite meta-progression
> **Platformy**: iOS, Android (Unity)
> **Cílová skupina**: 25–55 let, casual hráči, převaha žen (60/40)
> **Session**: 2–5 minut, 4–8× denně
> **Verze dokumentu**: 0.1 (MVP scope)

---

## 1. High Concept

> *"Block Blast potkává Slay the Spire. Skládáš runové bloky na mřížku, čistíš řady, ale každých 5 levelů si vybíráš permanentní perk, který mění pravidla. Žádné dvě hry nejsou stejné."*

**Elevator pitch (30 s)**: Jednoduchá puzzle hra, kterou pochopíš za 10 sekund — položíš blok, vyčistíš řadu, dostaneš body. Ale po každých pár levelech si vybereš jeden ze tří magických run, který trvale změní tvou strategii. Tisíce kombinací znamenají, že 100. hra je jiná než 10. Levely jsou nekonečné a obtížnost roste plynule.

---

## 2. Core Gameplay Loop

### 2.1 Mikro-loop (jeden tah, ~5 s)
1. Hráč vidí mřížku **8×8** a 3 dostupné bloky (různé tvary, 1–5 buněk).
2. Drag & drop bloku na platné místo.
3. Pokud blok dokončí řadu / sloupec / 3×3 čtverec → vyčistí se → confetti + zvuk + skóre.
4. Když jsou všechny 3 bloky umístěné, dostane další 3.
5. **Game over**, když žádný z 3 bloků nemůže být umístěn.

### 2.2 Mezo-loop (jeden level, ~2 min)
- Cíl: dosáhnout **target score** dříve než dojdou bloky / čas / tahy.
- Tři typy levelů (rotují):
  - **Score Rush**: 50 tahů, dosáhni X bodů
  - **Clear Goal**: vyčisti N specifických run barev
  - **Survival**: nedopusť game over po Y tahů
- Výhra → odměna (mince + zkušenosti) → další level.
- Prohra → nabídka **revive za rewarded ad** (1× za level).

### 2.3 Makro-loop (jedna "Expedice", ~15–20 min, 10 levelů)
- Levely 1–10 = jedna **Expedice**.
- Po levelech 3, 6, 9 → **Choice node**: vyber 1 ze 3 run/perků (roguelite).
- Level 10 = **Boss level** (speciální mechanika, větší odměna).
- Po dokončení → meta odměny + výběr nové Expedice (různé biomy = různé modifikátory).

### 2.4 Meta-loop (dlouhodobý)
- **Permanent progression**: trvalé upgrady (bigger grid, more blocks, better starting runes) za "essence" měnu.
- **Battle Pass** (sezóny po 30 dnech).
- **Daily quests** + **streak system**.
- **Liga** (týdenní leaderboard, hráči ve skupinách po 50).

---

## 3. Klíčové mechaniky

### 3.1 Bloky (pieces)
- Inspirace tetromino + pentomino (1–5 buněk).
- ~25 unikátních tvarů.
- Každý blok má **runovou barvu** (6 barev: Fire, Water, Earth, Air, Light, Shadow).
- Spawnují se v náhodné, ale **balancované** trojici (algoritmus zajišťuje, že vždy existuje validní umístění alespoň pro 1).

### 3.2 Vyčištění (clears)
- **Řada / sloupec** = +100 bodů
- **3×3 čtverec** = +200 bodů
- **Multi-clear** (víc najednou) = combo multiplier (×2, ×3, ×5)
- **Same-color clear** (řada jedné barvy) = +50 % bonus + spawn **runy**

### 3.3 Runy a perky (roguelite jádro)
Po levelech 3, 6, 9 v každé Expedici → výběr 1 ze 3 karet ze 4 vzácností:
- **Common** (bílé): malé bonusy (např. "+10 % skóre za zelené bloky")
- **Rare** (modré): mechanické změny (např. "Každý 5. blok je wild")
- **Epic** (fialové): silné synergie (např. "Vyčištění řady přidá 1 tah")
- **Legendary** (zlaté): game-changing (např. "Bloky 5+ buněk jsou zdarma")

**~80 unikátních run** v MVP. Synergie navržené pro **build crafting** (např. "Fire build" = 5 fire runes = exploze).

### 3.4 Power-upy (consumables)
- **Hammer** — odstraň 1 buňku
- **Bomb** — odstraň 3×3 oblast
- **Swap** — vyměň aktuální 3 bloky
- **Color Bomb** — odstraň všechny buňky 1 barvy

Power-upy se kupují za mince, dostávají z denního loginu nebo **rewarded ads**.

### 3.5 Biomy (Expedice)
Každá Expedice = jiný biom s globálním modifikátorem:
- **Forest** (tutoriál biom, snadný)
- **Volcano** (Fire bloky 2× skóre, ale méně Water bloků)
- **Tundra** (každý 10. tah zmrazí náhodnou buňku)
- **Desert** (méně bloků na výběr, ale větší)
- **Void** (random mutace každých 5 tahů)

→ 5 biomů v MVP, +1 biom každý měsíc jako live ops.

---

## 4. Procedurální generace

### 4.1 Generování bloků v kole
```
NextBlocks(level, history) =
  filter(allBlocks, b -> isPlayable(b, currentBoard))
  .weighted(rarity * difficultyCurve(level))
  .pickThree(ensureAtLeastOneFits)
```

**Anti-frustrace pravidla**:
- Vždy alespoň 1 blok ze 3 musí jít umístit.
- Po 2 prohraných pokusech sleva: nabídneme jednodušší trojici (skrytě).
- Žádné 3 stejné velké bloky za sebou.

### 4.2 Generování levelů
**Difficulty curve**:
```
targetScore(level) = 500 + level * 80 + log2(level) * 200
gridSize: 8x8 do level 50, pak 9x9
moveLimit: max(20, 50 - level/10)
```

**Boss levely** (každý 10. level):
- Specifický board layout (předem navržené šablony, ~30 v MVP)
- Speciální mechanika (např. "blokované buňky se objevují každých 5 tahů")
- 3× odměna

### 4.3 Seed-based reprodukovatelnost
Každý level má seed = `hash(playerId + expeditionId + levelIndex)` → daily challenge mód: všichni hrají stejný seed.

---

## 5. Ekonomika

### 5.1 Měny
| Měna | Použití | Získání |
|------|---------|---------|
| **Coins** (soft) | Power-upy, continue | Hraní, denní login, ads |
| **Gems** (hard) | Premium battle pass, urychlení, exclusivní runy | IAP, achievements (vzácně) |
| **Essence** (meta) | Permanentní upgrady | Boss levely, eventy |
| **Energy** | 1 = 1 Expedice | Regen 1/30min, max 5 |

### 5.2 Sink & source rovnováha
- **Coins source**: ~500 coins / level (avg)
- **Coins sink**: power-up = 100 coins, continue = 200 coins
- **Cíl**: hráč utratí 70 % získaných coinů, zbylých 30 % vytváří FOMO pro IAP

### 5.3 IAP nabídky
| Nabídka | Cena | Obsah |
|---------|------|-------|
| Starter Pack | $2.99 | 1000 gems + 5000 coins + 10 power-upů |
| Remove Ads | $4.99 | Žádné interstitial/banner (rewarded zůstávají) |
| Battle Pass | $9.99 / 30 dní | 100 levelů odměn |
| Gem Pack S | $0.99 | 100 gems |
| Gem Pack M | $4.99 | 600 gems (+20 %) |
| Gem Pack L | $19.99 | 3000 gems (+50 %) |
| Gem Pack XL | $49.99 | 10000 gems (+100 %) |
| Mega Bundle | $99.99 | Vše + exclusive cosmetic |

### 5.4 Cílové KPI ekonomiky
- **ARPDAU**: $0.12
- **Conversion to payer**: 3–5 %
- **Whale revenue share**: 50 % z top 1 % hráčů

---

## 6. Monetizační integrace

### 6.1 Reklamní místa
| Typ | Trigger | Frekvence |
|-----|---------|-----------|
| **Rewarded — Revive** | Game over | 1× / level |
| **Rewarded — 2× odměna** | Po výhře | každý level |
| **Rewarded — Free power-up** | Hlavní menu | 1× / 4 hod |
| **Rewarded — Daily wheel** | Denní login | 1× / den |
| **Interstitial** | Po levelu | každý 3. level (ne po prohře) |
| **Banner** | Hlavní menu, lobby | always (kromě IAP "remove ads") |

### 6.2 Pravidla
- **Nikdy** ad po prohře proti bossovi.
- **Nikdy** víc než 1 ad / 90 sekund.
- Frekvence řízená přes **Firebase Remote Config** → A/B test.

---

## 7. Retence systémy

### 7.1 Denní
- Daily login (7denní cyklus, 7. den = legendary rune)
- 3 daily quests (např. "vyčisti 50 řad", "dohraj 3 levely")
- Daily challenge (stejný seed pro všechny, leaderboard)

### 7.2 Týdenní
- **Liga** (Bronze → Diamond): top 10 z 50hráčové skupiny postupuje
- **Weekend event** (2× essence)
- **Boss rush** víkend (každá Expedice má 5 bossů místo 1)

### 7.3 Sezónní (30 dní)
- Battle pass (free + premium track)
- Nový biom
- 5 nových run
- Sezónní cosmetics (skiny pro bloky, board themes)

### 7.4 Push notifikace
- Plná energie (5/5)
- Daily reset (8:00 lokálně)
- Friend překonal tvé skóre
- "Tvá liga končí za 2 hod, jsi 11. — postup top 10"

---

## 8. Onboarding (první 3 minuty)

| Krok | Časový bod | Akce |
|------|------------|------|
| 1 | 0:00 | Splash, žádný account required |
| 2 | 0:05 | Animace: ruka položí 1. blok |
| 3 | 0:15 | Hráč položí 2 bloky → první clear → confetti |
| 4 | 0:45 | Dokončení levelu 1, "+50 coins" |
| 5 | 1:00 | Level 2, představen power-up |
| 6 | 2:00 | Level 3 → **první rune choice** (force win) |
| 7 | 2:30 | Level 4, hráč vidí efekt runy |
| 8 | 3:00 | Otevřena liga, daily login, soft account prompt |

**Pravidla**: žádné textové okno delší než 6 slov. Učení skrz UI shine + ruka animace.

---

## 9. Tech specifikace (MVP)

### 9.1 Stack
- **Engine**: Unity 2022 LTS
- **Jazyky**: C#
- **Backend**: Firebase (Auth, Firestore, Remote Config, Analytics)
- **Ad mediation**: AppLovin MAX (Meta, AdMob, Unity Ads, Mintegral, Vungle adapters)
- **IAP**: Unity IAP + RevenueCat
- **Analytika**: GameAnalytics (free) + Firebase + AppsFlyer (UA attribution)

### 9.2 Asset budget (mobil)
- Build size cíl: < 80 MB (důležité pro emerging markets)
- Textury: max 1024×1024, ETC2/ASTC komprese
- 60 FPS na iPhone 8 / Samsung A30

### 9.3 Save / Sync
- Lokální save (PlayerPrefs + JSON)
- Cloud sync přes Firebase (anonymous auth → optional Google/Apple)
- Server-authoritative pro currency (anti-cheat) — async validace

---

## 10. MVP scope (co JE a NENÍ ve verzi 1.0)

### ✅ JE v MVP
- 1 herní mód (Score Rush)
- 5 biomů (Forest, Volcano, Tundra, Desert, Void)
- 80 run / perků
- 4 power-upy
- 30 boss šablon
- Daily login + 3 daily quests
- Liga systém (1 sezóna = 7 dní)
- Battle pass (1 sezóna)
- Rewarded + interstitial + banner ads
- 8 IAP nabídek
- Onboarding tutorial

### ❌ NENÍ v MVP (post-launch roadmap)
- Multiplayer / PvP
- Friends list, gifting
- Klany / guildy
- Další herní módy (Clear Goal, Survival)
- Mini-events (např. limited-time runy)
- Cosmetic system (skiny)
- Cross-platform (web, PC)

---

## 11. Risk register

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|--------|-----------------|-------|----------|
| D1 retence < 35 % | Střední | Vysoký | Soft launch + iterace onboardingu |
| CPI > $1 | Vysoká (saturovaný trh) | Vysoký | Creative testing (10+ video adů) |
| Generátor produkuje frustrující levely | Střední | Vysoký | Hluboký playtest + telemetrie failů |
| Boss levely jsou "unfair" | Vysoká | Střední | Manuální tuning + difficulty data |
| Nízká IAP konverze | Vysoká | Vysoký | A/B test offer wall, Starter Pack timing |
| Crashe na low-end Androidu | Střední | Vysoký | Testovací matice, Firebase Crashlytics |

---

## 12. Production roadmap (16 týdnů)

| Sprint | Týdny | Deliverable |
|--------|-------|-------------|
| S1 | 1–2 | Core mechanika prototyp (Unity), block placement, line clear |
| S2 | 3–4 | Procedurální generátor, difficulty curve, 30 levelů playtest |
| S3 | 5–6 | Roguelite layer (rune systém, 20 run), 1 biom |
| S4 | 7–8 | Meta progression, ekonomika, save system |
| S5 | 9–10 | Onboarding, UI/UX polish, art pass |
| S6 | 11–12 | Ad + IAP integrace, 5 biomů, 80 run |
| S7 | 13 | Soft launch (PH, BR, ID) — 1000 instalů přes UA |
| S8 | 14–15 | Iterace na základě dat (D1, retence, ARPU) |
| S9 | 16 | Global launch + ASO + UA scale-up |

---

## 13. Success metrics (kdy je hra úspěšná)

**Minimum viable** (pokračovat ve vývoji):
- D1 ≥ 35 %, D7 ≥ 12 %, ARPDAU ≥ $0.08

**Healthy product** (scaling):
- D1 ≥ 45 %, D7 ≥ 20 %, D30 ≥ 8 %, ARPDAU ≥ $0.15, LTV/CPI ≥ 1.5

**Hit potential** (top 100):
- D1 ≥ 50 %, D30 ≥ 12 %, ARPDAU ≥ $0.30, LTV/CPI ≥ 2.5

---

## 14. Open questions / decisions needed

1. **Art style**: cartoon (Royal Match) vs. minimalist (Block Blast) vs. magical (Genshin lite)? → ovlivní CPI v různých regionech
2. **Theme**: fantasy vs. sci-fi vs. cute animals? → A/B test creatives
3. **Monetization tilt**: aggressive (Block Blast) vs. friendly (Royal Match)? → ovlivní D30 vs. ARPDAU trade-off
4. **Engine final**: Unity vs. Godot (open-source, levnější) vs. nativní?
5. **Studio model**: solo dev vs. malý tým (2 dev + 1 artist + 1 UA)?

---

*Další krok: validace prototypem (Sprint 1–2) → playtest 5 lidí → "fun test" pass / fail rozhoduje o pokračování.*

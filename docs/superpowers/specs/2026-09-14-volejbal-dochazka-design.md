# Volejbalová docházka a vyúčtování — návrh

Datum: 2026-09-14
Stav: návrh k odsouhlasení

## 1. Účel

Webová aplikace pro tým **Smečaři bez hranic** (AVL, 10. liga Sašova divize, Praha):

- evidence docházky na nedělních trénincích,
- rozpočítání ceny haly mezi přítomné,
- vyúčtování po ~2 měsících s QR platbou a evidencí zaplaceno/nezaplaceno,
- evidence zápasů a výpočet týmového i individuálního win rate.

Provoz musí být zdarma.

## 2. Rozhodnutí a jejich důvody

| Rozhodnutí | Důvod |
|---|---|
| Pouze QR platba (SPD), žádná platební brána | Stripe/GoPay stojí poplatky nebo paušál. QR platba je v ČR zdarma a univerzální. |
| Číslo účtu se zadává v českém formátu, IBAN se dopočítá | SPD vyžaduje v poli `ACC` IBAN. Převod je deterministický, není potřeba externí služba. |
| Zápis docházky výhradně organizátorem | Zvolená varianta. Ruší potřebu identity hráče, hráčské rozhraní je jen pro čtení. |
| Veřejná část bez ochrany, admin za PINem | Data nejsou citlivá, tým je malý. Odpadá registrace i správa účtů. |
| Zápasy zadávané ručně | avlka.cz nemá datumy zápasů ani sestavy a sezóna 2026/2027 zatím nemá odehráno. Scraping neušetří práci. |
| Postgres (Neon), ne SQLite soubor | Kádr je proměnlivý a historie se má držet roky. Free tier bohatě stačí. |

### Nezařazeno záměrně (YAGNI)

- Přihlašování hráčů, e-maily, notifikace.
- Přihlašování na trénink dopředu.
- Scraper avlka.cz — samostatná, pozdější fáze (viz §10).
- Vícetýmovost, více sezón jako první-třídní entita.

## 3. Technologie

- **Next.js 15** (App Router), TypeScript, React Server Components.
- **Tailwind CSS** + shadcn/ui.
- **Neon Postgres** přes Vercel Marketplace, **Drizzle ORM** + drizzle-kit migrace.
- Mutace přes **Server Actions**. Žádné REST API, žádný klientský data fetching.
- `qrcode` pro render QR kódu (server-side, SVG).
- **Vitest** pro doménovou logiku.
- Nasazení **Vercel Hobby**.

**Monitoring využití:** Vercel Web Analytics + Speed Insights (na Hobby zdarma), Neon dashboard pro velikost DB a compute hodiny.

## 4. Vizuální styl

Černo-růžová, dark-first. Zpracovat pomocí skillu `design-taste-frontend`, ne jako generický shadcn default.

Návrh tokenů (upřesní se při implementaci):

```
--bg          #0A0A0B   plocha stránky
--surface     #141417   karty, panely
--surface-2   #1D1D21   hover, zvýraznění
--border      #2A2A30
--text        #F4F4F5
--text-muted  #8A8A93
--accent      #FF2D78   růžová — primární akce, zvýraznění
--accent-dim  #C4165A   hover stavu accentu
--ok          #34D399   zaplaceno, výhra
--warn        #FBBF24   nezaplaceno
--danger      #F87171   prohra, zrušený trénink
```

Zásady: růžová je akcent, ne výplň — používá se pro primární akci, aktivní stav a klíčové číslo na stránce, ne pro každý prvek. Typografie s výrazným kontrastem velikostí (částky a statistiky velké, popisky malé). Mobil je primární zařízení — docházka se odklikává na telefonu.

## 5. Datový model

```
players
  id            serial pk
  name          text not null
  contact       text null            -- telefon/nick, volitelné
  archivedAt    timestamp null       -- vyplněno = odešel z týmu
  createdAt     timestamp not null

trainings
  id            serial pk
  date          date not null unique
  priceCzk      integer not null default 1350
  status        enum('held','cancelled') not null
  note          text null
  createdAt     timestamp not null

attendance
  trainingId    fk trainings on delete cascade
  playerId      fk players
  guests        integer not null default 0   -- kolik +1 hráč přivedl
  pk (trainingId, playerId)
  -- existence řádku = hráč byl přítomen

matches
  id            serial pk
  date          date not null
  opponent      text not null
  result        enum('win','loss') not null
  scoreText     text null            -- volně, např. "2:1"
  note          text null

matchAppearances
  matchId       fk matches on delete cascade
  playerId      fk players
  pk (matchId, playerId)

settlements
  id            serial pk
  label         text not null        -- "Září–Říjen 2026"
  periodStart   date not null
  periodEnd     date not null
  closedAt      timestamp null       -- null = koncept, jinak zmrazeno
  createdAt     timestamp not null

settlementItems
  id            serial pk
  settlementId  fk settlements on delete cascade
  playerId      fk players
  amountCzk     integer not null     -- zmrazená částka při uzavření
  paid          boolean not null default false
  paidAt        timestamp null
  note          text null
  unique (settlementId, playerId)
```

Archivace hráče nastaví `archivedAt`. Historie zůstává, hráč zmizí ze seznamů pro nové tréninky a zápasy. Lze vrátit.

## 6. Výpočet vyúčtování

Jádro domény. Čistá funkce bez závislosti na DB, plně testovatelná.

Pro každý trénink v období se `status = 'held'`:

```
hlavy        = Σ přes přítomné (1 + guests)
podílNaHlavu = priceCzk / hlavy          — přesná hodnota, NEzaokrouhluje se
podíl hráče  = podílNaHlavu × (1 + jeho guests)
```

Dluh hráče za období = součet jeho podílů přes všechny proběhlé tréninky. **Zaokrouhlení na celé Kč až na tomto součtu**, matematicky (half-up). Průběžné zaokrouhlování by při 8 trénincích způsobilo drift až o jednotky korun.

Zrušené tréninky (`status = 'cancelled'`) se do výpočtu nezahrnují vůbec.

Trénink, který proběhl, ale nemá žádnou docházku, se přeskočí (dělení nulou) a admin na něj dostane varování v náhledu.

### Kontrola rozdílu

Admin v náhledu vidí:
- součet ceny hal za období,
- součet zaokrouhlených částek hráčů,
- rozdíl (typicky ±5 Kč).

Rozdíl se nikam nepřerozděluje — jen se zobrazí, aby organizátor věděl, kolik doplácí nebo mu zbývá.

### Uzavření období

`closedAt` se vyplní a spočítané částky se zapíší do `settlementItems`. Od té chvíle jsou zmrazené — pozdější změna docházky je nerozhodí. Uzavření lze vrátit (`closedAt = null`) a přepočítat.

Otevřené (neuzavřené) období zobrazuje částky počítané za běhu.

### Testovací případy

- základní dělení bez hostů,
- hráč s jedním a více `guests` platí násobek,
- host zvyšuje dělitel, takže ostatním se cena sníží,
- zrušený trénink se ignoruje,
- hráč přidaný uprostřed období platí jen za tréninky, kde byl,
- archivovaný hráč s dluhem se ve vyúčtování stále objeví,
- zaokrouhlovací drift: 3 hráči, 1350 Kč, 8 tréninků → součet nesmí utéct o víc než 1 Kč na hráče,
- proběhlý trénink s nulovou docházkou nespadne.

## 7. Platby

Konfigurace v env proměnných:

```
BANK_ACCOUNT_PREFIX   volitelné, např. "19"
BANK_ACCOUNT_NUMBER   např. "2000145399"
BANK_CODE             např. "0800"
PAYEE_NAME            volitelné, jméno příjemce do QR
```

Z nich se dopočítá IBAN: `CZ` + kontrolní číslice (mod-97) + `bankCode` + `prefix` doplněný na 6 míst + `number` doplněné na 10 míst. Funkce je čistá a testuje se proti známým dvojicím účet↔IBAN.

SPD payload:

```
SPD*1.0*ACC:<IBAN>*AM:<částka>.00*CC:CZK*MSG:<label období>*X-VS:<variabilní symbol>
```

Variabilní symbol = `YYYYMM` konce období + pořadové číslo hráče, aby šly platby rozlišit. Přesný tvar se doladí při implementaci.

QR se renderuje server-side jako SVG. Vedle QR se vždy zobrazí i **číslo účtu, částka a VS textově**, aby šla platba zadat ručně — QR čtečka není samozřejmost.

Stav `paid` překlápí organizátor ručně v adminu.

## 8. Přístup

- Veřejné stránky: bez jakékoliv ochrany.
- `/admin/*`: PIN z env `ADMIN_PIN`. Po zadání se nastaví httpOnly, Secure, SameSite=Lax cookie s HMAC podpisem (`AUTH_SECRET`), platnost 90 dní. Ověření v middleware.
- Server Actions, které mění data, ověřují cookie samostatně — middleware sám o sobě není bezpečnostní hranice pro akce.
- Rate limit na ověření PINu: počítadlo pokusů v paměti, po 5 neúspěších 15 minut blok. Na tuto velikost stačí.

## 9. Stránky

### Veřejné

| Cesta | Obsah |
|---|---|
| `/` | Příští trénink, posledních 5 tréninků s počtem lidí a cenou na hlavu, přehled kdo dluží |
| `/treninky` | Historie tréninků: datum, stav, kdo byl, hosté, cena na hlavu |
| `/zapasy` | Kalendář zápasů, týmový win rate, tabulka individuálních win rate |
| `/platby` | Aktuální období: seznam hráčů, dlužná částka, stav. Detail hráče = QR + údaje k platbě |

### Admin

| Cesta | Obsah |
|---|---|
| `/admin` | Rozcestník + stav (neuzavřené období, tréninky bez docházky) |
| `/admin/hraci` | Přidat, přejmenovat, upravit kontakt, archivovat, vrátit z archivu |
| `/admin/treninky` | Založit trénink, přepnout proběhl/zrušen, mřížka docházky s počtem hostů |
| `/admin/zapasy` | Založit zápas, soupeř, výsledek, skóre, kdo nastoupil |
| `/admin/vyuctovani` | Založit období, náhled spočítaných částek, uzavřít, odškrtávat zaplaceno |

Mřížka docházky je hlavní obrazovka používaná každý týden — musí jít odklikat na mobilu na jeden zátah: seznam aktivních hráčů, přepínač přítomen, u přítomného stepper na počet hostů.

## 10. Pozdější fáze (mimo tento spec)

**Scraper avlka.cz.** Až sezóna poběží, přidat v adminu tlačítko „načíst z AVL": stáhne `avlka.cz/init/action/asynTransfer/drawLeague/?league=<id>`, rozparsuje matici vzájemných zápasů a nabídne nezadané zápasy jako koncepty (soupeř + výsledek). Datum a sestavu vždy doplní organizátor.

Omezení zdroje, ověřená 14. 9. 2026: žádné datumy zápasů, opakované zápasy sloučené do jedné buňky, ID ligy se mění s postupem týmu (aktuálně 469), sezóna 2026/2027 zatím bez odehraných zápasů.

Datový model zápasů je na to připravený — přibyla by jen nullable vazba na zdroj.

## 11. Struktura kódu

```
src/
  app/                     stránky (veřejné + admin)
  db/
    schema.ts              Drizzle schéma
    index.ts               klient
  domain/
    settlement.ts          výpočet vyúčtování — čisté funkce
    settlement.test.ts
    iban.ts                české číslo účtu → IBAN
    iban.test.ts
    spd.ts                 SPD payload
    spd.test.ts
    stats.ts               win rate
    stats.test.ts
  actions/                 Server Actions, tenké — validace + volání domény + DB
  components/
  lib/auth.ts              PIN, podpis cookie
```

Doménová vrstva nezná Next.js ani databázi — dostává prostá data, vrací prostá data. To je ta část, kterou stojí za to testovat, a testy pak běží v milisekundách.

## 12. Otevřené body k doplnění před implementací

- Seznam hráčů pro seed (jinak se naklikají v adminu).
- Číslo účtu pro QR platby (lze doplnit až při nasazení, je to env proměnná).

# Volejbalová docházka — implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Webová aplikace pro evidenci docházky na volejbalových trénincích, rozpočítání ceny haly mezi přítomné, dvouměsíční vyúčtování s QR platbou a statistiky zápasů.

**Architecture:** Next.js App Router s React Server Components. Veškerá doménová logika (výpočet vyúčtování, IBAN, SPD payload, win rate) žije v `src/domain/` jako čisté funkce bez znalosti Next.js i databáze — jen tyhle soubory mají unit testy. Mutace jdou přes Server Actions, které jsou tenké: validace vstupu, volání domény, zápis do DB. Veřejné stránky jsou bez ochrany, `/admin/*` za PINem v podepsané cookie.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Neon Postgres, Drizzle ORM, Vitest, Zod, `qrcode`, Vercel Hobby.

**Spec:** `docs/superpowers/specs/2026-09-14-volejbal-dochazka-design.md`

## Global Constraints

- Jazyk celého UI je **čeština**. Žádné anglické popisky ve viditelném rozhraní. Identifikátory v kódu anglicky.
- Výchozí cena tréninku: **1350 Kč**. Trénink je v **neděli 18:30–20:30**.
- Měna je vždy **CZK**, částky se ukládají jako **celá čísla korun** (`integer`), nikdy ne jako float ani halíře.
- Zaokrouhlování dluhu probíhá **až na součtu za celé období**, nikdy po jednotlivých trénincích.
- **Zrušené tréninky** (`status = 'cancelled'`) se do výpočtu peněz nezahrnují vůbec.
- Mutace dat výhradně přes **Server Actions**. Žádné route handlery pro CRUD, žádný klientský `fetch` na vlastní API.
- Každá Server Action, která zapisuje, **sama ověří admin cookie**. Middleware není jediná bariéra.
- Testují se **pouze soubory v `src/domain/`**. UI se netestuje automatizovaně.
- Paleta (CSS proměnné, definované jednou v `globals.css`):
  `--bg #0A0A0B`, `--surface #141417`, `--surface-2 #1D1D21`, `--border #2A2A30`,
  `--text #F4F4F5`, `--text-muted #8A8A93`, `--accent #FF2D78`, `--accent-dim #C4165A`,
  `--ok #34D399`, `--warn #FBBF24`, `--danger #F87171`.
- Růžová `--accent` je akcent, ne výplň: primární tlačítko, aktivní stav, jedno klíčové číslo na stránce. Nikdy ne jako pozadí velké plochy.
- Primární zařízení je **mobil**. Každá admin obrazovka musí být použitelná jednou rukou na 390px šířky.
- Commituj po každém dokončeném kroku, kde to plán říká.

---

## Struktura souborů

```
src/
  app/
    layout.tsx                    kořenový layout, fonty, theme
    globals.css                   CSS proměnné, Tailwind
    page.tsx                      / — přehled
    treninky/page.tsx             veřejný seznam tréninků
    zapasy/page.tsx               veřejné zápasy + win rate
    platby/page.tsx               veřejný přehled dluhů
    platby/[playerId]/page.tsx    QR + údaje k platbě
    admin/
      layout.tsx                  admin shell, navigace
      page.tsx                    rozcestník
      prihlaseni/page.tsx         zadání PINu
      hraci/page.tsx
      treninky/page.tsx
      treninky/[id]/page.tsx      mřížka docházky
      zapasy/page.tsx
      zapasy/[id]/page.tsx        sestava zápasu
      vyuctovani/page.tsx
      vyuctovani/[id]/page.tsx    náhled, uzavření, odškrtávání
  db/
    schema.ts                     Drizzle schéma
    index.ts                      klient
    queries.ts                    read dotazy sdílené mezi stránkami
  domain/
    iban.ts + iban.test.ts        české číslo účtu → IBAN
    spd.ts + spd.test.ts          SPD payload pro QR platbu
    settlement.ts + .test.ts      výpočet dluhů
    stats.ts + stats.test.ts      win rate
  actions/
    players.ts  trainings.ts  matches.ts  settlements.ts  auth.ts
  components/
    ui/                           shadcn primitiva
    AttendanceGrid.tsx            klientská mřížka docházky
    PaymentQr.tsx                 QR + textové údaje
    StatCard.tsx  PageHeader.tsx  Money.tsx
  lib/
    auth.ts                       PIN, HMAC podpis cookie, requireAdmin()
    format.ts                     formát částek a datumů v češtině
  middleware.ts
```

---

### Task 1: Scaffold projektu

**Files:**
- Create: celý kostra projektu přes `create-next-app`
- Create: `vitest.config.ts`
- Create: `src/domain/smoke.test.ts` (dočasný, smaže se v Tasku 2)
- Modify: `package.json` (skript `test`)

**Interfaces:**
- Consumes: nic
- Produces: funkční `npm run dev`, `npm run build`, `npm test`

- [ ] **Step 1: Vygeneruj projekt**

Spusť v kořeni repozitáře (adresář obsahuje `docs/` a `.git/`, jinak je prázdný):

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*" --no-turbopack --yes
```

- [ ] **Step 2: Nainstaluj závislosti**

```bash
npm install drizzle-orm @neondatabase/serverless zod qrcode
npm install -D drizzle-kit vitest @types/qrcode dotenv
```

- [ ] **Step 3: Vytvoř `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    include: ['src/domain/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```

- [ ] **Step 4: Přidej testovací skripty do `package.json`**

Do `"scripts"` doplň:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Napiš smoke test**

`src/domain/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('testovací běh', () => {
  it('funguje', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Ověř, že testy i build běží**

```bash
npm test
npm run build
```

Expected: test PASS, build projde bez chyb.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js projektu s Vitest"
```

---

### Task 2: Doména — převod českého čísla účtu na IBAN

**Files:**
- Create: `src/domain/iban.ts`
- Test: `src/domain/iban.test.ts`
- Delete: `src/domain/smoke.test.ts`

**Interfaces:**
- Consumes: nic
- Produces: `toCzechIban(account: CzechAccount): string` a typ
  `CzechAccount = { prefix?: string; number: string; bankCode: string }`.
  Vrací 24znakový IBAN bez mezer, např. `CZ6508000000192000145399`.
  Vyhodí `Error` při neplatném vstupu.

**Pozadí:** Český IBAN má tvar `CZ` + 2 kontrolní číslice + 4místný kód banky + 6místné předčíslí (doplněné nulami zleva) + 10místné číslo účtu (doplněné nulami zleva). Kontrolní číslice se počítají tak, že se za BBAN připojí `1235` (číselný přepis `CZ`, kde A=10 … Z=35, tedy C=12, Z=35) a `00`, spočítá se zbytek po dělení 97 a kontrolní číslice jsou `98 − zbytek`, doplněné na dvě místa. Číslo je delší než `Number.MAX_SAFE_INTEGER`, proto `BigInt`.

- [ ] **Step 1: Napiš failing testy**

`src/domain/iban.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { toCzechIban } from './iban'

describe('toCzechIban', () => {
  it('převede účet s předčíslím', () => {
    expect(toCzechIban({ prefix: '19', number: '2000145399', bankCode: '0800' }))
      .toBe('CZ6508000000192000145399')
  })

  it('převede účet bez předčíslí', () => {
    expect(toCzechIban({ number: '2601234567', bankCode: '2010' }))
      .toBe('CZ6120100000002601234567')
  })

  it('doplní nuly zleva u krátkého čísla účtu', () => {
    const iban = toCzechIban({ number: '123456', bankCode: '0100' })
    expect(iban).toHaveLength(24)
    expect(iban.slice(4)).toBe('0100' + '000000' + '0000123456')
  })

  it('odstraní mezery a pomlčky ze vstupu', () => {
    expect(toCzechIban({ prefix: '19', number: '2000 145 399', bankCode: '0800' }))
      .toBe('CZ6508000000192000145399')
  })

  it('odmítne nečíselné znaky', () => {
    expect(() => toCzechIban({ number: '12ab', bankCode: '0800' })).toThrow()
  })

  it('odmítne neplatný kód banky', () => {
    expect(() => toCzechIban({ number: '123456', bankCode: '80' })).toThrow()
  })

  it('odmítne příliš dlouhé číslo účtu', () => {
    expect(() => toCzechIban({ number: '12345678901', bankCode: '0800' })).toThrow()
  })
})
```

- [ ] **Step 2: Spusť test, ověř že padá**

```bash
npx vitest run src/domain/iban.test.ts
```

Expected: FAIL — `Failed to resolve import "./iban"`.

- [ ] **Step 3: Implementuj**

`src/domain/iban.ts`:

```ts
export type CzechAccount = {
  prefix?: string
  number: string
  bankCode: string
}

/** Odstraní mezery a pomlčky, ověří že zbydou jen číslice. */
function digitsOnly(value: string, label: string): string {
  const cleaned = value.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(cleaned)) {
    throw new Error(`${label} smí obsahovat jen číslice, dostal jsem "${value}"`)
  }
  return cleaned
}

export function toCzechIban(account: CzechAccount): string {
  const prefix = digitsOnly(account.prefix ?? '0', 'Předčíslí účtu')
  const number = digitsOnly(account.number, 'Číslo účtu')
  const bankCode = digitsOnly(account.bankCode, 'Kód banky')

  if (bankCode.length !== 4) {
    throw new Error(`Kód banky musí mít 4 číslice, dostal jsem "${account.bankCode}"`)
  }
  if (prefix.length > 6) {
    throw new Error(`Předčíslí smí mít nejvýš 6 číslic, dostal jsem "${account.prefix}"`)
  }
  if (number.length > 10) {
    throw new Error(`Číslo účtu smí mít nejvýš 10 číslic, dostal jsem "${account.number}"`)
  }

  const bban = bankCode + prefix.padStart(6, '0') + number.padStart(10, '0')

  // "CZ" -> C=12, Z=35 -> "1235"; "00" je placeholder kontrolních číslic.
  const remainder = BigInt(bban + '123500') % 97n
  const checkDigits = String(98n - remainder).padStart(2, '0')

  return `CZ${checkDigits}${bban}`
}
```

- [ ] **Step 4: Spusť test, ověř že prochází**

```bash
npx vitest run src/domain/iban.test.ts
```

Expected: PASS, 7 testů.

Pokud některý z prvních dvou testů selže, ověř očekávaný IBAN v nezávislé kalkulačce a oprav **test**, ne implementaci — algoritmus je normovaný, chyba bude v ručně opsané očekávané hodnotě.

- [ ] **Step 5: Smaž smoke test a commitni**

```bash
rm src/domain/smoke.test.ts
git add -A
git commit -m "feat(domain): převod českého čísla účtu na IBAN"
```

---

### Task 3: Doména — SPD payload pro QR platbu

**Files:**
- Create: `src/domain/spd.ts`
- Test: `src/domain/spd.test.ts`

**Interfaces:**
- Consumes: `toCzechIban` z Tasku 2
- Produces: `buildSpdPayload(input: SpdInput): string`, kde
  `SpdInput = { iban: string; amountCzk: number; message: string; variableSymbol: string; payeeName?: string }`.
  Vrací řetězec, který se vloží do QR kódu.

**Pozadí:** SPD („Short Payment Descriptor", standard ČBA) je jeden řádek `SPD*1.0*KLÍČ:hodnota*KLÍČ:hodnota`. `ACC` musí být první a je povinný. Hodnoty nesmí obsahovat `*`. Zpráva `MSG` má limit 60 znaků a smí obsahovat jen základní ASCII — česká diakritika se musí odstranit, jinak čtečky v bankách selžou nebo zobrazí zmatek.

- [ ] **Step 1: Napiš failing testy**

`src/domain/spd.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildSpdPayload, stripDiacritics } from './spd'

const IBAN = 'CZ6508000000192000145399'

describe('stripDiacritics', () => {
  it('odstraní českou diakritiku', () => {
    expect(stripDiacritics('Září–Říjen Smečaři')).toBe('Zari-Rijen Smecari')
  })
})

describe('buildSpdPayload', () => {
  it('poskládá payload ve správném pořadí polí', () => {
    expect(buildSpdPayload({
      iban: IBAN,
      amountCzk: 1234,
      message: 'Volejbal zari rijen',
      variableSymbol: '2026101',
    })).toBe(
      `SPD*1.0*ACC:${IBAN}*AM:1234.00*CC:CZK*MSG:VOLEJBAL ZARI RIJEN*X-VS:2026101`
    )
  })

  it('odstraní diakritiku ze zprávy a převede na velká písmena', () => {
    const payload = buildSpdPayload({
      iban: IBAN, amountCzk: 100, message: 'Září–Říjen', variableSymbol: '1',
    })
    expect(payload).toContain('*MSG:ZARI-RIJEN*')
  })

  it('zkrátí zprávu na 60 znaků', () => {
    const payload = buildSpdPayload({
      iban: IBAN, amountCzk: 100, message: 'A'.repeat(80), variableSymbol: '1',
    })
    const msg = payload.split('*MSG:')[1].split('*')[0]
    expect(msg).toHaveLength(60)
  })

  it('přidá jméno příjemce, pokud je zadané', () => {
    const payload = buildSpdPayload({
      iban: IBAN, amountCzk: 100, message: 'Test', variableSymbol: '1',
      payeeName: 'Jan Novák',
    })
    expect(payload).toContain('*RN:JAN NOVAK')
  })

  it('vynechá jméno příjemce, pokud zadané není', () => {
    const payload = buildSpdPayload({
      iban: IBAN, amountCzk: 100, message: 'Test', variableSymbol: '1',
    })
    expect(payload).not.toContain('*RN:')
  })

  it('odmítne zápornou nebo nulovou částku', () => {
    expect(() => buildSpdPayload({
      iban: IBAN, amountCzk: 0, message: 'Test', variableSymbol: '1',
    })).toThrow()
  })

  it('odmítne hvězdičku v hodnotě, aby nešlo rozbít formát', () => {
    expect(() => buildSpdPayload({
      iban: IBAN, amountCzk: 100, message: 'Test', variableSymbol: '1*2',
    })).toThrow()
  })
})
```

- [ ] **Step 2: Spusť test, ověř že padá**

```bash
npx vitest run src/domain/spd.test.ts
```

Expected: FAIL — modul neexistuje.

- [ ] **Step 3: Implementuj**

`src/domain/spd.ts`:

```ts
export type SpdInput = {
  iban: string
  amountCzk: number
  message: string
  variableSymbol: string
  payeeName?: string
}

const MAX_MESSAGE_LENGTH = 60

/** Rozloží znaky na základ + diakritické znaménko a znaménka zahodí. */
export function stripDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―]/g, '-') // různé typografické pomlčky na ASCII
}

/** Připraví hodnotu pro SPD pole: bez diakritiky, velkými písmeny, bez hvězdičky. */
function sanitize(value: string, maxLength: number): string {
  const clean = stripDiacritics(value).toUpperCase().trim()
  if (clean.includes('*')) {
    throw new Error(`Hodnota pro QR platbu nesmí obsahovat hvězdičku: "${value}"`)
  }
  return clean.slice(0, maxLength)
}

export function buildSpdPayload(input: SpdInput): string {
  if (!Number.isFinite(input.amountCzk) || input.amountCzk <= 0) {
    throw new Error(`Částka musí být kladná, dostal jsem ${input.amountCzk}`)
  }
  if (!/^\d{1,10}$/.test(input.variableSymbol)) {
    throw new Error(
      `Variabilní symbol musí být 1 až 10 číslic, dostal jsem "${input.variableSymbol}"`
    )
  }

  const fields: string[] = [
    `ACC:${input.iban}`,
    `AM:${input.amountCzk.toFixed(2)}`,
    `CC:CZK`,
    `MSG:${sanitize(input.message, MAX_MESSAGE_LENGTH)}`,
    `X-VS:${input.variableSymbol}`,
  ]

  if (input.payeeName) {
    fields.push(`RN:${sanitize(input.payeeName, 35)}`)
  }

  return `SPD*1.0*${fields.join('*')}`
}
```

- [ ] **Step 4: Spusť testy**

```bash
npx vitest run src/domain/spd.test.ts
```

Expected: PASS, 8 testů.

- [ ] **Step 5: Commit**

```bash
git add src/domain/spd.ts src/domain/spd.test.ts
git commit -m "feat(domain): generování SPD payloadu pro QR platbu"
```

---

### Task 4: Doména — výpočet vyúčtování

Nejdůležitější task v plánu. Tady se počítají skutečné peníze mezi kamarády, takže testy jdou první a jsou podrobné.

**Files:**
- Create: `src/domain/settlement.ts`
- Test: `src/domain/settlement.test.ts`

**Interfaces:**
- Consumes: nic
- Produces:

```ts
export type AttendanceEntry = { playerId: number; guests: number }
export type TrainingInput = {
  id: number
  priceCzk: number
  status: 'held' | 'cancelled'
  attendance: AttendanceEntry[]
}
export type PlayerDebt = { playerId: number; amountCzk: number }
export type SettlementResult = {
  debts: PlayerDebt[]          // seřazené vzestupně podle playerId
  totalPriceCzk: number        // součet cen proběhlých, započítaných tréninků
  totalChargedCzk: number      // součet zaokrouhlených dluhů
  differenceCzk: number        // totalChargedCzk − totalPriceCzk
  skippedTrainingIds: number[] // proběhlé tréninky bez docházky
}
export function calculateSettlement(trainings: TrainingInput[]): SettlementResult
```

- [ ] **Step 1: Napiš failing testy**

`src/domain/settlement.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calculateSettlement, type TrainingInput } from './settlement'

/** Zkratka: trénink, kde uvedení hráči byli bez hostů. */
function held(id: number, priceCzk: number, playerIds: number[]): TrainingInput {
  return {
    id, priceCzk, status: 'held',
    attendance: playerIds.map((playerId) => ({ playerId, guests: 0 })),
  }
}

function debtOf(result: ReturnType<typeof calculateSettlement>, playerId: number) {
  return result.debts.find((d) => d.playerId === playerId)?.amountCzk
}

describe('calculateSettlement', () => {
  it('rozdělí cenu rovným dílem mezi přítomné', () => {
    const result = calculateSettlement([held(1, 1200, [10, 20, 30])])
    expect(debtOf(result, 10)).toBe(400)
    expect(debtOf(result, 20)).toBe(400)
    expect(debtOf(result, 30)).toBe(400)
    expect(result.totalPriceCzk).toBe(1200)
    expect(result.totalChargedCzk).toBe(1200)
    expect(result.differenceCzk).toBe(0)
  })

  it('nezapočítá nepřítomného hráče', () => {
    const result = calculateSettlement([held(1, 1000, [10, 20])])
    expect(debtOf(result, 30)).toBeUndefined()
  })

  it('host zvyšuje dělitel, takže ostatním se cena sníží', () => {
    // 4 hlavy: hráč 10 + jeho host, hráč 20, hráč 30 -> 1200/4 = 300
    const result = calculateSettlement([{
      id: 1, priceCzk: 1200, status: 'held',
      attendance: [
        { playerId: 10, guests: 1 },
        { playerId: 20, guests: 0 },
        { playerId: 30, guests: 0 },
      ],
    }])
    expect(debtOf(result, 20)).toBe(300)
    expect(debtOf(result, 30)).toBe(300)
  })

  it('hráč platí za sebe i za své hosty', () => {
    const result = calculateSettlement([{
      id: 1, priceCzk: 1200, status: 'held',
      attendance: [
        { playerId: 10, guests: 2 },  // 3 hlavy
        { playerId: 20, guests: 0 },  // 1 hlava
      ],
    }])
    // 4 hlavy, 300 na hlavu
    expect(debtOf(result, 10)).toBe(900)
    expect(debtOf(result, 20)).toBe(300)
  })

  it('zrušený trénink ignoruje úplně', () => {
    const result = calculateSettlement([
      held(1, 1350, [10, 20]),
      { id: 2, priceCzk: 1350, status: 'cancelled', attendance: [{ playerId: 10, guests: 0 }] },
    ])
    expect(debtOf(result, 10)).toBe(675)
    expect(result.totalPriceCzk).toBe(1350)
  })

  it('proběhlý trénink bez docházky přeskočí a nahlásí ho', () => {
    const result = calculateSettlement([
      held(1, 1000, [10, 20]),
      { id: 2, priceCzk: 1350, status: 'held', attendance: [] },
    ])
    expect(result.skippedTrainingIds).toEqual([2])
    expect(result.totalPriceCzk).toBe(1000)
    expect(debtOf(result, 10)).toBe(500)
  })

  it('hráč přidaný uprostřed období platí jen za tréninky, kde byl', () => {
    const result = calculateSettlement([
      held(1, 1000, [10, 20]),
      held(2, 1000, [10, 20, 30]),
    ])
    expect(debtOf(result, 30)).toBe(333)
    expect(debtOf(result, 10)).toBe(833) // 500 + 333.33 = 833.33 -> 833
  })

  it('zaokrouhluje až na součtu za období, ne po trénincích', () => {
    // 1350/3 = 450 přesně; použij cenu, která se nedělí: 1000/3 = 333.333…
    const result = calculateSettlement([
      held(1, 1000, [10, 20, 30]),
      held(2, 1000, [10, 20, 30]),
      held(3, 1000, [10, 20, 30]),
    ])
    // přesně 1000 na hráče; zaokrouhlení po trénincích by dalo 999
    expect(debtOf(result, 10)).toBe(1000)
    expect(result.differenceCzk).toBe(0)
  })

  it('zaokrouhluje matematicky nahoru při přesné půlce', () => {
    const result = calculateSettlement([held(1, 1350, [10, 20, 30, 40])])
    // 1350/4 = 337.5 -> 338
    expect(debtOf(result, 10)).toBe(338)
    expect(result.totalChargedCzk).toBe(1352)
    expect(result.differenceCzk).toBe(2)
  })

  it('drift nepřekročí 1 Kč na hráče ani po osmi trénincích', () => {
    const trainings = Array.from({ length: 8 }, (_, i) => held(i + 1, 1350, [10, 20, 30]))
    const result = calculateSettlement(trainings)
    expect(Math.abs(result.differenceCzk)).toBeLessThanOrEqual(3)
    for (const debt of result.debts) {
      expect(Math.abs(debt.amountCzk - (1350 * 8) / 3)).toBeLessThanOrEqual(1)
    }
  })

  it('u prázdného období vrátí nulové součty', () => {
    const result = calculateSettlement([])
    expect(result.debts).toEqual([])
    expect(result.totalPriceCzk).toBe(0)
    expect(result.totalChargedCzk).toBe(0)
    expect(result.differenceCzk).toBe(0)
  })

  it('vrací dluhy seřazené podle playerId', () => {
    const result = calculateSettlement([held(1, 900, [30, 10, 20])])
    expect(result.debts.map((d) => d.playerId)).toEqual([10, 20, 30])
  })
})
```

- [ ] **Step 2: Spusť testy, ověř že padají**

```bash
npx vitest run src/domain/settlement.test.ts
```

Expected: FAIL — modul neexistuje.

- [ ] **Step 3: Implementuj**

`src/domain/settlement.ts`:

```ts
export type AttendanceEntry = { playerId: number; guests: number }

export type TrainingInput = {
  id: number
  priceCzk: number
  status: 'held' | 'cancelled'
  attendance: AttendanceEntry[]
}

export type PlayerDebt = { playerId: number; amountCzk: number }

export type SettlementResult = {
  debts: PlayerDebt[]
  totalPriceCzk: number
  totalChargedCzk: number
  differenceCzk: number
  skippedTrainingIds: number[]
}

/**
 * Rozpočítá cenu hal mezi přítomné hráče.
 *
 * Podíly se drží jako přesná desetinná čísla a zaokrouhlují se až na součtu
 * za celé období — zaokrouhlování po jednotlivých trénincích by při osmi
 * trénincích uteklo o jednotky korun.
 */
export function calculateSettlement(trainings: TrainingInput[]): SettlementResult {
  const exactShares = new Map<number, number>()
  const skippedTrainingIds: number[] = []
  let totalPriceCzk = 0

  for (const training of trainings) {
    if (training.status !== 'held') continue

    const heads = training.attendance.reduce((sum, entry) => sum + 1 + entry.guests, 0)
    if (heads === 0) {
      skippedTrainingIds.push(training.id)
      continue
    }

    totalPriceCzk += training.priceCzk
    const perHead = training.priceCzk / heads

    for (const entry of training.attendance) {
      const share = perHead * (1 + entry.guests)
      exactShares.set(entry.playerId, (exactShares.get(entry.playerId) ?? 0) + share)
    }
  }

  const debts: PlayerDebt[] = [...exactShares.entries()]
    .map(([playerId, exact]) => ({ playerId, amountCzk: Math.round(exact) }))
    .sort((a, b) => a.playerId - b.playerId)

  const totalChargedCzk = debts.reduce((sum, debt) => sum + debt.amountCzk, 0)

  return {
    debts,
    totalPriceCzk,
    totalChargedCzk,
    differenceCzk: totalChargedCzk - totalPriceCzk,
    skippedTrainingIds,
  }
}
```

- [ ] **Step 4: Spusť testy**

```bash
npx vitest run src/domain/settlement.test.ts
```

Expected: PASS, 12 testů.

- [ ] **Step 5: Commit**

```bash
git add src/domain/settlement.ts src/domain/settlement.test.ts
git commit -m "feat(domain): výpočet vyúčtování s hosty a zaokrouhlením na období"
```

---

### Task 5: Doména — win rate

**Files:**
- Create: `src/domain/stats.ts`
- Test: `src/domain/stats.test.ts`

**Interfaces:**
- Consumes: nic
- Produces:

```ts
export type MatchInput = { id: number; result: 'win' | 'loss'; playerIds: number[] }
export type WinRate = { wins: number; losses: number; played: number; rate: number | null }
export function teamWinRate(matches: MatchInput[]): WinRate
export function playerWinRate(matches: MatchInput[], playerId: number): WinRate
```

`rate` je podíl v rozsahu 0–1, nebo `null` když hráč (či tým) neodehrál žádný zápas — `null` se v UI zobrazí jako pomlčka, nikdy ne jako 0 %.

- [ ] **Step 1: Napiš failing testy**

`src/domain/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { teamWinRate, playerWinRate, type MatchInput } from './stats'

const matches: MatchInput[] = [
  { id: 1, result: 'win', playerIds: [10, 20] },
  { id: 2, result: 'loss', playerIds: [10, 30] },
  { id: 3, result: 'win', playerIds: [20, 30] },
  { id: 4, result: 'win', playerIds: [10, 20, 30] },
]

describe('teamWinRate', () => {
  it('spočítá poměr výher ze všech zápasů', () => {
    expect(teamWinRate(matches)).toEqual({ wins: 3, losses: 1, played: 4, rate: 0.75 })
  })

  it('bez zápasů vrátí rate null', () => {
    expect(teamWinRate([])).toEqual({ wins: 0, losses: 0, played: 0, rate: null })
  })
})

describe('playerWinRate', () => {
  it('počítá jen zápasy, kde hráč nastoupil', () => {
    // hráč 10: zápasy 1 (W), 2 (L), 4 (W)
    expect(playerWinRate(matches, 10)).toEqual({ wins: 2, losses: 1, played: 3, rate: 2 / 3 })
  })

  it('hráč se stoprocentní úspěšností', () => {
    // hráč 20: zápasy 1, 3, 4 — všechny výhry
    expect(playerWinRate(matches, 20)).toEqual({ wins: 3, losses: 0, played: 3, rate: 1 })
  })

  it('hráč bez odehraného zápasu má rate null', () => {
    expect(playerWinRate(matches, 99)).toEqual({ wins: 0, losses: 0, played: 0, rate: null })
  })
})
```

- [ ] **Step 2: Spusť testy, ověř že padají**

```bash
npx vitest run src/domain/stats.test.ts
```

Expected: FAIL — modul neexistuje.

- [ ] **Step 3: Implementuj**

`src/domain/stats.ts`:

```ts
export type MatchInput = {
  id: number
  result: 'win' | 'loss'
  playerIds: number[]
}

export type WinRate = {
  wins: number
  losses: number
  played: number
  /** Podíl výher 0–1, nebo null když se neodehrál žádný zápas. */
  rate: number | null
}

function summarize(results: ('win' | 'loss')[]): WinRate {
  const wins = results.filter((r) => r === 'win').length
  const played = results.length
  return {
    wins,
    losses: played - wins,
    played,
    rate: played === 0 ? null : wins / played,
  }
}

export function teamWinRate(matches: MatchInput[]): WinRate {
  return summarize(matches.map((m) => m.result))
}

export function playerWinRate(matches: MatchInput[], playerId: number): WinRate {
  return summarize(
    matches.filter((m) => m.playerIds.includes(playerId)).map((m) => m.result)
  )
}
```

- [ ] **Step 4: Spusť testy**

```bash
npx vitest run src/domain/stats.test.ts
```

Expected: PASS, 5 testů.

- [ ] **Step 5: Spusť celou sadu a commitni**

```bash
npm test
git add src/domain/stats.ts src/domain/stats.test.ts
git commit -m "feat(domain): týmový a individuální win rate"
```

---

### Task 6: Databáze — schéma a migrace

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `.env.example`
- Modify: `package.json` (skripty `db:generate`, `db:migrate`)

**Interfaces:**
- Consumes: nic
- Produces: exporty `players`, `trainings`, `attendance`, `matches`, `matchAppearances`,
  `settlements`, `settlementItems` z `@/db/schema` a klient `db` z `@/db`.

- [ ] **Step 1: Vytvoř Neon databázi a zapiš connection string**

Založ Postgres databázi v Neonu (přes Vercel Marketplace nebo přímo na neon.tech, free tier). Zkopíruj connection string do `.env.local`:

```
DATABASE_URL=postgresql://...
```

Vytvoř `.env.example` se stejnými klíči, ale prázdnými hodnotami:

```
DATABASE_URL=
ADMIN_PIN=
AUTH_SECRET=
BANK_ACCOUNT_PREFIX=
BANK_ACCOUNT_NUMBER=
BANK_CODE=
PAYEE_NAME=
```

Ověř, že `.env.local` je pokrytý `.gitignore` (vzor `.env*`).

- [ ] **Step 2: Napiš schéma**

`src/db/schema.ts`:

```ts
import {
  pgTable, serial, text, integer, boolean, date, timestamp, primaryKey, unique, pgEnum,
} from 'drizzle-orm/pg-core'

export const trainingStatus = pgEnum('training_status', ['held', 'cancelled'])
export const matchResult = pgEnum('match_result', ['win', 'loss'])

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contact: text('contact'),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const trainings = pgTable('trainings', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  priceCzk: integer('price_czk').notNull().default(1350),
  status: trainingStatus('status').notNull().default('held'),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const attendance = pgTable('attendance', {
  trainingId: integer('training_id').notNull()
    .references(() => trainings.id, { onDelete: 'cascade' }),
  playerId: integer('player_id').notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  guests: integer('guests').notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.trainingId, t.playerId] }),
}))

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  opponent: text('opponent').notNull(),
  result: matchResult('result').notNull(),
  scoreText: text('score_text'),
  note: text('note'),
})

export const matchAppearances = pgTable('match_appearances', {
  matchId: integer('match_id').notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  playerId: integer('player_id').notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.matchId, t.playerId] }),
}))

export const settlements = pgTable('settlements', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const settlementItems = pgTable('settlement_items', {
  id: serial('id').primaryKey(),
  settlementId: integer('settlement_id').notNull()
    .references(() => settlements.id, { onDelete: 'cascade' }),
  playerId: integer('player_id').notNull().references(() => players.id),
  amountCzk: integer('amount_czk').notNull(),
  paid: boolean('paid').notNull().default(false),
  paidAt: timestamp('paid_at'),
  note: text('note'),
}, (t) => ({
  uniquePlayerPerSettlement: unique().on(t.settlementId, t.playerId),
}))
```

- [ ] **Step 3: Vytvoř klienta**

`src/db/index.ts`:

```ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('Chybí proměnná DATABASE_URL')
}

export const db = drizzle(neon(process.env.DATABASE_URL), { schema })
export { schema }
```

- [ ] **Step 4: Vytvoř konfiguraci drizzle-kit**

`drizzle.config.ts`:

```ts
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

Do `package.json` přidej:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "dotenv -e .env.local -- drizzle-kit migrate"
```

- [ ] **Step 5: Vygeneruj a spusť migraci**

```bash
npm run db:generate
npm run db:migrate
```

Expected: vznikne adresář `drizzle/` s SQL migrací a tabulky se vytvoří v Neonu.

- [ ] **Step 6: Ověř, že se tabulky opravdu vytvořily**

V Neon konzoli (SQL editor) spusť:

```sql
select table_name from information_schema.tables where table_schema = 'public';
```

Expected: 7 tabulek plus `__drizzle_migrations`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(db): Drizzle schéma a první migrace"
```

---

### Task 7: Autentizace organizátora

**Files:**
- Create: `src/lib/auth.ts`, `src/actions/auth.ts`, `src/app/admin/prihlaseni/page.tsx`, `src/middleware.ts`

**Interfaces:**
- Consumes: nic
- Produces:
  - `verifyPin(pin: string): boolean`
  - `createSessionToken(): Promise<string>` a `isValidSessionToken(token: string): Promise<boolean>`
  - `isAdmin(): Promise<boolean>` — přečte cookie v Server Componentě
  - `requireAdmin(): Promise<void>` — vyhodí `Error`, pokud cookie chybí; volá se na začátku **každé** zapisující Server Action
  - Server Actions `loginAction(prevState, formData)` a `logoutAction()`

Token má tvar `<expiraceMs>.<hexHmac>`, kde HMAC je SHA-256 nad řetězcem expirace s klíčem `AUTH_SECRET`. Používá se Web Crypto API, protože běží i v middleware.

- [ ] **Step 1: Doplň proměnné do `.env.local`**

```
ADMIN_PIN=<zvol si šestimístný PIN>
AUTH_SECRET=<náhodný řetězec, např. `openssl rand -hex 32`>
```

- [ ] **Step 2: Implementuj `src/lib/auth.ts`**

```ts
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'volley_admin'
const SESSION_DAYS = 90

function secret(): string {
  const value = process.env.AUTH_SECRET
  if (!value) throw new Error('Chybí proměnná AUTH_SECRET')
  return value
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function verifyPin(pin: string): boolean {
  const expected = process.env.ADMIN_PIN
  if (!expected) throw new Error('Chybí proměnná ADMIN_PIN')
  // Porovnání konstantní délky, aby nešlo PIN uhodnout po znacích.
  if (pin.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < pin.length; i++) diff |= pin.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  return `${expiresAt}.${await sign(String(expiresAt))}`
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [expiresAt, signature] = token.split('.')
  if (!expiresAt || !signature) return false
  if (Number(expiresAt) < Date.now()) return false
  return (await sign(expiresAt)) === signature
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies()
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value)
}

/** Volej na prvním řádku každé Server Action, která zapisuje. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error('Tahle akce je jen pro organizátora.')
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60
```

- [ ] **Step 3: Implementuj přihlašovací akce**

`src/actions/auth.ts`:

```ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyPin, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'

/** Pokusy o PIN v paměti instance. Na velikost tohohle týmu to stačí. */
const attempts = new Map<string, { count: number; blockedUntil: number }>()
const MAX_ATTEMPTS = 5
const BLOCK_MS = 15 * 60 * 1000

export type LoginState = { error?: string }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const record = attempts.get('global') ?? { count: 0, blockedUntil: 0 }
  if (Date.now() < record.blockedUntil) {
    return { error: 'Moc pokusů. Zkus to za 15 minut.' }
  }

  const pin = String(formData.get('pin') ?? '')
  if (!verifyPin(pin)) {
    record.count += 1
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = Date.now() + BLOCK_MS
      record.count = 0
    }
    attempts.set('global', record)
    return { error: 'Špatný PIN.' }
  }

  attempts.delete('global')
  const store = await cookies()
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  redirect('/admin')
}

export async function logoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect('/')
}
```

- [ ] **Step 4: Implementuj middleware**

`src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, isValidSessionToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (await isValidSessionToken(token)) return NextResponse.next()

  const loginUrl = new URL('/admin/prihlaseni', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Chrání /admin a vše pod ním, kromě přihlašovací stránky.
  matcher: ['/admin/((?!prihlaseni).*)', '/admin'],
}
```

Pozor: `src/lib/auth.ts` importuje `next/headers`, což v middleware nejde. Vyřeš to tak, že `sign` a `isValidSessionToken` přesuneš do `src/lib/auth-core.ts` bez importu `next/headers`, a `src/lib/auth.ts` je reexportuje spolu s cookie funkcemi. Middleware importuje jen `auth-core`.

- [ ] **Step 5: Vytvoř přihlašovací stránku**

`src/app/admin/prihlaseni/page.tsx` — klientská komponenta s `useActionState(loginAction, {})`, jedno pole `name="pin"` s `inputMode="numeric"` a `autoFocus`, tlačítko „Přihlásit", pod ním `state.error` v barvě `--danger`.

- [ ] **Step 6: Ověř ručně**

```bash
npm run dev
```

Zkontroluj v prohlížeči:
- `/admin` bez cookie přesměruje na `/admin/prihlaseni`
- špatný PIN zobrazí chybu a nepřihlásí
- správný PIN přesměruje na `/admin`
- po přihlášení `/admin` funguje i po obnovení stránky

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): přihlášení organizátora přes PIN a podepsanou cookie"
```

---

### Task 8: Vizuální základ a layout

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/lib/format.ts`, `src/components/PageHeader.tsx`, `src/components/StatCard.tsx`, `src/components/Money.tsx`, `src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: nic
- Produces:
  - `formatCzk(amount: number): string` — `"1 350 Kč"`, nedělitelné mezery
  - `formatDate(date: string | Date): string` — `"14. 9. 2026"`
  - `formatWinRate(rate: number | null): string` — `"75 %"` nebo `"—"`
  - komponenty `<PageHeader title subtitle? action? />`, `<StatCard label value hint? tone? />`, `<Money value />`

**Pozor:** Tenhle task rozhoduje, jestli appka bude vypadat dobře, nebo jako shadcn demo. Před psaním CSS **použij skill `design-taste-frontend`** a nech ho určit typografickou škálu, rytmus mezer a tvar karet. Paleta je daná v Global Constraints, ale vše ostatní je na tom skillu.

- [ ] **Step 1: Zaveď skill pro vizuální směr**

Vyvolej `design-taste-frontend` se zadáním: sportovní týmová aplikace, dark-first, černá plocha s růžovým akcentem, primárně mobil, hlavní obsah jsou čísla (částky, docházka, procenta). Výstupem je typografická škála, spacing a tvarosloví karet, které použiješ v dalších krocích.

- [ ] **Step 2: Definuj CSS proměnné**

Do `src/app/globals.css` doplň `:root` blok s proměnnými z Global Constraints a nastav `body { background: var(--bg); color: var(--text); }`. Barvy zpřístupni Tailwindu přes `@theme` (Tailwind v4), aby šlo psát `bg-surface`, `text-accent` a podobně.

- [ ] **Step 3: Implementuj formátovací funkce**

`src/lib/format.ts`:

```ts
const czk = new Intl.NumberFormat('cs-CZ', {
  style: 'currency', currency: 'CZK', maximumFractionDigits: 0,
})

export function formatCzk(amount: number): string {
  return czk.format(amount)
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric', month: 'numeric', year: 'numeric',
  }).format(date)
}

export function formatWinRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)} %`
}
```

- [ ] **Step 4: Postav layout a sdílené komponenty**

Kořenový `layout.tsx`: `lang="cs"`, dark téma, horní navigace s odkazy Přehled / Tréninky / Zápasy / Platby. Na mobilu navigace jako spodní lišta, na desktopu nahoře.

`admin/layout.tsx`: vlastní navigace Hráči / Tréninky / Zápasy / Vyúčtování, vizuálně odlišená od veřejné části (růžový proužek nahoře, popisek „organizátor"), plus tlačítko odhlášení volající `logoutAction`.

- [ ] **Step 5: Ověř vzhled na mobilní šířce**

```bash
npm run dev
```

Otevři v prohlížeči na šířce 390 px a zkontroluj, že se nic nepřetéká vodorovně a navigace je palcem dosažitelná.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): černo-růžové téma, layout a formátovací pomocníci"
```

---

### Task 9: Správa hráčů

**Files:**
- Create: `src/actions/players.ts`, `src/app/admin/hraci/page.tsx`
- Create: `src/db/queries.ts`

**Interfaces:**
- Consumes: `requireAdmin` (Task 7), `db`/`schema` (Task 6)
- Produces:
  - z `@/db/queries`: `getActivePlayers()`, `getAllPlayers()` — vrací `{ id, name, contact, archivedAt }[]`, řazeno podle jména česky
  - Server Actions: `createPlayer(formData)`, `updatePlayer(formData)`, `archivePlayer(formData)`, `restorePlayer(formData)`
  - `src/db/seed.ts` + skript `npm run db:seed` — naplní kádr z WhatsApp skupiny, idempotentně

- [ ] **Step 1: Napiš dotazy**

`src/db/queries.ts`:

```ts
import { isNull } from 'drizzle-orm'
import { db } from '@/db'
import { players } from '@/db/schema'

/**
 * Řadíme v JS, ne v SQL. Postgres by podle své collation mohl poslat Šárku
 * až za Z; `localeCompare` s 'cs' dá správné české pořadí bez ohledu na to,
 * jak je databáze nastavená. Hráčů jsou desítky, cena je nulová.
 */
function byCzechName<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'cs'))
}

export async function getActivePlayers() {
  return byCzechName(await db.select().from(players).where(isNull(players.archivedAt)))
}

export async function getAllPlayers() {
  return byCzechName(await db.select().from(players))
}
```

- [ ] **Step 2: Napiš akce**

`src/actions/players.ts`:

```ts
'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { players } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

const nameSchema = z.string().trim().min(1, 'Jméno nesmí být prázdné').max(60)
const contactSchema = z.string().trim().max(100).optional().or(z.literal(''))

export async function createPlayer(formData: FormData) {
  await requireAdmin()
  const name = nameSchema.parse(formData.get('name'))
  const contact = contactSchema.parse(formData.get('contact') ?? '')
  await db.insert(players).values({ name, contact: contact || null })
  revalidatePath('/admin/hraci')
}

export async function updatePlayer(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  const name = nameSchema.parse(formData.get('name'))
  const contact = contactSchema.parse(formData.get('contact') ?? '')
  await db.update(players).set({ name, contact: contact || null }).where(eq(players.id, id))
  revalidatePath('/admin/hraci')
}

export async function archivePlayer(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  await db.update(players).set({ archivedAt: new Date() }).where(eq(players.id, id))
  revalidatePath('/admin/hraci')
}

export async function restorePlayer(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  await db.update(players).set({ archivedAt: null }).where(eq(players.id, id))
  revalidatePath('/admin/hraci')
}
```

- [ ] **Step 3: Postav stránku**

`src/app/admin/hraci/page.tsx` — Server Component:
- formulář na přidání hráče nahoře (jméno + kontakt + tlačítko „Přidat"),
- seznam aktivních hráčů, u každého jméno, kontakt a tlačítko „Archivovat",
- sbalená sekce „Archivovaní" s tlačítkem „Vrátit".

Formuláře používají `action={createPlayer}` přímo, žádný klientský stav.

- [ ] **Step 4: Napiš seed skript s kádrem**

`src/db/seed.ts` — jednorázové naplnění hráčů z WhatsApp skupiny. Skript je **idempotentní**: hráče se stejným jménem nepřidá dvakrát, takže se dá pustit opakovaně.

```ts
import 'dotenv/config'
import { db } from './index'
import { players } from './schema'

/**
 * Kádr podle WhatsApp skupiny (stav k 14. 9. 2026).
 * Není to soupiska — kdo nechodí na tréninky, archivuje se v /admin/hraci.
 */
const ROSTER = [
  'Anetka Bouberlová',
  'Daniel Petrtýl',
  'Eda Mlej',
  'Filip Kožený',
  'Jakub Kuchar',
  'Jan Hrabák',
  'Johana Kolářová',
  'Klára Kalinová',
  'Kohi',
  'Lenka',
  'Lucie Boušová',
  'Matej Kolak',
  'Naty Houzvickova',
  'Nicole Přibylová',
  'Nynča',
  'Petr Šindílek',
  'Šárka Beková',
  'Tomáš Blodek',
  'Tomáš Loužecký',
  'Václav Pesl',
  'Viola',
  'Vojtěch Šašek',
  'ORGANIZÁTOR — přejmenuj mě',
]

async function seed() {
  const existing = await db.select({ name: players.name }).from(players)
  const known = new Set(existing.map((p) => p.name))
  const missing = ROSTER.filter((name) => !known.has(name))

  if (missing.length === 0) {
    console.log('Všichni hráči už v databázi jsou, nepřidávám nic.')
    return
  }

  await db.insert(players).values(missing.map((name) => ({ name })))
  console.log(`Přidáno ${missing.length} hráčů:`)
  for (const name of missing) console.log(`  ${name}`)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

Do `package.json` přidej:

```json
"db:seed": "npx tsx --env-file=.env.local src/db/seed.ts"
```

a doinstaluj `tsx`:

```bash
npm install -D tsx
```

- [ ] **Step 5: Spusť seed a doplň chybějící**

```bash
npm run db:seed
```

Expected: přidá se 23 hráčů.

Potom v `/admin/hraci` ručně:
- **přejmenuj `ORGANIZÁTOR — přejmenuj mě`** na své jméno (ve WhatsApp výpisu figuruješ jen jako „Vy", jméno z něj nešlo přečíst),
- **zkontroluj diakritiku** u `Matej Kolak` a `Naty Houzvickova` — ve WhatsAppu jsou bez háčků, ale skutečná jména budou nejspíš `Matěj Kolák` a `Naty Houzvicková`,
- **doplň, kdo chybí.** Zdrojové screenshoty nezachytily celou abecedu: mezi `Petr Šindílek` a `Šárka Beková` chybí případní hráči na R a S, a nad `Anetka Bouberlová` mohl být ještě někdo na A.
- **archivuj ty, kdo na tréninky nechodí.** WhatsApp skupina není soupiska.

- [ ] **Step 6: Ověř ručně**

Přidej testovacího hráče, archivuj ho, vrať ho, smaž. Zkontroluj, že je seznam řazený česky — `Šárka` musí být až za `Petr`, ne mezi `S` a `T` podle ASCII.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(admin): správa hráčů, archivace a seed kádru"
```

---

### Task 10: Tréninky a mřížka docházky

Nejpoužívanější obrazovka v celé aplikaci. Musí jít odklikat na telefonu za půl minuty.

**Files:**
- Create: `src/actions/trainings.ts`, `src/app/admin/treninky/page.tsx`, `src/app/admin/treninky/[id]/page.tsx`, `src/components/AttendanceGrid.tsx`
- Modify: `src/db/queries.ts`

**Interfaces:**
- Consumes: `getActivePlayers` (Task 9), `requireAdmin`
- Produces:
  - `getTrainings()`, `getTrainingWithAttendance(id)` z `@/db/queries`
  - akce `createTraining(formData)`, `setTrainingStatus(formData)`, `saveAttendance(trainingId, entries)`
  - `nextSundayIso(from?: Date): string` v `src/lib/format.ts` — ISO datum nejbližší nadcházející neděle, pro předvyplnění formuláře

- [ ] **Step 1: Doplň dotazy do `src/db/queries.ts`**

```ts
import { desc, eq } from 'drizzle-orm'
import { trainings, attendance } from '@/db/schema'

export async function getTrainings() {
  return db.select().from(trainings).orderBy(desc(trainings.date))
}

export async function getTrainingWithAttendance(id: number) {
  const [training] = await db.select().from(trainings).where(eq(trainings.id, id))
  if (!training) return null
  const rows = await db.select().from(attendance).where(eq(attendance.trainingId, id))
  return { training, attendance: rows }
}
```

- [ ] **Step 2: Přidej `nextSundayIso` do `src/lib/format.ts`**

```ts
/** ISO datum (YYYY-MM-DD) nejbližší neděle. Když je dnes neděle, vrátí dnešek. */
export function nextSundayIso(from: Date = new Date()): string {
  const date = new Date(from)
  date.setHours(12, 0, 0, 0) // poledne, aby letní čas neposunul den
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7))
  return date.toISOString().slice(0, 10)
}
```

- [ ] **Step 3: Napiš akce**

`src/actions/trainings.ts`:

```ts
'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { trainings, attendance } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

export async function createTraining(formData: FormData) {
  await requireAdmin()
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(formData.get('date'))
  const priceCzk = z.coerce.number().int().positive().max(100000)
    .parse(formData.get('priceCzk') ?? 1350)
  await db.insert(trainings).values({ date, priceCzk })
  revalidatePath('/admin/treninky')
}

export async function setTrainingStatus(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  const status = z.enum(['held', 'cancelled']).parse(formData.get('status'))
  await db.update(trainings).set({ status }).where(eq(trainings.id, id))
  revalidatePath('/admin/treninky')
  revalidatePath(`/admin/treninky/${id}`)
}

const entriesSchema = z.array(z.object({
  playerId: z.number().int().positive(),
  guests: z.number().int().min(0).max(10),
}))

/** Přepíše docházku tréninku na přesně předaný seznam. */
export async function saveAttendance(trainingId: number, entries: unknown) {
  await requireAdmin()
  const id = z.number().int().positive().parse(trainingId)
  const parsed = entriesSchema.parse(entries)

  await db.delete(attendance).where(eq(attendance.trainingId, id))
  if (parsed.length > 0) {
    await db.insert(attendance).values(
      parsed.map((e) => ({ trainingId: id, playerId: e.playerId, guests: e.guests }))
    )
  }
  revalidatePath(`/admin/treninky/${id}`)
  revalidatePath('/treninky')
  revalidatePath('/')
}
```

Poznámka k `and` importu: pokud ho v souboru nepoužiješ, odstraň ho, jinak ESLint zahlásí nepoužitý import.

- [ ] **Step 4: Postav mřížku docházky**

`src/components/AttendanceGrid.tsx` — klientská komponenta (`'use client'`):

```tsx
'use client'

import { useState, useTransition } from 'react'
import { saveAttendance } from '@/actions/trainings'

type Player = { id: number; name: string }
type Entry = { playerId: number; guests: number }

export function AttendanceGrid({
  trainingId, players, initial,
}: { trainingId: number; players: Player[]; initial: Entry[] }) {
  const [entries, setEntries] = useState<Map<number, number>>(
    () => new Map(initial.map((e) => [e.playerId, e.guests]))
  )
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggle(playerId: number) {
    setEntries((prev) => {
      const next = new Map(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.set(playerId, 0)
      return next
    })
    setSaved(false)
  }

  function setGuests(playerId: number, guests: number) {
    setEntries((prev) => new Map(prev).set(playerId, Math.max(0, guests)))
    setSaved(false)
  }

  function save() {
    const payload = [...entries.entries()].map(([playerId, guests]) => ({ playerId, guests }))
    startTransition(async () => {
      await saveAttendance(trainingId, payload)
      setSaved(true)
    })
  }

  const heads = [...entries.values()].reduce((sum, g) => sum + 1 + g, 0)

  return (
    <div>
      <ul>
        {players.map((player) => {
          const present = entries.has(player.id)
          return (
            <li key={player.id}>
              <button type="button" onClick={() => toggle(player.id)} aria-pressed={present}>
                {player.name}
              </button>
              {present && (
                <span>
                  <button type="button" onClick={() => setGuests(player.id, (entries.get(player.id) ?? 0) - 1)}>−</button>
                  <span>+{entries.get(player.id) ?? 0}</span>
                  <button type="button" onClick={() => setGuests(player.id, (entries.get(player.id) ?? 0) + 1)}>+</button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p>Celkem hlav: {heads}</p>
      <button type="button" onClick={save} disabled={pending}>
        {pending ? 'Ukládám…' : saved ? 'Uloženo' : 'Uložit docházku'}
      </button>
    </div>
  )
}
```

Struktura je funkční kostra — vizuál doplň podle směru z Tasku 8. Řádek hráče musí mít dotykovou plochu aspoň 44 px na výšku, stepper hostů se zobrazuje jen u přítomných, aby seznam nebyl přeplácaný.

- [ ] **Step 5: Postav stránky**

`admin/treninky/page.tsx`: formulář na založení tréninku s předvyplněným `nextSundayIso()` a cenou 1350, pod ním seznam tréninků s datem, stavem, počtem hlav a odkazem na detail. U každého přepínač proběhl/zrušen.

`admin/treninky/[id]/page.tsx`: hlavička s datem a cenou, `<AttendanceGrid />` s aktivními hráči a uloženou docházkou.

- [ ] **Step 6: Ověř ručně**

Založ trénink, naklikej docházku včetně jednoho hráče s `+2`, ulož, obnov stránku a zkontroluj, že se stav načetl zpět. Zruš trénink a ověř, že se u něj stav změnil.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(admin): tréninky a mřížka docházky s hosty"
```

---

### Task 11: Zápasy a sestavy

**Files:**
- Create: `src/actions/matches.ts`, `src/app/admin/zapasy/page.tsx`, `src/app/admin/zapasy/[id]/page.tsx`
- Modify: `src/db/queries.ts`

**Interfaces:**
- Consumes: `getActivePlayers`, `requireAdmin`, `MatchInput` typ z `@/domain/stats`
- Produces:
  - `getMatchesWithAppearances(): Promise<(Match & { playerIds: number[] })[]>` z `@/db/queries` — tvar je přímo použitelný jako `MatchInput[]` pro `teamWinRate` a `playerWinRate`
  - akce `createMatch(formData)`, `updateMatch(formData)`, `deleteMatch(formData)`, `saveAppearances(matchId, playerIds)`

- [ ] **Step 1: Doplň dotaz**

Do `src/db/queries.ts`:

```ts
import { matches, matchAppearances } from '@/db/schema'

export async function getMatchesWithAppearances() {
  const rows = await db.select().from(matches).orderBy(desc(matches.date))
  const appearances = await db.select().from(matchAppearances)
  return rows.map((match) => ({
    ...match,
    playerIds: appearances.filter((a) => a.matchId === match.id).map((a) => a.playerId),
  }))
}
```

Dva dotazy místo joinu jsou tu záměr: zápasů jsou desítky, ne tisíce, a tenhle tvar jde rovnou předat doménovým funkcím.

- [ ] **Step 2: Napiš akce**

`src/actions/matches.ts`:

```ts
'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { matches, matchAppearances } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

const matchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  opponent: z.string().trim().min(1, 'Doplň soupeře').max(80),
  result: z.enum(['win', 'loss']),
  scoreText: z.string().trim().max(20).optional().or(z.literal('')),
})

export async function createMatch(formData: FormData) {
  await requireAdmin()
  const input = matchSchema.parse({
    date: formData.get('date'),
    opponent: formData.get('opponent'),
    result: formData.get('result'),
    scoreText: formData.get('scoreText') ?? '',
  })
  await db.insert(matches).values({ ...input, scoreText: input.scoreText || null })
  revalidatePath('/admin/zapasy')
  revalidatePath('/zapasy')
}

export async function updateMatch(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  const input = matchSchema.parse({
    date: formData.get('date'),
    opponent: formData.get('opponent'),
    result: formData.get('result'),
    scoreText: formData.get('scoreText') ?? '',
  })
  await db.update(matches).set({ ...input, scoreText: input.scoreText || null })
    .where(eq(matches.id, id))
  revalidatePath('/admin/zapasy')
  revalidatePath('/zapasy')
}

export async function deleteMatch(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  await db.delete(matches).where(eq(matches.id, id))
  revalidatePath('/admin/zapasy')
  revalidatePath('/zapasy')
}

export async function saveAppearances(matchId: number, playerIds: unknown) {
  await requireAdmin()
  const id = z.number().int().positive().parse(matchId)
  const parsed = z.array(z.number().int().positive()).parse(playerIds)

  await db.delete(matchAppearances).where(eq(matchAppearances.matchId, id))
  if (parsed.length > 0) {
    await db.insert(matchAppearances).values(parsed.map((playerId) => ({ matchId: id, playerId })))
  }
  revalidatePath(`/admin/zapasy/${id}`)
  revalidatePath('/zapasy')
}
```

- [ ] **Step 3: Postav stránky**

`admin/zapasy/page.tsx`: formulář na založení (datum, soupeř, výhra/prohra jako dvojice přepínačů, skóre volitelně), pod ním seznam zápasů s výsledkem barevně (`--ok` výhra, `--danger` prohra) a odkazem na sestavu.

`admin/zapasy/[id]/page.tsx`: editace zápasu + výběr, kdo nastoupil. Použij stejný vzor jako `AttendanceGrid`, ale bez stepperu hostů — stačí přepínání jmen a tlačítko Uložit volající `saveAppearances`. Vytvoř na to samostatnou komponentu `src/components/LineupPicker.tsx`, nesnaž se ohýbat `AttendanceGrid`.

- [ ] **Step 4: Ověř ručně**

Založ tři zápasy (2 výhry, 1 prohra), u každého vyber sestavu. Zkontroluj, že se sestava po obnovení stránky načte.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): zápasy a sestavy"
```

---

### Task 12: Vyúčtování

**Files:**
- Create: `src/actions/settlements.ts`, `src/app/admin/vyuctovani/page.tsx`, `src/app/admin/vyuctovani/[id]/page.tsx`
- Modify: `src/db/queries.ts`

**Interfaces:**
- Consumes: `calculateSettlement`, `TrainingInput` (Task 4), `requireAdmin`
- Produces:
  - `getSettlements()`, `getSettlementDetail(id)` z `@/db/queries`
  - `loadTrainingInputs(periodStart, periodEnd): Promise<TrainingInput[]>` — načte tréninky v období včetně docházky ve tvaru, který jí doména
  - akce `createSettlement(formData)`, `closeSettlement(formData)`, `reopenSettlement(formData)`, `togglePaid(formData)`

- [ ] **Step 1: Doplň dotazy**

Do `src/db/queries.ts`:

```ts
import { and, gte, lte } from 'drizzle-orm'
import { settlements, settlementItems } from '@/db/schema'
import type { TrainingInput } from '@/domain/settlement'

export async function loadTrainingInputs(
  periodStart: string, periodEnd: string,
): Promise<TrainingInput[]> {
  const rows = await db.select().from(trainings)
    .where(and(gte(trainings.date, periodStart), lte(trainings.date, periodEnd)))
  const all = await db.select().from(attendance)
  return rows.map((training) => ({
    id: training.id,
    priceCzk: training.priceCzk,
    status: training.status,
    attendance: all
      .filter((a) => a.trainingId === training.id)
      .map((a) => ({ playerId: a.playerId, guests: a.guests })),
  }))
}

export async function getSettlements() {
  return db.select().from(settlements).orderBy(desc(settlements.periodEnd))
}

export async function getSettlementDetail(id: number) {
  const [settlement] = await db.select().from(settlements).where(eq(settlements.id, id))
  if (!settlement) return null
  const items = await db.select().from(settlementItems)
    .where(eq(settlementItems.settlementId, id))
  return { settlement, items }
}
```

- [ ] **Step 2: Napiš akce**

`src/actions/settlements.ts`:

```ts
'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { settlements, settlementItems } from '@/db/schema'
import { loadTrainingInputs } from '@/db/queries'
import { calculateSettlement } from '@/domain/settlement'
import { requireAdmin } from '@/lib/auth'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export async function createSettlement(formData: FormData) {
  await requireAdmin()
  const label = z.string().trim().min(1, 'Doplň název období').max(60)
    .parse(formData.get('label'))
  const periodStart = isoDate.parse(formData.get('periodStart'))
  const periodEnd = isoDate.parse(formData.get('periodEnd'))
  if (periodEnd < periodStart) {
    throw new Error('Konec období nemůže být před začátkem.')
  }
  await db.insert(settlements).values({ label, periodStart, periodEnd })
  revalidatePath('/admin/vyuctovani')
}

/** Zmrazí spočítané částky do settlement_items. */
export async function closeSettlement(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))

  const [settlement] = await db.select().from(settlements).where(eq(settlements.id, id))
  if (!settlement) throw new Error('Vyúčtování neexistuje.')
  if (settlement.closedAt) throw new Error('Tohle období je už uzavřené.')

  const inputs = await loadTrainingInputs(settlement.periodStart, settlement.periodEnd)
  const result = calculateSettlement(inputs)

  if (result.debts.length > 0) {
    await db.insert(settlementItems).values(
      result.debts.map((debt) => ({
        settlementId: id, playerId: debt.playerId, amountCzk: debt.amountCzk,
      }))
    )
  }
  await db.update(settlements).set({ closedAt: new Date() }).where(eq(settlements.id, id))

  revalidatePath('/admin/vyuctovani')
  revalidatePath(`/admin/vyuctovani/${id}`)
  revalidatePath('/platby')
}

/** Zruší uzavření a zahodí zmrazené částky, aby šlo přepočítat. */
export async function reopenSettlement(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  await db.delete(settlementItems).where(eq(settlementItems.settlementId, id))
  await db.update(settlements).set({ closedAt: null }).where(eq(settlements.id, id))
  revalidatePath(`/admin/vyuctovani/${id}`)
  revalidatePath('/platby')
}

export async function togglePaid(formData: FormData) {
  await requireAdmin()
  const itemId = z.coerce.number().int().positive().parse(formData.get('itemId'))
  const paid = formData.get('paid') === 'true'
  await db.update(settlementItems)
    .set({ paid, paidAt: paid ? new Date() : null })
    .where(eq(settlementItems.id, itemId))
  revalidatePath('/admin/vyuctovani')
  revalidatePath('/platby')
}
```

Poznámka: `reopenSettlement` zahodí i příznaky `paid`. Zobraz u toho tlačítka varování „Zrušení uzavření smaže i odškrtnuté platby."

- [ ] **Step 3: Postav stránky**

`admin/vyuctovani/page.tsx`: formulář na založení období (název, od, do) a seznam období se stavem koncept/uzavřeno.

`admin/vyuctovani/[id]/page.tsx`:
- **koncept** — náhled spočítaný za běhu z `loadTrainingInputs` + `calculateSettlement`: tabulka hráč/částka, pod ní součet ceny hal, součet účtovaného a rozdíl. Varování u `skippedTrainingIds` („Trénink 12. 10. proběhl, ale nemá zadanou docházku — nezapočítal se."). Tlačítko „Uzavřít období".
- **uzavřené** — tabulka ze `settlementItems`, u každého řádku přepínač zaplaceno s barvou `--ok`/`--warn`, souhrn kolik z kolika zaplaceno, tlačítko „Zrušit uzavření".

- [ ] **Step 4: Ověř ručně proti ruční kalkulaci**

Založ období pokrývající tréninky z Tasku 10. Spočítej si jednu částku na papíře a porovnej s náhledem. Uzavři období, odškrtni jednoho hráče jako zaplaceného, zruš uzavření a ověř, že se náhled vrátil.

- [ ] **Step 5: Postav admin rozcestník**

`src/app/admin/page.tsx` — Server Component, čtyři dlaždice na Hráče / Tréninky / Zápasy / Vyúčtování a nad nimi sekce „Vyžaduje pozornost", která se zobrazí jen když je co hlásit:

- proběhlé tréninky bez jediného záznamu docházky — odkaz rovnou na jejich mřížku,
- rozpracované (neuzavřené) vyúčtování,
- v posledním uzavřeném období počet hráčů, kteří ještě nezaplatili.

Když není nic k řešení, sekce zmizí úplně. Tohle je první obrazovka, kterou uvidíš každou neděli po tréninku — musí říct, co udělat, ne zobrazit prázdné nadpisy.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): vyúčtování období s uzavřením a evidencí plateb"
```

---

### Task 13: Veřejné stránky s přehledem a statistikami

**Files:**
- Create: `src/app/page.tsx` (přepiš výchozí), `src/app/treninky/page.tsx`, `src/app/zapasy/page.tsx`
- Modify: `src/db/queries.ts`

**Interfaces:**
- Consumes: `getTrainings`, `getMatchesWithAppearances`, `getActivePlayers`, `teamWinRate`, `playerWinRate`, `calculateSettlement`
- Produces: nic pro další tasky

- [ ] **Step 1: Doplň dotaz na tréninky s docházkou**

Do `src/db/queries.ts`:

```ts
export async function getTrainingsWithAttendance() {
  const rows = await db.select().from(trainings).orderBy(desc(trainings.date))
  const all = await db.select().from(attendance)
  return rows.map((training) => ({
    ...training,
    attendance: all.filter((a) => a.trainingId === training.id),
    heads: all
      .filter((a) => a.trainingId === training.id)
      .reduce((sum, a) => sum + 1 + a.guests, 0),
  }))
}
```

- [ ] **Step 2: Postav `/` — přehled**

Server Component. Obsah:
- karta „Příští trénink" — nejbližší budoucí trénink, nebo `nextSundayIso()` s poznámkou „zatím nezaložený",
- posledních 5 proběhlých tréninků: datum, počet hlav, cena na hlavu (`priceCzk / heads`, zaokrouhleno pro zobrazení),
- karta s týmovým win rate,
- pokud existuje uzavřené neproplacené vyúčtování, karta „Nezaplaceno: X z Y" s odkazem na `/platby`.

- [ ] **Step 3: Postav `/treninky`**

Tabulka všech tréninků: datum, stav (zrušené vizuálně potlačené, `--danger` štítek), kdo byl (jména, u hostů „+N"), počet hlav, cena na hlavu.

- [ ] **Step 4: Postav `/zapasy`**

- Nahoře `<StatCard>` s týmovým win rate z `teamWinRate(matches)`.
- Seznam zápasů: datum, soupeř, výsledek barevně, skóre, kdo nastoupil.
- Tabulka individuálních win rate: pro každého hráče (aktivní i archivované, kteří mají aspoň jeden zápas) `playerWinRate(matches, player.id)`, sloupce odehráno / výhry / prohry / úspěšnost přes `formatWinRate`. Řadit sestupně podle `rate`, hráče s `rate === null` úplně vynechat.

- [ ] **Step 5: Ověř ručně**

Zkontroluj, že se čísla na `/zapasy` shodují s tím, co jsi zadal v Tasku 11, a že zrušený trénink je na `/treninky` vidět jako zrušený a nemá cenu na hlavu.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): veřejný přehled, tréninky a statistiky zápasů"
```

---

### Task 14: Veřejné platby s QR kódem

**Files:**
- Create: `src/app/platby/page.tsx`, `src/app/platby/[playerId]/page.tsx`, `src/components/PaymentQr.tsx`, `src/lib/bank.ts`

**Interfaces:**
- Consumes: `toCzechIban` (Task 2), `buildSpdPayload` (Task 3), `getSettlementDetail`, `getAllPlayers`
- Produces: z `@/lib/bank` funkce `getPayeeIban(): string`, `getPayeeName(): string | undefined`
  a `getReadableAccount(): string`; komponenta `<PaymentQr amountCzk message variableSymbol />`

- [ ] **Step 1: Načti konfiguraci účtu**

`src/lib/bank.ts`:

```ts
import { toCzechIban } from '@/domain/iban'

export function getPayeeIban(): string {
  const number = process.env.BANK_ACCOUNT_NUMBER
  const bankCode = process.env.BANK_CODE
  if (!number || !bankCode) {
    throw new Error('Chybí BANK_ACCOUNT_NUMBER nebo BANK_CODE')
  }
  return toCzechIban({ prefix: process.env.BANK_ACCOUNT_PREFIX, number, bankCode })
}

export function getPayeeName(): string | undefined {
  return process.env.PAYEE_NAME || undefined
}

/** Lidsky čitelný tvar účtu pro ruční přepsání. */
export function getReadableAccount(): string {
  const prefix = process.env.BANK_ACCOUNT_PREFIX
  return `${prefix ? `${prefix}-` : ''}${process.env.BANK_ACCOUNT_NUMBER}/${process.env.BANK_CODE}`
}
```

- [ ] **Step 2: Postav QR komponentu**

`src/components/PaymentQr.tsx` — Server Component, generuje SVG na serveru, takže se do klienta nedostane žádná knihovna:

```tsx
import QRCode from 'qrcode'
import { buildSpdPayload } from '@/domain/spd'
import { getPayeeIban, getPayeeName, getReadableAccount } from '@/lib/bank'
import { formatCzk } from '@/lib/format'

export async function PaymentQr({
  amountCzk, message, variableSymbol,
}: { amountCzk: number; message: string; variableSymbol: string }) {
  const payload = buildSpdPayload({
    iban: getPayeeIban(),
    amountCzk,
    message,
    variableSymbol,
    payeeName: getPayeeName(),
  })
  const svg = await QRCode.toString(payload, {
    type: 'svg', errorCorrectionLevel: 'M', margin: 1,
    color: { dark: '#0A0A0B', light: '#FFFFFF' },
  })

  return (
    <div>
      {/* Bílé pozadí je nutné — čtečky nespolehlivě čtou invertovaný QR kód. */}
      <div
        className="bg-white p-4 rounded-xl w-fit"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <dl>
        <dt>Účet</dt><dd>{getReadableAccount()}</dd>
        <dt>Částka</dt><dd>{formatCzk(amountCzk)}</dd>
        <dt>Variabilní symbol</dt><dd>{variableSymbol}</dd>
        <dt>Zpráva</dt><dd>{message}</dd>
      </dl>
    </div>
  )
}
```

QR kód **musí** mít světlé pozadí i v tmavém tématu — tohle je nejčastější chyba u dark UI a způsobí, že platba nejde naskenovat.

- [ ] **Step 3: Postav `/platby`**

Najdi nejnovější uzavřené vyúčtování. Pro každou položku zobraz jméno hráče, částku a stav (`--ok` zaplaceno / `--warn` nezaplaceno), jméno odkazuje na `/platby/[playerId]`. Nahoře souhrn „Zaplaceno X z Y" a název období. Když uzavřené vyúčtování neexistuje, zobraz „Zatím není co platit."

- [ ] **Step 4: Postav `/platby/[playerId]`**

Detail hráče v aktuálním uzavřeném období: jméno, částka velkým písmem v `--accent`, `<PaymentQr />`. Variabilní symbol se skládá jako `periodEnd` ve tvaru `YYYYMM` + `playerId` doplněné na dvě místa zleva nulou (např. `2026` + `10` + `07` = `20261007`). Zpráva pro příjemce je `Volejbal ${settlement.label}`.

Když je už zaplaceno, místo QR zobraz potvrzení v `--ok` a datum platby.

- [ ] **Step 5: Ověř skenováním**

Otevři `/platby/[playerId]` a **naskenuj QR skutečnou bankovní aplikací**. Zkontroluj, že se předvyplní správný účet, částka i variabilní symbol. Tenhle krok nepřeskakuj — chyba v SPD payloadu se jinak projeví až u někoho z týmu.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): platby s QR kódem a údaji k převodu"
```

---

### Task 15: Nasazení na Vercel a monitoring

**Files:**
- Create: `README.md`
- Modify: `src/app/layout.tsx` (Analytics, Speed Insights)

**Interfaces:**
- Consumes: nic
- Produces: běžící nasazení

- [ ] **Step 1: Přidej analytiku**

```bash
npm install @vercel/analytics @vercel/speed-insights
```

Do `src/app/layout.tsx` vlož `<Analytics />` a `<SpeedInsights />` z `@vercel/analytics/next` a `@vercel/speed-insights/next` těsně před `</body>`.

- [ ] **Step 2: Napiš README**

`README.md` česky: k čemu appka je, jak spustit lokálně, seznam env proměnných s významem (obzvlášť formát čísla účtu — `BANK_ACCOUNT_PREFIX` bez pomlčky, `BANK_CODE` čtyřmístný), jak pustit migrace, odkaz na spec a plán.

- [ ] **Step 3: Nahraj na GitHub a propoj s Vercelem**

Vytvoř repozitář, pushni, v Vercelu naimportuj projekt.

- [ ] **Step 4: Nastav produkční env proměnné**

Ve Vercelu nastav pro Production i Preview: `DATABASE_URL`, `ADMIN_PIN`, `AUTH_SECRET`, `BANK_ACCOUNT_NUMBER`, `BANK_CODE`, volitelně `BANK_ACCOUNT_PREFIX` a `PAYEE_NAME`.

**`AUTH_SECRET` musí být jiný než lokální** a nesmí se nikdy dostat do gitu.

- [ ] **Step 5: Ověř produkční nasazení**

Na produkční URL projdi: přihlášení PINem, založení tréninku, zápis docházky, náhled vyúčtování, zobrazení QR. Ověř, že `/admin` bez přihlášení přesměruje.

- [ ] **Step 6: Zapni Web Analytics**

Ve Vercel dashboardu projektu zapni Web Analytics a Speed Insights (na Hobby zdarma). V Neon dashboardu zkontroluj spotřebu — měla by být hluboko pod free tierem.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: nasazení na Vercel, analytika a README"
```

---

## Co plán záměrně neřeší

- **Scraper avlka.cz** — §10 specifikace. Sezóna 2026/2027 zatím nemá odehrané zápasy, není co stahovat.
- **Doplnění kádru.** Seed v Tasku 9 obsahuje 22 jmen přečtených ze screenshotů WhatsApp skupiny plus placeholder za organizátora. Chybí případní hráči na R a S (screenshoty ten úsek abecedy nezachytily) a jméno organizátora. Doplní se ručně v `/admin/hraci`.
- **Přihlašování hráčů, notifikace, přihlašování na trénink dopředu** — mimo rozsah specifikace.

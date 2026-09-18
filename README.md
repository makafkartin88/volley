# Volejbal — docházka a vyúčtování

Interní webová aplikace týmu **Smečaři bez hranic** (AVL, 10. liga Sašova divize, Praha).
Slouží k evidenci docházky na nedělních trénincích, rozpočítání ceny haly mezi přítomné,
vyúčtování po zhruba dvou měsících (s QR platbou a evidencí zaplaceno/nezaplaceno) a k evidenci
zápasů včetně týmového a individuálního win rate.

Veřejná část (přehled, tréninky, statistiky, platby) je bez přihlášení. Administrace
(`/admin`) — zakládání tréninků, zápis docházky, zápasy, sestavy, vyúčtování — je za PINem.

## Spuštění lokálně

Vyžaduje Node.js a přístup k Postgres databázi (Neon).

```bash
npm install
npm run dev
```

Aplikace poběží na `http://localhost:3000`.

Testy doménové logiky:

```bash
npm test
```

### Proměnné prostředí

Zkopíruj `.env.example` do `.env.local` a doplň hodnoty:

| Proměnná | Význam |
|---|---|
| `DATABASE_URL` | Connection string k Postgres databázi (Neon). |
| `ADMIN_PIN` | PIN pro přihlášení do administrace (`/admin`). |
| `AUTH_SECRET` | Tajný klíč pro podepisování přihlašovací session. V produkci musí být jiný než lokálně a nikdy nesmí skončit v gitu. |
| `BANK_ACCOUNT_PREFIX` | Předčíslí čísla účtu **bez pomlčky** (např. `19` pro účet `19-2000145399/0800`). Volitelné — pokud účet předčíslí nemá, nech prázdné. |
| `BANK_ACCOUNT_NUMBER` | Číslo účtu za pomlčkou (v příkladu výše `2000145399`). |
| `BANK_CODE` | Čtyřmístný kód banky (v příkladu výše `0800`). |
| `PAYEE_NAME` | Jméno příjemce platby, zobrazí se u QR kódu a údajů k převodu. |

Číslo účtu se v aplikaci zadává v běžném českém tvaru (předčíslí, číslo účtu, kód banky) a
appka si z něj sama dopočítá IBAN, který je potřeba pro vygenerování QR platby (formát SPD).
Žádná externí služba se k tomu nepoužívá.

## Migrace databáze

Až bude existovat reálná databáze (Neon), spusť v tomto pořadí:

```bash
npm run db:generate   # vygeneruje SQL migrace ze schématu v src/db
npm run db:migrate    # aplikuje migrace na databázi z DATABASE_URL v .env.local
npm run db:seed       # naplní databázi počátečními daty (kádr, atd.)
```

## Monitoring

Aplikace používá Vercel Web Analytics a Speed Insights (`@vercel/analytics`,
`@vercel/speed-insights`) — na Vercel Hobby plánu zdarma. Zapínají se v nastavení projektu
ve Vercel dashboardu.

## Dokumentace

- [Specifikace](docs/superpowers/specs/2026-09-14-volejbal-dochazka-design.md)
- [Implementační plán](docs/superpowers/plans/2026-09-14-volejbal-dochazka.md)

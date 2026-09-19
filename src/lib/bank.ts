import { toCzechIban } from '@/domain/iban'

/**
 * Sestaví IBAN příjemce z env proměnných přes `toCzechIban` (Task 2) —
 * žádná IBAN aritmetika tu není, jen předání vstupů.
 */
export function getPayeeIban(): string {
  const number = process.env.BANK_ACCOUNT_NUMBER
  const bankCode = process.env.BANK_CODE
  if (!number || !bankCode) {
    throw new Error('Chybí BANK_ACCOUNT_NUMBER nebo BANK_CODE')
  }
  // `|| undefined`, ne jen `process.env...` — proměnná z .env je vždy
  // řetězec, i "prázdná", a `toCzechIban` čeká undefined, aby doplnila '0'.
  return toCzechIban({ prefix: process.env.BANK_ACCOUNT_PREFIX || undefined, number, bankCode })
}

export function getPayeeName(): string | undefined {
  return process.env.PAYEE_NAME || undefined
}

/** Lidsky čitelný tvar účtu pro ruční přepsání, když někdo nechce skenovat QR. */
export function getReadableAccount(): string {
  const prefix = process.env.BANK_ACCOUNT_PREFIX
  return `${prefix ? `${prefix}-` : ''}${process.env.BANK_ACCOUNT_NUMBER}/${process.env.BANK_CODE}`
}

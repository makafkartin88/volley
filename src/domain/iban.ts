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

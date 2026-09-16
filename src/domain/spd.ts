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

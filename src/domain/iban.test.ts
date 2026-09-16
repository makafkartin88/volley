import { describe, it, expect } from 'vitest'
import { toCzechIban } from './iban'

describe('toCzechIban', () => {
  it('převede účet s předčíslím', () => {
    expect(toCzechIban({ prefix: '19', number: '2000145399', bankCode: '0800' }))
      .toBe('CZ6508000000192000145399')
  })

  it('převede účet bez předčíslí', () => {
    expect(toCzechIban({ number: '2601234567', bankCode: '2010' }))
      .toBe('CZ2020100000002601234567')
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

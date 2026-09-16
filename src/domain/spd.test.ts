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

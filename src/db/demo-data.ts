/**
 * Společné značky pro ukázková data, aby šla jedním příkazem smazat.
 *
 * Tréninky i zápasy se značí polem `note`, vyúčtování svým názvem — ta
 * tabulka poznámku nemá. `npm run db:demo:clear` maže přesně podle nich,
 * takže se nikdy nesáhne na skutečná data.
 */
export const DEMO_NOTE = 'demo'

export const DEMO_SETTLEMENT_LABELS = ['Červen–Červenec 2026', 'Srpen–Září 2026']

/** Neděle od 7. 6. do 13. 9. 2026 — záměrně končí před skutečným tréninkem 20. 9. */
export const DEMO_SUNDAYS = [
  '2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28',
  '2026-07-05', '2026-07-12', '2026-07-19', '2026-07-26',
  '2026-08-02', '2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30',
  '2026-09-06', '2026-09-13',
]

/** Trénink, který se nekonal kvůli zápasu. */
export const DEMO_CANCELLED = '2026-08-16'

/**
 * Jak spolehlivě kdo chodí. Drží se kolem 12 hlav na trénink, což odpovídá
 * skutečné anketě na 20. 9.
 */
export const DEMO_RATES: Record<string, number> = {
  'Martin Kafka': 0.95,
  'Eda Mlej': 0.92,
  'Anetka Bouberlová': 0.88,
  'Viola': 0.84,
  'Filip Kožený': 0.8,
  'Lenka': 0.74,
  'Václav Pesl': 0.7,
  'Johana Kolářová': 0.66,
  'Jan Hrabák': 0.62,
  'Lucie Boušová': 0.58,
  'Petr Šindílek': 0.55,
  'Matej Kolak': 0.5,
  'Tomáš Blodek': 0.46,
  'Nicole Přibylová': 0.42,
  'Šárka Beková': 0.4,
  'Klára Kalinová': 0.36,
  'Tomáš Loužecký': 0.33,
  'Daniel Petrtýl': 0.3,
  'Jakub Kuchar': 0.26,
  'Vojtěch Šašek': 0.22,
  'Naty Houzvickova': 0.18,
  'Nynča': 0.15,
  'Kohi': 0.12,
}

export const DEMO_MATCHES = [
  { date: '2026-06-13', opponent: 'Bobři Mikulova', result: 'win' as const, scoreText: '2:1' },
  { date: '2026-06-27', opponent: 'HAU-HAU', result: 'loss' as const, scoreText: '0:2' },
  { date: '2026-07-18', opponent: 'Braničtí rytíři', result: 'win' as const, scoreText: '2:0' },
  { date: '2026-08-16', opponent: 'LAMY', result: 'win' as const, scoreText: '2:1' },
  { date: '2026-09-05', opponent: 'Storm', result: 'loss' as const, scoreText: '1:2' },
]

/**
 * FNV-1a s lavinovým promícháním (fmix32 z MurmurHash3), normalizovaná do 0–1.
 * Deterministická, takže stejný seed dá vždycky stejnou docházku.
 *
 * Bez toho závěrečného promíchání korelují hodnoty se stejným prefixem —
 * u seedu „jméno|datum“ se mění jen pár posledních znaků, takže hráč vycházel
 * buď skoro pokaždé, nebo skoro nikdy, místo aby se držel své pravděpodobnosti.
 */
export function seededUnit(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 16
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

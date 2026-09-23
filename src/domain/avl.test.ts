import { describe, it, expect } from 'vitest'
import { parseAvlCrosstable } from './avl'

/**
 * Skutečný řádek "Smečaři bez hranic" z historické sezóny 2025/2026
 * (`league=452`), stažený a ověřený ručně 23. 9. 2026 — 15 zápasů, 9
 * výher, 6 proher podle skóre setů (liší se od bodové "úspěšnosti" 64,44 %
 * v tabulce pořadí, která počítá jiným bodovým systémem, viz avl.ts).
 * Zkrácená na jeden řádek tabulky, ne celou stránku — to je vše, co
 * parser potřebuje.
 */
const REAL_ROW_FIXTURE = `
<table class='crosstable'>
<tr><th id="tablecorner"></th><th class="vertical">(s)hit happens</th></tr>
<tr class="odd"><th><a href="https://www.avlka.cz/init/pages/team/smecari-bez-hranic/">Smečaři bez hranic</a></th><td><span class="tdhover">1:2<div class="tooltip"><span>Smečaři bez hranic vs (s)hit happens</span><br />18:25,26:24,13:15</div></span></td><td><span class="tdhover">2:0<div class="tooltip"><span>Smečaři bez hranic vs Armáda Spásy</span><br />25:0,25:0</div></span></td><td><span class="tdhover">2:0<div class="tooltip"><span>Smečaři bez hranic vs Blokujem vidlema</span><br />25:12,25:22</div></span></td><td><span class="tdhover">1:2<div class="tooltip"><span>Smečaři bez hranic vs Bombarďáci</span><br />25:16,21:25,9:15</div></span></td><td><span class="tdhover">1:2<div class="tooltip"><span>Smečaři bez hranic vs buzzny</span><br />25:20,22:25,10:15</div></span></td><td><span class="tdhover">0:2<div class="tooltip"><span>Smečaři bez hranic vs Černý labutě</span><br />24:26,19:25</div></span></td><td><span class="tdhover">2:0<div class="tooltip"><span>Smečaři bez hranic vs DickyAut</span><br />25:14,25:19</div></span></td><td><span class="tdhover">2:0<div class="tooltip"><span>Smečaři bez hranic vs Edovi Srdcaři</span><br />25:18,25:7</div></span></td><td><span class="tdhover">2:0<div class="tooltip"><span>Smečaři bez hranic vs Koudisácí</span><br />28:26,28:26</div></span></td><td><span class="tdhover">2:0<div class="tooltip"><span>Smečaři bez hranic vs Mistři Tesaři</span><br />25:9,27:25</div></span></td><td><span class="tdhover">2:0<div class="tooltip"><span>Smečaři bez hranic vs Ruběž</span><br />25:16,25:17</div></span></td><td><span class="tdhover">2:1<div class="tooltip"><span>Smečaři bez hranic vs Řev v Letech</span><br />25:20,18:25,15:9</div></span></td><td><span class="tdhover">1:2<div class="tooltip"><span>Smečaři bez hranic vs S.T.R.O.J.E.</span><br />25:15,26:28,11:15</div></span></td><td class="cross"></td><td><span class="tdhover">2:1<div class="tooltip"><span>Smečaři bez hranic vs UNYPs Blazers</span><br />22:25,25:21,15:8</div></span></td><td><span class="tdhover">0:2<div class="tooltip"><span>Smečaři bez hranic vs Viet Sport</span><br />24:26,27:29</div></span></td></tr>
</table>
`

describe('parseAvlCrosstable', () => {
  it('rozparsuje všech 15 zápasů reálného řádku', () => {
    const rows = parseAvlCrosstable(REAL_ROW_FIXTURE, 'Smečaři bez hranic')
    expect(rows).not.toBeNull()
    expect(rows).toHaveLength(15)
  })

  it('přeskočí vlastní buňku (tým sám proti sobě), nepočítá ji jako zápas', () => {
    const rows = parseAvlCrosstable(REAL_ROW_FIXTURE, 'Smečaři bez hranic')!
    expect(rows.some((r) => r.opponent === 'Smečaři bez hranic')).toBe(false)
  })

  it('určí výhru/prohru podle počtu vyhraných setů, ne podle bodů v setu', () => {
    const rows = parseAvlCrosstable(REAL_ROW_FIXTURE, 'Smečaři bez hranic')!
    const wins = rows.filter((r) => r.result === 'win')
    const losses = rows.filter((r) => r.result === 'loss')
    expect(wins).toHaveLength(9)
    expect(losses).toHaveLength(6)
  })

  it('vrátí soupeře a skóre přesně pro konkrétní zápas (výhra 2:1 na tři sety)', () => {
    const rows = parseAvlCrosstable(REAL_ROW_FIXTURE, 'Smečaři bez hranic')!
    const match = rows.find((r) => r.opponent === 'Řev v Letech')
    expect(match).toEqual({ opponent: 'Řev v Letech', result: 'win', scoreText: '2:1' })
  })

  it('vrátí soupeře a skóre přesně pro prohru 0:2', () => {
    const rows = parseAvlCrosstable(REAL_ROW_FIXTURE, 'Smečaři bez hranic')!
    const match = rows.find((r) => r.opponent === 'Viet Sport')
    expect(match).toEqual({ opponent: 'Viet Sport', result: 'loss', scoreText: '0:2' })
  })

  it('zvládne soupeře se závorkou ve jméně bez rozbití regexu', () => {
    const rows = parseAvlCrosstable(REAL_ROW_FIXTURE, 'Smečaři bez hranic')!
    expect(rows.some((r) => r.opponent === '(s)hit happens')).toBe(true)
  })

  it('vrátí null, když tým v matici není', () => {
    expect(parseAvlCrosstable(REAL_ROW_FIXTURE, 'Neexistující tým')).toBeNull()
  })

  it('vrátí null, když stránka nemá matici vůbec (např. špatné ID ligy)', () => {
    expect(parseAvlCrosstable('<html><body>404</body></html>', 'Smečaři bez hranic')).toBeNull()
  })

  it('nespojí zápas jiného týmu, kde se hledaný tým zmiňuje jen jako soupeř', () => {
    const html = `
      <table class='crosstable'>
      <tr class="even"><th><a href="...">(s)hit happens</a></th>
        <td><span class="tdhover">2:1<div class="tooltip"><span>(s)hit happens vs Smečaři bez hranic</span><br />25:18,24:26,15:13</div></span></td>
      </tr>
      </table>
    `
    // Hledáme řádek "Smečaři bez hranic" jako ŘÁDKOVÝ tým — tahle tabulka
    // ho má jen jako soupeře v cizím řádku, takže se nesmí nic vrátit.
    expect(parseAvlCrosstable(html, 'Smečaři bez hranic')).toBeNull()
  })
})

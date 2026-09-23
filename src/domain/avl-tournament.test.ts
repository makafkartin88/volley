import { describe, it, expect } from 'vitest'
import { parseAvlTournamentList, parseAvlTournamentMatches } from './avl-tournament'

/** Zkrácený, ale skutečný výřez sekce "Turnaje" ze stránky ligy (league=452). */
const LEAGUE_TOURNAMENT_LIST = `
<div id="teams"><h3>Turnaje</h3>
<table>
<tbody><tr class="even"><td>29.03.2026</td><td><a href="https://www.avlka.cz/init/pages/tournament/2868">Barvě MIZUNO AVL Praha</a></td></tr>
<tr class="odd"><td>01.03.2026</td><td><a href="https://www.avlka.cz/init/pages/tournament/2855">kontumace v 10.MIZUNO AVL Praha</a></td></tr>
<tr class="even"><td>01.03.2026</td><td><a href="https://www.avlka.cz/init/pages/tournament/2837">turnaj 6., 7., 8. a 10.MIZUNO AVL Praha</a></td></tr>
<tr class="odd"><td>19.10.2025</td><td><a href="https://www.avlka.cz/init/pages/tournament/2761">turnaj 6., 8., 9. a 10.MIZUNO AVL Praha</a></td></tr></tbody>
</table>
`

/** Dva skutečné bloky zápasů z turnajové stránky (tournament/2761, 19. 10. 2025). */
const TOURNAMENT_PAGE = `
<div class="blok" style='width: 100%;text-align: center;'>
  <span class="tymblok"><span><a class="team1473" href="https://www.avlka.cz/init/pages/team/unyps-blazers/">
    UNYPs Blazers  </a></span></span><br />
  vs<br />
  <span class="tymblok"><span><a class="team1270" href="https://www.avlka.cz/init/pages/team/smecari-bez-hranic/">
    Smečaři bez hranic  </a></span></span><hr />
    <span>1:2</span><br />
    <span style="font-size: 7pt;">25:22,21:25,8:15</span>
    <hr />
  <img src="/ico/whistle.png" alt="whistle" title="rozhodčí" /><a style="font-size: 8pt;" class="team796" href="https://www.avlka.cz/init/pages/team/vocem/">
    VočeM  </a>
</div>
<div class="blok" style='width: 100%;text-align: center;'>
  <span class="tymblok"><span><a class="team1460" href="https://www.avlka.cz/init/pages/team/blokujem-vidlema/">
    Blokujem vidlema  </a></span></span><br />
  vs<br />
  <span class="tymblok"><span><a class="team1270" href="https://www.avlka.cz/init/pages/team/smecari-bez-hranic/">
    Smečaři bez hranic  </a></span></span><hr />
    <span>0:2</span><br />
    <span style="font-size: 7pt;">12:25,22:25</span>
    <hr />
  <img src="/ico/whistle.png" alt="whistle" title="rozhodčí" /><a style="font-size: 8pt;" class="team1370" href="https://www.avlka.cz/init/pages/team/valec/">
    VÁLEC  </a>
</div>
<div class="blok" style='width: 100%;text-align: center;'>
  <span class="tymblok"><span><a class="team1270" href="https://www.avlka.cz/init/pages/team/smecari-bez-hranic/">
    Smečaři bez hranic  </a></span></span><br />
  vs<br />
  <span class="tymblok"><span><a class="team999" href="https://www.avlka.cz/init/pages/team/mistri-tesari/">
    Mistři Tesaři  </a></span></span><hr />
    <span>2:0</span><br />
    <span style="font-size: 7pt;">25:9,27:25</span>
    <hr />
  <img src="/ico/whistle.png" alt="whistle" title="rozhodčí" /><a style="font-size: 8pt;" class="team1000" href="https://www.avlka.cz/init/pages/team/nekdo/">
    Někdo  </a>
</div>
<div class="blok" style='width: 100%;text-align: center;'>
  <span class="tymblok"><span><a class="team1270" href="https://www.avlka.cz/init/pages/team/smecari-bez-hranic/">
    Smečaři bez hranic  </a></span></span><br />
  vs<br />
  <span class="tymblok"><span><a class="team555" href="https://www.avlka.cz/init/pages/team/buzzny/">
    buzzny  </a></span></span><hr />
    <span>1:2</span><br />
    <span style="font-size: 7pt;">25:20,22:25,10:15</span>
    <hr />
  <img src="/ico/whistle.png" alt="whistle" title="rozhodčí" /><a style="font-size: 8pt;" class="team444" href="https://www.avlka.cz/init/pages/team/rozhodci/">
    Rozhodčí  </a>
</div>
`

describe('parseAvlTournamentList', () => {
  it('rozparsuje datum a ID turnaje z odkazu', () => {
    const links = parseAvlTournamentList(LEAGUE_TOURNAMENT_LIST)
    expect(links).toContainEqual({ date: '2026-03-29', tournamentId: '2868' })
    expect(links).toContainEqual({ date: '2025-10-19', tournamentId: '2761' })
  })

  it('zachová dva turnaje se stejným datem (souběžné skupiny)', () => {
    const links = parseAvlTournamentList(LEAGUE_TOURNAMENT_LIST)
    const sameDay = links.filter((l) => l.date === '2026-03-01')
    expect(sameDay).toHaveLength(2)
    expect(sameDay.map((l) => l.tournamentId).sort()).toEqual(['2837', '2855'])
  })

  it('vrátí prázdné pole, když sekce Turnaje chybí', () => {
    expect(parseAvlTournamentList('<html></html>')).toEqual([])
  })
})

describe('parseAvlTournamentMatches', () => {
  it('najde všechny zápasy týmu na stránce, ignoruje zápas mezi jinými dvěma týmy', () => {
    const rows = parseAvlTournamentMatches(TOURNAMENT_PAGE, 'Smečaři bez hranic')
    expect(rows).toHaveLength(4)
  })

  it('náš tým první, prohra beze změny pořadí skóre', () => {
    const rows = parseAvlTournamentMatches(TOURNAMENT_PAGE, 'Smečaři bez hranic')
    const vsBuzzny = rows.find((r) => r.opponent === 'buzzny')
    expect(vsBuzzny).toEqual({ opponent: 'buzzny', result: 'loss', scoreText: '1:2' })
  })

  it('otočí výsledek, když je náš tým na druhé straně (soupeř první)', () => {
    const rows = parseAvlTournamentMatches(TOURNAMENT_PAGE, 'Smečaři bez hranic')
    const vsUnyps = rows.find((r) => r.opponent === 'UNYPs Blazers')
    // zápis na stránce je "UNYPs Blazers vs Smečaři" 1:2 → z pohledu
    // Smečařů je to 2:1, výhra
    expect(vsUnyps).toEqual({ opponent: 'UNYPs Blazers', result: 'win', scoreText: '2:1' })
  })

  it('nechá výsledek beze změny, když je náš tým první', () => {
    const rows = parseAvlTournamentMatches(TOURNAMENT_PAGE, 'Smečaři bez hranic')
    const vsMistri = rows.find((r) => r.opponent === 'Mistři Tesaři')
    expect(vsMistri).toEqual({ opponent: 'Mistři Tesaři', result: 'win', scoreText: '2:0' })
  })

  it('otočí skóre správně i u druhého bloku (soupeř první, výhra)', () => {
    // Zápis "Blokujem vidlema vs Smečaři" 0:2 → z pohledu Smečařů 2:0, výhra.
    const rows = parseAvlTournamentMatches(TOURNAMENT_PAGE, 'Smečaři bez hranic')
    const vsBlokujem = rows.find((r) => r.opponent === 'Blokujem vidlema')
    expect(vsBlokujem).toEqual({ opponent: 'Blokujem vidlema', result: 'win', scoreText: '2:0' })
  })

  it('nezaměstná rozhodčího zápasu za účastníka', () => {
    // "VočeM" a "VÁLEC" jsou rozhodčí pod čárou u zápasů Smečařů — nesmí
    // se objevit jako soupeř.
    const rows = parseAvlTournamentMatches(TOURNAMENT_PAGE, 'Smečaři bez hranic')
    expect(rows.some((r) => r.opponent === 'VočeM')).toBe(false)
    expect(rows.some((r) => r.opponent === 'VÁLEC')).toBe(false)
  })

  it('vrátí prázdné pole, když tým ten den nehrál', () => {
    expect(parseAvlTournamentMatches(TOURNAMENT_PAGE, 'Neexistující tým')).toEqual([])
  })
})

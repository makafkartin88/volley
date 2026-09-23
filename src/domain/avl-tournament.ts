/**
 * Parsování jednotlivých turnajových stránek avlka.cz
 * (`https://www.avlka.cz/init/pages/tournament/<ID>/`).
 *
 * Na rozdíl od `avl.ts` (matice vzájemných zápasů, bez data) tahle stránka
 * datum zná — je to jeden konkrétní hrací den. Díky tomu jde nový zápas
 * založit rovnou se skutečným datem, ne s odhadem.
 *
 * Seznam turnajů s daty se čte ze stránky ligy (`?league=<ID>`), ze sekce
 * "Turnaje" — to je vstup pro `parseAvlTournamentList`. Konkrétní zápasy
 * daného dne pak vrací `parseAvlTournamentMatches` z jeho vlastní stránky.
 */

export type AvlTournamentLink = {
  /** ISO datum (YYYY-MM-DD). */
  date: string
  tournamentId: string
}

export type AvlTournamentMatch = {
  opponent: string
  result: 'win' | 'loss'
  /** "2:1" — počet vyhraných setů, ne bodové skóre v setu. */
  scoreText: string
}

/**
 * Seznam odehraných turnajů (kol) dané ligy s jejich daty — ze sekce
 * "Turnaje" na stránce `?league=<ID>`. Stejná liga může mít v seznamu
 * i více turnajů se stejným datem (souběžné skupiny/nadstavba).
 */
export function parseAvlTournamentList(html: string): AvlTournamentLink[] {
  const pattern = /<td>(\d{2})\.(\d{2})\.(\d{4})<\/td><td><a href="[^"]*\/tournament\/(\d+)/g
  const links: AvlTournamentLink[] = []
  for (const match of html.matchAll(pattern)) {
    const [, day, month, year, tournamentId] = match
    links.push({ date: `${year}-${month}-${day}`, tournamentId })
  }
  return links
}

/**
 * Zápasy daného týmu z jedné turnajové stránky. Stránka obsahuje zápasy
 * všech týmů toho dne na všech kurtech — vybere jen bloky, kde je `teamName`
 * jednou ze dvou stran (ne tam, kde se objeví jen jako rozhodčí ve
 * fotbálku pod čárou).
 */
export function parseAvlTournamentMatches(html: string, teamName: string): AvlTournamentMatch[] {
  const matches: AvlTournamentMatch[] = []
  const blockPattern = /<div class="blok"[^>]*>.*?<\/div>/gs

  for (const block of html.matchAll(blockPattern)) {
    const sides = [...block[0].matchAll(/<span class="tymblok"><span><a[^>]*>\s*([^<]+?)\s*<\/a>/gs)]
      .map((m) => m[1].trim())
    if (sides.length !== 2) continue

    const ourIndex = sides.indexOf(teamName)
    if (ourIndex === -1) continue

    const score = block[0].match(/<span>(\d+):(\d+)<\/span>/)
    if (!score) continue

    const opponent = sides[ourIndex === 0 ? 1 : 0]
    let won = Number(score[1])
    let lost = Number(score[2])
    if (ourIndex === 1) [won, lost] = [lost, won]

    matches.push({ opponent, result: won > lost ? 'win' : 'loss', scoreText: `${won}:${lost}` })
  }

  return matches
}

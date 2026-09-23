/**
 * Parsování matice "Vzájemné zápasy" z avlka.cz (např.
 * `https://www.avlka.cz/init/action/asynTransfer/drawLeague/?league=<ID>`).
 *
 * Jen tahle matice, nikdy tabulka pořadí — ta počítá body podle vlastního
 * bodového systému AVL (2:0 = 3 body, 2:1 = 2, 1:2 = 1, 0:2 = 0 bodů),
 * takže její "úspěšnost v %" je poměr bodů k maximu, ne poměr výher.
 * Pro binární výhra/prohra, jak ho čeká tahle appka, je zdrojem pravdy
 * jen skóre setů v matici — kdo vyhrál víc setů, ten zápas vyhrál.
 *
 * Datum ani sestava v datech AVL nejsou nikdy — ty vždycky doplní
 * organizátor ručně, tenhle parser jen ušetří opisování soupeře a skóre.
 */

export type AvlMatchRow = {
  opponent: string
  result: 'win' | 'loss'
  /** "2:1" — počet vyhraných setů, ne bodové skóre v setu. */
  scoreText: string
}

/** Rozloží pár HTML entit, které se na avlka.cz reálně objevují v týmových jménech. */
function unescapeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
}

/**
 * Najde řádek daného týmu v `<table class='crosstable'>` a vrátí jeho
 * zápasy se všemi ostatními týmy. Vrací `null`, pokud stránka nemá matici
 * vůbec (např. špatné ID ligy), nebo v ní tenhle tým není.
 *
 * Vlastní buňka (tým sám proti sobě) je `<td class="cross"></td>` bez
 * `tdhover` obsahu — ta se přeskočí přirozeně, ne podle pozice ve sloupci.
 */
export function parseAvlCrosstable(html: string, teamName: string): AvlMatchRow[] | null {
  const rowMatch = findTeamRow(html, teamName)
  if (!rowMatch) return null

  const rows: AvlMatchRow[] = []
  const cellPattern = /<td[^>]*>(.*?)<\/td>/gs
  for (const cell of rowMatch.matchAll(cellPattern)) {
    const parsed = parseCell(cell[1])
    if (parsed) rows.push(parsed)
  }
  return rows
}

/**
 * Vrátí HTML jednoho `<tr>…</tr>`, jehož první buňka je odkaz na tým
 * `teamName` — to je vždycky řádkový (ne sloupcový) záhlaví, takže se
 * nikdy neshoduje jen proto, že se jméno týmu zmiňuje jako soupeř jinde.
 */
function findTeamRow(html: string, teamName: string): string | null {
  const rowPattern = /<tr[^>]*>(?:(?!<\/tr>).)*<\/tr>/gs
  const rows = html.match(rowPattern)
  if (!rows) return null

  const headerPattern = new RegExp(
    `<th><a[^>]*>${escapeRegExp(teamName)}</a></th>`,
  )
  return rows.find((row) => headerPattern.test(row)) ?? null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Jedna buňka matice: `<span class="tdhover">2:1<div class="tooltip">
 * <span>Tým A vs Tým B</span><br />25:18,24:26,15:13</div></span>`, nebo
 * prázdná vlastní buňka `<td class="cross"></td>` (jejíž obsah je "").
 */
function parseCell(cellHtml: string): AvlMatchRow | null {
  const match = cellHtml.match(
    /(\d+):(\d+)<div class="tooltip"><span>.*? vs (.*?)<\/span>/s,
  )
  if (!match) return null

  const [, wonRaw, lostRaw, opponentRaw] = match
  const won = Number(wonRaw)
  const lost = Number(lostRaw)
  const opponent = unescapeHtml(opponentRaw).trim()

  return {
    opponent,
    result: won > lost ? 'win' : 'loss',
    scoreText: `${won}:${lost}`,
  }
}

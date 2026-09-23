'use client'

import { useState, useTransition } from 'react'
import { fetchAvlMatches, type AvlFetchResult } from '@/actions/avl'
import { createMatch } from '@/actions/matches'
import type { AvlMatchRow } from '@/domain/avl'

type ExistingMatch = { opponent: string; scoreText: string | null }

const inputClass =
  'mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim'

/** Stejný vzor jako `ResultMark` v `MatchesSection` — plná značka pro výhru, obrysová pro prohru, žádná zeleň/červeň. */
function ResultMark({ result }: { result: 'win' | 'loss' }) {
  return (
    <span
      className={
        result === 'win'
          ? 'flex h-4 w-4 shrink-0 items-center justify-center border border-chalk bg-chalk'
          : 'flex h-4 w-4 shrink-0 items-center justify-center border border-chalk-dim'
      }
      aria-hidden="true"
    />
  )
}

function isAlreadyRecorded(row: AvlMatchRow, existingMatches: ExistingMatch[]): boolean {
  return existingMatches.some(
    (m) => m.opponent === row.opponent && m.scoreText === row.scoreText,
  )
}

function AvlMatchRowItem({ row }: { row: AvlMatchRow }) {
  const [date, setDate] = useState('')
  const [pending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  function submit() {
    if (!date) return
    const formData = new FormData()
    formData.set('date', date)
    formData.set('opponent', row.opponent)
    formData.set('result', row.result)
    formData.set('scoreText', row.scoreText)
    startTransition(async () => {
      await createMatch(formData)
      setAdded(true)
    })
  }

  if (added) {
    return (
      <li className="row flex min-h-11 items-center gap-3 py-3 text-chalk-dim">
        <ResultMark result={row.result} />
        {row.opponent}, {row.scoreText} — přidáno
      </li>
    )
  }

  return (
    <li className="row flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 text-body text-chalk">
        <ResultMark result={row.result} />
        {row.opponent}
        <span className="text-meta text-chalk-dim">{row.scoreText}</span>
      </span>
      <span className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${inputClass} mt-0 sm:w-40`}
          aria-label="Datum zápasu"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!date || pending}
          className="btn-quiet"
        >
          {pending ? 'Přidávám…' : 'Přidat'}
        </button>
      </span>
    </li>
  )
}

export function AvlImport({ existingMatches }: { existingMatches: ExistingMatch[] }) {
  const [leagueId, setLeagueId] = useState('')
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<AvlFetchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await fetchAvlMatches(leagueId)
        setResult(res)
      } catch {
        setError('ID ligy musí být číslo.')
      }
    })
  }

  const suggested =
    result?.status === 'ok'
      ? result.matches.filter((row) => !isAlreadyRecorded(row, existingMatches))
      : []

  return (
    <div className="flex flex-col gap-4 border-t border-rule pt-6">
      <h2 className="text-meta text-chalk-dim">Import z avlka.cz</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="sm:w-48">
          <span className="text-meta text-chalk-dim">ID ligy z avlka.cz</span>
          <input
            type="text"
            inputMode="numeric"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            placeholder="452"
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={pending || leagueId.trim() === ''}
          className="btn-quiet"
        >
          {pending ? 'Načítám…' : 'Načíst z AVL'}
        </button>
      </div>

      {error && <p className="text-meta text-danger">{error}</p>}

      {result?.status === 'error' && <p className="text-meta text-danger">{result.message}</p>}

      {result?.status === 'not_found' && (
        <p className="measure text-meta text-chalk-dim">
          V téhle lize tým „Smečaři bez hranic&rdquo; nemá žádné zápasy — zkontroluj ID ligy, nebo
          sezóna ještě nezačala.
        </p>
      )}

      {result?.status === 'ok' && suggested.length === 0 && (
        <p className="measure text-meta text-chalk-dim">
          Všechny zápasy z týhle ligy už jsou zadané.
        </p>
      )}

      {result?.status === 'ok' && suggested.length > 0 && (
        <ul className="flex flex-col">
          {suggested.map((row, index) => (
            <AvlMatchRowItem key={`${row.opponent}-${row.scoreText}-${index}`} row={row} />
          ))}
        </ul>
      )}
    </div>
  )
}

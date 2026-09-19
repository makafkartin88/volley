'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatCzk, formatDate } from '@/lib/format'

/** Zrušený trénink má `heads === null` — v čáře z něj bude mezera, ne nula. */
export type ChartPoint = {
  date: string
  heads: number | null
  perHead: number | null
}

const PAD = { top: 18, right: 16, bottom: 26, left: 30 }
const PLOT_H = 150
/** Dotykový cíl mezi body. Když se body nevejdou, graf se vodorovně posouvá. */
const MIN_GAP = 30

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/**
 * Docházka trénink po tréninku. Jedna řada, takže žádná legenda — popisuje
 * ji nadpis bloku. Čára je v --chalk, osy a mřížka v --rule ustupují,
 * růžová se objeví jen na vybraném bodu a jen po dobu dotyku či fokusu.
 *
 * Hodnoty nejsou schované za bublinou: výpis nad grafem ukazuje poslední
 * trénink i bez ťuknutí a pod grafem je stejná data tabulkou.
 */
export function AttendanceChart({ points }: { points: ChartPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const rectsRef = useRef<(SVGRectElement | null)[]>([])
  const [avail, setAvail] = useState(330)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setAvail(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const move = useCallback((from: number, step: number) => {
    const next = Math.min(points.length - 1, Math.max(0, from + step))
    setSelected(next)
    rectsRef.current[next]?.focus()
  }, [points.length])

  if (points.length === 0) {
    return (
      <p className="measure py-4 text-chalk-dim">
        Zatím není co kreslit. Po prvním zapsaném tréninku se tu objeví křivka.
      </p>
    )
  }

  const counts = points.map((p) => p.heads ?? 0)
  const top = Math.max(4, Math.ceil(Math.max(...counts) / 4) * 4)
  const gap = Math.max(MIN_GAP, (avail - PAD.left - PAD.right) / Math.max(1, points.length - 1))
  const width = PAD.left + gap * (points.length - 1) + PAD.right
  const height = PAD.top + PLOT_H + PAD.bottom

  const x = (i: number) => PAD.left + i * gap
  const y = (v: number) => PAD.top + PLOT_H - (v / top) * PLOT_H

  // Čáru kreslíme po úsecích mezi zrušenými tréninky — přes mezeru nevede.
  const segments: { i: number; heads: number }[][] = []
  let run: { i: number; heads: number }[] = []
  points.forEach((point, i) => {
    if (point.heads === null) {
      if (run.length > 0) segments.push(run)
      run = []
    } else {
      run.push({ i, heads: point.heads })
    }
  })
  if (run.length > 0) segments.push(run)

  // Popisek osy X jen u prvního bodu každého měsíce, ne u každého tréninku.
  const monthTicks = points
    .map((point, i) => ({ i, month: Number(point.date.slice(5, 7)) }))
    .filter((tick, index, all) => index === 0 || all[index - 1].month !== tick.month)

  const lastIndex = points.length - 1
  const readoutIndex = selected ?? lastIndex
  const readout = points[readoutIndex]

  return (
    <div className="flex flex-col gap-3">
      <dl
        aria-live="polite"
        className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-rule pb-3"
      >
        <div>
          <dt className="text-meta text-chalk-dim">
            {selected === null ? 'Poslední trénink' : 'Vybraný trénink'}
          </dt>
          <dd className="display text-body text-chalk">{formatDate(readout.date)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-meta text-chalk-dim">Hlav</dt>
          <dd className="display text-body tabular-nums text-chalk">
            {readout.heads ?? 'Nekonal se'}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-meta text-chalk-dim">Na hlavu</dt>
          <dd className="display text-body tabular-nums text-chalk">
            {readout.perHead === null ? '—' : formatCzk(readout.perHead)}
          </dd>
        </div>
      </dl>

      <div ref={wrapRef} className="-mx-1 overflow-x-auto px-1">
        <svg
          role="img"
          aria-label={`Počet hlav na ${points.length} trénincích, od ${formatDate(points[0].date)} do ${formatDate(points[lastIndex].date)}.`}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onPointerLeave={() => setSelected(null)}
          className="block touch-pan-y"
        >
          {[0, top / 2, top].map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--rule)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(value)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--chalk-dim)"
                className="tabular-nums"
              >
                {value}
              </text>
            </g>
          ))}

          {monthTicks.map((tick) => (
            <text
              key={tick.i}
              x={x(tick.i)}
              y={height - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--chalk-dim)"
            >
              {ROMAN[tick.month]}
            </text>
          ))}

          {/* Zrušený trénink: tichá svislice místo bodu. Mezeru v čáře vysvětlí,
              ale nedělá z ní nulu. */}
          {points.map((point, i) => (point.heads === null ? (
            <line
              key={`gap-${point.date}`}
              x1={x(i)}
              x2={x(i)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="var(--rule)"
              strokeWidth={1}
            />
          ) : null))}

          {segments.map((segment) => (
            <polyline
              key={segment[0].i}
              points={segment.map((p) => `${x(p.i)},${y(p.heads)}`).join(' ')}
              fill="none"
              stroke="var(--chalk)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {points.map((point, i) => {
            if (point.heads === null) return null
            const active = selected === i
            return (
              <circle
                key={`dot-${point.date}`}
                cx={x(i)}
                cy={y(point.heads)}
                r={active ? 5 : i === lastIndex ? 4.5 : 3.5}
                fill={active ? 'var(--pink)' : 'var(--chalk)'}
                stroke="var(--ink)"
                strokeWidth={2}
                className="[transition:r_120ms_ease-out]"
              />
            )
          })}

          {points.map((point, i) => (
            <rect
              key={`hit-${point.date}`}
              ref={(node) => { rectsRef.current[i] = node }}
              x={x(i) - gap / 2}
              y={PAD.top}
              width={gap}
              height={PLOT_H}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={describe(point)}
              onPointerEnter={() => setSelected(i)}
              onPointerDown={(event) => {
                setSelected(i)
                // Myš nemá dostat klávesový rámeček; u dotyku se default
                // nechává, jinak by se graf nedal vodorovně posouvat.
                if (event.pointerType === 'mouse') event.preventDefault()
              }}
              onFocus={() => setSelected(i)}
              onBlur={() => setSelected(null)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') { event.preventDefault(); move(i, 1) }
                if (event.key === 'ArrowLeft') { event.preventDefault(); move(i, -1) }
              }}
            />
          ))}
        </svg>
      </div>

      <details className="text-meta">
        <summary className="flex min-h-11 cursor-pointer items-center text-chalk-dim">
          Vypsat čísla tabulkou
        </summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="border-b border-rule text-chalk-dim">
              <th scope="col" className="py-2 font-normal">Trénink</th>
              <th scope="col" className="py-2 text-right font-normal">Hlav</th>
              <th scope="col" className="py-2 text-right font-normal">Na hlavu</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={`row-${point.date}`} className="border-b border-rule">
                <td className="py-2 text-chalk">{formatDate(point.date)}</td>
                <td className="py-2 text-right tabular-nums text-chalk">
                  {point.heads ?? 'Nekonal se'}
                </td>
                <td className="py-2 text-right tabular-nums text-chalk-dim">
                  {point.perHead === null ? '—' : formatCzk(point.perHead)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function describe(point: ChartPoint): string {
  if (point.heads === null) return `${formatDate(point.date)}: trénink se nekonal.`
  const price = point.perHead === null ? '' : `, ${formatCzk(point.perHead)} na hlavu`
  return `${formatDate(point.date)}: ${point.heads} hlav${price}.`
}

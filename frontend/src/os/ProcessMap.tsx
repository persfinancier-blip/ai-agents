// Карта бизнес-процесса цели: этапы-узлы + переходы seq/split/join с условиями.
// Ручной SVG в манере карты целей: viewBox, кривые Безье, hex-палитра.
// Узел карты и строка в списке этапов — один объект (синхрон по hoverId/onOpen).

import { LIFECYCLE_LABEL, flowState } from './goals'
import type { OsGoal, OsTransition } from './data'

const W = 172
const H = 56
const COLW = 216
const ROWH = 92

const NODE_STROKE: Record<'passed' | 'now' | 'next', string> = {
  passed: 'rgba(143,209,79,.5)',
  now: '#e8c04a',
  next: 'rgba(228,227,223,.28)',
}

const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export function ProcessMap({
  stages,
  process,
  hoverId,
  onHover,
  onOpen,
}: {
  stages: OsGoal[]
  process: OsTransition[]
  hoverId: string | null
  onHover: (id: string | null) => void
  onOpen: (id: string) => void
}) {
  // укладка по уровням: longest path от истоков
  const lvl: Record<string, number> = {}
  for (const s of stages) lvl[s.id] = 0
  for (let i = 0; i < stages.length; i++)
    for (const t of process)
      if (lvl[t.from] !== undefined && lvl[t.to] !== undefined)
        lvl[t.to] = Math.max(lvl[t.to], lvl[t.from] + 1)

  const cols = new Map<number, OsGoal[]>()
  for (const s of stages) {
    const l = lvl[s.id]
    if (!cols.has(l)) cols.set(l, [])
    cols.get(l)!.push(s)
  }
  const nCols = Math.max(...cols.keys()) + 1
  const maxRows = Math.max(...[...cols.values()].map((c) => c.length))
  const vw = 24 + nCols * COLW
  const vh = 24 + maxRows * ROWH

  // координаты узлов (центр колонки по вертикали)
  const pos = new Map<string, { x: number; y: number }>()
  for (const [l, list] of cols) {
    const y0 = 12 + ((maxRows - list.length) * ROWH) / 2
    list.forEach((s, i) => pos.set(s.id, { x: 20 + l * COLW, y: y0 + i * ROWH }))
  }

  const stateOf = (id: string) => flowState(stages.find((s) => s.id === id)!)

  return (
    <div className="pmap">
      <svg viewBox={`0 0 ${vw} ${vh}`} role="img" aria-label="Карта бизнес-процесса цели">
        {/* связи */}
        {process.map((t) => {
          const a = pos.get(t.from)
          const b = pos.get(t.to)
          if (!a || !b) return null
          const sx = a.x + W
          const sy = a.y + H / 2
          const tx = b.x
          const ty = b.y + H / 2
          const fromSt = stateOf(t.from)
          const toSt = stateOf(t.to)
          const cls =
            fromSt === 'passed' && toSt === 'passed'
              ? 'pm-passed'
              : fromSt !== 'next' && toSt !== 'passed' && toSt === 'now'
                ? 'pm-now'
                : fromSt === 'passed' && toSt === 'next'
                  ? 'pm-ready'
                  : 'pm-next'
          return (
            <g key={`${t.from}-${t.to}`}>
              <path
                className={`pm-edge ${cls}`}
                d={`M ${sx} ${sy} C ${sx + 44} ${sy}, ${tx - 44} ${ty}, ${tx} ${ty}`}
                fill="none"
              />
              <polygon
                points={`${tx},${ty} ${tx - 7},${ty - 4} ${tx - 7},${ty + 4}`}
                className={`pm-arr ${cls}`}
              />
            </g>
          )
        })}

        {/* шлюзы: деление (у истока split) и слияние (у стока join) */}
        {[...new Set(process.filter((t) => t.kind === 'split').map((t) => t.from))].map((id) => {
          const a = pos.get(id)
          if (!a) return null
          const x = a.x + W + 22
          const y = a.y + H / 2
          return (
            <rect key={`sp-${id}`} className="pm-gate" x={x - 6} y={y - 6} width="12" height="12" transform={`rotate(45 ${x} ${y})`} />
          )
        })}
        {[...new Set(process.filter((t) => t.kind === 'join').map((t) => t.to))].map((id) => {
          const b = pos.get(id)
          if (!b) return null
          const x = b.x - 22
          const y = b.y + H / 2
          return (
            <rect key={`jn-${id}`} className="pm-gate" x={x - 6} y={y - 6} width="12" height="12" transform={`rotate(45 ${x} ${y})`} />
          )
        })}

        {/* узлы — те же этапы, что и в списке */}
        {stages.map((s) => {
          const p = pos.get(s.id)!
          const st = flowState(s)
          const hot = hoverId === s.id
          return (
            <g
              key={s.id}
              className={`pm-node pm-${st}${hot ? ' hot' : ''}`}
              transform={`translate(${p.x} ${p.y})`}
              onClick={() => onOpen(s.id)}
              onMouseEnter={() => onHover(s.id)}
              onMouseLeave={() => onHover(null)}
              tabIndex={0}
              role="button"
              aria-label={`Открыть этап: ${s.name}`}
              onKeyDown={(e) => e.key === 'Enter' && onOpen(s.id)}
            >
              <rect
                className="pm-box"
                width={W}
                height={H}
                rx="4"
                stroke={hot ? '#e8c04a' : NODE_STROKE[st]}
                strokeDasharray={st === 'next' && !hot ? '5 4' : undefined}
              />
              {st === 'now' && <circle className="pm-pulse" cx={W - 10} cy={10} r="3.5" />}
              <text className="pm-name" x="10" y="22">
                {trim(s.name, 24)}
              </text>
              <text className="pm-meta" x="10" y="42">
                {s.kpi}% · {LIFECYCLE_LABEL[s.lifecycle].toLowerCase()}
              </text>
            </g>
          )
        })}

        {/* подписи режима слияния — верхним слоем */}
        {[...new Set(process.filter((t) => t.kind === 'join').map((t) => t.to))].map((id) => {
          const b = pos.get(id)
          if (!b) return null
          const mode = process.find((t) => t.kind === 'join' && t.to === id)?.mode
          return (
            <text key={`jl-${id}`} className="pm-cond" x={b.x - 22} y={b.y + H / 2 + 22} textAnchor="middle">
              {mode === 'any' ? 'любая ветка' : 'ждать всех'}
            </text>
          )
        })}

        {/* подписи условий — верхним слоем, чтобы читались поверх узлов */}
        {process.map((t) => {
          const a = pos.get(t.from)
          const b = pos.get(t.to)
          if (!a || !b || !t.condition) return null
          const mx = (a.x + W + b.x) / 2
          const my = (a.y + b.y + H) / 2
          // над коридором узлов, чтобы подпись не ложилась на рамки
          const ly = a.y === b.y ? a.y - 7 : my - 9
          return (
            <text key={`c-${t.from}-${t.to}`} className="pm-cond" x={mx} y={ly} textAnchor="middle">
              {t.condition}
            </text>
          )
        })}
      </svg>
      <div className="pm-legend">
        ◇ — шлюз: деление и слияние веток · подпись на связи — условие перехода · пройденное погашено, текущее пульсирует
      </div>
    </div>
  )
}

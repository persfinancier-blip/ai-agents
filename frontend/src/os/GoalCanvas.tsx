// Канвас постановки цели (Ф4, промпт №23) — «круговая постановка»: цель в центре,
// вокруг неё вся постановка. Первый экран, показывающий граф увязки KPI→KPI
// (API есть с Шагов 3a/3b/3c, здесь его впервые видно). Backend не менялся.
// Раскладка — простая тригонометрия по секторам, без force-directed (временно,
// как карта целей); после мутаций связей — полная перезагрузка данных (без
// оптимизма, как в Ф3).

import { useEffect, useState } from 'react'
import {
  ApiError,
  confirmKpiLinkCycle,
  createKpiLink,
  deleteKpiLink,
  getGoal,
  getGoalSubtree,
  listGoals,
  listKpiFactors,
  listKpiLinkCycles,
  listKpiLinksForKpi,
} from '../api'
import type { GoalKpiRead, GoalRead, KpiFactorRead, KpiLinkCycleRead, KpiLinkRead, KpiLinkType } from '../types'
import { definitenessLabel, kpiValue, ownerOrDash } from './goalFormat'

const LINK_TYPE_LABEL: Record<KpiLinkType, string> = {
  contributes: 'способствует',
  constrains: 'ограничивает',
  depends_on: 'зависит от',
}
const LINK_TYPE_CLASS: Record<KpiLinkType, string> = {
  contributes: 'lt-contributes',
  constrains: 'lt-constrains',
  depends_on: 'lt-depends',
}
const LINK_TYPES = Object.keys(LINK_TYPE_LABEL) as KpiLinkType[]

/* ── геометрия: простая тригонометрия по секторам ────────────────────────── */

const CX = 520
const CY = 330
const CANVAS_W = 1040
const CANVAS_H = 660
const KPI_R0 = 175
const SUB_R0 = 175
const ROW_STEP = 78
const SAT_EXTRA = 75
const MAX_KPI_ROW = 5
const MAX_SAT_ROW = 6
const CENTER_GAP = 95
const KPI_GAP = 54
const SUB_GAP = 58
const SAT_GAP = 50

interface Pt {
  x: number
  y: number
}

const polar = (radius: number, angleDeg: number): Pt => {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

// Дуга в один ряд; при переполнении сектора зовущий код передаёт уже нарезанные
// на ряды порции (chunkRows) с растущим радиусом на ряд.
function arcPositions(count: number, angleFrom: number, angleTo: number, radius: number): Pt[] {
  if (count === 0) return []
  if (count === 1) return [polar(radius, (angleFrom + angleTo) / 2)]
  const step = (angleTo - angleFrom) / (count - 1)
  return Array.from({ length: count }, (_, i) => polar(radius, angleFrom + i * step))
}

function chunkRows<T>(items: T[], maxPerRow: number): T[][] {
  if (items.length <= maxPerRow) return [items]
  const rowCount = Math.ceil(items.length / maxPerRow)
  const perRow = Math.ceil(items.length / rowCount)
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow))
  return rows
}

// Обрезает отрезок с обоих концов на gap (приблизительно — под размер узла-пилюли),
// чтобы линия/стрелка не влезала внутрь карточки.
function trimLine(x1: number, y1: number, x2: number, y2: number, gap1: number, gap2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  return { sx: x1 + ux * gap1, sy: y1 + uy * gap1, tx: x2 - ux * gap2, ty: y2 - uy * gap2 }
}

// KPI-связи в обе стороны — обычный сценарий (создали «способствует», потом «зависит
// от» в ответ, чтобы замкнуть цикл на подтверждение) даёт две связи между ровно той же
// парой узлов. Прямая линия наложила бы их друг на друга — обе визуально и по клику
// (hit-область верхней перекрывала нижнюю). offset разводит дугой; offset=0 (единственная
// связь пары — обычный случай) даёт ту же прямую линию, что и раньше.
//
// perp задаётся ОТДЕЛЬНО от направления source→target: две встречные связи одной пары
// (source/target местами) иначе давали бы противоположный perp-вектор при одинаковом по
// модулю offset разного знака — знаки взаимно гасились, и обе дуги ложились в одну и ту
// же control-point (баг, пойманный вручную в Playwright: hit-область нижней связи была
// недостижима для клика). perp считается по канонической (не зависящей от направления
// конкретной связи) паре узлов — см. вызов ниже.
function curvedPath(sx: number, sy: number, tx: number, ty: number, perp: Pt, offset: number) {
  if (offset === 0) {
    return { d: `M ${sx} ${sy} L ${tx} ${ty}`, angle: (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI }
  }
  const cx = (sx + tx) / 2 + perp.x * offset
  const cy = (sy + ty) / 2 + perp.y * offset
  return { d: `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`, angle: (Math.atan2(ty - cy, tx - cx) * 180) / Math.PI }
}

/* ── данные канваса: собираются из уже существующего API (backend не менялся) ── */

interface KpiLocation {
  kpiId: string
  goalId: string
  goalName: string
  kpi: GoalKpiRead
}

interface CanvasData {
  goal: GoalRead
  children: GoalRead[]
  allGoals: GoalRead[]
  links: KpiLinkRead[]
  cycles: KpiLinkCycleRead[]
  factors: KpiFactorRead[]
  kpiIndex: Map<string, KpiLocation>
  goalIndex: Map<string, string>
}

async function fetchCanvasData(goalId: string): Promise<CanvasData> {
  const [goal, subtree, allGoals] = await Promise.all([getGoal(goalId), getGoalSubtree(goalId), listGoals()])
  const children = subtree.filter((c) => c.id !== goal.id && c.parent_id === goal.id)

  const kpiIndex = new Map<string, KpiLocation>()
  const goalIndex = new Map<string, string>()
  for (const g of allGoals) {
    goalIndex.set(g.id, g.name)
    for (const k of g.kpis) if (k.id) kpiIndex.set(k.id, { kpiId: k.id, goalId: g.id, goalName: g.name, kpi: k })
  }

  const ownKpiIds = goal.kpis.map((k) => k.id).filter((id): id is string => id != null)

  const linkLists = await Promise.all(ownKpiIds.map((id) => listKpiLinksForKpi(id)))
  const linksById = new Map<string, KpiLinkRead>()
  for (const list of linkLists) for (const l of list) linksById.set(l.id, l)

  const allCycles = await listKpiLinkCycles()
  const ownIdSet = new Set(ownKpiIds)
  const cycles = allCycles.filter((c) => c.member_kpi_ids.some((id) => ownIdSet.has(id)))

  const compositeIds = goal.kpis.filter((k) => k.computed_value != null && k.id).map((k) => k.id as string)
  const factorLists = await Promise.all(compositeIds.map((id) => listKpiFactors(id)))

  return {
    goal,
    children,
    allGoals,
    links: [...linksById.values()],
    cycles,
    factors: factorLists.flat(),
    kpiIndex,
    goalIndex,
  }
}

type Status = 'loading' | 'ready' | 'notfound' | 'error'

interface LinkDraft {
  sourceKpiId: string
  targetGoalId: string | null
  targetKpiId: string | null
}

export function GoalCanvas({
  path,
  onNavigate,
  onBack,
}: {
  path: string[]
  onNavigate: (path: string[]) => void
  onBack: () => void
}) {
  const id = path[path.length - 1]

  const [data, setData] = useState<CanvasData | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null)
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setData(null)
    setLinkDraft(null)
    setActionError(null)

    fetchCanvasData(id)
      .then((fresh) => {
        if (cancelled) return
        setData(fresh)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // Escape: сперва закрывает поповер связи, иначе — возврат к карточке (как «Назад»)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (linkDraft) setLinkDraft(null)
      else onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [linkDraft, onBack])

  const reload = async () => {
    const fresh = await fetchCanvasData(id)
    setData(fresh)
  }

  const goTo = (goalId: string) => onNavigate([...path, goalId])

  const openLink = (kpiId: string) => {
    setLinkError(null)
    setLinkDraft({ sourceKpiId: kpiId, targetGoalId: null, targetKpiId: null })
  }

  const submitLink = (type: KpiLinkType) => {
    if (!linkDraft?.targetKpiId || linkBusy) return
    setLinkBusy(true)
    setLinkError(null)
    createKpiLink({ source_kpi_id: linkDraft.sourceKpiId, target_kpi_id: linkDraft.targetKpiId, link_type: type })
      .then(() => reload())
      .then(() => setLinkDraft(null))
      .catch((err: unknown) => {
        setLinkError(
          err instanceof ApiError && err.status === 409
            ? 'Такая связь уже существует'
            : 'Нельзя создать связь: проверьте выбор KPI',
        )
      })
      .finally(() => setLinkBusy(false))
  }

  const handleDeleteLink = (link: KpiLinkRead) => {
    if (busy) return
    const label = LINK_TYPE_LABEL[link.link_type as KpiLinkType] ?? link.link_type
    if (!window.confirm(`Разорвать связь «${label}»?`)) return
    setBusy(true)
    setActionError(null)
    deleteKpiLink(link.id)
      .then(() => reload())
      .catch(() => setActionError('Не удалось разорвать связь'))
      .finally(() => setBusy(false))
  }

  const toggleCycleConfirm = (cycle: KpiLinkCycleRead) => {
    if (busy) return
    setBusy(true)
    setActionError(null)
    confirmKpiLinkCycle(cycle.id, !cycle.confirmed)
      .then(() => reload())
      .catch(() => setActionError('Не удалось обновить статус цикла'))
      .finally(() => setBusy(false))
  }

  if (status !== 'ready' || !data) {
    return (
      <div className="os-goal">
        <header className="top">
          <span className="crumb">
            <button onClick={onBack}>← карточка</button> / <b>канвас постановки</b>
          </span>
        </header>
        <div className="wrap">
          <div style={{ color: 'var(--i55)', padding: '40px 0' }}>
            {status === 'loading' && 'Загрузка…'}
            {status === 'notfound' && 'Цель не найдена — возможно, её удалили.'}
            {status === 'error' && 'Не удалось загрузить канвас постановки'}
          </div>
        </div>
      </div>
    )
  }

  const { goal, children, cycles, factors, kpiIndex, goalIndex, allGoals } = data
  const ownKpis = goal.kpis.filter((k): k is GoalKpiRead & { id: string } => k.id != null)
  const ownIdSet = new Set(ownKpis.map((k) => k.id))
  const ownKpiById = new Map(ownKpis.map((k) => [k.id, k]))

  /* позиции узлов */
  const kpiPos = new Map<string, Pt>()
  chunkRows(ownKpis, MAX_KPI_ROW).forEach((row, ri) => {
    arcPositions(row.length, -165, -15, KPI_R0 + ri * ROW_STEP).forEach((p, i) => kpiPos.set(row[i].id, p))
  })

  const subPos = new Map<string, Pt>()
  chunkRows(children, MAX_KPI_ROW).forEach((row, ri) => {
    arcPositions(row.length, 15, 165, SUB_R0 + ri * ROW_STEP).forEach((p, i) => subPos.set(row[i].id, p))
  })

  const externalIds = new Set<string>()
  for (const l of data.links) {
    if (!ownIdSet.has(l.source_kpi_id)) externalIds.add(l.source_kpi_id)
    if (!ownIdSet.has(l.target_kpi_id)) externalIds.add(l.target_kpi_id)
  }
  for (const f of factors) if (!ownIdSet.has(f.factor_kpi_id)) externalIds.add(f.factor_kpi_id)
  const externalList = [...externalIds].sort()

  const kpiRowCount = chunkRows(ownKpis, MAX_KPI_ROW).length
  const satBaseR = KPI_R0 + kpiRowCount * ROW_STEP + SAT_EXTRA
  const satPos = new Map<string, Pt>()
  chunkRows(externalList, MAX_SAT_ROW).forEach((row, ri) => {
    arcPositions(row.length, -175, -5, satBaseR + ri * ROW_STEP).forEach((p, i) => satPos.set(row[i], p))
  })

  const posOf = (kpiId: string): Pt | undefined => (ownIdSet.has(kpiId) ? kpiPos.get(kpiId) : satPos.get(kpiId))
  const nodeGap = (kpiId: string) => (ownIdSet.has(kpiId) ? KPI_GAP : SAT_GAP)
  const kpiLabel = (kpiId: string) => ownKpiById.get(kpiId)?.name ?? kpiIndex.get(kpiId)?.kpi.name ?? kpiId

  // группировка связей по неупорядоченной паре KPI — см. curvedPath
  const linkPairIndex = new Map<string, number>()
  const linkPairCount = new Map<string, number>()
  for (const l of data.links) {
    const key = [l.source_kpi_id, l.target_kpi_id].sort().join('|')
    linkPairIndex.set(l.id, linkPairCount.get(key) ?? 0)
    linkPairCount.set(key, (linkPairCount.get(key) ?? 0) + 1)
  }
  const EDGE_OFFSET_STEP = 30

  /* циклы: чем красить рёбра/узлы (риск — есть неподтверждённый цикл, иначе внимание) */
  const cycleLinkState = new Map<string, 'risk' | 'warn'>()
  const cycleKpiState = new Map<string, 'risk' | 'warn'>()
  for (const c of cycles) {
    const tone = c.confirmed ? 'warn' : 'risk'
    for (const lid of c.member_link_ids) if (cycleLinkState.get(lid) !== 'risk') cycleLinkState.set(lid, tone)
    for (const kid of c.member_kpi_ids) if (cycleKpiState.get(kid) !== 'risk') cycleKpiState.set(kid, tone)
  }

  /* чек постановки (Management_Model §3): владелец / измеримость / связи вверх */
  const hasOwner = goal.owner.trim() !== ''
  const measurable = ownKpis.length > 0 && ownKpis.every((k) => k.target != null || k.computed_value != null)
  const hasUpwardLink = data.links.some((l) => ownIdSet.has(l.source_kpi_id) && !ownIdSet.has(l.target_kpi_id))
  const checks: { tone: 'ok' | 'wr' | 'er'; text: string }[] = [
    { tone: hasOwner ? 'ok' : 'er', text: hasOwner ? `Владелец назначен: ${goal.owner}` : 'Владелец не назначен' },
    {
      tone: ownKpis.length === 0 ? 'er' : measurable ? 'ok' : 'wr',
      text: ownKpis.length === 0 ? 'KPI не заданы' : measurable ? 'Все KPI измеримы' : 'Не все KPI измеримы',
    },
    {
      tone: hasUpwardLink ? 'ok' : 'wr',
      text: hasUpwardLink ? 'Связи с KPI других целей есть' : 'Связей с KPI других целей нет',
    },
  ]
  const checkMark = { ok: '✓', wr: '⚠', er: '✕' } as const

  const draftGoal = linkDraft?.targetGoalId ? allGoals.find((g) => g.id === linkDraft.targetGoalId) : undefined

  return (
    <div className="os-goal">
      <header className="top">
        <span className="crumb">
          <button onClick={onBack}>← карточка</button> / <b>канвас постановки · {goal.name}</b>
        </span>
        <span className="badges">
          <span className={`bdg ${goal.definiteness === 'fog' ? 'b-sec' : 'b-act'}`}>
            {goal.definiteness === 'fog' ? 'ТУМАН' : 'ОПРЕДЕЛЕНА'}
          </span>
        </span>
      </header>

      <div className="wrap">
        <div className="gcanvas-wrap">
          <aside className="side">
            <div className="panel">
              <div className="ph">
                <span className="t">ВЛАДЕЛЕЦ ЦЕЛИ</span>
              </div>
              <div className="s" style={{ fontSize: 13 }}>
                {ownerOrDash(goal.owner)}
              </div>
              <div className="s" style={{ fontSize: 11, color: 'var(--i40)' }}>
                {goal.role_label}
              </div>
            </div>
          </aside>

          <div className="gcanvas-center">
            <div className="gc-legend">
              <span>
                <span className="gc-lt-dot lt-contributes" />
                способствует
              </span>
              <span>
                <span className="gc-lt-dot lt-constrains" />
                ограничивает
              </span>
              <span>
                <span className="gc-lt-dot lt-depends" />
                зависит от
              </span>
              <span>
                <span className="gc-lt-dot gc-factor-dot" />
                фактор композита (вес)
              </span>
              <span>
                <span className="gc-lt-dot gc-cycle-risk-dot" />
                цикл увязки
              </span>
            </div>

            <div className="gcanvas-stage" style={{ width: CANVAS_W, height: CANVAS_H }}>
              <svg
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                role="img"
                aria-label="Канвас постановки цели: KPI, подцели и связи увязки"
              >
                {ownKpis.map((k) => {
                  const p = kpiPos.get(k.id)
                  if (!p) return null
                  const t = trimLine(CX, CY, p.x, p.y, CENTER_GAP, KPI_GAP)
                  return <line key={`ck-${k.id}`} x1={t.sx} y1={t.sy} x2={t.tx} y2={t.ty} className="gc-struct" />
                })}
                {children.map((c) => {
                  const p = subPos.get(c.id)
                  if (!p) return null
                  const t = trimLine(CX, CY, p.x, p.y, CENTER_GAP, SUB_GAP)
                  return (
                    <line
                      key={`cs-${c.id}`}
                      x1={t.sx}
                      y1={t.sy}
                      x2={t.tx}
                      y2={t.ty}
                      className={`gc-struct${c.definiteness === 'fog' ? ' fog' : ''}`}
                    />
                  )
                })}
                {factors.map((f) => {
                  const compositePos = kpiPos.get(f.composite_kpi_id)
                  const factorPos = posOf(f.factor_kpi_id)
                  if (!compositePos || !factorPos) return null
                  const t = trimLine(
                    factorPos.x,
                    factorPos.y,
                    compositePos.x,
                    compositePos.y,
                    nodeGap(f.factor_kpi_id),
                    KPI_GAP,
                  )
                  return (
                    <g key={`f-${f.id}`}>
                      <line x1={t.sx} y1={t.sy} x2={t.tx} y2={t.ty} className="gc-factor" />
                      <text x={(t.sx + t.tx) / 2} y={(t.sy + t.ty) / 2 - 6} textAnchor="middle" className="gc-weight">
                        ×{f.weight}
                      </text>
                    </g>
                  )
                })}
                {data.links.map((l) => {
                  const sp = posOf(l.source_kpi_id)
                  const tp = posOf(l.target_kpi_id)
                  if (!sp || !tp) return null
                  const t = trimLine(sp.x, sp.y, tp.x, tp.y, nodeGap(l.source_kpi_id), nodeGap(l.target_kpi_id))
                  const pairKey = [l.source_kpi_id, l.target_kpi_id].sort().join('|')
                  const pairTotal = linkPairCount.get(pairKey) ?? 1
                  const pairIdx = linkPairIndex.get(l.id) ?? 0
                  const offset = pairTotal > 1 ? (pairIdx - (pairTotal - 1) / 2) * EDGE_OFFSET_STEP : 0
                  const [canonA, canonB] = [l.source_kpi_id, l.target_kpi_id].sort()
                  const pa = posOf(canonA)
                  const pb = posOf(canonB)
                  const cdx = pa && pb ? pb.x - pa.x : 1
                  const cdy = pa && pb ? pb.y - pa.y : 0
                  const clen = Math.hypot(cdx, cdy) || 1
                  const perp: Pt = { x: -cdy / clen, y: cdx / clen }
                  const { d, angle } = curvedPath(t.sx, t.sy, t.tx, t.ty, perp, offset)
                  const type = l.link_type as KpiLinkType
                  const cycleState = cycleLinkState.get(l.id)
                  const cls = cycleState ? `gc-edge gc-cycle-${cycleState}` : `gc-edge ${LINK_TYPE_CLASS[type] ?? ''}`
                  const label = `${LINK_TYPE_LABEL[type] ?? l.link_type}: ${kpiLabel(l.source_kpi_id)} → ${kpiLabel(l.target_kpi_id)}`
                  return (
                    <g key={l.id}>
                      <path d={d} style={{ fill: 'none' }} className={cls} />
                      <polygon
                        points={`${t.tx},${t.ty} ${t.tx - 7},${t.ty - 4} ${t.tx - 7},${t.ty + 4}`}
                        transform={`rotate(${angle} ${t.tx} ${t.ty})`}
                        className={cls}
                      />
                      <path
                        d={d}
                        style={{ fill: 'none' }}
                        className="gc-edge-hit"
                        role="button"
                        tabIndex={0}
                        aria-label={`Разорвать связь «${label}»`}
                        onClick={() => handleDeleteLink(l)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleDeleteLink(l)
                        }}
                      />
                    </g>
                  )
                })}
              </svg>

              <div className="gc-center" style={{ left: CX, top: CY }}>
                <div className="nm">{goal.name}</div>
                <div className="sb">отв. {ownerOrDash(goal.owner)}</div>
                <span className={`bdg ${goal.definiteness === 'fog' ? 'b-sec' : 'b-act'}`}>
                  {goal.definiteness === 'fog' ? 'ТУМАН' : 'ОПРЕДЕЛЕНА'}
                </span>
              </div>

              {ownKpis.map((k) => {
                const p = kpiPos.get(k.id)
                if (!p) return null
                const cycleState = cycleKpiState.get(k.id)
                return (
                  <button
                    key={k.id}
                    className={`gc-kpi${k.computed_value != null ? ' composite' : ''}${cycleState ? ` gc-cycle-${cycleState}` : ''}`}
                    style={{ left: p.x, top: p.y }}
                    onClick={() => openLink(k.id)}
                    aria-label={`Связать KPI «${k.name}»`}
                  >
                    <span className="nm">{k.name}</span>
                    <span className="sb">{kpiValue(k)}</span>
                  </button>
                )
              })}

              {children.map((c) => {
                const p = subPos.get(c.id)
                if (!p) return null
                return (
                  <button
                    key={c.id}
                    className={`gc-sub${c.definiteness === 'fog' ? ' hazy' : ''}`}
                    style={{ left: p.x, top: p.y }}
                    onClick={() => goTo(c.id)}
                    aria-label={`Открыть подцель: ${c.name}`}
                  >
                    <span className="nm">{c.name}</span>
                    <span className="sb">
                      {ownerOrDash(c.owner)} · {definitenessLabel(c)}
                    </span>
                  </button>
                )
              })}

              {externalList.map((kpiId) => {
                const loc = kpiIndex.get(kpiId)
                const p = satPos.get(kpiId)
                if (!loc || !p) return null
                const cycleState = cycleKpiState.get(kpiId)
                return (
                  <button
                    key={kpiId}
                    className={`gc-sat${cycleState ? ` gc-cycle-${cycleState}` : ''}`}
                    style={{ left: p.x, top: p.y }}
                    onClick={() => goTo(loc.goalId)}
                    aria-label={`Перейти к цели «${loc.goalName}» (KPI «${loc.kpi.name}»)`}
                  >
                    <span className="nm">{loc.kpi.name}</span>
                    <span className="sb">{loc.goalName}</span>
                  </button>
                )
              })}

              {linkDraft && (
                <div className="gc-popover">
                  <div className="cap">СВЯЗАТЬ KPI «{ownKpiById.get(linkDraft.sourceKpiId)?.name}»</div>
                  {!linkDraft.targetGoalId ? (
                    <div className="rpool">
                      {allGoals.map((g) => (
                        <button key={g.id} onClick={() => setLinkDraft({ ...linkDraft, targetGoalId: g.id })}>
                          <b>{g.name}</b>
                          <em>{g.kpis.length} KPI</em>
                        </button>
                      ))}
                    </div>
                  ) : !linkDraft.targetKpiId ? (
                    <>
                      <button className="radd" onClick={() => setLinkDraft({ ...linkDraft, targetGoalId: null })}>
                        ← другая цель
                      </button>
                      <div className="rpool">
                        {(draftGoal?.kpis ?? [])
                          .filter((k) => k.id && k.id !== linkDraft.sourceKpiId)
                          .map((k) => (
                            <button
                              key={k.id}
                              onClick={() => setLinkDraft({ ...linkDraft, targetKpiId: k.id as string })}
                            >
                              <b>{k.name}</b>
                              <em>{kpiValue(k)}</em>
                            </button>
                          ))}
                        {!draftGoal?.kpis.some((k) => k.id && k.id !== linkDraft.sourceKpiId) && (
                          <div className="note">у цели нет доступных KPI</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <button className="radd" onClick={() => setLinkDraft({ ...linkDraft, targetKpiId: null })}>
                        ← другой KPI
                      </button>
                      <div className="gc-linktypes">
                        {LINK_TYPES.map((t) => (
                          <button
                            key={t}
                            className={`gc-lt gc-lt-${t}`}
                            disabled={linkBusy}
                            onClick={() => submitLink(t)}
                          >
                            {LINK_TYPE_LABEL[t]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {linkError && (
                    <div className="s" style={{ color: 'var(--rk)' }}>
                      {linkError}
                    </div>
                  )}
                  <button className="radd" onClick={() => setLinkDraft(null)}>
                    отмена
                  </button>
                </div>
              )}
            </div>

            {cycles.length > 0 && (
              <div className="gc-cycles">
                {cycles.map((c) => (
                  <div key={c.id} className={`ovl ${c.confirmed ? 'warn' : 'crit'}`}>
                    <b>Цикл увязки</b> — {c.member_kpi_ids.map(kpiLabel).join(' → ')} · судья:{' '}
                    {c.judge_goal_id ? (goalIndex.get(c.judge_goal_id) ?? '—') : '—'}
                    <button className="radd" style={{ marginLeft: 10 }} disabled={busy} onClick={() => toggleCycleConfirm(c)}>
                      {c.confirmed ? 'подтверждён ✓ — снять' : 'подтвердить как ставку'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="side">
            <div className="panel">
              <div className="ph">
                <span className="t">ЧЕК ПОСТАНОВКИ</span>
              </div>
              <div className="checks">
                {checks.map((c) => (
                  <div key={c.text} className={`check ${c.tone}`}>
                    <span className="m">{checkMark[c.tone]}</span>
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
            {actionError && (
              <div className="s" style={{ color: 'var(--rk)' }}>
                {actionError}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

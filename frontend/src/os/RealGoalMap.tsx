import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GoalRead } from '../types'
import { layoutForest } from './goalTree'
import type { GoalNode } from './goalTree'
import { Icon, HoverGlyph } from './panelIcons'

/* ── идентичность ветки на карте: декоративный цвет иконки-бейджа узла,
   независимый от светофора статусов (D2 Часть III). Реальные цели не несут
   поля «ветка» — цвет берётся детерминированным хешем id, до появления
   такого поля в модели данных (см. «Открытые вопросы» Visual_Reference.md). */

export const BRANCH_STYLES = [
  { hex: '#a855f7', bg: 'rgba(168,85,247,.14)', bd: 'rgba(168,85,247,.4)', fg: '#c084fc' },
  { hex: '#22d3ee', bg: 'rgba(34,211,238,.12)', bd: 'rgba(34,211,238,.4)', fg: '#67e8f9' },
  { hex: '#fb923c', bg: 'rgba(251,146,60,.13)', bd: 'rgba(251,146,60,.45)', fg: '#fdba74' },
  { hex: '#3b82f6', bg: 'rgba(59,130,246,.13)', bd: 'rgba(59,130,246,.45)', fg: '#93c5fd' },
] as const

export const FOG_ICON = { hex: '#6b6f80', bg: 'rgba(231,232,238,.06)', bd: 'rgba(231,232,238,.25)', fg: 'rgba(231,232,238,.5)' }
export const SEL_ICON = { hex: '#a855f7', bg: 'rgba(168,85,247,.18)', bd: 'rgba(168,85,247,.55)', fg: '#c084fc' }

export function branchStyle(id: string, fog: boolean): (typeof BRANCH_STYLES)[number] | typeof FOG_ICON {
  if (fog) return FOG_ICON
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return BRANCH_STYLES[h % BRANCH_STYLES.length]
}

/* ── реальная карта целей (Goal API, промпт №17) ─────────────────────────── */

// Тон узла: туман — код «нет данных» (пунктир .g-next, D6); для определённых —
// маппинг risk_level: low → обычный, medium → warn, high → risk. Прогресса на
// карте нет сознательно: факт KPI появится только с ресурсными блоками (ADR-0005).
export const goalTone = (g: GoalRead): string => {
  if (g.definiteness === 'fog') return ' g-next'
  if (g.risk_level === 'high') return ' g-risk'
  if (g.risk_level === 'medium') return ' g-warn'
  return ''
}

export const kpiLabel = (g: GoalRead): string =>
  g.definiteness === 'fog' ? 'туман' : `${g.kpis.length} KPI`

export const ownerLabel = (g: GoalRead): string => `отв. ${g.unit_name ?? '—'}`

export const countGoals = (nodes: GoalNode[]): number =>
  nodes.reduce((acc, n) => acc + 1 + countGoals(n.children), 0)

interface RealGoalMapProps {
  forest: GoalNode[]
  onOpenGoal: (id: string) => void
  onAddChild: (parentId: string) => void
  onInsertBetween: (parentId: string, childId: string) => void
  onToggleBacklog: (goal: GoalRead) => void
  onDeleteGoal: (goal: GoalRead) => void
  onUnlink: (childId: string) => void
  onReparent: (childId: string, parentId: string) => void
}

// Слайс 39: перетаскивание рёбер (drag-create + reconnect). Единое состояние
// драга — источник события (порт узла-родителя или «схваченный» родительский
// конец существующего ребра); движение записывается в px канвы (canvas 1:1 с
// viewBox SVG, см. os.css .canvas), поэтому конвертация координат не нужна.
type DragState =
  | { kind: 'create'; parentId: string; x: number; y: number; overNodeId: string | null }
  | { kind: 'reconnect'; childId: string; oldParentId: string; x: number; y: number; overNodeId: string | null }

// Порог движения (px) до перевода pointer-down в драг — иначе конфликт с
// кликом по узлу/ребру (открытие попапа, hover-ряды).
const DRAG_THRESHOLD = 4

export function RealGoalMap({
  forest,
  onOpenGoal,
  onAddChild,
  onInsertBetween,
  onToggleBacklog,
  onDeleteGoal,
  onUnlink,
  onReparent,
}: RealGoalMapProps) {
  const pos = layoutForest(forest)
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [hoverEdge, setHoverEdge] = useState<string | null>(null)
  const [focusEdge, setFocusEdge] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragStart = useRef<{ x: number; y: number; pointerId: number; pending: DragState } | null>(null)

  // рёбра структурного дерева parent_id (связи KPI→KPI и циклы — не здесь: ADR-0004)
  const edges: {
    key: string
    parentId: string
    childId: string
    x1: number
    y1: number
    x2: number
    y2: number
    fog: boolean
    color: string
  }[] = []
  const walk = (node: GoalNode): void => {
    const from = pos.get(node.goal.id)
    for (const child of node.children) {
      const to = pos.get(child.goal.id)
      if (from && to) {
        const fog = child.goal.definiteness === 'fog'
        edges.push({
          key: `${node.goal.id}-${child.goal.id}`,
          parentId: node.goal.id,
          childId: child.goal.id,
          x1: from.x + from.w,
          y1: from.y + 38,
          x2: to.x,
          y2: to.y + 38,
          fog,
          color: branchStyle(child.goal.id, fog).hex,
        })
      }
      walk(child)
    }
  }
  forest.forEach(walk)

  const nodes: GoalNode[] = []
  const flatten = (node: GoalNode): void => {
    nodes.push(node)
    node.children.forEach(flatten)
  }
  forest.forEach(flatten)

  const focus = forest[0]

  // Слайс 39: точка в координатах канвы (px, 1:1 с viewBox SVG) из клиентских
  // координат события — единая конвертация для всех pointermove/up хендлеров.
  const toCanvasPoint = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: clientX, y: clientY }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  // Узел под курсором — для подсветки drop-таргета. Проверяем по прямоугольнику
  // карточки (позиция+ширина из layoutForest, высота узла фиксирована ~ 62px).
  const nodeAt = (x: number, y: number): string | null => {
    for (const { goal: g } of nodes) {
      const p = pos.get(g.id)
      if (!p) continue
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + 62) return g.id
    }
    return null
  }

  const finishDrag = (state: DragState, dropNodeId: string | null) => {
    setDrag(null)
    dragStart.current = null
    if (!dropNodeId) return // пустое полотно/за пределами карты — отмена, ноль запросов
    if (state.kind === 'create') {
      if (dropNodeId === state.parentId) return // self-drop — игнор
      onReparent(dropNodeId, state.parentId)
    } else {
      if (dropNodeId === state.childId) return // self-drop — игнор
      onReparent(state.childId, dropNodeId)
    }
  }

  const onDragPointerMove = (e: ReactPointerEvent) => {
    const { x, y } = toCanvasPoint(e.clientX, e.clientY)
    if (dragStart.current && !drag) {
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      setDrag(dragStart.current.pending)
    }
    setDrag((cur) => (cur ? { ...cur, x, y, overNodeId: nodeAt(x, y) } : cur))
  }

  const onDragPointerUp = (e: ReactPointerEvent) => {
    if (!dragStart.current) return
    const pointerId = dragStart.current.pointerId
    const target = e.currentTarget as HTMLElement
    if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId)
    const state = drag ?? dragStart.current.pending
    const { x, y } = toCanvasPoint(e.clientX, e.clientY)
    finishDrag(state, nodeAt(x, y))
  }

  const cancelDrag = () => {
    setDrag(null)
    dragStart.current = null
  }

  useEffect(() => {
    if (!drag) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') cancelDrag()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null])

  const startPortDrag = (e: ReactPointerEvent, parentId: string) => {
    e.stopPropagation()
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const from = pos.get(parentId)
    const start = from ? { x: from.x + from.w, y: from.y + 38 } : toCanvasPoint(e.clientX, e.clientY)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      pending: { kind: 'create', parentId, x: start.x, y: start.y, overNodeId: null },
    }
  }

  const startReconnectDrag = (e: ReactPointerEvent, childId: string, oldParentId: string) => {
    e.stopPropagation()
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const from = pos.get(oldParentId)
    const start = from ? { x: from.x + from.w, y: from.y + 38 } : toCanvasPoint(e.clientX, e.clientY)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      pending: { kind: 'reconnect', childId, oldParentId, x: start.x, y: start.y, overNodeId: null },
    }
  }

  // Конец превью-линии: пока не начался драг (dragStart есть, drag ещё null,
  // движения <порога) якорь стоит в точке старта — линия не рендерится (см. ниже).
  const previewEnd = drag
    ? { x: drag.x, y: drag.y }
    : null
  const previewStart =
    drag?.kind === 'create'
      ? (() => {
          const p = pos.get(drag.parentId)
          return p ? { x: p.x + p.w, y: p.y + 38 } : null
        })()
      : drag?.kind === 'reconnect'
        ? (() => {
            const child = pos.get(drag.childId)
            return child ? { x: child.x, y: child.y + 38 } : null
          })()
        : null

  return (
    <div
      className="rgm-layer"
      ref={canvasRef}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
      onPointerCancel={cancelDrag}
    >
      <svg viewBox="0 0 1040 560">
        {edges.map((e) => (
          <line
            key={e.key}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke={e.color}
            strokeOpacity={e.fog ? '.3' : '.55'}
            strokeWidth="1.5"
            strokeDasharray="5 6"
            className={e.fog ? undefined : 'flow'}
          />
        ))}
        {edges
          .filter((e) => !e.fog)
          .map((e) => (
            <circle key={`${e.key}-pp`} cx={(e.x1 + e.x2) / 2} cy={(e.y1 + e.y2) / 2} r="3.5" fill={e.color} className="pulse" />
          ))}
        {/* драг-превью (слайс 39): D6 — пунктир строго для «будущего/черновика»,
            тот же стиль, что и рёбра-туман; конец следует за курсором */}
        {drag && previewStart && previewEnd && (
          <line
            x1={previewStart.x}
            y1={previewStart.y}
            x2={previewEnd.x}
            y2={previewEnd.y}
            stroke="var(--i45)"
            strokeOpacity=".7"
            strokeWidth="1.5"
            strokeDasharray="5 6"
          />
        )}
        {/* невидимая широкая зона наведения — шире видимой линии ребра (мышь
            только: focus не вешаем — при 2+ рёбрах их <line> внутри одного
            <svg> оказываются в DOM раньше HTML-обёрток .ehov, и Tab перескакивал
            бы между линиями, минуя кнопки, см. промпт №38a, п.2) */}
        {edges.map((e) => (
          <line
            key={`${e.key}-hit`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="transparent"
            strokeWidth="16"
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onMouseEnter={() => setHoverEdge(e.key)}
            onMouseLeave={() => setHoverEdge((cur) => (cur === e.key ? null : cur))}
          />
        ))}
      </svg>

      {edges.map((e) => {
        const mx = (e.x1 + e.x2) / 2
        const my = (e.y1 + e.y2) / 2
        const active = hoverEdge === e.key || focusEdge === e.key
        const reconnecting = drag?.kind === 'reconnect' && drag.childId === e.childId
        return (
          // HTML-обёртка на каждое ребро — «горячая точка» получает фокус
          // Tab'ом (клавиатурный путь к «+ ×», недоступный самой SVG-линии
          // без риска сломать порядок обхода) и сразу содержит .ehov, поэтому
          // Tab из hotspot идёт в кнопки ряда, а не перепрыгивает к соседнему ребру.
          <div
            key={`${e.key}-wrap`}
            className="ehov-wrap"
            style={{ left: mx, top: my }}
            onMouseEnter={() => setHoverEdge(e.key)}
            onMouseLeave={() => setHoverEdge((cur) => (cur === e.key ? null : cur))}
          >
            <button
              type="button"
              className="ehov-hotspot"
              aria-label="Связь: действия"
              onFocus={() => setFocusEdge(e.key)}
              onBlur={(ev) => {
                if (!ev.currentTarget.parentElement?.contains(ev.relatedTarget as Node | null)) {
                  setFocusEdge((cur) => (cur === e.key ? null : cur))
                }
              }}
            />
            {active && !reconnecting && (
              <div className="ehov">
                <button
                  type="button"
                  title="вставить цель между"
                  aria-label="Вставить цель между узлами"
                  onClick={() => onInsertBetween(e.parentId, e.childId)}
                >
                  <HoverGlyph name="plus" />
                </button>
                <button
                  type="button"
                  title="удалить связь"
                  aria-label="Удалить связь между узлами"
                  onClick={() => onUnlink(e.childId)}
                >
                  <HoverGlyph name="cross" />
                </button>
              </div>
            )}

            {/* Слайс 39: «схватить» родительский конец ребра — переподключение.
                Позиционируется абсолютно от узла-родителя (e.x1/e.y1), не от
                середины ребра (.ehov-wrap центрирован в mx/my transform'ом). */}
            {(active || reconnecting) && (
              <button
                type="button"
                className="ereconn"
                style={{ left: e.x1 - mx, top: e.y1 - my }}
                title="перетянуть начало связи к другому родителю"
                aria-label="Переподключить связь к другому родителю"
                onPointerDown={(ev) => startReconnectDrag(ev, e.childId, e.parentId)}
              />
            )}
          </div>
        )
      })}

      {nodes.map(({ goal: g }) => {
        const p = pos.get(g.id)
        if (!p) return null
        const fog = g.definiteness === 'fog'
        const bs = branchStyle(g.id, fog)
        const hovered = hoverNode === g.id
        const isDropTarget = drag !== null && drag.overNodeId === g.id
        return (
          <div
            key={g.id}
            className="gnode-wrap"
            style={{ left: p.x, top: p.y, width: p.w }}
            onMouseEnter={() => setHoverNode(g.id)}
            onMouseLeave={() => setHoverNode((cur) => (cur === g.id ? null : cur))}
            onFocus={() => setHoverNode(g.id)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHoverNode((cur) => (cur === g.id ? null : cur))
            }}
          >
            <button
              className={`gcard${goalTone(g)}${fog ? ' hazy' : ''}${g.is_backlog ? ' paused' : ''}${isDropTarget ? ' drop-target' : ''}`}
              style={{ position: 'static', width: '100%' }}
              title={g.is_backlog ? 'На паузе' : 'Открыть карточку цели'}
              onClick={() => onOpenGoal(g.id)}
            >
              <span className="row">
                <span className="ic" style={{ background: bs.bg, borderColor: bs.bd, color: bs.fg }}>
                  <Icon name="hex" color={bs.fg} />
                </span>
                <span className="txt">
                  <span className="nm" title={g.name}>
                    {g.name}
                  </span>
                  <span className="sb">
                    {ownerLabel(g)} · {fog ? 'туман' : 'определена'}
                    {g.is_backlog ? ' · ‖ пауза' : ''}
                  </span>
                </span>
                <span className="kp">{kpiLabel(g)}</span>
              </span>
            </button>

            {/* Слайс 39: порт исходящих связей — pointer-down начинает драг-создание
                ребра «этот узел становится родителем» (конвенция владельца:
                направление драга = направление ребра, от родителя к ребёнку). */}
            {(hovered || (drag?.kind === 'create' && drag.parentId === g.id)) && (
              <button
                type="button"
                className="gport"
                title="потянуть связь к другой цели"
                aria-label={`Создать связь от «${g.name}» к другой цели`}
                onPointerDown={(e) => startPortDrag(e, g.id)}
              />
            )}

            {hovered && !drag && (
              <div className="nhov">
                <button
                  type="button"
                  title="добавить подцель"
                  aria-label={`Добавить подцель к «${g.name}»`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddChild(g.id)
                  }}
                >
                  <HoverGlyph name="plus" />
                </button>
                <button
                  type="button"
                  title={g.is_backlog ? 'вернуть на карту' : 'пауза — в бэклог'}
                  aria-label={g.is_backlog ? `Вернуть «${g.name}» на карту` : `Поставить «${g.name}» на паузу`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleBacklog(g)
                  }}
                >
                  <HoverGlyph name={g.is_backlog ? 'play' : 'pause'} />
                </button>
                <button type="button" title="назначить процесс — скоро" aria-label="Назначить процесс — скоро" disabled>
                  <HoverGlyph name="process" />
                </button>
                <button
                  type="button"
                  title="удалить цель"
                  aria-label={`Удалить «${g.name}»`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteGoal(g)
                  }}
                >
                  <HoverGlyph name="trash" />
                </button>
              </div>
            )}
          </div>
        )
      })}

      {focus && (
        // Фокус-цель: первая корневая. Позиция фиксированная (правый нижний
        // квадрант) — простая временная раскладка, как и вся карта этого среза.
        <div className="gx" style={{ left: 620, top: 300, width: 400 }}>
          <div className="hd">
            <span className="ic" style={{ background: SEL_ICON.bg, borderColor: SEL_ICON.bd, color: SEL_ICON.fg }}>
              <Icon name="hex" color={SEL_ICON.fg} />
            </span>
            <div>
              <div className="t">{focus.goal.name}</div>
              <div className="s">
                {ownerLabel(focus.goal)} · {focus.goal.definiteness === 'fog' ? 'туман' : 'определена'}
              </div>
            </div>
            <div className="pct">
              <b>{focus.goal.kpis.length}</b>
              <span>KPI</span>
            </div>
          </div>
          {focus.children.length > 0 && (
            <div className="stg">
              <div className="cap">ЭТАПЫ — ПРЯМЫЕ ПОДЦЕЛИ</div>
              {focus.children.map((child, i) => (
                <div key={child.goal.id} className="srow">
                  <span className="n">{i + 1}</span>
                  {child.goal.name}
                  <span className="who">{child.goal.unit_name ?? '—'}</span>
                  <span className="st">{child.goal.definiteness === 'fog' ? 'туман' : 'определена'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

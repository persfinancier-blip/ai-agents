import { useEffect, useState } from 'react'
import { listGoals } from '../api'
import type { GoalRead } from '../types'
import {
  ADVISOR_SLOTS,
  FOCUS_GOAL,
  MAP_GOALS,
  RAIL_ACTIVE,
  RAIL_OFF,
} from './data'
import type { ChatMsg, RailBlock } from './data'
import { buildGoalForest, layoutForest } from './goalTree'
import type { GoalNode } from './goalTree'

const STROKE = 'rgba(228,227,223,.55)'

// сообщения чата рендерятся как HTML (демо-разметка) — свой ввод экранируем
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function Icon({ name, color = STROKE }: { name: string; color?: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.6 }
  switch (name) {
    case 'hex':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M14 4 L23 9.5 V19 L14 24.5 L5 19 V9.5 Z" {...p} />
        </svg>
      )
    case 'chart':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <rect x="5" y="5" width="18" height="18" rx="2" {...p} />
          <path d="M9 17 L13 12 L16 15 L19 10" {...p} />
        </svg>
      )
    case 'person':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <circle cx="14" cy="11" r="5" {...p} />
          <path d="M5 24 C7 18 21 18 23 24" {...p} />
        </svg>
      )
    case 'house':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M5 22 V12 L14 5 L23 12 V22 Z" {...p} />
        </svg>
      )
    case 'clock':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="9" {...p} />
          <path d="M14 8 V14 L18 17" {...p} />
        </svg>
      )
    case 'grad':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M4 11 L14 6 L24 11 L14 16 Z" {...p} />
          <path d="M8 14 V19 C8 21 20 21 20 19 V14" {...p} />
        </svg>
      )
    case 'tri':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M14 5 L23 22 L5 22 Z" strokeLinejoin="round" {...p} />
        </svg>
      )
    case 'mega':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M5 18 L23 18 M7 18 L9 8 H19 L21 18" {...p} />
        </svg>
      )
    case 'box':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <rect x="5" y="9" width="18" height="13" rx="2" {...p} />
          <path d="M10 9 V6 H18 V9" {...p} />
        </svg>
      )
    case 'doc':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <rect x="6" y="5" width="16" height="18" rx="2" {...p} />
          <path d="M10 11 H18 M10 15 H18" {...p} />
        </svg>
      )
    default:
      return null
  }
}

const HumanDot = () => (
  <svg width="11" height="11" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="10" fill="none" stroke="#e4e3df" strokeWidth="2" />
  </svg>
)

const AiDot = () => (
  <svg width="11" height="11" viewBox="0 0 28 28">
    <rect x="6.5" y="6.5" width="15" height="15" transform="rotate(45 14 14)" fill="none" stroke="#e8c04a" strokeWidth="2" />
  </svg>
)

function RailButton({ b }: { b: RailBlock }) {
  const cls = b.tone === 'on' ? 'on' : b.tone ?? ''
  return (
    <button className={cls} title={b.name}>
      <Icon name={b.icon} color={b.tone === 'on' ? '#8fd14f' : STROKE} />
      {b.name} <span className="hp">{b.hp}</span>
    </button>
  )
}

/* ── реальная карта целей (Goal API, промпт №17) ─────────────────────────── */

// Тон узла: туман — код «нет данных» (пунктир .g-next, D6); для определённых —
// маппинг risk_level: low → обычный, medium → warn, high → risk. Прогресса на
// карте нет сознательно: факт KPI появится только с ресурсными блоками (ADR-0005).
const goalTone = (g: GoalRead): string => {
  if (g.definiteness === 'fog') return ' g-next'
  if (g.risk_level === 'high') return ' g-risk'
  if (g.risk_level === 'medium') return ' g-warn'
  return ''
}

const kpiLabel = (g: GoalRead): string =>
  g.definiteness === 'fog' ? 'туман' : `${g.kpis.length} KPI`

const ownerLabel = (g: GoalRead): string => `отв. ${g.owner.trim() === '' ? '—' : g.owner}`

const countGoals = (nodes: GoalNode[]): number =>
  nodes.reduce((acc, n) => acc + 1 + countGoals(n.children), 0)

function RealGoalMap({ forest }: { forest: GoalNode[] }) {
  const pos = layoutForest(forest)

  // рёбра структурного дерева parent_id (связи KPI→KPI и циклы — не здесь: ADR-0004)
  const edges: { key: string; x1: number; y1: number; x2: number; y2: number }[] = []
  const walk = (node: GoalNode): void => {
    const from = pos.get(node.goal.id)
    for (const child of node.children) {
      const to = pos.get(child.goal.id)
      if (from && to) {
        edges.push({
          key: `${node.goal.id}-${child.goal.id}`,
          x1: from.x + from.w,
          y1: from.y + 38,
          x2: to.x,
          y2: to.y + 38,
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

  return (
    <>
      <svg viewBox="0 0 1040 560">
        {edges.map((e) => (
          <line
            key={e.key}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="rgba(228,227,223,.25)"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {nodes.map(({ goal: g }) => {
        const p = pos.get(g.id)
        if (!p) return null
        return (
          <button
            key={g.id}
            className={`gcard${goalTone(g)}`}
            style={{ left: p.x, top: p.y, width: p.w }}
            title="Карточка цели — следующий срез"
          >
            <span>
              <span className="id">
                ЦЕЛЬ · {g.definiteness === 'fog' ? 'туман' : 'определена'}
              </span>
              <span className="nm" style={{ display: 'block' }}>
                {g.name}
              </span>
            </span>
            <span className="bar">
              <i />
            </span>
            <span className="ft">
              <span>{kpiLabel(g)}</span>
              <span>{ownerLabel(g)}</span>
            </span>
          </button>
        )
      })}

      {focus && (
        // Фокус-цель: первая корневая. Позиция фиксированная (правый нижний
        // квадрант) — простая временная раскладка, как и вся карта этого среза.
        <div className="gx" style={{ left: 620, top: 300, width: 400 }}>
          <div className="hd">
            <Icon name="hex" color="#e8c04a" />
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
                  <span className="who">{child.goal.owner.trim() === '' ? '—' : child.goal.owner}</span>
                  <span className="st">{child.goal.definiteness === 'fog' ? 'туман' : 'определена'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

/* ── демо-карта (пустая БД): контент data.ts, без изменений ──────────────── */

function DemoGoalMap({ onOpenGoal }: { onOpenGoal: (id: string) => void }) {
  return (
    <>
      <svg viewBox="0 0 1040 560">
        <line x1="220" y1="96" x2="310" y2="96" stroke="#e8544a" strokeOpacity=".6" strokeWidth="1.6" strokeDasharray="5 6" className="flow" />
        <polygon points="310,96 302,92 302,100" fill="#e8544a" fillOpacity=".7" />
        <line x1="200" y1="330" x2="280" y2="330" stroke="#8fd14f" strokeOpacity=".55" strokeWidth="1.5" />
        <polygon points="280,330 272,326 272,334" fill="#8fd14f" fillOpacity=".6" />
        <line x1="420" y1="140" x2="890" y2="290" stroke="#e8c04a" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="5 6" className="flow" />
        <line x1="710" y1="330" x2="790" y2="330" stroke="#e8c04a" strokeOpacity=".6" strokeWidth="1.6" strokeDasharray="5 6" className="flow" />
        <polygon points="790,330 782,326 782,334" fill="#e8c04a" fillOpacity=".7" />
        <text x="238" y="84" fill="rgba(232,84,74,.85)" fontSize="9" fontFamily="IBM Plex Mono">блокирует</text>
        <text x="204" y="320" fill="rgba(143,209,79,.7)" fontSize="9" fontFamily="IBM Plex Mono">выполнена</text>
        <text x="714" y="318" fill="rgba(232,192,74,.8)" fontSize="9" fontFamily="IBM Plex Mono">следующая</text>
      </svg>

      {MAP_GOALS.map((g) => (
        <button
          key={g.id}
          className={`gcard g-${g.tone}`}
          style={{ left: g.x, top: g.y, width: g.w }}
          onClick={() => onOpenGoal(g.id)}
        >
          <span>
            <span className="id">
              {g.code} · {g.kind}
            </span>
            <span className="nm" style={{ display: 'block' }}>
              {g.name}
            </span>
          </span>
          <span className="bar">
            <i
              style={{
                width: `${g.pct}%`,
                background: g.tone === 'done' ? 'var(--gr)' : g.tone === 'warn' ? 'var(--op)' : g.tone === 'risk' ? 'var(--rk)' : 'transparent',
              }}
            />
          </span>
          <span className="ft">
            <span style={g.tone === 'done' ? { color: 'var(--gr)' } : undefined}>{g.ft[0]}</span>
            <span>{g.ft[1]}</span>
          </span>
        </button>
      ))}

      <div className="gx" style={{ left: FOCUS_GOAL.x, top: FOCUS_GOAL.y, width: FOCUS_GOAL.w }}>
        <div className="hd">
          <Icon name="hex" color="#e8c04a" />
          <div>
            <div className="t">{FOCUS_GOAL.name}</div>
            <div className="s">
              {FOCUS_GOAL.sub}{' '}
              <span className="dot pulse" style={{ background: 'var(--op)', verticalAlign: 'middle', marginLeft: 4 }} />
            </div>
          </div>
          <div className="pct">
            <b>{FOCUS_GOAL.pct}%</b>
            <span>прогресс</span>
          </div>
        </div>
        <div className="bar">
          <i />
        </div>
        <div className="stg">
          <div className="cap">ЭТАПЫ — БИЗНЕС-ПРОЦЕСС ЦЕЛИ</div>
          {FOCUS_GOAL.stages.map((s) => (
            <div key={s.name} className={`srow ${s.state}`}>
              <span className="n">{s.n}</span>
              {s.name}
              <span className="who">
                {s.whoKind === 'human' && <HumanDot />}
                {s.whoKind === 'ai' && <AiDot />}
                {s.who}
              </span>
              <span className="st">{s.st}</span>
            </div>
          ))}
        </div>
        <div className="ft">
          <span>
            ресурсы: <b>{FOCUS_GOAL.ft.res}</b>
          </span>
          <span>
            команда: <b>{FOCUS_GOAL.ft.team}</b>
          </span>
          <span>
            решения: <b>{FOCUS_GOAL.ft.dec}</b>
          </span>
          <button className="open" onClick={() => onOpenGoal('g14')}>
            карточка цели →
          </button>
        </div>
      </div>

      <div className="fog" style={{ left: 790, top: 430, width: 225, height: 90 }}>
        БУДУЩИЕ ЦЕЛИ · НЕТ ДАННЫХ
      </div>
    </>
  )
}

export function CommandPanel({
  decisionsOnMove,
  onOpenGoal,
}: {
  decisionsOnMove: number | null
  onOpenGoal: (id: string) => void
}) {
  const [slotId, setSlotId] = useState(ADVISOR_SLOTS[0].id)
  const [extra, setExtra] = useState<Record<string, ChatMsg[]>>({})
  const [text, setText] = useState('')

  // реальные цели: null — загрузка; [] и далее — ответ API; error — отказ сети/бэка
  const [goals, setGoals] = useState<GoalRead[] | null>(null)
  const [goalsError, setGoalsError] = useState(false)

  useEffect(() => {
    listGoals()
      .then(setGoals)
      .catch(() => setGoalsError(true))
  }, [])

  const forest = buildGoalForest(goals ?? [])
  const hasRealGoals = forest.length > 0
  const loading = goals === null && !goalsError

  const mapLabel = goalsError
    ? 'КАРТА ЦЕЛЕЙ'
    : loading
      ? 'КАРТА ЦЕЛЕЙ · ЗАГРУЗКА…'
      : hasRealGoals
        ? `КАРТА ЦЕЛЕЙ · УЗЛОВ: ${countGoals(forest)}`
        : 'КАРТА ЦЕЛЕЙ · ЦЕПОЧКА-ПРОЦЕСС · 6 ЦЕЛЕЙ, 5 СВЯЗЕЙ · ДЕМО-ДАННЫЕ'

  const slot = ADVISOR_SLOTS.find((s) => s.id === slotId) ?? ADVISOR_SLOTS[0]
  const chat = [...slot.chat, ...(extra[slot.id] ?? [])]

  const send = () => {
    if (!text.trim()) return
    setExtra((e) => ({
      ...e,
      [slot.id]: [
        ...(e[slot.id] ?? []),
        { who: 'me', meta: 'ВЫ · сейчас', html: escapeHtml(text.trim()) },
      ],
    }))
    setText('')
  }

  return (
    <div className="os-panel">
      <header className="top">
        <div className="l">
          <span className="logo">
            <Icon name="hex" color="#8fd14f" />
            ВЕКТОР·OS
          </span>
          <span className="sep" />
          <span className="crumb">
            Компания / <b>Карта целей</b>
          </span>
        </div>
        <div className="search">
          <svg width="13" height="13" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" fill="none" stroke="rgba(228,227,223,.4)" strokeWidth="1.6" />
            <line x1="16.2" y1="16.2" x2="21" y2="21" stroke="rgba(228,227,223,.4)" strokeWidth="1.6" />
          </svg>
          искать цель, сущность, команду…
        </div>
        <div className="r">
          <span>
            МАСШТАБ <b>КОМПАНИЯ</b>
          </span>
          <span>
            ХОД <b>14</b>
          </span>
          <span>
            пн 06.07 <b>09:41</b>
          </span>
          <span className="ava">АС</span>
        </div>
      </header>

      <div className="shell">
        <nav className="rail">
          <div className="cap">БЛОКИ ФИРМЫ</div>
          {RAIL_ACTIVE.map((b) => (
            <RailButton key={b.id} b={b} />
          ))}
          <div className="cap2">НЕАКТИВНЫ</div>
          {RAIL_OFF.map((b) => (
            <RailButton key={b.id} b={b} />
          ))}
        </nav>

        <div className="stagewrap">
          <div className="bitab">
            СВОДКА · BI <span>◂</span>
          </div>
          <div className="stage">
            <div className="maplbl">{mapLabel}</div>

            <div className="canvas">
              {goalsError ? (
                <div style={{ position: 'absolute', left: 20, top: 56, color: 'var(--i55)' }}>
                  Не удалось загрузить карту целей
                </div>
              ) : loading ? null : hasRealGoals ? (
                <RealGoalMap forest={forest} />
              ) : (
                <DemoGoalMap onOpenGoal={onOpenGoal} />
              )}
            </div>
          </div>
        </div>

        <aside className="adv">
          <div className="ph">
            <span className="t">СОВЕТНИКИ · 3 СЛОТА</span>
            <span className="cl" title="Свернуть панель">
              ▸
            </span>
          </div>
          <div className="slots">
            {ADVISOR_SLOTS.map((s) => (
              <button key={s.id} className={`slot${s.id === slotId ? ' on' : ''}`} onClick={() => setSlotId(s.id)}>
                <div className="sn">{s.name}</div>
                <div className="sr">{s.role}</div>
              </button>
            ))}
            <button className="slot add" title="Прототип: выбор агента появится позже">
              <div className="sn">+ слот</div>
              <div className="sr">выбрать агента</div>
            </button>
          </div>
          <div className="ctx">
            КОНТЕКСТ <i>GOAL-014 · Выручка 120 млн ₽</i>
          </div>
          <div className="chat">
            {chat.map((m, i) => (
              <div key={i} className={`msg ${m.who}`}>
                <div className="mt">{m.meta}</div>
                {/* демо-контент из дизайн-данных, не пользовательский ввод с бэкенда */}
                <span dangerouslySetInnerHTML={{ __html: m.html }} />
              </div>
            ))}
          </div>
          <div className="quick">
            {slot.quick.map((q) => (
              <button key={q} onClick={() => setText(q)}>
                {q}
              </button>
            ))}
          </div>
          <div className="inp">
            <input
              type="text"
              placeholder={`сообщение — ${slot.name}…`}
              aria-label="Сообщение советнику"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send}>→</button>
          </div>
        </aside>
      </div>

      <footer className="bot">
        <div className="l">
          <span className="m">
            ВЫРУЧКА ПРОГНОЗ <b>96</b> / 120 млн ₽ <span className="dn">−8%</span>
          </span>
          <span className="m">
            КАССА <b>11 нед</b> <span className="dn">▼</span>
          </span>
          <span className="m">
            РЕШЕНИЯ НА ХОДУ <b>{decisionsOnMove ?? '—'}</b>
          </span>
          <span className="m">
            ЮНИТЫ <b>4</b> <span style={{ color: 'var(--i40)' }}>+ 5 AI</span> · приёмка <b className="up">84%</b>
          </span>
        </div>
        <div className="hp">
          <span className="m">HEALTH</span>
          <span className="tr">
            <i />
          </span>
          <span className="m" style={{ color: 'var(--op)', fontWeight: 600 }}>
            68
          </span>
        </div>
      </footer>
    </div>
  )
}

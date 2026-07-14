import { useEffect, useState } from 'react'
import { listGoals } from '../api'
import type { GoalRead } from '../types'
import { AdvisorOrb } from './AdvisorOrb'
import {
  ADVISOR_SLOTS,
  ADVISOR_TOPICS,
  FOCUS_GOAL,
  MAP_GOALS,
  RAIL_ACTIVE,
  RAIL_OFF,
} from './data'
import type { ChatMsg, RailBlock } from './data'
import { buildGoalForest, layoutForest } from './goalTree'
import type { GoalNode } from './goalTree'

const STROKE = 'rgba(231,232,238,.55)'

// сообщения чата рендерятся как HTML (демо-разметка) — свой ввод экранируем
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// «шёпот» у орба — одна строка без разметки чата
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '')

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
    <circle cx="14" cy="14" r="10" fill="none" stroke="#e7e8ee" strokeWidth="2" />
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

/* ── идентичность ветки на карте: декоративный цвет иконки-бейджа узла,
   независимый от светофора статусов (D2 Часть III). Реальные цели не несут
   поля «ветка» — цвет берётся детерминированным хешем id, до появления
   такого поля в модели данных (см. «Открытые вопросы» Visual_Reference.md). */

const BRANCH_STYLES = [
  { hex: '#a855f7', bg: 'rgba(168,85,247,.14)', bd: 'rgba(168,85,247,.4)', fg: '#c084fc' },
  { hex: '#22d3ee', bg: 'rgba(34,211,238,.12)', bd: 'rgba(34,211,238,.4)', fg: '#67e8f9' },
  { hex: '#fb923c', bg: 'rgba(251,146,60,.13)', bd: 'rgba(251,146,60,.45)', fg: '#fdba74' },
  { hex: '#3b82f6', bg: 'rgba(59,130,246,.13)', bd: 'rgba(59,130,246,.45)', fg: '#93c5fd' },
] as const

const FOG_ICON = { hex: '#6b6f80', bg: 'rgba(231,232,238,.06)', bd: 'rgba(231,232,238,.25)', fg: 'rgba(231,232,238,.5)' }
const SEL_ICON = { hex: '#a855f7', bg: 'rgba(168,85,247,.18)', bd: 'rgba(168,85,247,.55)', fg: '#c084fc' }

function branchStyle(id: string, fog: boolean): (typeof BRANCH_STYLES)[number] | typeof FOG_ICON {
  if (fog) return FOG_ICON
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return BRANCH_STYLES[h % BRANCH_STYLES.length]
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

function RealGoalMap({ forest, onOpenGoal }: { forest: GoalNode[]; onOpenGoal: (id: string) => void }) {
  const pos = layoutForest(forest)

  // рёбра структурного дерева parent_id (связи KPI→KPI и циклы — не здесь: ADR-0004)
  const edges: { key: string; x1: number; y1: number; x2: number; y2: number; fog: boolean; color: string }[] = []
  const walk = (node: GoalNode): void => {
    const from = pos.get(node.goal.id)
    for (const child of node.children) {
      const to = pos.get(child.goal.id)
      if (from && to) {
        const fog = child.goal.definiteness === 'fog'
        edges.push({
          key: `${node.goal.id}-${child.goal.id}`,
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
      </svg>

      {nodes.map(({ goal: g }) => {
        const p = pos.get(g.id)
        if (!p) return null
        const fog = g.definiteness === 'fog'
        const bs = branchStyle(g.id, fog)
        return (
          <button
            key={g.id}
            className={`gcard${goalTone(g)}${fog ? ' hazy' : ''}`}
            style={{ left: p.x, top: p.y, width: p.w }}
            title="Открыть карточку цели"
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
                </span>
              </span>
              <span className="kp">{kpiLabel(g)}</span>
            </span>
          </button>
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
        <line x1="220" y1="96" x2="310" y2="96" stroke="var(--rk)" strokeOpacity=".6" strokeWidth="1.6" strokeDasharray="5 6" className="flow" />
        <polygon points="310,96 302,92 302,100" fill="var(--rk)" fillOpacity=".7" />
        <line x1="200" y1="330" x2="280" y2="330" stroke="var(--gr)" strokeOpacity=".55" strokeWidth="1.5" />
        <polygon points="280,330 272,326 272,334" fill="var(--gr)" fillOpacity=".6" />
        <line x1="420" y1="140" x2="890" y2="290" stroke="var(--op)" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="5 6" className="flow" />
        <line x1="710" y1="330" x2="790" y2="330" stroke="var(--op)" strokeOpacity=".6" strokeWidth="1.6" strokeDasharray="5 6" className="flow" />
        <polygon points="790,330 782,326 782,334" fill="var(--op)" fillOpacity=".7" />
        <circle cx="265" cy="96" r="3.5" fill="var(--rk)" className="pulse" />
        <circle cx="655" cy="215" r="3.5" fill="var(--op)" className="pulse" />
        <circle cx="750" cy="330" r="3.5" fill="var(--op)" className="pulse" />
        <text x="238" y="84" fill="rgba(232,84,74,.85)" fontSize="9" fontFamily="IBM Plex Mono">блокирует</text>
        <text x="204" y="320" fill="rgba(143,209,79,.7)" fontSize="9" fontFamily="IBM Plex Mono">выполнена</text>
        <text x="714" y="318" fill="rgba(232,192,74,.8)" fontSize="9" fontFamily="IBM Plex Mono">следующая</text>
      </svg>

      {MAP_GOALS.map((g) => {
        const fogLike = g.tone === 'next'
        const bs = branchStyle(g.id, fogLike)
        return (
          <button
            key={g.id}
            className={`gcard g-${g.tone}${fogLike ? ' hazy' : ''}`}
            style={{ left: g.x, top: g.y, width: g.w }}
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
                <span className="sb">{g.ft[1]}</span>
              </span>
              <span className="kp" style={g.tone === 'done' ? { color: 'var(--gr)' } : undefined}>
                {g.ft[0].split('·')[0].trim()}
              </span>
            </span>
          </button>
        )
      })}

      <div className="gx" style={{ left: FOCUS_GOAL.x, top: FOCUS_GOAL.y, width: FOCUS_GOAL.w }}>
        <div className="hd">
          <span className="ic" style={{ background: SEL_ICON.bg, borderColor: SEL_ICON.bd, color: SEL_ICON.fg }}>
            <Icon name="hex" color={SEL_ICON.fg} />
          </span>
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

/* ── вертикаль собеседников: орбы советников + оверлей разговора ─────────── */

const ADVISOR_HUE: Record<string, number> = { cfo: 278, strat: 28 }
const ADVISOR_BADGE: Record<string, { bg: string; fg: string }> = {
  cfo: { bg: 'var(--id-purple)', fg: '#f3e8ff' },
  strat: { bg: 'var(--id-orange)', fg: '#431407' },
}
const ADVISOR_UNREAD: Record<string, number> = { cfo: 3, strat: 1 }

export function CommandPanel({
  decisionsOnMove,
  onOpenGoal,
}: {
  decisionsOnMove: number | null
  onOpenGoal: (id: string, source: 'demo' | 'real') => void
}) {
  const [slotId, setSlotId] = useState(ADVISOR_SLOTS[0].id)
  const [extra, setExtra] = useState<Record<string, ChatMsg[]>>({})
  const [text, setText] = useState('')
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const [topicId, setTopicId] = useState(ADVISOR_TOPICS[0].id)

  // реальные цели: null — загрузка; [] и далее — ответ API; error — отказ сети/бэка
  const [goals, setGoals] = useState<GoalRead[] | null>(null)
  const [goalsError, setGoalsError] = useState(false)

  useEffect(() => {
    listGoals()
      .then(setGoals)
      .catch(() => setGoalsError(true))
  }, [])

  useEffect(() => {
    if (!advisorOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAdvisorOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advisorOpen])

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
  const lastAi = [...chat].reverse().find((m) => m.who === 'ai')
  const topic = ADVISOR_TOPICS.find((t) => t.id === topicId) ?? ADVISOR_TOPICS[0]

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

  const openAdvisor = (id: string) => {
    setSlotId(id)
    setAdvisorOpen(true)
  }

  return (
    <div className="os-panel">
      <header className="top">
        <div className="l pill">
          <span className="logotile">
            <Icon name="hex" color="var(--id-purple)" />
          </span>
          <span className="logo">ВЕКТОР·OS</span>
          <span className="crumb">/ карта целей</span>
        </div>
        <div className="search pill">
          <svg width="13" height="13" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" fill="none" stroke="rgba(231,232,238,.4)" strokeWidth="1.6" />
            <line x1="16.2" y1="16.2" x2="21" y2="21" stroke="rgba(231,232,238,.4)" strokeWidth="1.6" />
          </svg>
          искать цель, сущность, команду…
        </div>
        <div className="r">
          <span className="pill rmeta">
            МАСШТАБ <b>КОМПАНИЯ</b> · ХОД <b>14</b> · пн 06.07 <b>09:41</b>
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
          <div className={`stage${advisorOpen ? ' blurred' : ''}`}>
            <div className="maplbl">{mapLabel}</div>

            <div className="canvas">
              {goalsError ? (
                <div style={{ position: 'absolute', left: 20, top: 56, color: 'var(--i55)' }}>
                  Не удалось загрузить карту целей
                </div>
              ) : loading ? null : hasRealGoals ? (
                <RealGoalMap forest={forest} onOpenGoal={(id) => onOpenGoal(id, 'real')} />
              ) : (
                <DemoGoalMap onOpenGoal={(id) => onOpenGoal(id, 'demo')} />
              )}
            </div>
          </div>

          <div className={`strip${advisorOpen ? ' hidden' : ''}`}>
            {ADVISOR_SLOTS.map((s) => (
              <div
                key={s.id}
                className="adva"
                role="button"
                tabIndex={0}
                aria-label={`Открыть разговор: ${s.name}`}
                title={s.name}
                onClick={() => openAdvisor(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openAdvisor(s.id)
                  }
                }}
              >
                <AdvisorOrb size={52} hue={ADVISOR_HUE[s.id] ?? 200} />
                {ADVISOR_UNREAD[s.id] > 0 && (
                  <span className="abdg" style={{ background: ADVISOR_BADGE[s.id]?.bg, color: ADVISOR_BADGE[s.id]?.fg }}>
                    {ADVISOR_UNREAD[s.id]}
                  </span>
                )}
                {s.id === slotId && lastAi && <span className="whisper">{stripHtml(lastAi.html)}</span>}
              </div>
            ))}
            <div className="adva add" role="button" tabIndex={0} aria-label="Добавить слот советника" title="Прототип: выбор агента появится позже">
              +
            </div>
          </div>

          {advisorOpen && (
            <div className="ov">
              <div className="ov-bg" onClick={() => setAdvisorOpen(false)} />
              <div className="ov-orb">
                <AdvisorOrb size={220} hue={ADVISOR_HUE[slot.id] ?? 200} />
                <div className="ov-name">{slot.name} · слушает</div>
              </div>
              <div className="ov-topics">
                <div className="ov-topics-cap">темы</div>
                {ADVISOR_TOPICS.map((t) => (
                  <button key={t.id} className={`topic${t.id === topicId ? ' on' : ''}`} onClick={() => setTopicId(t.id)}>
                    {t.title}
                    <br />
                    <span>{t.meta}</span>
                  </button>
                ))}
                <button className="topic add">+ новая тема</button>
              </div>
              <div className="ov-chat">
                <div className="ov-chat-hd">
                  <span>
                    {topic.title} · контекст {topic.meta.split('·').pop()?.trim()}
                  </span>
                  <button className="ov-close" onClick={() => setAdvisorOpen(false)} aria-label="Закрыть разговор">
                    ✕
                  </button>
                </div>
                <div className="ov-msgs">
                  {chat.map((m, i) => (
                    <div key={i} className={`omsg ${m.who}`}>
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
                <div className="ov-input">
                  <input
                    type="text"
                    placeholder="говори или пиши — я слушаю…"
                    aria-label="Сообщение советнику"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send()}
                  />
                  <span className="mic" aria-hidden="true">
                    🎙
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="bot">
        <div className="pod l">
          <span className="m">
            ВЫРУЧКА ПРОГНОЗ <b>96</b> / 120 млн ₽ <span className="dn">−8%</span>
          </span>
          <span className="m">
            КАССА <b>11 нед</b> <span className="dn">▼</span>
          </span>
          <span className="m">
            ЮНИТЫ <b>4</b> <span style={{ color: 'var(--i40)' }}>+ 5 AI</span> · приёмка <b className="up">84%</b>
          </span>
        </div>
        <div className="pod">
          <span className="m">
            РЕШЕНИЯ НА ХОДУ <b>{decisionsOnMove ?? '—'}</b>
          </span>
        </div>
        <div className="pod hp">
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

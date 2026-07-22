import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { ApiError, createGoal, listGoals, patchGoal } from '../api'
import type { GoalRead } from '../types'
import { AdvisorOrb } from './AdvisorOrb'
import {
  ADVISOR_SLOTS,
  ADVISOR_TOPICS,
  RAIL_ACTIVE,
  RAIL_OFF,
} from './data'
import type { ChatMsg } from './data'
import { DemoGoalMap } from './DemoGoalMap'
import { GoalPopup } from './GoalPopup'
import type { GoalPopupMode } from './GoalPopup'
import { deleteGoalWithCascadeConfirm } from './goalFormat'
import { buildGoalForest } from './goalTree'
import { Icon, RailButton } from './panelIcons'
import { branchStyle, countGoals, RealGoalMap } from './RealGoalMap'
import { UnitsPanel } from './UnitsPanel'

// сообщения чата рендерятся как HTML (демо-разметка) — свой ввод экранируем
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// «шёпот» у орба — одна строка без разметки чата
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '')

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
  onOpenCanvas,
}: {
  decisionsOnMove: number | null
  onOpenGoal: (id: string) => void
  onOpenCanvas: (id: string) => void
}) {
  const [slotId, setSlotId] = useState(ADVISOR_SLOTS[0].id)
  const [extra, setExtra] = useState<Record<string, ChatMsg[]>>({})
  const [text, setText] = useState('')
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const [unitsOpen, setUnitsOpen] = useState(false)
  const [topicId, setTopicId] = useState(ADVISOR_TOPICS[0].id)

  // реальные цели: null — загрузка; [] и далее — ответ API; error — отказ сети/бэка
  const [goals, setGoals] = useState<GoalRead[] | null>(null)
  const [goalsError, setGoalsError] = useState(false)

  // попап карточки цели (Ф7a, промпт №35) — рендерится поверх карты, без смены роута.
  // Слайс 38: тот же попап открывается и в режиме создания (hover-контролы узла/ребра).
  const [popupMode, setPopupMode] = useState<GoalPopupMode | null>(null)

  // Ф3 (промпт №22): черновик-узел двойного клика по полотну — координаты клика
  // живут только тут, до сохранения; поля «позиция узла» в модели нет и не будет
  // (см. goalTree.ts) — после POST карта перезагружается и узел встаёт по автораскладке.
  const [draft, setDraft] = useState<{ x: number; y: number; name: string; saving: boolean; error: string | null } | null>(
    null,
  )
  const skipDraftBlur = useRef(false)
  const draftInputRef = useRef<HTMLInputElement>(null)

  const refreshGoals = () => {
    listGoals()
      .then((fresh) => {
        setGoals(fresh)
        setGoalsError(false)
      })
      .catch(() => setGoalsError(true))
  }

  useEffect(() => {
    refreshGoals()
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

  // Ф3: двойной клик по пустому полотну — черновик-узел с инлайн-вводом имени.
  // Клик по существующему узлу/кнопке не должен запускать создание.
  const onCanvasDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (loading || goalsError || draft) return
    const target = e.target as HTMLElement
    if (target.closest('button, .gcard, .gx')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX - rect.left, 10), 1040 - 260)
    const y = Math.min(Math.max(e.clientY - rect.top, 10), 560 - 60)
    setDraft({ x, y, name: '', saving: false, error: null })
  }

  const submitDraft = () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) {
      setDraft(null)
      return
    }
    setDraft({ ...draft, saving: true, error: null })
    createGoal({ name })
      .then(() => listGoals())
      .then((fresh) => {
        setGoals(fresh)
        setDraft(null)
      })
      .catch((err: unknown) => {
        setDraft((d) =>
          d ? { ...d, saving: false, error: err instanceof ApiError ? 'Не удалось создать цель' : 'Нет связи с сервером' } : d,
        )
        // disabled={saving} снимает фокус с инпута — при отказе возвращаем его,
        // чтобы можно было сразу поправить имя и повторить попытку
        requestAnimationFrame(() => draftInputRef.current?.focus())
      })
  }

  /* ── слайс 38: hover-контролы узла/ребра карты ────────────────────────── */

  const handleToggleBacklog = (goal: GoalRead) => {
    patchGoal(goal.id, { is_backlog: !goal.is_backlog })
      .then(() => refreshGoals())
      .catch(() => {
        // тост/ошибка не предусмотрены для этого тумблера в этом слайсе —
        // карта просто останется в прежнем состоянии при отказе
      })
  }

  const handleDeleteGoal = (goal: GoalRead) => {
    void deleteGoalWithCascadeConfirm(goal).then((result) => {
      if (result === 'error') {
        window.alert('Не удалось удалить цель')
        return
      }
      if (result !== 'deleted') return
      refreshGoals()
      setPopupMode((m) => (m?.kind === 'edit' && m.goalId === goal.id ? null : m))
    })
  }

  const handleUnlink = (childId: string) => {
    void patchGoal(childId, { parent_id: null }).then(() => refreshGoals())
  }

  // Слайс 39: drag-create/reconnect — обе ветки одинаковы после старта
  // (parent_id мутация с honest-отказом при цикле, тем же текстом, что в
  // GoalPopup.saveField); состояние карты при отказе не меняется — refreshGoals
  // просто не вызывается, а карточка (если открыта) синхронизацию не потеряет.
  const handleReparent = (childId: string, parentId: string) => {
    patchGoal(childId, { parent_id: parentId })
      .then(() => refreshGoals())
      .catch((err: unknown) => {
        window.alert(err instanceof ApiError && err.status === 409 ? 'Нельзя: цикл в дереве' : 'Не удалось сохранить изменения')
      })
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
          <button
            className="pill rmeta"
            style={{ cursor: 'pointer' }}
            onClick={() => setUnitsOpen(true)}
            aria-label="Открыть панель юнитов"
          >
            ЮНИТЫ
          </button>
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

            <div className="canvas" onDoubleClick={onCanvasDoubleClick}>
              {goalsError ? (
                <div style={{ position: 'absolute', left: 20, top: 56, color: 'var(--i55)' }}>
                  Не удалось загрузить карту целей
                </div>
              ) : loading ? null : hasRealGoals ? (
                <RealGoalMap
                  forest={forest}
                  onOpenGoal={(id) => setPopupMode({ kind: 'edit', goalId: id })}
                  onAddChild={(parentId) => setPopupMode({ kind: 'create', parentId })}
                  onInsertBetween={(parentId, childId) => setPopupMode({ kind: 'insert-between', parentId, childId })}
                  onToggleBacklog={handleToggleBacklog}
                  onDeleteGoal={handleDeleteGoal}
                  onReparent={handleReparent}
                  onUnlink={handleUnlink}
                />
              ) : (
                <DemoGoalMap onOpenGoal={onOpenGoal} />
              )}

              {draft && (
                <div className="gcard hazy gdraft" style={{ left: draft.x, top: draft.y, width: 250 }}>
                  <input
                    ref={draftInputRef}
                    aria-label="Название новой цели"
                    placeholder="название цели…"
                    autoFocus
                    disabled={draft.saving}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        skipDraftBlur.current = true
                        setDraft(null)
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        skipDraftBlur.current = true
                        submitDraft()
                      }
                    }}
                    onBlur={() => {
                      if (skipDraftBlur.current) {
                        skipDraftBlur.current = false
                        return
                      }
                      submitDraft()
                    }}
                  />
                  {draft.error && <div className="derr">{draft.error}</div>}
                </div>
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

          {unitsOpen && <UnitsPanel onClose={() => setUnitsOpen(false)} />}

          {popupMode && (
            <GoalPopup
              mode={popupMode}
              branch={branchStyle(
                popupMode.kind === 'edit'
                  ? popupMode.goalId
                  : popupMode.kind === 'insert-between'
                    ? popupMode.childId
                    : (popupMode.parentId ?? 'root'),
                false,
              )}
              onClose={() => setPopupMode(null)}
              onOpenCanvas={(id) => {
                setPopupMode(null)
                onOpenCanvas(id)
              }}
              onChanged={refreshGoals}
            />
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

// Карточка цели. Этап цели — сам по себе цель (рекурсия через stages):
// клик по этапу или узлу карты процесса открывает его той же карточкой,
// хлебные крошки возвращают наверх. Ресурсы: свои + свёртка ветки + перегруз.

import { useState } from 'react'
import { COST_RATE, GOAL_CARD, GOAL_CHAIN, UNITS, UNIT_KIND_LABEL } from './data'
import type { OsGoal, OsUnit } from './data'
import {
  LIFECYCLE_LABEL,
  branchByUnit,
  branchCost,
  branchGoals,
  branchLoad,
  findOverloads,
  flowState,
  resolveChain,
  rollupKpi,
  unitById,
  updateGoalTree,
} from './goals'
import { ProcessMap } from './ProcessMap'

const HumanDot = () => (
  <svg width="12" height="12" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="10" fill="none" stroke="#e4e3df" strokeWidth="2" />
  </svg>
)

const AiDot = () => (
  <svg width="12" height="12" viewBox="0 0 28 28">
    <rect x="6.5" y="6.5" width="15" height="15" transform="rotate(45 14 14)" fill="none" stroke="#e8c04a" strokeWidth="2" />
  </svg>
)

const UnitMark = ({ kind }: { kind: OsUnit['kind'] }) =>
  kind === 'human' || kind === 'team' || kind === 'dept' ? <HumanDot /> : <AiDot />

const FLOW_CLS = { passed: 'done', now: 'act', next: '' } as const
const FLOW_TXT = { passed: 'ГОТОВО', now: '● В РАБОТЕ', next: 'ОЖИДАЕТ' } as const

function ChainCard({ cls, goal, label }: { cls: string; goal: OsGoal; label: string }) {
  const bar = goal.lifecycle === 'archived' ? 'var(--gr)' : goal.lifecycle === 'draft' ? 'transparent' : 'var(--op)'
  const ft =
    goal.lifecycle === 'archived'
      ? [`✓ завершена ${goal.due ?? ''}`, '2 хода']
      : goal.lifecycle === 'draft'
        ? ['откроется после текущей', `отв. ${goal.owner === 'не назначен' ? '—' : goal.owner}`]
        : [`${goal.kpi}%`, `отв. ${goal.owner}`]
  return (
    <div className={`ch ${cls}`}>
      <div className="id">
        {label} · {goal.code}
      </div>
      <div className="nm">{goal.name}</div>
      <div className="bar">
        <i style={{ width: `${goal.kpi}%`, background: bar }} />
      </div>
      <div className="ft">
        <span style={{ color: cls === 'prev' ? 'var(--gr)' : cls === 'cur' ? 'var(--op)' : undefined }}>{ft[0]}</span>
        <span>{ft[1]}</span>
      </div>
    </div>
  )
}

export function GoalCard({
  goals,
  path,
  onNavigate,
  onBack,
  onUpdate,
}: {
  goals: OsGoal[]
  path: string[]
  onNavigate: (path: string[]) => void
  onBack: () => void
  onUpdate: (next: OsGoal[]) => void
}) {
  const [vis, setVis] = useState('top')
  const [resView, setResView] = useState<'own' | 'roll'>('own')
  const [pick, setPick] = useState(false)
  const [hov, setHov] = useState<string | null>(null)

  const chain = resolveChain(goals, path)
  const g = chain.at(-1)
  if (!g) {
    onBack()
    return null
  }
  const isRoot = chain.length === 1
  const links = isRoot ? GOAL_CHAIN[g.id] : undefined
  const prev = links?.prev ? goals.find((x) => x.id === links.prev) : undefined
  const next = links?.next ? goals.find((x) => x.id === links.next) : undefined

  const stages = g.stages ?? []
  const rollKpi = rollupKpi(g)
  const overloads = findOverloads(g)
  const ownLoad = (g.resources ?? []).reduce((s, r) => s + r.load, 0)
  const ownCost = (g.resources ?? []).reduce((s, r) => s + (r.cost ?? 0), 0)
  const pool = UNITS.filter((u) => !g.resources?.some((r) => r.unitId === u.id))

  const patch = (fn: (n: OsGoal) => OsGoal) => onUpdate(updateGoalTree(goals, g.id, fn))
  const addRes = (u: OsUnit) => {
    patch((n) => ({
      ...n,
      resources: [
        ...(n.resources ?? []),
        { unitId: u.id, kind: u.kind, load: 20, cost: Math.round(20 * COST_RATE[u.kind]) },
      ],
    }))
    setPick(false)
  }
  const bumpRes = (unitId: string, d: number) =>
    patch((n) => ({
      ...n,
      resources: n.resources?.map((r) =>
        r.unitId === unitId
          ? { ...r, load: Math.min(100, Math.max(5, r.load + d)), cost: Math.round(Math.min(100, Math.max(5, r.load + d)) * COST_RATE[r.kind]) }
          : r,
      ),
    }))
  const dropRes = (unitId: string) =>
    patch((n) => ({ ...n, resources: n.resources?.filter((r) => r.unitId !== unitId) }))

  const openStage = (id: string) => {
    setHov(null)
    setResView('own')
    setPick(false)
    onNavigate([...path, id])
  }

  // динамический чек-лист советника по постановке
  const checks: { tone: 'ok' | 'wr' | 'er'; m: string; text: string }[] = [
    {
      tone: 'ok',
      m: '✓',
      text: `Измеримость: KPI ${g.kpi}%${stages.length ? ` · свёртка этапов ${rollKpi}%` : ''}`,
    },
  ]
  if (isRoot && (prev || next)) checks.push({ tone: 'ok', m: '✓', text: 'Связность: предыдущая и следующая цели заданы' })
  for (const o of overloads) {
    const u = unitById.get(o.unitId)
    checks.push(
      o.missing
        ? { tone: 'wr', m: '⚠', text: `${u?.name}: занят на этапах (${o.childrenLoad}%), но не выделен этой цели` }
        : { tone: 'er', m: '✕', text: `Перегруз: ${u?.name} — этапы ${o.childrenLoad}% > выделено ${o.parentLoad}%` },
    )
  }
  for (const s of stages) {
    if (s.ownerKind === 'none') checks.push({ tone: 'er', m: '✕', text: `«${s.name}» без ответственного — назначьте сотрудника или AI` })
    for (const c of s.sub ?? []) if (c.miss) checks.push({ tone: 'wr', m: '⚠', text: `«${s.name}»: ${c.t}` })
  }

  return (
    <div className="os-goal">
      <header className="top">
        <span className="crumb">
          <button onClick={onBack}>Компания</button> / <button onClick={onBack}>Карта целей</button>
          {chain.slice(0, -1).map((c, i) => (
            <span key={c.id}>
              {' '}
              / <button onClick={() => onNavigate(path.slice(0, i + 1))}>{i === 0 ? c.code : c.name}</button>
            </span>
          ))}{' '}
          / <b>{isRoot ? g.code : g.name}</b>
        </span>
        <span className="badges">
          <span className="bdg b-sec">{GOAL_CARD.visibility}</span>
          <span className="bdg b-act">
            {LIFECYCLE_LABEL[g.lifecycle].toUpperCase()} · ХОД 14
          </span>
        </span>
      </header>

      <div className="wrap">
        <div className="hd">
          <div className="ic">
            <svg width="24" height="24" viewBox="0 0 28 28">
              <path d="M14 4 L23 9.5 V19 L14 24.5 L5 19 V9.5 Z" fill="none" stroke="#e8c04a" strokeWidth="1.6" />
            </svg>
          </div>
          <div>
            <h1>{g.name}</h1>
            <div className="s">
              {g.code} · {isRoot ? 'цель' : `этап цели ${chain[0].code}`} · владелец {g.owner}
              {g.lifecycle === 'active' && (
                <>
                  {' '}
                  <span className="dot pulse" style={{ background: 'var(--op)', verticalAlign: 'middle' }} /> в работе
                </>
              )}
            </div>
          </div>
          <div className="kpis">
            <div className="k">
              <div className="l">ПРОГРЕСС</div>
              <div className="v" style={{ color: 'var(--op)' }}>
                {g.kpi}%
              </div>
            </div>
            <div className="k">
              <div className="l">СВЁРТКА ЭТАПОВ</div>
              <div className="v" style={{ color: stages.length ? 'var(--gr)' : 'var(--i35)' }}>
                {stages.length ? `${rollKpi}%` : '—'}
              </div>
            </div>
            <div className="k">
              <div className="l">СРОК</div>
              <div className="v">{g.due ?? '—'}</div>
            </div>
          </div>
        </div>

        {isRoot && prev && next && (
          <div className="chain">
            <ChainCard cls="prev" goal={prev} label="ПРЕДЫДУЩАЯ ЦЕЛЬ" />
            <div className="arr">→</div>
            <ChainCard cls="cur" goal={g} label="ТЕКУЩАЯ ЦЕЛЬ" />
            <div className="arr">→</div>
            <ChainCard cls="next" goal={next} label="СЛЕДУЮЩАЯ ЦЕЛЬ" />
          </div>
        )}

        <div className="cols">
          <div className="main">
            <div className="sec">
              <div className="cap caprow">
                НЕОБХОДИМЫЕ РЕСУРСЫ · ЕДИНАЯ РАБОЧАЯ СИЛА
                <span className="rtog">
                  <button className={resView === 'own' ? 'on' : ''} onClick={() => setResView('own')}>
                    Свои
                  </button>
                  <button className={resView === 'roll' ? 'on' : ''} onClick={() => setResView('roll')}>
                    Свёртка ветки
                  </button>
                </span>
              </div>

              {resView === 'own' ? (
                <div className="res">
                  <div className="rc rc2">
                    <div className="t">
                      <span className="l">НАЗНАЧЕНИЯ НА ЭТОТ УЗЕЛ</span>
                      <span className="st" style={{ color: 'var(--i35)' }}>
                        {g.resources?.length ?? 0} юнит(а)
                      </span>
                    </div>
                    {(g.resources ?? []).map((r) => {
                      const u = unitById.get(r.unitId)
                      if (!u) return null
                      return (
                        <div key={r.unitId} className="rrow">
                          <UnitMark kind={r.kind} />
                          <span className="rname">{u.name}</span>
                          <span className="rkind">{UNIT_KIND_LABEL[r.kind]}</span>
                          <span className="rload">
                            <button onClick={() => bumpRes(r.unitId, -5)} aria-label="Меньше загрузки">
                              −
                            </button>
                            <b>{r.load}%</b>
                            <button onClick={() => bumpRes(r.unitId, 5)} aria-label="Больше загрузки">
                              +
                            </button>
                          </span>
                          <span className="rcost">{r.cost ?? '—'} т₽</span>
                          <button className="rdel" onClick={() => dropRes(r.unitId)} aria-label={`Снять ${u.name}`}>
                            ×
                          </button>
                        </div>
                      )
                    })}
                    {!g.resources?.length && <div className="note">ресурсы не выделены</div>}
                    <button className="radd" onClick={() => setPick(!pick)}>
                      + назначить юнит
                    </button>
                    {pick && (
                      <div className="rpool">
                        {pool.map((u) => (
                          <button key={u.id} onClick={() => addRes(u)}>
                            <UnitMark kind={u.kind} />
                            <span>
                              <b>{u.name}</b>
                              <em>
                                {UNIT_KIND_LABEL[u.kind]} · {u.detail}
                              </em>
                            </span>
                          </button>
                        ))}
                        {!pool.length && <div className="note">все юниты уже назначены</div>}
                      </div>
                    )}
                  </div>

                  <div className="rc">
                    <div className="t">
                      <span className="l">ИТОГО СВОИ</span>
                      <span className="st" style={{ color: 'var(--gr)' }}>
                        узел
                      </span>
                    </div>
                    <div className="v">
                      {ownLoad}
                      <small>% загрузки</small>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${Math.min(100, ownLoad / 4)}%`, background: 'var(--op)' }} />
                    </div>
                    <div className="note">≈ {(ownLoad / 100).toFixed(1)} FTE · {ownCost} тыс ₽/мес</div>
                  </div>

                  <div className="rc rcw">
                    <div className="t">
                      <span className="l">СИГНАЛ ПЕРЕГРУЗА</span>
                      <span className="st" style={{ color: overloads.length ? 'var(--rk)' : 'var(--gr)' }}>
                        {overloads.length ? `${overloads.length} наход.` : 'чисто'}
                      </span>
                    </div>
                    {overloads.length ? (
                      overloads.map((o) => {
                        const u = unitById.get(o.unitId)
                        return (
                          <div key={o.unitId} className={`ovl ${o.missing ? 'warn' : 'crit'}`}>
                            <b>{u?.name}</b>
                            {o.missing
                              ? ` — занят на этапах (${o.childrenLoad}%), не выделен узлу`
                              : ` — этапы ${o.childrenLoad}% > выделено ${o.parentLoad}%`}
                          </div>
                        )
                      })
                    ) : (
                      <div className="note">этапы укладываются в выделенные ресурсы</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="res">
                  <div className="rc">
                    <div className="t">
                      <span className="l">ЗАГРУЗКА ВЕТКИ</span>
                      <span className="st" style={{ color: 'var(--op)' }}>
                        узел + этапы
                      </span>
                    </div>
                    <div className="v">
                      {branchLoad(g)}
                      <small>% суммарно</small>
                    </div>
                    <div className="note">≈ {(branchLoad(g) / 100).toFixed(1)} FTE по всем уровням</div>
                  </div>
                  <div className="rc rcw">
                    <div className="t">
                      <span className="l">СТОИМОСТЬ ВЕТКИ</span>
                      <span className="st" style={{ color: 'var(--op)' }}>
                        тыс ₽/мес
                      </span>
                    </div>
                    <div className="v">{branchCost(g)}</div>
                    <div className="note">
                      узлов в ветке: {branchGoals(g).length} · этапов: {stages.length}
                    </div>
                  </div>
                  <div className="rc rc2">
                    <div className="t">
                      <span className="l">ЮНИТЫ ПО ВЕТКЕ</span>
                      <span className="st" style={{ color: 'var(--i35)' }}>
                        {branchByUnit(g).size} юнит(ов)
                      </span>
                    </div>
                    <div className="chips">
                      {[...branchByUnit(g)].map(([id, load]) => {
                        const u = unitById.get(id)
                        return (
                          <span key={id} className={`chip${u?.kind === 'digital' ? ' ai' : ''}`}>
                            {u?.name} · {load}%
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sec">
              <div className="cap">ЭТАПЫ — КАЖДЫЙ ЭТАП САМ ПО СЕБЕ ЦЕЛЬ</div>
              <div className="flow">
                {stages.map((s, i) => {
                  const st = flowState(s)
                  const kids = s.stages?.length ?? 0
                  return (
                    <div
                      key={s.id}
                      className={`wstage ${FLOW_CLS[st]}${hov === s.id ? ' hot' : ''}`}
                      onClick={() => openStage(s.id)}
                      onMouseEnter={() => setHov(s.id)}
                      onMouseLeave={() => setHov(null)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && openStage(s.id)}
                      aria-label={`Открыть этап как цель: ${s.name}`}
                    >
                      <div className="num">{st === 'passed' ? '✓' : i + 1}</div>
                      <div>
                        <div className="nm">
                          {s.name} <span className="scode">{s.code}</span>
                        </div>
                        <div className="dsc">{s.dsc}</div>
                        <div className="sub">
                          <span className={`chip lc-${s.lifecycle}`}>{LIFECYCLE_LABEL[s.lifecycle]}</span>
                          {kids > 0 && <span className="chip">▸ {kids} подэтапа · свёртка {rollupKpi(s)}%</span>}
                          {(s.sub ?? []).map((c) => (
                            <span key={c.t} className={`chip${c.ai ? ' ai' : ''}${c.miss ? ' miss' : ''}`}>
                              {c.t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="who">
                        {s.ownerKind === 'none' ? (
                          <div className="p" style={{ color: 'var(--i35)' }}>
                            ответственный не назначен
                          </div>
                        ) : (
                          <div className="p">
                            {s.ownerKind === 'ai' ? <AiDot /> : <HumanDot />}
                            <b>{s.owner}</b>
                            <span className="r">владелец</span>
                          </div>
                        )}
                        <div className="p" style={{ color: 'var(--i35)' }}>
                          KPI {s.kpi}% · ресурсы: {s.resources?.length ?? 0}
                        </div>
                      </div>
                      <div className="due">{s.due}</div>
                      <div className={`st ${FLOW_CLS[st]}`}>{s.lifecycle === 'review' ? 'НА ПРОВЕРКЕ' : FLOW_TXT[st]}</div>
                    </div>
                  )
                })}
                {!stages.length && (
                  <div className="wstage" style={{ cursor: 'default' }}>
                    <div className="num">1</div>
                    <div>
                      <div className="nm">Этапов пока нет</div>
                      <div className="dsc">Лист дерева: работа идёт по подпроцессам ниже, или декомпозируйте цель.</div>
                      <div className="sub">
                        {(g.sub ?? []).map((c) => (
                          <span key={c.t} className={`chip${c.ai ? ' ai' : ''}${c.miss ? ' miss' : ''}`}>
                            {c.t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="who" />
                    <div className="due">{g.due}</div>
                    <div className="st">—</div>
                  </div>
                )}
                <div className="addstage">
                  <button>+ добавить этап</button> · или попросите советника предложить недостающие
                </div>
              </div>
            </div>

            {stages.length > 0 && g.process && (
              <div className="sec">
                <div className="cap">КАРТА ПРОЦЕССА — ПОДГРАФ ЖИВОГО ГРАФА ПРЕДПРИЯТИЯ</div>
                <ProcessMap stages={stages} process={g.process} hoverId={hov} onHover={setHov} onOpen={openStage} />
                <div className="hint">Прототип: этапы, ресурсы и переходы — демо-данные. Goal Entity и связи графа придут на M6.</div>
              </div>
            )}
          </div>

          <aside className="side">
            <div className="panel">
              <div className="ph">
                <span className="dot pulse" style={{ background: 'var(--gr)' }} />
                <span className="t">СОВЕТНИК ПО ПОСТАНОВКЕ ЦЕЛИ</span>
              </div>
              <div className="amsg">
                <div className="mt">СОВЕТНИК · сегодня 09:30</div>
                Проверил постановку «{g.name}». {checks.some((c) => c.tone !== 'ok') ? 'Есть пробелы — см. чек-лист ниже.' : 'Пробелов не вижу.'}
              </div>
              <div className="checks">
                {checks.slice(0, 6).map((c) => (
                  <div key={c.text} className={`check ${c.tone}`}>
                    <span className="m">{c.m}</span>
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
              <div className="abtn">
                <button className="pri">Проверить снова</button>
                <button className="ghost">Предложить этапы</button>
              </div>
              <div className="ainp">
                <input type="text" placeholder="спросить советника…" aria-label="Вопрос советнику" />
                <button>→</button>
              </div>
            </div>

            <div className="panel">
              <div className="ph">
                <span className="t">БЕЗОПАСНОСТЬ · КТО ВИДИТ ЦЕЛЬ</span>
              </div>
              <div className="opts">
                {GOAL_CARD.security.map((o) => (
                  <button key={o.id} className={`opt${vis === o.id ? ' on' : ''}`} onClick={() => setVis(o.id)}>
                    <span className="rad" />
                    {o.name}
                    <span className="hint">{o.hint}</span>
                  </button>
                ))}
              </div>
              <div className="cap">ДОСТУП СЕЙЧАС</div>
              <div className="grant">
                {GOAL_CARD.grants.map((c) => (
                  <span key={c.t} className={`chip${'ai' in c && c.ai ? ' ai' : ''}`}>
                    {c.t}
                  </span>
                ))}
              </div>
            </div>

            <div className="actions">
              <button className="ok">Утвердить цель</button>
              <button className="dr">Сохранить черновик</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

import { branchStyle, SEL_ICON } from './CommandPanel'
import { FOCUS_GOAL, MAP_GOALS } from './data'
import { AiDot, HumanDot, Icon } from './panelIcons'

/* ── демо-карта (пустая БД): контент data.ts, без изменений ──────────────── */

export function DemoGoalMap({ onOpenGoal }: { onOpenGoal: (id: string) => void }) {
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

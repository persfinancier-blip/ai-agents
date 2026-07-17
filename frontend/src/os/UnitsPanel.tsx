// Панель юнитов (промпт №43) — read-only список реальных Unit-сущностей
// (Unit API, слайс 41). Переиспользует паттерн оверлея .ov/.ov-bg (D10,
// тот же, что и советник/карточка цели), без своей рамки-контейнера.

import { useEffect, useState } from 'react'
import { listUnits } from '../api'
import type { UnitRead } from '../types'
import { unitKindColor, unitKindLabel } from './units'

type Status = 'loading' | 'ready' | 'error'

export function UnitsPanel({ onClose }: { onClose: () => void }) {
  const [units, setUnits] = useState<UnitRead[]>([])
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    listUnits()
      .then((data) => {
        if (cancelled) return
        setUnits(data)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="ov" role="dialog" aria-label="Юниты">
      <div className="ov-bg" onClick={onClose} />
      <div className="gpop-col units-col">
        <div className="gpop-bub">
          <div className="gpop-hd">
            <span>Юниты</span>
            <div className="gpop-icons">
              <button className="gpop-ic" onClick={onClose} aria-label="Закрыть панель юнитов">
                ✕
              </button>
            </div>
          </div>

          {status === 'loading' && <div className="hint">Загрузка…</div>}

          {status === 'error' && (
            <div className="hint">Не удалось загрузить юнитов</div>
          )}

          {status === 'ready' && units.length === 0 && <div className="hint">Юнитов пока нет</div>}

          {status === 'ready' &&
            units.map((u) => {
              const color = unitKindColor(u.kind)
              return (
                <div key={u.entity_id} className="unit-row">
                  <span
                    className="unit-chip"
                    style={color ? { color, borderColor: color } : undefined}
                  >
                    {unitKindLabel(u.kind)}
                  </span>
                  <span className="unit-name">{u.name}</span>
                  {u.description && <span className="unit-desc">{u.description}</span>}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

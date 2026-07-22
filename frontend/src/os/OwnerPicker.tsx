import { useEffect, useRef, useState } from 'react'
import type { UnitGroupRead, UnitRead } from '../types'
import { groupKindLabel, unitKindColor, unitKindLabel } from './units'

// пикер владельца (промпт №45, ADR-0007) — тот же D9-паттерн, что ParentPicker,
// но список смешивает юниты и группы (department/team) с поиском по имени.
export function OwnerPicker({
  units,
  groups,
  error,
  borderColor,
  onChoose,
  onClose,
}: {
  units: UnitRead[] | null
  groups: UnitGroupRead[] | null
  error: boolean
  borderColor: string
  onChoose: (unitId: string | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [onClose])

  const q = query.trim().toLowerCase()
  const filteredUnits = units?.filter((u) => u.name.toLowerCase().includes(q)) ?? null
  const filteredDepartments = groups?.filter((g) => g.kind === 'department' && g.name.toLowerCase().includes(q)) ?? null
  const filteredTeams = groups?.filter((g) => g.kind === 'team' && g.name.toLowerCase().includes(q)) ?? null
  const loading = units === null || groups === null
  const empty = !loading && !filteredUnits?.length && !filteredDepartments?.length && !filteredTeams?.length

  return (
    <div className="gpop-bub gpop-parent-picker" style={{ borderColor }} ref={ref}>
      <input
        className="edit"
        aria-label="Поиск юнита или группы"
        placeholder="поиск…"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <div className="rpool">
        <button onClick={() => onChoose(null)}>
          <b>— не назначен</b>
        </button>
        {error && <div className="note">Не удалось загрузить список</div>}
        {!error && loading && <div className="note">загрузка…</div>}
        {!error && empty && <div className="note">нет юнитов и групп</div>}
        {!error && !!filteredUnits?.length && (
          <>
            <div className="note">Юниты</div>
            {filteredUnits.map((u) => {
              const color = unitKindColor(u.kind)
              return (
                <button key={u.entity_id} onClick={() => onChoose(u.entity_id)}>
                  <b>{u.name}</b>
                  <span className="unit-chip" style={color ? { color, borderColor: color } : undefined}>
                    {unitKindLabel(u.kind)}
                  </span>
                </button>
              )
            })}
          </>
        )}
        {!error && !!filteredDepartments?.length && (
          <>
            <div className="note">Департаменты</div>
            {filteredDepartments.map((g) => (
              <button key={g.entity_id} onClick={() => onChoose(g.entity_id)}>
                <b>{g.name}</b>
                <span className="unit-chip">{groupKindLabel(g.kind)}</span>
              </button>
            ))}
          </>
        )}
        {!error && !!filteredTeams?.length && (
          <>
            <div className="note">Команды</div>
            {filteredTeams.map((g) => (
              <button key={g.entity_id} onClick={() => onChoose(g.entity_id)}>
                <b>{g.name}</b>
                <span className="unit-chip">{groupKindLabel(g.kind)}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

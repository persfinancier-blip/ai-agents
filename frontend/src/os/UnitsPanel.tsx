// Панель юнитов (промпт №43, дерево департаментов и команды — промпт №46)
// (Unit API, слайс 41; UnitGroup API, ADR-0007). Переиспользует паттерн
// оверлея .ov/.ov-bg (D10, тот же, что и советник/карточка цели), без своей
// рамки-контейнера. Read-only: без редактирования членства.

import { useEffect, useState } from 'react'
import { listTeamMembers, listUnitGroups, listUnits } from '../api'
import type { UnitGroupRead, UnitRead } from '../types'
import { groupKindLabel, unitKindColor, unitKindLabel } from './units'

type Status = 'loading' | 'ready' | 'error'

function UnitRow({ unit }: { unit: UnitRead }) {
  const color = unitKindColor(unit.kind)
  return (
    <div className="unit-row">
      <span className="unit-chip" style={color ? { color, borderColor: color } : undefined}>
        {unitKindLabel(unit.kind)}
      </span>
      <span className="unit-name">{unit.name}</span>
      {unit.description && <span className="unit-desc">{unit.description}</span>}
    </div>
  )
}

function DepartmentNode({
  dept,
  depth,
  childrenByParent,
  unitsByDept,
}: {
  dept: UnitGroupRead
  depth: number
  childrenByParent: Map<string, UnitGroupRead[]>
  unitsByDept: Map<string, UnitRead[]>
}) {
  const children = childrenByParent.get(dept.entity_id) ?? []
  const units = unitsByDept.get(dept.entity_id) ?? []

  return (
    <>
      <div className="unit-dept-row" style={{ paddingLeft: 18 + depth * 16 }}>
        <span className="unit-dept-name">{dept.name}</span>
        {dept.description && <span className="unit-desc">{dept.description}</span>}
      </div>
      {units.map((u) => (
        <div key={u.entity_id} style={{ paddingLeft: depth * 16 }}>
          <UnitRow unit={u} />
        </div>
      ))}
      {children.map((child) => (
        <DepartmentNode
          key={child.entity_id}
          dept={child}
          depth={depth + 1}
          childrenByParent={childrenByParent}
          unitsByDept={unitsByDept}
        />
      ))}
    </>
  )
}

export function UnitsPanel({ onClose }: { onClose: () => void }) {
  const [units, setUnits] = useState<UnitRead[]>([])
  const [groups, setGroups] = useState<UnitGroupRead[]>([])
  const [teamMembers, setTeamMembers] = useState<Map<string, string[]>>(new Map())
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    Promise.all([listUnits(), listUnitGroups()])
      .then(async ([unitsData, groupsData]) => {
        const teams = groupsData.filter((g) => g.kind === 'team')
        const memberLists = await Promise.all(teams.map((t) => listTeamMembers(t.entity_id)))
        if (cancelled) return
        const membersMap = new Map<string, string[]>()
        teams.forEach((t, i) => membersMap.set(t.entity_id, memberLists[i]))
        setUnits(unitsData)
        setGroups(groupsData)
        setTeamMembers(membersMap)
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

  const departments = groups.filter((g) => g.kind === 'department')
  const teams = groups.filter((g) => g.kind === 'team')
  const departmentIds = new Set(departments.map((d) => d.entity_id))

  const childrenByParent = new Map<string, UnitGroupRead[]>()
  const roots: UnitGroupRead[] = []
  for (const dept of departments) {
    if (dept.parent_id !== null && departmentIds.has(dept.parent_id)) {
      const siblings = childrenByParent.get(dept.parent_id) ?? []
      siblings.push(dept)
      childrenByParent.set(dept.parent_id, siblings)
    } else {
      roots.push(dept)
    }
  }

  const unitsByDept = new Map<string, UnitRead[]>()
  const unassigned: UnitRead[] = []
  for (const u of units) {
    if (u.department_id !== null && departmentIds.has(u.department_id)) {
      const list = unitsByDept.get(u.department_id) ?? []
      list.push(u)
      unitsByDept.set(u.department_id, list)
    } else {
      unassigned.push(u)
    }
  }

  const unitById = new Map(units.map((u) => [u.entity_id, u]))
  const isEmpty = status === 'ready' && units.length === 0 && groups.length === 0

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

          {status === 'error' && <div className="hint">Не удалось загрузить юнитов</div>}

          {isEmpty && <div className="hint">Юнитов пока нет</div>}

          {status === 'ready' && !isEmpty && (
            <>
              {(roots.length > 0 || unassigned.length > 0) && (
                <div className="unit-section-caption">Департаменты</div>
              )}

              {roots.map((dept) => (
                <DepartmentNode
                  key={dept.entity_id}
                  dept={dept}
                  depth={0}
                  childrenByParent={childrenByParent}
                  unitsByDept={unitsByDept}
                />
              ))}

              {unassigned.length > 0 && (
                <>
                  <div className="unit-dept-row">
                    <span className="unit-dept-name">Без департамента</span>
                  </div>
                  {unassigned.map((u) => (
                    <UnitRow key={u.entity_id} unit={u} />
                  ))}
                </>
              )}

              {teams.length > 0 && (
                <>
                  <div className="unit-section-caption">Команды</div>
                  {teams.map((team) => {
                    const memberIds = teamMembers.get(team.entity_id) ?? []
                    const memberNames = memberIds
                      .map((id) => unitById.get(id)?.name)
                      .filter((name): name is string => Boolean(name))
                    return (
                      <div key={team.entity_id} className="unit-team-row">
                        <div className="unit-dept-row">
                          <span className="unit-dept-name">{team.name}</span>
                          <span className="unit-chip">{groupKindLabel(team.kind)}</span>
                        </div>
                        <div className="unit-desc unit-team-members">
                          {memberNames.length > 0 ? memberNames.join(', ') : '— пусто'}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

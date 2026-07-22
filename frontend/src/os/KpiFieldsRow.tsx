import { useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface KpiFieldsValue {
  name: string
  target: string
  unit: string
}

// та же inline-редактор строка KPI, что была в RealGoalCard.tsx — имя+target+unit,
// Enter/blur вне полей → commit, Escape → cancel без запроса.
export function KpiFieldsRow({
  value,
  onChange,
  onCommit,
  onCancel,
  disabled,
}: {
  value: KpiFieldsValue
  onChange: (next: KpiFieldsValue) => void
  onCommit: () => void
  onCancel: () => void
  disabled: boolean
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const skipBlur = useRef(false)

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      skipBlur.current = true
      onCancel()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      skipBlur.current = true
      onCommit()
    }
  }
  const onBlur = () => {
    if (skipBlur.current) {
      skipBlur.current = false
      return
    }
    requestAnimationFrame(() => {
      if (rowRef.current && !rowRef.current.contains(document.activeElement)) onCommit()
    })
  }

  return (
    <div className="rrow" ref={rowRef}>
      <input
        className="edit"
        style={{ flex: 1 }}
        aria-label="Название KPI"
        placeholder="название KPI"
        value={value.name}
        disabled={disabled}
        autoFocus
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <input
        className="edit"
        style={{ width: 84 }}
        aria-label="Целевое значение KPI"
        placeholder="target"
        inputMode="decimal"
        value={value.target}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, target: e.target.value })}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <input
        className="edit"
        style={{ width: 70 }}
        aria-label="Единица измерения KPI"
        placeholder="ед."
        value={value.unit}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, unit: e.target.value })}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
    </div>
  )
}

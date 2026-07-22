import { useEffect, useRef } from 'react'
import type { GoalRead } from '../types'

// пикер родителя — облачко D9 (та же порода, что .gpop-bub), список .rpool
// восстановлен из истории RealGoalCard.tsx (openParentPicker/chooseParent).
export function ParentPicker({
  options,
  error,
  borderColor,
  onChoose,
  onClose,
}: {
  options: GoalRead[] | null
  error: boolean
  borderColor: string
  onChoose: (parentId: string | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [onClose])

  return (
    <div className="gpop-bub gpop-parent-picker" style={{ borderColor }} ref={ref}>
      <div className="rpool">
        <button onClick={() => onChoose(null)}>
          <b>сделать корневой</b>
        </button>
        {error && <div className="note">Не удалось загрузить список</div>}
        {!error && options === null && <div className="note">загрузка…</div>}
        {!error &&
          options?.map((g) => (
            <button key={g.id} onClick={() => onChoose(g.id)}>
              <b>{g.name}</b>
            </button>
          ))}
      </div>
    </div>
  )
}

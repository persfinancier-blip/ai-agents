import { useEffect, useState } from 'react'
import { listDecisions } from './api'
import { CommandPanel } from './os/CommandPanel'
import { GoalCanvas } from './os/GoalCanvas'
import { GoalCard } from './os/GoalCard'
import { GOAL_TREE } from './os/data'
import type { OsGoal } from './os/data'
import './os/os.css'

function App() {
  // дерево целей живёт здесь, чтобы правки ресурсов переживали навигацию
  const [goals, setGoals] = useState<OsGoal[]>(GOAL_TREE)
  // путь drill-down демо-карточки: [] — панель, [rootId, stageId, …] — демо-карточка
  const [goalPath, setGoalPath] = useState<string[]>([])
  // канвас постановки (Ф4, промпт №23) — единственный полноэкранный переход для
  // реальных целей после удаления RealGoalCard.tsx (Ф7a, промпт №35); путь для
  // него ведёт себя как раньше — [goalId] с возможной последующей навигацией.
  const [canvasPath, setCanvasPath] = useState<string[] | null>(null)
  // единственные живые данные M5 — Decisions из реального API (счётчик в баре)
  const [decisionsOnMove, setDecisionsOnMove] = useState<number | null>(null)

  useEffect(() => {
    listDecisions()
      .then((d) => setDecisionsOnMove(d.length))
      .catch(() => setDecisionsOnMove(null))
  }, [])

  const openGoal = (id: string) => {
    setGoalPath([id])
  }

  if (canvasPath) {
    return (
      <GoalCanvas
        path={canvasPath}
        onNavigate={setCanvasPath}
        onBack={() => setCanvasPath(null)}
      />
    )
  }

  if (goalPath.length > 0) {
    return (
      <GoalCard
        goals={goals}
        path={goalPath}
        onNavigate={setGoalPath}
        onBack={() => setGoalPath([])}
        onUpdate={setGoals}
      />
    )
  }

  return (
    <CommandPanel
      decisionsOnMove={decisionsOnMove}
      onOpenGoal={openGoal}
      onOpenCanvas={(id) => setCanvasPath([id])}
    />
  )
}

export default App

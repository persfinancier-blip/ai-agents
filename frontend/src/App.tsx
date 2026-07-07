import { useEffect, useState } from 'react'
import { listDecisions } from './api'
import { CommandPanel } from './os/CommandPanel'
import { GoalCard } from './os/GoalCard'
import { GOAL_TREE } from './os/data'
import type { OsGoal } from './os/data'
import './os/os.css'

function App() {
  // дерево целей живёт здесь, чтобы правки ресурсов переживали навигацию
  const [goals, setGoals] = useState<OsGoal[]>(GOAL_TREE)
  // путь drill-down: [] — панель, [rootId, stageId, …] — карточка цели
  const [goalPath, setGoalPath] = useState<string[]>([])
  // единственные живые данные M5 — Decisions из реального API (счётчик в баре)
  const [decisionsOnMove, setDecisionsOnMove] = useState<number | null>(null)

  useEffect(() => {
    listDecisions()
      .then((d) => setDecisionsOnMove(d.length))
      .catch(() => setDecisionsOnMove(null))
  }, [])

  return goalPath.length === 0 ? (
    <CommandPanel decisionsOnMove={decisionsOnMove} onOpenGoal={(id) => setGoalPath([id])} />
  ) : (
    <GoalCard
      goals={goals}
      path={goalPath}
      onNavigate={setGoalPath}
      onBack={() => setGoalPath([])}
      onUpdate={setGoals}
    />
  )
}

export default App

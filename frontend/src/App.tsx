import { useEffect, useState } from 'react'
import { listDecisions } from './api'
import { CommandPanel } from './os/CommandPanel'
import { GoalCard } from './os/GoalCard'
import { RealGoalCard } from './os/RealGoalCard'
import { GOAL_TREE } from './os/data'
import type { OsGoal } from './os/data'
import './os/os.css'

function App() {
  // дерево целей живёт здесь, чтобы правки ресурсов переживали навигацию
  const [goals, setGoals] = useState<OsGoal[]>(GOAL_TREE)
  // путь drill-down: [] — панель, [rootId, stageId, …] — карточка цели
  const [goalPath, setGoalPath] = useState<string[]>([])
  // источник открытой карточки: узел демо-карты или реального Goal API (промпт №18)
  const [goalSource, setGoalSource] = useState<'demo' | 'real'>('demo')
  // единственные живые данные M5 — Decisions из реального API (счётчик в баре)
  const [decisionsOnMove, setDecisionsOnMove] = useState<number | null>(null)

  useEffect(() => {
    listDecisions()
      .then((d) => setDecisionsOnMove(d.length))
      .catch(() => setDecisionsOnMove(null))
  }, [])

  const openGoal = (id: string, source: 'demo' | 'real') => {
    setGoalSource(source)
    setGoalPath([id])
  }

  if (goalPath.length === 0) {
    return <CommandPanel decisionsOnMove={decisionsOnMove} onOpenGoal={openGoal} />
  }

  return goalSource === 'real' ? (
    <RealGoalCard path={goalPath} onNavigate={setGoalPath} onBack={() => setGoalPath([])} />
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

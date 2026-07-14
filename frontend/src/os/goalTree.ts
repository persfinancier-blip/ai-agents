// Дерево и раскладка реальных целей (Goal API, промпт №17).
// Не смешивать с демо-хелперами goals.ts: здесь только GoalRead с бэкенда.

import type { GoalRead } from '../types'

export interface GoalNode {
  goal: GoalRead
  children: GoalNode[]
}

/**
 * Лес из плоского списка по parent_id. Сироты (parent не в списке) поднимаются
 * в корни; цикл невозможен — бэкенд запрещает (would_create_cycle).
 * Бэклог-цели (is_backlog) на карте не размещаются: это отложенные идеи,
 * визуальный код «бэклога» — открытый вопрос бренд-бука, не решаем здесь.
 */
export function buildGoalForest(goals: GoalRead[]): GoalNode[] {
  const nodes = new Map<string, GoalNode>()
  for (const g of goals) {
    if (!g.is_backlog) nodes.set(g.id, { goal: g, children: [] })
  }
  const roots: GoalNode[] = []
  for (const node of nodes.values()) {
    const pid = node.goal.parent_id
    const parent = pid === null ? undefined : nodes.get(pid)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

export interface NodePos {
  x: number
  y: number
  w: number
}

// Простая автораскладка: глубина = колонка, порядок обхода = строка.
// Константы шага — из габаритов демо-узлов MAP_GOALS (w ≈ 230–265, шаг y ≈ 118).
// Заведомо временная раскладка до отдельного среза UI карты — никаких
// force-directed алгоритмов здесь сознательно нет.
const NODE_W = 250
const COL_W = 285
const ROW_H = 118
const X0 = 20
const Y0 = 56

export function layoutForest(forest: GoalNode[]): Map<string, NodePos> {
  const pos = new Map<string, NodePos>()
  let row = 0
  const place = (node: GoalNode, depth: number): void => {
    pos.set(node.goal.id, { x: X0 + depth * COL_W, y: Y0 + row * ROW_H, w: NODE_W })
    row += 1
    for (const child of node.children) place(child, depth + 1)
  }
  for (const root of forest) place(root, 0)
  return pos
}

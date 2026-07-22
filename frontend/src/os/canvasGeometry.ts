import type { KpiLinkType } from '../types'

/* ── геометрия: простая тригонометрия по секторам ────────────────────────── */

export const CX = 520
export const CY = 330
export const CANVAS_W = 1040
export const CANVAS_H = 660
export const KPI_R0 = 175
export const SUB_R0 = 175
export const ROW_STEP = 78
export const SAT_EXTRA = 75
export const MAX_KPI_ROW = 5
export const MAX_SAT_ROW = 6
export const CENTER_GAP = 95
export const KPI_GAP = 54
export const SUB_GAP = 58
export const SAT_GAP = 50

export interface Pt {
  x: number
  y: number
}

export const polar = (radius: number, angleDeg: number): Pt => {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

// Дуга в один ряд; при переполнении сектора зовущий код передаёт уже нарезанные
// на ряды порции (chunkRows) с растущим радиусом на ряд.
export function arcPositions(count: number, angleFrom: number, angleTo: number, radius: number): Pt[] {
  if (count === 0) return []
  if (count === 1) return [polar(radius, (angleFrom + angleTo) / 2)]
  const step = (angleTo - angleFrom) / (count - 1)
  return Array.from({ length: count }, (_, i) => polar(radius, angleFrom + i * step))
}

export function chunkRows<T>(items: T[], maxPerRow: number): T[][] {
  if (items.length <= maxPerRow) return [items]
  const rowCount = Math.ceil(items.length / maxPerRow)
  const perRow = Math.ceil(items.length / rowCount)
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow))
  return rows
}

// Обрезает отрезок с обоих концов на gap (приблизительно — под размер узла-пилюли),
// чтобы линия/стрелка не влезала внутрь карточки.
export function trimLine(x1: number, y1: number, x2: number, y2: number, gap1: number, gap2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  return { sx: x1 + ux * gap1, sy: y1 + uy * gap1, tx: x2 - ux * gap2, ty: y2 - uy * gap2 }
}

// KPI-связи в обе стороны — обычный сценарий (создали «способствует», потом «зависит
// от» в ответ, чтобы замкнуть цикл на подтверждение) даёт две связи между ровно той же
// парой узлов. Прямая линия наложила бы их друг на друга — обе визуально и по клику
// (hit-область верхней перекрывала нижнюю). offset разводит дугой; offset=0 (единственная
// связь пары — обычный случай) даёт ту же прямую линию, что и раньше.
//
// perp задаётся ОТДЕЛЬНО от направления source→target: две встречные связи одной пары
// (source/target местами) иначе давали бы противоположный perp-вектор при одинаковом по
// модулю offset разного знака — знаки взаимно гасились, и обе дуги ложились в одну и ту
// же control-point (баг, пойманный вручную в Playwright: hit-область нижней связи была
// недостижима для клика). perp считается по канонической (не зависящей от направления
// конкретной связи) паре узлов — см. вызов ниже.
export function curvedPath(sx: number, sy: number, tx: number, ty: number, perp: Pt, offset: number) {
  if (offset === 0) {
    return { d: `M ${sx} ${sy} L ${tx} ${ty}`, angle: (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI }
  }
  const cx = (sx + tx) / 2 + perp.x * offset
  const cy = (sy + ty) / 2 + perp.y * offset
  return { d: `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`, angle: (Math.atan2(ty - cy, tx - cx) * 180) / Math.PI }
}

export const LINK_TYPE_LABEL: Record<KpiLinkType, string> = {
  contributes: 'способствует',
  constrains: 'ограничивает',
  depends_on: 'зависит от',
}
export const LINK_TYPE_CLASS: Record<KpiLinkType, string> = {
  contributes: 'lt-contributes',
  constrains: 'lt-constrains',
  depends_on: 'lt-depends',
}
export const LINK_TYPES = Object.keys(LINK_TYPE_LABEL) as KpiLinkType[]

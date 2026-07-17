// Юниты (промпт №43) — RU-подписи атомарных видов исполнителя (Management_Model.md §2, ADR-0006).

import type { UnitKind } from '../types'

export const UNIT_KIND_LABEL: Record<UnitKind, string> = {
  employee: 'Сотрудник',
  agent: 'Агент',
  external: 'Вне контура',
  device: 'Устройство',
}

// D10: один локальный канал --id-* на вид юнита, без новых токенов.
export const UNIT_KIND_COLOR: Record<UnitKind, string> = {
  employee: 'var(--id-blue)',
  agent: 'var(--id-purple)',
  external: 'var(--id-orange)',
  device: 'var(--id-cyan)',
}

const KNOWN_KINDS = new Set<string>(Object.keys(UNIT_KIND_LABEL))

export const unitKindLabel = (kind: string): string =>
  KNOWN_KINDS.has(kind) ? UNIT_KIND_LABEL[kind as UnitKind] : kind

export const unitKindColor = (kind: string): string | null =>
  KNOWN_KINDS.has(kind) ? UNIT_KIND_COLOR[kind as UnitKind] : null

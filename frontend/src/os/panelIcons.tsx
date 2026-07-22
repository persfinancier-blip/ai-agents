import type { RailBlock } from './data'

export const STROKE = 'rgba(231,232,238,.55)'

export function Icon({ name, color = STROKE }: { name: string; color?: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.6 }
  switch (name) {
    case 'hex':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M14 4 L23 9.5 V19 L14 24.5 L5 19 V9.5 Z" {...p} />
        </svg>
      )
    case 'chart':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <rect x="5" y="5" width="18" height="18" rx="2" {...p} />
          <path d="M9 17 L13 12 L16 15 L19 10" {...p} />
        </svg>
      )
    case 'person':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <circle cx="14" cy="11" r="5" {...p} />
          <path d="M5 24 C7 18 21 18 23 24" {...p} />
        </svg>
      )
    case 'house':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M5 22 V12 L14 5 L23 12 V22 Z" {...p} />
        </svg>
      )
    case 'clock':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="9" {...p} />
          <path d="M14 8 V14 L18 17" {...p} />
        </svg>
      )
    case 'grad':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M4 11 L14 6 L24 11 L14 16 Z" {...p} />
          <path d="M8 14 V19 C8 21 20 21 20 19 V14" {...p} />
        </svg>
      )
    case 'tri':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M14 5 L23 22 L5 22 Z" strokeLinejoin="round" {...p} />
        </svg>
      )
    case 'mega':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <path d="M5 18 L23 18 M7 18 L9 8 H19 L21 18" {...p} />
        </svg>
      )
    case 'box':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <rect x="5" y="9" width="18" height="13" rx="2" {...p} />
          <path d="M10 9 V6 H18 V9" {...p} />
        </svg>
      )
    case 'doc':
      return (
        <svg width="15" height="15" viewBox="0 0 28 28">
          <rect x="6" y="5" width="16" height="18" rx="2" {...p} />
          <path d="M10 11 H18 M10 15 H18" {...p} />
        </svg>
      )
    default:
      return null
  }
}

export const HumanDot = () => (
  <svg width="11" height="11" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="10" fill="none" stroke="#e7e8ee" strokeWidth="2" />
  </svg>
)

export const AiDot = () => (
  <svg width="11" height="11" viewBox="0 0 28 28">
    <rect x="6.5" y="6.5" width="15" height="15" transform="rotate(45 14 14)" fill="none" stroke="#e8c04a" strokeWidth="2" />
  </svg>
)

export function RailButton({ b }: { b: RailBlock }) {
  const cls = b.tone === 'on' ? 'on' : b.tone ?? ''
  return (
    <button className={cls} title={b.name}>
      <Icon name={b.icon} color={b.tone === 'on' ? '#8fd14f' : STROKE} />
      {b.name} <span className="hp">{b.hp}</span>
    </button>
  )
}

// Слайс 38: иконка-глиф для рядов hover-контролов узла/ребра — тот же голый
// stroke-glyph, что в GoalPopup (.gpop-ic), без заливки/подписи (D9).
export function HoverGlyph({ name }: { name: 'plus' | 'pause' | 'play' | 'process' | 'trash' | 'cross' }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }
  switch (name) {
    case 'plus':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path d="M12 5 V19 M5 12 H19" {...p} />
        </svg>
      )
    case 'pause':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" fill="currentColor" />
          <rect x="14" y="4" width="4" height="16" fill="currentColor" />
        </svg>
      )
    case 'play':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path d="M6 4 L20 12 L6 20 Z" fill="currentColor" />
        </svg>
      )
    case 'process':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path d="M14 4 L23 9.5 V19 L14 24.5 L5 19 V9.5 Z" {...p} />
        </svg>
      )
    case 'trash':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path d="M5 7 H19 M9 7 V5 H15 V7 M7 7 L8 20 H16 L17 7" {...p} />
        </svg>
      )
    case 'cross':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path d="M6 6 L18 18 M18 6 L6 18" {...p} />
        </svg>
      )
  }
}

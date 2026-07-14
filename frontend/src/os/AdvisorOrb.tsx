// Орб советника — canvas, точки по сфере Фибоначчи (золотой угол), дыхание +
// вращение через requestAnimationFrame. Порт алгоритма orb5() из эталона
// renders/mockup-target-v2.html (Часть III Visual_Reference.md). Чистое
// представление: размер и hue — единственные параметры, клик/фокус вешает
// вызывающий компонент (см. `.adva` в CommandPanel.tsx).

import { useEffect, useRef } from 'react'

export function AdvisorOrb({ size, hue }: { size: number; hue: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const W = canvas.width
    const H = canvas.height
    const R = W * 0.36
    const n = Math.max(160, Math.round(W * 2.6))
    const ga = Math.PI * (3 - Math.sqrt(5))
    const pts: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = ga * i
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r])
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const render = (t: number) => {
      ctx.clearRect(0, 0, W, H)
      const tt = t * 0.00035
      const br = 1 + 0.06 * Math.sin(t * 0.0012)
      for (let i = 0; i < n; i++) {
        const p = pts[i]
        const w = 1 + 0.11 * Math.sin(3 * p[1] + tt * 3) + 0.07 * Math.sin(4 * p[0] + tt * 2.1)
        const x = p[0] * w
        const y = p[1] * w
        const z = p[2] * w
        const cx = x * Math.cos(tt) + z * Math.sin(tt)
        const cz = -x * Math.sin(tt) + z * Math.cos(tt)
        const s = R * br
        const px = W / 2 + cx * s
        const py = H / 2 + y * s
        const a = 0.15 + 0.6 * ((cz + 1.2) / 2.2)
        const sz = (0.55 + 1.05 * ((cz + 1.2) / 2.2)) * Math.max(1, W / 220)
        ctx.fillStyle = `hsla(${hue},86%,${60 + 14 * cz}%,${a.toFixed(2)})`
        ctx.beginPath()
        ctx.arc(px, py, sz, 0, 6.284)
        ctx.fill()
      }
    }

    let raf = 0
    if (reduced) {
      render(0)
    } else {
      const loop = (t: number) => {
        render(t)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    return () => cancelAnimationFrame(raf)
  }, [hue, size])

  return <canvas ref={canvasRef} width={size} height={size} className="orb" aria-hidden="true" />
}

'use client'

import { useEffect, useState } from 'react'

interface RingProps {
  value: number
  size?: number
  stroke?: number
  from?: string
  to?: string
}

export function Ring({ value, size = 132, stroke = 13, from = '#FFB300', to = '#F57C00' }: RingProps) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { setAnimated(true) }, [])

  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - (animated ? value : 0) / 100)
  const uid = `ring-${size}-${Math.round(value)}`

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E9EFEC" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${uid})`} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)' }}
      />
    </svg>
  )
}

interface DonutSegment { value: number; color: string }

export function Donut({ data = [], size = 128, stroke = 20 }: { data: DonutSegment[]; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  let acc = 0

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1ECE1" strokeWidth={stroke} />
      {data.map((d, i) => {
        const frac = d.value / total
        const len = c * frac
        const dash = Math.max(len - 2, 0)
        const off = -c * acc
        acc += frac
        return (
          <circle
            key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={d.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={off}
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)' }}
          />
        )
      })}
    </svg>
  )
}

export function Sparkline({
  points = [],
  w = 120,
  h = 34,
  color = '#28A745',
  fill = 'rgba(40,167,69,.12)',
}: {
  points?: number[]
  w?: number
  h?: number
  color?: string
  fill?: string
}) {
  if (!points.length) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = w / (points.length - 1)
  const coords: [number, number][] = points.map((p, i) => [
    i * step,
    h - 4 - ((p - min) / span) * (h - 8),
  ])
  const line = coords.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${w} ${h} L 0 ${h} Z`
  const last = coords[coords.length - 1]

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} fill={fill} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
    </svg>
  )
}

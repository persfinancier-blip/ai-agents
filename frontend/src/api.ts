import type { BoardOpinionRead, DecisionCreate, DecisionRead } from './types'

const BASE = '/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const listDecisions = () => request<DecisionRead[]>('/decisions')

export const getDecision = (id: string) => request<DecisionRead>(`/decisions/${id}`)

export const createDecision = (payload: DecisionCreate) =>
  request<DecisionRead>('/decisions', { method: 'POST', body: JSON.stringify(payload) })

export const analyzeDecision = (id: string) =>
  request<BoardOpinionRead>(`/decisions/${id}/analyze`, { method: 'POST' })

export const getBoard = (id: string) => request<BoardOpinionRead[]>(`/decisions/${id}/board`)

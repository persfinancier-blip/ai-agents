export interface DecisionCreate {
  name: string
  owner: string
  problem: string
  goal: string
  initiator: string
  decision_type?: 'strategic' | 'tactical' | 'operational' | 'automatic'
  estimated_cost?: number
  estimated_timeline_days?: number
}

export interface DecisionRead {
  id: string
  name: string
  description: string | null
  owner: string
  status: string
  lifecycle_stage: string
  risk_level: string
  problem: string
  goal: string
  initiator: string
  estimated_cost: number | null
  estimated_timeline_days: number | null
  decision_type: string
  autonomy_level: string
  final_decision: string | null
  created_at: string
  updated_at: string
}

export interface BoardOpinionRead {
  id: number
  decision_id: string
  persona: string
  recommendation: string
  confidence: number
  key_risks: string[]
  key_benefits: string[]
  rationale: string
  created_at: string
}

/* Goal API (промпт №17) — зеркало pydantic-схем backend/app/schemas/goal.py */

export interface GoalKpiRead {
  id: string | null
  name: string
  target: number | null
  unit: string
  computed_value: number | null
}

export interface GoalRead {
  id: string
  entity_type: string
  name: string
  description: string | null
  owner: string
  status: string
  lifecycle_stage: string
  risk_level: string
  role_label: string
  kpis: GoalKpiRead[]
  is_backlog: boolean
  definiteness: 'fog' | 'defined'
  parent_id: string | null
  created_at: string
  updated_at: string
}

/* Ф3 — редактирование (промпт №22): зеркало GoalCreate/GoalPatch/GoalKpi (write-часть) */

export interface GoalKpiWrite {
  id: string | null
  name: string
  target: number | null
  unit: string
}

export interface GoalCreate {
  name: string
  owner?: string
  description?: string | null
  kpis?: GoalKpiWrite[]
  parent_id?: string | null
}

export interface GoalPatch {
  name?: string
  description?: string | null
  owner?: string
  kpis?: GoalKpiWrite[]
  is_backlog?: boolean
  parent_id?: string | null
}

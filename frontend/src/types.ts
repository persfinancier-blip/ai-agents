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

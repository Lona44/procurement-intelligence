export type AgentType = "conservative" | "aggressive" | "balanced";
export type AgentStatus = "idle" | "thinking" | "complete" | "error";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  estimated_savings: number;
  confidence: number;
  risk_level: "low" | "medium" | "high";
  pros: string[];
  cons: string[];
}

export interface AgentState {
  type: AgentType;
  status: AgentStatus;
  progress: number;
  steps: string[];
  recommendations: Recommendation[];
  total_savings: number;
  summary: string;
}

export interface UploadResponse {
  session_id: string;
  row_count: number;
  total_spend: number;
  date_range: string;
  top_vendors: Record<string, unknown>[];
  categories: Record<string, unknown>[];
}

export interface SSEEvent {
  type?: string;
  agent?: AgentType;
  status?: "thinking" | "complete";
  step?: string;
  progress?: number;
  result?: {
    agent_type: string;
    recommendations: Recommendation[];
    total_savings: number;
    summary: string;
  };
}

export interface Votes {
  conservative: number;
  aggressive: number;
  balanced: number;
}

export interface VotedRec {
  agentType: AgentType;
  recommendationId: string;
}

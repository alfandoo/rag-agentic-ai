export interface CompetitorFocus {
  name: string;
  website?: string;
  category: string;
  core_value_prop: string;
}

export interface ResearchSubtask {
  subtask_id: string;
  focus_dimension: "product_features" | "pricing_model" | "user_sentiment" | "go_to_market";
  competitor_target: string;
  search_queries: string[];
  expected_findings: string;
}

export interface ResearchPlan {
  market_domain: string;
  competitors: CompetitorFocus[];
  subtasks: ResearchSubtask[];
  key_hypotheses: string[];
}

export interface SourceCitation {
  url: string;
  title: string;
  snippet: string;
  source_engine: "google_grounding" | "tavily" | "duckduckgo";
  retrieved_at: string;
}

export interface VerificationVerdict {
  is_valid: boolean;
  confidence_score: number;
  critique: string;
  missing_aspects: string[];
  retry_search_queries: string[];
}

export interface SWOTAnalysis {
  competitor: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CompetitorProfile {
  name: string;
  tagline: string;
  pricing_summary: string;
  key_features: string[];
  pros: string[];
  cons: string[];
  market_positioning: string;
}

export interface CompetitorReport {
  title: string;
  executive_summary: string;
  market_overview: string;
  competitor_profiles: CompetitorProfile[];
  feature_matrix_markdown: string;
  pricing_matrix_markdown: string;
  swot_analyses: SWOTAnalysis[];
  strategic_recommendations: string[];
  verified_citations: SourceCitation[];
  confidence_score?: number;
  audit_status?: "verified" | "partial_evidence";
  generated_at: string;
}

export interface StatusEvent {
  node: string;
  status: string;
  message: string;
  timestamp: string;
  data?: Record<string, any>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

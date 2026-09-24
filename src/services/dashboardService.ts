// ============================================================
// Dashboard Service – Metrics & System Summary API
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export interface DashboardSummary {
  total_candidates: number;
  total_active_jobs: number;
  jobs_processed: number;
  processing_errors: number;
  matches_generated: number;
  strong_matches: number;
  system_status: string;
}

export interface RecentMatchLog {
  match_id: string;
  candidate_id: string;
  candidate_name: string;
  job_id: string;
  job_title: string;
  overall_score: number;
  status: string;
  created_at: string;
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE_URL}/dashboard/summary`);
    if (!res.ok) throw new Error("Failed to fetch dashboard summary");
    return res.json();
  },

  async getRecentMatches(limit: number = 10): Promise<{ recent_matches: RecentMatchLog[] }> {
    const res = await fetch(`${API_BASE_URL}/dashboard/recent-matches?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch recent matches");
    return res.json();
  }
};

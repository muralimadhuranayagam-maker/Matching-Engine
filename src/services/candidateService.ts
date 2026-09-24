// ============================================================
// Candidate Service – API abstraction layer
// Base URL is configured via VITE_API_BASE_URL env variable
// ============================================================

import type { CandidateIntakeFormPayload } from "../types/candidate";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export interface CandidateCreateResponse {
  id: string;
  candidate_id: string;
  status: string;
  message: string;
  created_at: string;
}

export interface CandidateItem {
  id: string;
  candidate_id: string;
  name: string;
  phone: string;
  email: string;
  skill: string;
  work_status: string;
  status: string;
  created_at: string;
  profile: CandidateIntakeFormPayload;
}

export interface CandidateMatchItem {
  match_id: string;
  job_id: string;
  job_title: string;
  location: string;
  employment_type: string;
  overall_score: number;
  status: string;
  score_breakdown: {
    skills: number;
    experience: number;
    role_responsibilities: number;
    education: number;
    location: number;
    shift: number;
    other: number;
  };
  matched_requirements: Array<{ requirement: string; candidate_evidence: string; status: string }>;
  missing_requirements: Array<{ requirement: string; candidate_evidence: string; status: string }>;
  partial_requirements: Array<{ requirement: string; candidate_evidence: string; status: string }>;
  llm_validation?: {
    llm_validated: boolean;
    confidence_score: number;
    explanation: string;
    key_strengths: string[];
    potential_risks: string[];
  };
  created_at: string;
}

export const candidateService = {
  async createCandidate(payload: CandidateIntakeFormPayload): Promise<CandidateCreateResponse> {
    const res = await fetch(`${API_BASE_URL}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to save candidate" }));
      throw new Error(err.message || "Request failed");
    }
    return res.json();
  },

  async getCandidates(search?: string): Promise<{ total: number; candidates: CandidateItem[] }> {
    const url = search ? `${API_BASE_URL}/candidates?search=${encodeURIComponent(search)}` : `${API_BASE_URL}/candidates`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch candidates");
    return res.json();
  },

  async getCandidateMatches(candidateId: string): Promise<{ total_matches: number; matches: CandidateMatchItem[] }> {
    const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/matches`);
    if (!res.ok) throw new Error("Failed to fetch candidate matches");
    return res.json();
  },

  async triggerMatching(candidateId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/match`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to trigger candidate matching");
    return res.json();
  },

  async deleteCandidate(candidateId: string): Promise<{ status: string; message: string; candidate_id: string }> {
    const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to delete candidate" }));
      throw new Error(err.detail || "Failed to delete candidate");
    }
    return res.json();
  },

  async bulkDeleteCandidates(candidateIds: string[]): Promise<{ status: string; deleted_count: number; candidate_ids: string[]; message: string }> {
    const res = await fetch(`${API_BASE_URL}/candidates/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_ids: candidateIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to delete selected candidates" }));
      throw new Error(err.detail || "Failed to delete selected candidates");
    }
    return res.json();
  }
};


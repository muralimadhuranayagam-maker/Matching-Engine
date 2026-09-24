// ============================================================
// Job Description Service – API abstraction layer
// Handles batch PDF/DOCX/TXT upload, status tracking, canonical JD fetch
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export interface JobItem {
  id: string;
  job_id: string;
  title: string;
  original_filename: string;
  file_type: string;
  file_size?: string;
  processing_status: string;
  processing_error?: string;
  is_active: boolean;
  created_at: string;
  structured_data?: Record<string, any>;
}

export interface BatchUploadResult {
  total_files: number;
  successful_files: number;
  failed_files: number;
  jobs: Array<{
    job_id: string;
    filename: string;
    status: string;
    message: string;
  }>;
}

export interface JobMatchingCandidate {
  match_id: string;
  candidate_id: string;
  candidate_name: string;
  phone: string;
  email: string;
  skill: string;
  work_status: string;
  overall_score: number;
  status: string;
  score_breakdown: Record<string, number>;
  matched_requirements: Array<{ requirement: string; candidate_evidence: string; status: string }>;
  missing_requirements: Array<{ requirement: string; candidate_evidence: string; status: string }>;
  partial_requirements: Array<{ requirement: string; candidate_evidence: string; status: string }>;
  llm_validation?: any;
  created_at: string;
}

export const jobService = {
  async uploadBatchJobs(files: File[]): Promise<BatchUploadResult> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch(`${API_BASE_URL}/jobs/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Batch upload failed" }));
      throw new Error(err.detail || "Batch upload failed");
    }
    return res.json();
  },

  async getJobs(): Promise<{ total: number; jobs: JobItem[] }> {
    const res = await fetch(`${API_BASE_URL}/jobs`);
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  },

  async getJobDetail(jobId: string): Promise<JobItem & { raw_text?: string }> {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!res.ok) throw new Error("Failed to fetch job detail");
    return res.json();
  },

  async getJobCandidates(jobId: string): Promise<{ total_candidates: number; candidates: JobMatchingCandidate[] }> {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/candidates`);
    if (!res.ok) throw new Error("Failed to fetch matching candidates for job");
    return res.json();
  },

  async triggerJobMatching(jobId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/match`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to trigger job matching");
    return res.json();
  },

  async deleteJob(jobId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to delete job" }));
      throw new Error(err.detail || "Failed to delete job");
    }
    return res.json();
  },

  async bulkDeleteJobs(jobIds: string[]): Promise<{ status: string; deleted_count: number; job_ids: string[]; message: string }> {
    const res = await fetch(`${API_BASE_URL}/jobs/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_ids: jobIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to delete selected jobs" }));
      throw new Error(err.detail || "Failed to delete selected jobs");
    }
    return res.json();
  }
};


import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export interface InterviewQuestionItem {
  id: string;
  category: string;
  question: string;
  target_skill_or_topic: string;
  evaluation_criteria?: string;
}

export interface InterviewResponseItem {
  question_id: string;
  question: string;
  answer: string;
  recorded_at: number;
}

export interface InterviewEvaluation {
  technical_depth_score: number;
  jd_relevance_score: number;
  communication_clarity_score: number;
  overall_interview_score: number;
  recommendation: "STRONG_MATCH" | "CONDITIONAL_MATCH" | "NOT_RECOMMENDED";
  strengths: string[];
  gaps: string[];
  matched_requirements: string[];
  missing_requirements: string[];
  executive_summary: string;
}

export interface CandidateInterviewSession {
  id: string;
  session_id: string;
  candidate_id: string;
  job_id?: string;
  status: "IN_PROGRESS" | "COMPLETED" | "EVALUATED";
  interview_score?: number;
  questions: InterviewQuestionItem[];
  responses: InterviewResponseItem[];
  evaluation?: InterviewEvaluation;
  created_at: string;
  updated_at?: string;
}

export interface CandidateSessionsResponse {
  candidate_id: string;
  total_sessions: number;
  sessions: {
    id: string;
    session_id: string;
    job_id?: string;
    status: string;
    interview_score?: number;
    total_questions: number;
    total_answers: number;
    evaluation?: InterviewEvaluation;
    created_at: string;
  }[];
}

export const interviewService = {
  /**
   * Fetches all interview sessions and evaluations for a candidate
   */
  async getCandidateSessions(candidateId: string): Promise<CandidateSessionsResponse> {
    const res = await axios.get<CandidateSessionsResponse>(`${API_BASE}/interviews/candidate/${candidateId}/sessions`);
    return res.data;
  },

  /**
   * Fetches single full interview session details
   */
  async getSessionDetails(sessionId: string): Promise<CandidateInterviewSession> {
    const res = await axios.get<CandidateInterviewSession>(`${API_BASE}/interviews/sessions/${sessionId}`);
    return res.data;
  },

  /**
   * Generates dynamic interview questions based SOLELY on candidate intake form data
   */
  async generateQuestions(candidateId: string, sessionId?: string): Promise<any> {
    const res = await axios.post(`${API_BASE}/interviews/generate-questions`, {
      candidate_id: candidateId,
      session_id: sessionId
    });
    return res.data;
  },

  /**
   * Finalizes interview at the end of the call and triggers full matching across all active JDs
   */
  async finalizeInterview(sessionId: string): Promise<any> {
    const res = await axios.post(`${API_BASE}/interviews/finalize`, {
      session_id: sessionId
    });
    return res.data;
  },

  /**
   * Compares candidate's full profile (form + interview transcript) against a specific JD
   */
  async compareWithJD(candidateId: string, jobId: string, sessionId?: string): Promise<any> {
    const res = await axios.post(`${API_BASE}/interviews/compare-jd`, {
      candidate_id: candidateId,
      job_id: jobId,
      session_id: sessionId
    });
    return res.data;
  }
};

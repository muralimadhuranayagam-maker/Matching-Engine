// ============================================================
// Centralized Disposition Branching Rules
// Each disposition maps to the field it controls + lineup condition.
// ============================================================

import type { CallDisposition } from "../types/candidate";

export type LineupCondition =
  | "always"
  | "never"
  | "poor_comm_fit"    // fit_domestic_or_non_voice != Neither
  | "non_hiring_zone"  // stay_type=PG AND will_relocate=Yes
  | "other_domain"     // interested_in_bpo_job=Yes
  | "wfh_flexible"     // flexible_to_work_from_office=Yes
  | "shift_go_lineup"  // shift_go_to_lineup=Yes
  | "call_disconnected_fit"; // call_disconnected_fit != Neither (when comm is Poor/Average)

export interface DispositionRule {
  /** The key of the branch object in the form values (if any) */
  branchKey?: string;
  /** Whether lineup_scheduled_details should appear and under what condition */
  lineupCondition: LineupCondition;
}

export const DISPOSITION_RULES: Record<CallDisposition, DispositionRule> = {
  "Poor Communication": {
    branchKey: "poor_communication_assessment",
    lineupCondition: "poor_comm_fit",
  },
  "Non Hiring Zone": {
    branchKey: "non_hiring_zone_details",
    lineupCondition: "non_hiring_zone",
  },
  "Not Interested": {
    branchKey: "not_interested_details",
    lineupCondition: "never",
  },
  "High Salary": {
    branchKey: "high_salary_assessment",
    lineupCondition: "never",
  },
  "Age Limit": {
    branchKey: "age_limit_details",
    lineupCondition: "never",
  },
  "Career Gap": {
    branchKey: "career_gap_details",
    lineupCondition: "never",
  },
  "No Company": {
    branchKey: "no_company_details",
    lineupCondition: "never",
  },
  "Voice Mail": {
    lineupCondition: "never",
  },
  "Other Domain Experience": {
    branchKey: "other_domain_experience_details",
    lineupCondition: "other_domain",
  },
  "Busy, Call me Back": {
    branchKey: "busy_call_me_back_details",
    lineupCondition: "never",
  },
  "Work from Home": {
    branchKey: "work_from_home_details",
    lineupCondition: "wfh_flexible",
  },
  "Out Station Candidate": {
    branchKey: "outstation_candidate_details",
    lineupCondition: "never",
  },
  "Shift Issues": {
    branchKey: "shift_issues_details",
    lineupCondition: "shift_go_lineup",
  },
  "Non Hiring University": {
    branchKey: "non_hiring_university_details",
    lineupCondition: "never",
  },
  "No Education Documents": {
    lineupCondition: "never",
  },
  "No Experience Documents": {
    lineupCondition: "never",
  },
  "Serving Notice": {
    branchKey: "serving_notice_details",
    lineupCondition: "never",
  },
  "Line Up Scheduled": {
    lineupCondition: "always",
  },
  "Call Disconnected": {
    branchKey: "call_disconnected_details",
    lineupCondition: "call_disconnected_fit",
  },
  "Cooling Period": {
    branchKey: "cooling_period_details",
    lineupCondition: "never",
  },
  "Need Weekend Off": {
    lineupCondition: "always",
  },
  "Other Recruiter": {
    branchKey: "other_recruiter_details",
    lineupCondition: "never",
  },
};

/** All disposition branch keys — used to clean up stale values */
export const ALL_BRANCH_KEYS = [
  "poor_communication_assessment",
  "non_hiring_zone_details",
  "not_interested_details",
  "high_salary_assessment",
  "age_limit_details",
  "career_gap_details",
  "no_company_details",
  "other_domain_experience_details",
  "busy_call_me_back_details",
  "work_from_home_details",
  "outstation_candidate_details",
  "shift_issues_details",
  "non_hiring_university_details",
  "serving_notice_details",
  "cooling_period_details",
  "other_recruiter_details",
  "call_disconnected_details",
  "lineup_scheduled_details",
] as const;

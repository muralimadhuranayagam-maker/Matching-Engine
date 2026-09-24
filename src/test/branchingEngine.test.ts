// ============================================================
// Branching Engine Unit Tests
// Tests the shouldShowLineup() and buildPayload() logic
// Imports from pure lib module — no React/DOM required
// ============================================================

import { describe, it, expect } from "vitest";
import { shouldShowLineup, buildPayload } from "../lib/branchingLogic";
import { educationHistorySchema } from "../schemas/candidateIntakeSchema";

const BASE = {
  personal: {
    first_name: "Test",
    last_name: "Candidate",
    gender: "Male",
    date_of_birth: "01-01-1995",
    marital_status: "Single",
    mother_tongue: "Hindi",
    knowledge_of_hindi: "Good - I may have some difficulty understanding certain Hindi accents",
  },
  contact: {
    phone: "9876543210",
    email: "test@example.com",
  },
  address: {
    current: { address_line: "Line 1", pincode: "400001", area: "Andheri", city: "Mumbai", state: "Maharashtra" },
    permanent: { address_line: "Line 1", pincode: "400001", area: "Andheri", city: "Mumbai", state: "Maharashtra" },
  },
  education: {
    tenth: { status: "State Board", passing_year: "2010" },
    twelfth: { status: "State Board", passing_year: "2012" },
    diploma: { status: "Regular" },
    graduation: { status: "UG", passing_year: "2015", degree: "B.Tech" },
  },
  professional_profile: {
    work_status: "EXPERIENCED",
    total_experience_years: 3,
    total_experience_months: 6,
    total_companies: 2,
    skill_role: "Customer Support",
    skill: "Voice",
    industry: "BPO",
    english_communication: "Good",
  },
  employment_history: {
    current: { company_name: "Current Corp", role: "Sr Associate" },
    previous_companies: [],
  },
  job_preferences: {
    job_city: "Mumbai",
    preferred_area: "Andheri",
    shift_base: "Any shift",
    work_from_home: false,
  },
  salary: { current_monthly_salary: 30000, expected_monthly_salary: 35000 },
  availability: { last_working_day: "30-09-2026", notice_period: "Immediate" },
  dnd_status: "Deactivate",
};

// ============================================================
// 1. Poor Communication
// ============================================================
describe("Poor Communication", () => {
  it("shows lineup when fit = Domestic (Voice)", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Poor Communication",
      poor_communication_assessment: {
        poor_communication_reason: "Heavy accent",
        fit_domestic_or_non_voice: "Domestic (Voice)",
      },
    })).toBe(true);
  });

  it("shows lineup when fit = Non-Voice", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Poor Communication",
      poor_communication_assessment: {
        poor_communication_reason: "MTI",
        fit_domestic_or_non_voice: "Non-Voice",
      },
    })).toBe(true);
  });

  it("does NOT show lineup when fit = Neither", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Poor Communication",
      poor_communication_assessment: {
        poor_communication_reason: "Grammar issues",
        fit_domestic_or_non_voice: "Neither",
      },
    })).toBe(false);
  });
});

// ============================================================
// 2. Non Hiring Zone
// ============================================================
describe("Non Hiring Zone", () => {
  it("shows lineup when stay_type=PG AND will_relocate=Yes", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Non Hiring Zone",
      non_hiring_zone_details: {
        candidate_pincode: "400001",
        candidate_area: "Andheri",
        no_hiring_zone_company: "XYZ",
        no_hiring_zone_process: "CS",
        stay_type: "PG",
        will_relocate: "Yes",
      },
    })).toBe(true);
  });

  it("does NOT show lineup when stay_type=With Family", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Non Hiring Zone",
      non_hiring_zone_details: {
        candidate_pincode: "400001",
        candidate_area: "Andheri",
        no_hiring_zone_company: "XYZ",
        no_hiring_zone_process: "CS",
        stay_type: "With Family",
        will_relocate: "Yes",
      },
    })).toBe(false);
  });

  it("does NOT show lineup when will_relocate=No", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Non Hiring Zone",
      non_hiring_zone_details: {
        candidate_pincode: "400001",
        candidate_area: "Andheri",
        no_hiring_zone_company: "XYZ",
        no_hiring_zone_process: "CS",
        stay_type: "PG",
        will_relocate: "No",
      },
    })).toBe(false);
  });
});

// ============================================================
// 3. Other Domain Experience
// ============================================================
describe("Other Domain Experience", () => {
  it("shows lineup when interested_in_bpo_job=Yes", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Other Domain Experience",
      other_domain_experience_details: {
        other_domain_name: "Accounts",
        interested_in_bpo_job: "Yes",
      },
    })).toBe(true);
  });

  it("does NOT show lineup when interested_in_bpo_job=No", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Other Domain Experience",
      other_domain_experience_details: {
        other_domain_name: "Accounts",
        interested_in_bpo_job: "No",
      },
    })).toBe(false);
  });
});

// ============================================================
// 4. Work from Home
// ============================================================
describe("Work from Home", () => {
  it("shows lineup when flexible_to_work_from_office=Yes", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Work from Home",
      work_from_home_details: {
        wfh_address_pincode: "400001",
        flexible_to_work_from_office: "Yes",
      },
    })).toBe(true);
  });

  it("does NOT show lineup when flexible_to_work_from_office=No", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Work from Home",
      work_from_home_details: {
        wfh_address_pincode: "400001",
        flexible_to_work_from_office: "No",
      },
    })).toBe(false);
  });
});

// ============================================================
// 5. Shift Issues
// ============================================================
describe("Shift Issues", () => {
  it("shows lineup when shift_go_to_lineup=Yes", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Shift Issues",
      shift_issues_details: {
        preferred_shift_choice: "Day shift only",
        shift_preference_reason: "Studying",
        shift_go_to_lineup: "Yes",
      },
    })).toBe(true);
  });

  it("does NOT show lineup when shift_go_to_lineup=No", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Shift Issues",
      shift_issues_details: {
        preferred_shift_choice: "Day shift only",
        shift_preference_reason: "Studying",
        shift_go_to_lineup: "No",
      },
    })).toBe(false);
  });
});

// ============================================================
// 6. Call Disconnected
// ============================================================
describe("Call Disconnected", () => {
  it("shows lineup when judge=Yes, comm=Poor, and fit=Domestic", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Call Disconnected",
      call_disconnected_details: {
        call_duration_seconds: 30,
        call_disconnected_judge_communication: "Yes",
        call_disconnected_english_communication: "Poor",
        call_disconnected_fit_domestic_or_non_voice: "Domestic (Voice)",
      },
    })).toBe(true);
  });

  it("does NOT show lineup when judge=No", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Call Disconnected",
      call_disconnected_details: {
        call_duration_seconds: 5,
        call_disconnected_judge_communication: "No",
        call_disconnected_send_details_for_callback: "Yes",
      },
    })).toBe(false);
  });

  it("does NOT show lineup when comm=Excellent", () => {
    expect(shouldShowLineup({
      ...BASE,
      call_disposition: "Call Disconnected",
      call_disconnected_details: {
        call_duration_seconds: 45,
        call_disconnected_judge_communication: "Yes",
        call_disconnected_english_communication: "Excellent",
        call_disconnected_fit_domestic_or_non_voice: "Domestic (Voice)",
      },
    })).toBe(false);
  });
});

// ============================================================
// 7. Unconditional Lineups (always)
// ============================================================
describe("Unconditional Lineups", () => {
  it("Line Up Scheduled ALWAYS shows lineup", () => {
    expect(shouldShowLineup({ ...BASE, call_disposition: "Line Up Scheduled" })).toBe(true);
  });

  it("Need Weekend Off ALWAYS shows lineup", () => {
    expect(shouldShowLineup({ ...BASE, call_disposition: "Need Weekend Off" })).toBe(true);
  });
});

// ============================================================
// 8. Always-Never Lineups
// ============================================================
describe("Unconditional Non-Lineups", () => {
  const NEVER_DISPOSITIONS = [
    "Not Interested",
    "High Salary",
    "Age Limit",
    "Career Gap",
    "No Company",
    "Voice Mail",
    "Busy, Call me Back",
    "Out Station Candidate",
    "Non Hiring University",
    "No Education Documents",
    "No Experience Documents",
    "Serving Notice",
    "Cooling Period",
    "Other Recruiter",
  ];

  NEVER_DISPOSITIONS.forEach((disposition) => {
    it(`${disposition} NEVER shows lineup`, () => {
      expect(shouldShowLineup({ ...BASE, call_disposition: disposition })).toBe(false);
    });
  });
});

// ============================================================
// 9. Payload Builder Cleansing
// ============================================================
describe("buildPayload Cleansing", () => {
  it("includes branch object for selected disposition and derives age", () => {
    const payload = buildPayload({
      ...BASE,
      call_disposition: "Not Interested",
      not_interested_details: { not_interested_reason: "DND (Do Not Disturb)" },
      high_salary_assessment: { expected_salary_monthly: 50000 }, // inactive branch
    });

    expect(payload.call_disposition).toBe("Not Interested");
    expect(payload.not_interested_details).toEqual({ not_interested_reason: "DND (Do Not Disturb)" });
    expect(payload.high_salary_assessment).toBeUndefined();
    expect(payload.is_submitted).toBe(true);
    expect(payload.personal.first_name).toBe("Test");
    expect(payload.personal.age).toBeGreaterThan(0);
  });
});

// ============================================================
// 10. Education Gap Validation
// ============================================================
describe("Education Gap Validation", () => {
  it("allows 12th passing within 2 years of 10th without gap reason", () => {
    const res = educationHistorySchema.safeParse({
      tenth: { status: "State Board", passing_year: "2019" },
      twelfth: { status: "State Board", passing_year: "2021" },
      diploma: { status: "Completed" },
      graduation: { status: "Graduate" },
    });
    expect(res.success).toBe(true);
  });

  it("requires 12th gap reason when 12th passing year is 2022 and 10th is 2019 (1 year gap)", () => {
    const resWithoutReason = educationHistorySchema.safeParse({
      tenth: { status: "State Board", passing_year: "2019" },
      twelfth: { status: "State Board", passing_year: "2022" },
      diploma: { status: "Completed" },
      graduation: { status: "Graduate" },
    });
    expect(resWithoutReason.success).toBe(false);
    if (!resWithoutReason.success) {
      const issue = resWithoutReason.error.issues.find(
        (i) => i.path.join(".") === "twelfth.gap_reason"
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("1 year gap detected between 10th and 12th");
    }

    const resWithReason = educationHistorySchema.safeParse({
      tenth: { status: "State Board", passing_year: "2019" },
      twelfth: { status: "State Board", passing_year: "2022", gap_reason: "Family Concerns" },
      diploma: { status: "Completed" },
      graduation: { status: "Graduate" },
    });
    expect(resWithReason.success).toBe(true);
  });
});

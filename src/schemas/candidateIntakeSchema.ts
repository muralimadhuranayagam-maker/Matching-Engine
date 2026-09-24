import { z } from "zod";

const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
const pincodeRegex = /^\d{6}$/;
const phoneRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reusable sub-field validators
const dateField = z.string().regex(dateRegex, "Enter date in DD-MM-YYYY format");
const pincodeField = z.string().regex(pincodeRegex, "Enter a valid 6-digit pincode");
const yesNoField = z.enum(["Yes", "No"]);
const englishCommField = z.enum(["Excellent", "Very good", "Good", "Average", "Poor"]);

// ------------------------------------------------------------
// Master Candidate Profile Sub-Schemas
// ------------------------------------------------------------

export const personalInformationSchema = z.object({
  first_name: z.string().min(1, "First name required"),
  last_name: z.string().min(1, "Last name required"),
  gender: z.enum(["Male", "Female", "Other"]),
  date_of_birth: dateField,
  age: z.number().nullable().optional(),
  marital_status: z.enum(["Single", "Married", "Divorced", "Widowed"]),
  mother_tongue: z.string().min(1, "Mother tongue required"),
  knowledge_of_hindi: z.enum([
    "Excellent - I am from North India, and I am as fluent in Hindi as a native speaker",
    "Very good - A Hindi speaker would easily understand what I say",
    "Good - I may have some difficulty understanding certain Hindi accents",
    "Average - I may not understand everything a Hindi-speaking customer says",
    "Poor - I may not be able to understand what a Hindi speaker says"
  ]),
});

export const contactInformationSchema = z.object({
  phone: z.string().regex(phoneRegex, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().regex(emailRegex, "Enter a valid email address"),
});

export const addressBlockSchema = z.object({
  address_line: z.string().optional(),
  pincode: pincodeField,
  area: z.string().min(1, "Area / Locality required"),
  city: z.string().min(1, "City required"),
  state: z.string().optional(),
});

export const addressInformationSchema = z.object({
  current: addressBlockSchema,
  permanent: addressBlockSchema,
});

export const tenthEducationSchema = z.object({
  school_name: z.string().optional(),
  status: z.string().min(1, "Status required"),
  passing_year: z.string().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  gap_reason: z.string().optional(),
});

export const twelfthEducationSchema = z.object({
  school_or_college_name: z.string().optional(),
  status: z.string().min(1, "Status required"),
  passing_year: z.string().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  gap_reason: z.string().optional(),
});

export const diplomaEducationSchema = z.object({
  institution_name: z.string().optional(),
  status: z.string().min(1, "Status required"),
  diploma_type: z.string().optional(),
  passing_year: z.string().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  gap_reason: z.string().optional(),
});

export const undergraduationSchema = z.object({
  college_name: z.string().optional(),
  university_name: z.string().optional(),
  degree: z.string().optional(),
  passing_year: z.string().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  gap_reason: z.string().optional(),
}).optional();

export const graduationEducationSchema = z.object({
  college_name: z.string().optional(),
  university_name: z.string().optional(),
  degree: z.string().optional(),
  status: z.string().min(1, "Status required"),
  passing_year: z.string().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  gap_reason: z.string().optional(),
  undergraduation: undergraduationSchema,
});

export const educationHistorySchema = z.object({
  tenth: tenthEducationSchema,
  twelfth: twelfthEducationSchema,
  diploma: diplomaEducationSchema,
  graduation: graduationEducationSchema,
}).superRefine((data, ctx) => {
  const tenthYear = parseInt(data.tenth?.passing_year || "", 10);
  const twelfthYear = parseInt(data.twelfth?.passing_year || "", 10);
  
  // 10th to 12th gap check (standard 2 years)
  if (!isNaN(tenthYear) && !isNaN(twelfthYear) && tenthYear >= 1970 && twelfthYear >= 1970) {
    const gap = twelfthYear - tenthYear - 2;
    if (gap > 0 && (!data.twelfth?.gap_reason || !data.twelfth.gap_reason.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Education Gap Reason is required (${gap} year gap detected between 10th and 12th)`,
        path: ["twelfth", "gap_reason"],
      });
    }
  }

  // Diploma gap check
  const diplomaYear = parseInt(data.diploma?.passing_year || "", 10);
  if (!isNaN(diplomaYear) && diplomaYear >= 1970) {
    if (!isNaN(tenthYear) && (isNaN(twelfthYear) || twelfthYear < 1970) && tenthYear >= 1970) {
      const gap = diplomaYear - tenthYear - 3;
      if (gap > 0 && (!data.diploma?.gap_reason || !data.diploma.gap_reason.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Diploma Gap Reason is required (${gap} year gap detected after 10th)`,
          path: ["diploma", "gap_reason"],
        });
      }
    } else if (!isNaN(twelfthYear) && twelfthYear >= 1970) {
      const gap = diplomaYear - twelfthYear - 2;
      if (gap > 0 && (!data.diploma?.gap_reason || !data.diploma.gap_reason.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Diploma Gap Reason is required (${gap} year gap detected after 12th)`,
          path: ["diploma", "gap_reason"],
        });
      }
    }
  }

  // Graduation gap check
  const gradYear = parseInt(data.graduation?.passing_year || "", 10);
  if (!isNaN(gradYear) && gradYear >= 1970 && !isNaN(twelfthYear) && twelfthYear >= 1970) {
    const gap = gradYear - twelfthYear - 3;
    if (gap > 0 && (!data.graduation?.gap_reason || !data.graduation.gap_reason.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Graduation Gap Reason is required (${gap} year gap detected after 12th)`,
        path: ["graduation", "gap_reason"],
      });
    }
  }

  // Postgraduation gap check
  if (data.graduation?.status === "PG") {
    const ugYear = parseInt(data.graduation?.undergraduation?.passing_year || "", 10);
    if (!isNaN(gradYear) && gradYear >= 1970 && !isNaN(ugYear) && ugYear >= 1970) {
      const gap = gradYear - ugYear - 2;
      if (gap > 0 && (!data.graduation?.gap_reason || !data.graduation.gap_reason.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `PG Education Gap Reason is required (${gap} year gap detected after UG)`,
          path: ["graduation", "gap_reason"],
        });
      }
    }
  }
});

export const primarySkillSchema = z.union([
  z.string().min(1, "Primary Skill required"),
  z.array(z.string().min(1, "Primary Skill required")).min(1, "Primary Skill required"),
], {
  errorMap: () => ({ message: "Primary Skill required" }),
});

export const professionalProfileSchema = z.object({
  work_status: z.enum(["FRESHER", "EXPERIENCED"]),
  total_experience_years: z.number().min(0).nullable().optional(),
  total_experience_months: z.number().min(0).max(11).nullable().optional(),
  total_companies: z.number().min(0, "Must be >= 0"),
  skill_role: z.string().min(1, "Skill / Role required"),
  skill: primarySkillSchema,
  industry: z.string().min(1, "Industry required"),
  english_communication: englishCommField,
});

export const currentEmploymentSchema = z.object({
  company_name: z.string().optional(),
  role: z.string().optional(),
  process_name: z.string().optional(),
  skill: z.string().optional(),
  joining_date: z.string().optional(),
  last_working_day: z.string().optional(),
  monthly_salary: z.number().min(0).nullable().optional(),
  notice_period: z.string().optional(),
  reason_for_leaving: z.string().optional(),
});

export const companyEntrySchema = z.object({
  company_name: z.string().min(1, "Company name required"),
  process_name: z.string().min(1, "Process name required"),
  skill: z.string().min(1, "Skill required"),
  role: z.string().min(1, "Role required"),
  start_date: z.union([dateField, z.literal("")]).optional(),
  end_date: z.union([dateField, z.literal("")]).optional(),
  last_salary: z.number().min(0).nullable().optional(),
  reason_for_leaving: z.string().optional(),
  has_pay_slip: yesNoField,
  has_offer_letter: yesNoField,
  has_experience_letter: yesNoField,
});

export const employmentHistorySchema = z.object({
  current: currentEmploymentSchema,
  previous_companies: z.array(companyEntrySchema),
});

export const jobPreferencesSchema = z.object({
  job_city: z.string().min(1, "Job city required"),
  preferred_area: z.string().optional(),
  shift_base: z.enum(["Any shift", "Day shift only", "Night shift only", "UK Shift", "US Shift", "AUS Shift", "Domestic Shift", "Rotational"]),
  work_from_home: z.boolean(),
  expected_salary_monthly: z.number().min(0).nullable().optional(),
});

export const salaryInformationSchema = z.object({
  current_monthly_salary: z.number().min(0).nullable().optional(),
  expected_monthly_salary: z.number().min(0).nullable().optional(),
});

export const availabilityInformationSchema = z.object({
  last_working_day: z.string().optional(),
  notice_period: z.string().optional(),
  available_from: z.string().optional(),
});

// ------------------------------------------------------------
// Recruiter Disposition Sub-Schemas
// ------------------------------------------------------------

export const poorCommunicationSchema = z.object({
  poor_communication_reason: z.string().optional(),
  fit_domestic_or_non_voice: z.string().optional(),
}).optional().nullable();

export const nonHiringZoneSchema = z.object({
  candidate_pincode: z.string().optional(),
  candidate_area: z.string().optional(),
  no_hiring_zone_company: z.string().optional(),
  no_hiring_zone_process: z.string().optional(),
  stay_type: z.string().optional(),
  will_relocate: z.string().optional(),
}).optional().nullable();

export const notInterestedSchema = z.object({
  not_interested_reason: z.string().optional(),
}).optional().nullable();

export const highSalarySchema = z.object({
  expected_salary_monthly: z.number().nullable().optional(),
  communication_matches_salary: z.string().optional(),
  experience_matches_salary: z.string().optional(),
  has_paying_company: z.string().optional(),
  paying_company_name: z.string().optional(),
  paying_process_name: z.string().optional(),
  reminder_active_process: z.string().optional(),
}).optional().nullable();

export const ageLimitSchema = z.object({
  candidate_dob_age_limit: z.string().optional(),
}).optional().nullable();

export const careerGapSchema = z.object({
  career_gap_gender: z.string().optional(),
  career_gap_dob: z.string().optional(),
  career_gap_reason: z.string().optional(),
}).optional().nullable();

export const noCompanySchema = z.object({
  no_company_reason: z.string().optional(),
}).optional().nullable();

export const otherDomainSchema = z.object({
  other_domain_name: z.string().optional(),
  interested_in_bpo_job: z.string().optional(),
}).optional().nullable();

export const busyCallBackSchema = z.object({
  able_to_judge_communication: z.string().optional(),
  callback_english_communication: z.string().optional(),
  send_details_for_callback: z.string().optional(),
}).optional().nullable();

export const wfhSchema = z.object({
  wfh_address_pincode: z.string().optional(),
  flexible_to_work_from_office: z.string().optional(),
}).optional().nullable();

export const outstationSchema = z.object({
  outstation_address_pincode: z.string().optional(),
}).optional().nullable();

export const shiftIssuesSchema = z.object({
  preferred_shift_choice: z.string().optional(),
  shift_preference_reason: z.string().optional(),
  shift_go_to_lineup: z.string().optional(),
}).optional().nullable();

export const nonHiringUniversitySchema = z.object({
  non_hiring_uni_10th_status: z.string().optional(),
  non_hiring_uni_10th_year: z.string().optional(),
  non_hiring_uni_10th_gap_reason: z.string().optional(),
  non_hiring_uni_12th_status: z.string().optional(),
  non_hiring_uni_12th_year: z.string().optional(),
  non_hiring_uni_12th_gap_reason: z.string().optional(),
  non_hiring_uni_diploma_status: z.string().optional(),
  non_hiring_uni_diploma_type: z.string().optional(),
  non_hiring_uni_diploma_year: z.string().optional(),
  non_hiring_uni_diploma_gap_reason: z.string().optional(),
  non_hiring_uni_graduation_status: z.string().optional(),
  non_hiring_uni_graduation_year: z.string().optional(),
  non_hiring_uni_graduation_gap_reason: z.string().optional(),
}).optional().nullable();

export const servingNoticeSchema = z.object({
  serving_notice_skill: z.string().optional(),
  serving_notice_english_communication: z.string().optional(),
  current_working_company: z.string().optional(),
  last_working_day: z.string().optional(),
  fit_target_company: z.string().optional(),
  fit_target_process: z.string().optional(),
  reminder_job_available: z.string().optional(),
}).optional().nullable();

export const coolingPeriodSchema = z.object({
  rejected_company_name: z.string().optional(),
  rejection_round: z.string().optional(),
  rejection_date: z.string().optional(),
  cooling_period_duration: z.string().optional(),
}).optional().nullable();

export const otherRecruiterSchema = z.object({
  assigned_other_recruiter: z.string().optional(),
  other_recruiter_notes: z.string().optional(),
}).optional().nullable();

export const callDisconnectedSchema = z.object({
  call_duration_seconds: z.number().nullable().optional(),
  call_disconnected_judge_communication: z.string().optional(),
  call_disconnected_english_communication: z.string().optional(),
  call_disconnected_fit_domestic_or_non_voice: z.string().optional(),
  call_disconnected_send_details_for_callback: z.string().optional(),
}).optional().nullable();

export const lineupScheduledSchema = z.object({
  lineup_skill_role: z.string().optional(),
  lineup_skill: z.string().optional(),
  lineup_english_communication: z.string().optional(),
  mother_tongue: z.string().optional(),
  knowledge_of_hindi: z.string().optional(),
  date_of_birth_lineup: z.string().optional(),
  bpo_experience: z.string().optional(),
  total_companies_worked: z.number().optional(),
  last_monthly_salary: z.number().nullable().optional(),
  expected_monthly_salary: z.number().nullable().optional(),
  current_address_pincode: z.string().optional(),
  address_area: z.string().optional(),
  companies: z.array(companyEntrySchema).optional(),
}).optional().nullable();

// ------------------------------------------------------------
// Master Candidate Intake Schema
// ------------------------------------------------------------

export const candidateIntakeSchema = z.object({
  personal: personalInformationSchema,
  contact: contactInformationSchema,
  address: addressInformationSchema,
  education: educationHistorySchema,
  professional_profile: professionalProfileSchema,
  employment_history: employmentHistorySchema,
  job_preferences: jobPreferencesSchema,
  salary: salaryInformationSchema,
  availability: availabilityInformationSchema,
  dnd_status: z.enum(["Activate", "Deactivate"]),
  call_disposition: z.string().min(1, "Call disposition required"),

  poor_communication_assessment: poorCommunicationSchema.optional(),
  non_hiring_zone_details: nonHiringZoneSchema.optional(),
  not_interested_details: notInterestedSchema.optional(),
  high_salary_assessment: highSalarySchema.optional(),
  age_limit_details: ageLimitSchema.optional(),
  career_gap_details: careerGapSchema.optional(),
  no_company_details: noCompanySchema.optional(),
  other_domain_experience_details: otherDomainSchema.optional(),
  busy_call_me_back_details: busyCallBackSchema.optional(),
  work_from_home_details: wfhSchema.optional(),
  outstation_candidate_details: outstationSchema.optional(),
  shift_issues_details: shiftIssuesSchema.optional(),
  non_hiring_university_details: nonHiringUniversitySchema.optional(),
  serving_notice_details: servingNoticeSchema.optional(),
  cooling_period_details: coolingPeriodSchema.optional(),
  other_recruiter_details: otherRecruiterSchema.optional(),
  call_disconnected_details: callDisconnectedSchema.optional(),
  lineup_scheduled_details: lineupScheduledSchema.optional(),
});

export type CandidateIntakeSchema = z.infer<typeof candidateIntakeSchema>;

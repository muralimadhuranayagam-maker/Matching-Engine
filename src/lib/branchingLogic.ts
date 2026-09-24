// ============================================================
// Pure branching logic — NO React/MUI/date-fns dependencies
// Safe to import in Node/Vitest without DOM setup
// ============================================================

import { DISPOSITION_RULES } from "../config/dispositions";
import type { CandidateIntakeFormPayload } from "../types/candidate";

export type FormValues = Record<string, any>;

export function shouldShowLineup(values: FormValues): boolean {
  const d = values["call_disposition"] as string | undefined;
  if (!d) return false;
  const rule = DISPOSITION_RULES[d as keyof typeof DISPOSITION_RULES];
  if (!rule) return false;

  switch (rule.lineupCondition) {
    case "always":
      return true;
    case "never":
      return false;
    case "poor_comm_fit": {
      const assess = values["poor_communication_assessment"] as Record<string, string> | undefined;
      const fit = assess?.fit_domestic_or_non_voice;
      return fit === "Domestic (Voice)" || fit === "Non-Voice";
    }
    case "non_hiring_zone": {
      const nhz = values["non_hiring_zone_details"] as Record<string, string> | undefined;
      return nhz?.stay_type === "PG" && nhz?.will_relocate === "Yes";
    }
    case "other_domain": {
      const ode = values["other_domain_experience_details"] as Record<string, string> | undefined;
      return ode?.interested_in_bpo_job === "Yes";
    }
    case "wfh_flexible": {
      const wfh = values["work_from_home_details"] as Record<string, string> | undefined;
      return wfh?.flexible_to_work_from_office === "Yes";
    }
    case "shift_go_lineup": {
      const si = values["shift_issues_details"] as Record<string, string> | undefined;
      return si?.shift_go_to_lineup === "Yes";
    }
    case "call_disconnected_fit": {
      const cd = values["call_disconnected_details"] as Record<string, string> | undefined;
      if (cd?.call_disconnected_judge_communication !== "Yes") return false;
      const comm = cd?.call_disconnected_english_communication;
      if (!comm) return false;
      const isPoorOrAvg = comm === "Poor" || comm === "Average";
      if (!isPoorOrAvg) return false;
      const fit = cd?.call_disconnected_fit_domestic_or_non_voice;
      return fit === "Domestic (Voice)" || fit === "Non-Voice";
    }
    default:
      return false;
  }
}

export function buildPayload(
  values: FormValues,
  isSubmitted = true
): CandidateIntakeFormPayload {
  const d = values["call_disposition"] as string;
  const rule = DISPOSITION_RULES[d as keyof typeof DISPOSITION_RULES];

  // Derive age if date_of_birth is available
  let age: number | null = null;
  const dobStr = values.personal?.date_of_birth;
  if (dobStr && typeof dobStr === "string" && /^\d{2}-\d{2}-\d{4}$/.test(dobStr)) {
    const [day, month, year] = dobStr.split("-").map(Number);
    const dob = new Date(year, month - 1, day);
    const today = new Date();
    let computedAge = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      computedAge--;
    }
    age = Math.max(0, computedAge);
  }

  const payload: Record<string, any> = {
    personal: {
      first_name: values.personal?.first_name ?? "",
      last_name: values.personal?.last_name ?? "",
      gender: values.personal?.gender ?? "Male",
      date_of_birth: values.personal?.date_of_birth ?? "",
      age: values.personal?.age ?? age,
      marital_status: values.personal?.marital_status ?? "Single",
      mother_tongue: values.personal?.mother_tongue ?? "",
      knowledge_of_hindi: values.personal?.knowledge_of_hindi ?? "Good - I may have some difficulty understanding certain Hindi accents",
    },
    contact: {
      phone: values.contact?.phone ?? "",
      email: values.contact?.email ?? "",
    },
    address: {
      current: {
        address_line: values.address?.current?.address_line ?? "",
        pincode: values.address?.current?.pincode ?? "",
        area: values.address?.current?.area ?? "",
        city: values.address?.current?.city ?? "",
        state: values.address?.current?.state ?? "",
      },
      permanent: {
        address_line: values.address?.permanent?.address_line ?? "",
        pincode: values.address?.permanent?.pincode ?? "",
        area: values.address?.permanent?.area ?? "",
        city: values.address?.permanent?.city ?? "",
        state: values.address?.permanent?.state ?? "",
      },
    },
    education: {
      tenth: {
        school_name: values.education?.tenth?.school_name ?? "",
        status: values.education?.tenth?.status ?? "Regular",
        passing_year: values.education?.tenth?.passing_year ?? "",
        percentage: values.education?.tenth?.percentage ?? null,
        gap_reason: values.education?.tenth?.gap_reason ?? "",
      },
      twelfth: {
        school_or_college_name: values.education?.twelfth?.school_or_college_name ?? "",
        status: values.education?.twelfth?.status ?? "Regular",
        passing_year: values.education?.twelfth?.passing_year ?? "",
        percentage: values.education?.twelfth?.percentage ?? null,
        gap_reason: values.education?.twelfth?.gap_reason ?? "",
      },
      diploma: {
        institution_name: values.education?.diploma?.institution_name ?? "",
        status: values.education?.diploma?.status ?? "Regular",
        diploma_type: values.education?.diploma?.diploma_type ?? "",
        passing_year: values.education?.diploma?.passing_year ?? "",
        percentage: values.education?.diploma?.percentage ?? null,
        gap_reason: values.education?.diploma?.gap_reason ?? "",
      },
      graduation: {
        college_name: values.education?.graduation?.college_name ?? "",
        university_name: values.education?.graduation?.university_name ?? "",
        degree: values.education?.graduation?.degree ?? "",
        status: values.education?.graduation?.status ?? "Regular",
        passing_year: values.education?.graduation?.passing_year ?? "",
        percentage: values.education?.graduation?.percentage ?? null,
        cgpa: values.education?.graduation?.cgpa ?? null,
        gap_reason: values.education?.graduation?.gap_reason ?? "",
      },
    },
    professional_profile: {
      work_status: values.professional_profile?.work_status ?? "FRESHER",
      total_experience_years: values.professional_profile?.total_experience_years ?? 0,
      total_experience_months: values.professional_profile?.total_experience_months ?? 0,
      total_companies: values.professional_profile?.total_companies ?? 0,
      skill_role: values.professional_profile?.skill_role ?? "",
      skill: Array.isArray(values.professional_profile?.skill)
        ? values.professional_profile.skill.join(", ")
        : (values.professional_profile?.skill ?? ""),
      industry: values.professional_profile?.industry ?? "",
      english_communication: values.professional_profile?.english_communication ?? "Good",
    },
    employment_history: {
      current: {
        company_name: values.employment_history?.current?.company_name || values.employment_history?.previous_companies?.[0]?.company_name || "",
        role: values.employment_history?.current?.role || values.employment_history?.previous_companies?.[0]?.role || "",
        process_name: values.employment_history?.current?.process_name || values.employment_history?.previous_companies?.[0]?.process_name || "",
        skill: values.employment_history?.current?.skill || values.employment_history?.previous_companies?.[0]?.skill || "",
        joining_date: values.employment_history?.current?.joining_date || values.employment_history?.previous_companies?.[0]?.start_date || "",
        last_working_day: values.employment_history?.current?.last_working_day || values.employment_history?.previous_companies?.[0]?.end_date || "",
        monthly_salary: values.employment_history?.current?.monthly_salary ?? values.employment_history?.previous_companies?.[0]?.last_salary ?? null,
        notice_period: values.employment_history?.current?.notice_period || values.availability?.notice_period || "",
        reason_for_leaving: values.employment_history?.current?.reason_for_leaving || values.employment_history?.previous_companies?.[0]?.reason_for_leaving || "",
      },
      previous_companies: values.employment_history?.previous_companies ?? [],
    },
    job_preferences: {
      job_city: values.job_preferences?.job_city ?? "",
      preferred_area: values.job_preferences?.preferred_area ?? "",
      shift_base: values.job_preferences?.shift_base ?? "Any shift",
      work_from_home: values.job_preferences?.work_from_home ?? false,
      expected_salary_monthly: values.job_preferences?.expected_salary_monthly ?? null,
    },
    salary: {
      current_monthly_salary: values.salary?.current_monthly_salary ?? null,
      expected_monthly_salary: values.salary?.expected_monthly_salary ?? null,
    },
    availability: {
      last_working_day: values.availability?.last_working_day ?? "",
      notice_period: values.availability?.notice_period ?? "",
      available_from: values.availability?.available_from ?? "",
    },
    dnd_status: values.dnd_status ?? "Deactivate",
    call_disposition: d,
    is_submitted: isSubmitted,
  };

  // Add the active disposition branch object
  if (rule?.branchKey) {
    const branchVal = values[rule.branchKey];
    if (branchVal !== undefined) {
      payload[rule.branchKey] = branchVal;
    }
  }

  // Populate lineup_scheduled_details if condition is met
  if (shouldShowLineup(values)) {
    const lsd = values["lineup_scheduled_details"] ?? {};
    payload["lineup_scheduled_details"] = {
      lineup_skill_role: lsd.lineup_skill_role || values.professional_profile?.skill_role || "",
      lineup_skill: lsd.lineup_skill || (
        Array.isArray(values.professional_profile?.skill)
          ? values.professional_profile.skill.join(", ")
          : (values.professional_profile?.skill || "")
      ),
      lineup_english_communication: lsd.lineup_english_communication || values.professional_profile?.english_communication || "Good",
      mother_tongue: lsd.mother_tongue || values.personal?.mother_tongue || "",
      knowledge_of_hindi: lsd.knowledge_of_hindi || values.personal?.knowledge_of_hindi || "Good - I may have some difficulty understanding certain Hindi accents",
      date_of_birth_lineup: lsd.date_of_birth_lineup || values.personal?.date_of_birth || "",
      bpo_experience: lsd.bpo_experience || values.professional_profile?.work_status || "FRESHER",
      total_companies_worked: lsd.total_companies_worked ?? values.professional_profile?.total_companies ?? 0,
      last_monthly_salary: lsd.last_monthly_salary ?? values.salary?.current_monthly_salary ?? 0,
      expected_monthly_salary: lsd.expected_monthly_salary ?? values.salary?.expected_monthly_salary ?? 0,
      current_address_pincode: lsd.current_address_pincode || values.address?.current?.pincode || "",
      address_area: lsd.address_area || values.address?.current?.area || "",
      companies: values.employment_history?.previous_companies ?? [],
    };
  }

  return payload as unknown as CandidateIntakeFormPayload;
}

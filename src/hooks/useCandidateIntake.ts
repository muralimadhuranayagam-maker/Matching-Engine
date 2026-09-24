// ============================================================
// useCandidateIntake – central hook for form state + submission
// ============================================================

import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { candidateIntakeSchema, type CandidateIntakeSchema } from "../schemas/candidateIntakeSchema";
import { candidateService } from "../services/candidateService";
import type { CandidateIntakeFormPayload } from "../types/candidate";
import { ALL_BRANCH_KEYS } from "../config/dispositions";
import { buildPayload } from "../lib/branchingLogic";

// Re-export pure functions so components can import from one place
export { shouldShowLineup, buildPayload } from "../lib/branchingLogic";

const DRAFT_KEY = "candidate_intake_draft";

function loadDraft(): Partial<CandidateIntakeSchema> {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDraft(values: Partial<CandidateIntakeSchema>) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {
    // ignore quota errors
  }
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

export function useCandidateIntake() {
  const draft = loadDraft();

  const form = useForm<CandidateIntakeSchema>({
    resolver: zodResolver(candidateIntakeSchema),
    defaultValues: {
      personal: {
        first_name: "",
        last_name: "",
        gender: "Male",
        date_of_birth: "",
        age: null,
        marital_status: "Single",
        mother_tongue: "",
        knowledge_of_hindi: "Good - I may have some difficulty understanding certain Hindi accents",
        ...(draft.personal ?? {}),
      },
      contact: {
        phone: "",
        email: "",
        ...(draft.contact ?? {}),
      },
      address: {
        current: {
          address_line: "",
          pincode: "",
          area: "",
          city: "",
          state: "",
          ...(draft.address?.current ?? {}),
        },
        permanent: {
          address_line: "",
          pincode: "",
          area: "",
          city: "",
          state: "",
          ...(draft.address?.permanent ?? {}),
        },
      },
      education: {
        tenth: { school_name: "", status: "State Board", passing_year: "", percentage: null, gap_reason: "", ...(draft.education?.tenth ?? {}) },
        twelfth: { school_or_college_name: "", status: "State Board", passing_year: "", percentage: null, gap_reason: "", ...(draft.education?.twelfth ?? {}) },
        diploma: { institution_name: "", status: "Regular", diploma_type: "", passing_year: "", percentage: null, gap_reason: "", ...(draft.education?.diploma ?? {}) },
        graduation: {
          college_name: "",
          university_name: "",
          degree: "",
          status: "UG",
          passing_year: "",
          percentage: null,
          cgpa: null,
          gap_reason: "",
          undergraduation: {
            college_name: "",
            university_name: "",
            degree: "",
            passing_year: "",
            percentage: null,
            cgpa: null,
            gap_reason: "",
            ...(draft.education?.graduation?.undergraduation ?? {}),
          },
          ...(draft.education?.graduation ?? {}),
        },
      },
      professional_profile: {
        work_status: "FRESHER",
        total_experience_years: 0,
        total_experience_months: 0,
        total_companies: 0,
        skill_role: "",
        skill: "",
        industry: "BPO/Call Center",
        english_communication: "Good",
        ...(draft.professional_profile ?? {}),
      },
      employment_history: {
        current: { company_name: "", role: "", process_name: "", skill: "", joining_date: "", last_working_day: "", monthly_salary: null, notice_period: "", reason_for_leaving: "", ...(draft.employment_history?.current ?? {}) },
        previous_companies: draft.employment_history?.previous_companies ?? [],
      },
      job_preferences: {
        job_city: "",
        preferred_area: "",
        shift_base: "Any shift",
        work_from_home: false,
        expected_salary_monthly: null,
        ...(draft.job_preferences ?? {}),
      },
      salary: {
        current_monthly_salary: null,
        expected_monthly_salary: null,
        ...(draft.salary ?? {}),
      },
      availability: {
        last_working_day: "",
        notice_period: "",
        available_from: "",
        ...(draft.availability ?? {}),
      },
      dnd_status: "Deactivate",
      call_disposition: "",
      lineup_scheduled_details: {
        companies: [],
        total_companies_worked: 0,
        last_monthly_salary: 0,
        expected_monthly_salary: 0,
        current_address_pincode: "",
        address_area: "",
        lineup_skill_role: "",
        lineup_skill: "",
        lineup_english_communication: "Good",
        mother_tongue: "",
        knowledge_of_hindi: "Good - I may have some difficulty understanding certain Hindi accents",
        date_of_birth_lineup: "",
        bpo_experience: "FRESHER",
        ...(draft.lineup_scheduled_details ?? {}),
      },
      ...draft,
    },
    mode: "onTouched",
  });

  const persistDraft = () => saveDraft(form.getValues());

  const mutation = useMutation({
    mutationFn: (payload: CandidateIntakeFormPayload) =>
      candidateService.createCandidate(payload),
    onSuccess: () => {
      clearDraft();
    },
  });

  const submitForm = form.handleSubmit((values) => {
    const payload = buildPayload(values);
    mutation.mutate(payload);
  });

  return {
    form,
    submitForm,
    mutation,
    persistDraft,
    ALL_BRANCH_KEYS,
  };
}

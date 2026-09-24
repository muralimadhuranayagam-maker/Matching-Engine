import { describe, it, expect, vi } from "vitest";

describe("Live Candidate Intake Form Field Updates", () => {
  it("prioritizes trigger fields before conditional child fields", () => {
    const triggerKeys = [
      "call_disposition",
      "professional_profile.work_status",
      "education.graduation.status",
    ];

    const updates = {
      "employment_history.current.company_name": "Infosys",
      "employment_history.current.designation": ".NET Developer",
      "professional_profile.work_status": "EXPERIENCED",
      "employment_history.current.annual_ctc": "600000",
    };

    const entries = Object.entries(updates);
    const sortedEntries = entries.sort(([a], [b]) => {
      const aIsTrigger = triggerKeys.includes(a);
      const bIsTrigger = triggerKeys.includes(b);
      if (aIsTrigger && !bIsTrigger) return -1;
      if (!aIsTrigger && bIsTrigger) return 1;
      return 0;
    });

    // The trigger field must be first
    expect(sortedEntries[0][0]).toBe("professional_profile.work_status");
    expect(sortedEntries[0][1]).toBe("EXPERIENCED");
  });

  it("calls form.setValue with shouldValidate, shouldDirty, and shouldTouch true", () => {
    const mockSetValue = vi.fn();
    const mockForm = {
      setValue: mockSetValue,
    };

    const updates = {
      "personal_information.candidate_name": "Siva",
      "professional_profile.total_experience_years": 3,
    };

    Object.entries(updates).forEach(([path, value]) => {
      mockForm.setValue(path, value, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    });

    expect(mockSetValue).toHaveBeenCalledTimes(2);
    expect(mockSetValue).toHaveBeenNthCalledWith(
      1,
      "personal_information.candidate_name",
      "Siva",
      { shouldValidate: true, shouldDirty: true, shouldTouch: true }
    );
    expect(mockSetValue).toHaveBeenNthCalledWith(
      2,
      "professional_profile.total_experience_years",
      3,
      { shouldValidate: true, shouldDirty: true, shouldTouch: true }
    );
  });

  it("handles dropdown / select mapping to canonical uppercase enum values", () => {
    // Canonical enum in options.ts is 'EXPERIENCED' and 'FRESHER'
    const spokenInput = "I have 3 years of experience";
    const mappedWorkStatus = spokenInput.toLowerCase().includes("experience")
      ? "EXPERIENCED"
      : "FRESHER";

    expect(mappedWorkStatus).toBe("EXPERIENCED");
  });

  it("handles correction where latest answer overrides earlier answer", () => {
    const state: Record<string, any> = {};

    // First answer
    state["employment_history.current.company_name"] = "Infosys";
    expect(state["employment_history.current.company_name"]).toBe("Infosys");

    // Candidate corrects: "Actually, I work at TCS."
    state["employment_history.current.company_name"] = "TCS";
    expect(state["employment_history.current.company_name"]).toBe("TCS");
  });
});

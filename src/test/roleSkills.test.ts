import { describe, it, expect } from "vitest";
import { getSkillsForRole, ROLE_SKILLS_MAP } from "../config/options";
import { primarySkillSchema } from "../schemas/candidateIntakeSchema";
import { buildPayload } from "../lib/branchingLogic";

describe("Dynamic Role-Based Skills & Multi-Select", () => {
  it("returns software engineering skills when 'Software Engineer' is selected", () => {
    const skills = getSkillsForRole("Software Engineer");
    expect(skills).toContain("C#");
    expect(skills).toContain("ASP.NET Core");
    expect(skills).toContain("MySQL");
    expect(skills).toContain("React");
    expect(skills).toContain("Angular");
    expect(skills.length).toBeGreaterThan(15);
  });

  it("returns customer support skills when 'Customer Support Associate' is selected", () => {
    const skills = getSkillsForRole("Customer Support Associate");
    expect(skills).toContain("Voice Process - Domestic");
    expect(skills).toContain("Live Chat Support");
    expect(skills).toContain("Customer Retention & Loyalty");
  });

  it("handles case-insensitive and heuristic role queries", () => {
    const skillsLower = getSkillsForRole("software engineer");
    expect(skillsLower).toEqual(ROLE_SKILLS_MAP["Software Engineer"]);

    const skillsDev = getSkillsForRole("Full Stack Developer");
    expect(skillsDev).toEqual(ROLE_SKILLS_MAP["Software Engineer"]);

    const skillsTech = getSkillsForRole("IT Support Tech");
    expect(skillsTech).toEqual(ROLE_SKILLS_MAP["Technical Support Executive"]);
  });

  it("returns fallback skills when role is empty or unknown", () => {
    const emptySkills = getSkillsForRole("");
    expect(emptySkills.length).toBeGreaterThan(0);

    const unknownSkills = getSkillsForRole("Astronaut");
    expect(unknownSkills).toEqual(ROLE_SKILLS_MAP["Other"]);
  });

  describe("Primary Skill Zod Schema Validation", () => {
    it("validates when a non-empty array of skills is provided", () => {
      const result = primarySkillSchema.safeParse(["C#", "ASP.NET Core", "MySQL"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(["C#", "ASP.NET Core", "MySQL"]);
      }
    });

    it("validates when a single string skill is provided", () => {
      const result = primarySkillSchema.safeParse("React, Angular");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("React, Angular");
      }
    });

    it("fails validation with 'Primary Skill required' when array is empty", () => {
      const result = primarySkillSchema.safeParse([]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Primary Skill required");
      }
    });

    it("fails validation with 'Primary Skill required' when string is empty", () => {
      const result = primarySkillSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Primary Skill required");
      }
    });
  });

  describe("buildPayload Skill Formatting", () => {
    it("joins array of skills into clean comma-separated string in payload", () => {
      const formValues: any = {
        personal: { first_name: "John", last_name: "Doe" },
        contact: { phone: "9876543210" },
        address: { current: { city: "Ahmedabad" } },
        education: { tenth: { status: "CBSE" }, twelfth: { status: "CBSE" }, diploma: { status: "Regular" }, graduation: { status: "UG" } },
        professional_profile: {
          work_status: "EXPERIENCED",
          total_experience_years: 4,
          total_experience_months: 2,
          total_companies: 2,
          skill_role: "Software Engineer",
          skill: ["C#", "ASP.NET Core", "MySQL", "React", "Angular"],
          industry: "IT/Software",
          english_communication: "Good"
        },
        employment_history: { current: {}, previous_companies: [] },
        job_preferences: { job_city: "Ahmedabad", shift_base: "Any shift" },
        salary: { current_monthly_salary: 50000, expected_monthly_salary: 65000 },
        availability: {},
        call_outcome: { call_disposition: "Busy, Call me Back" }
      };

      const payload = buildPayload(formValues);
      expect(payload.professional_profile.skill).toBe("C#, ASP.NET Core, MySQL, React, Angular");
    });
  });
});

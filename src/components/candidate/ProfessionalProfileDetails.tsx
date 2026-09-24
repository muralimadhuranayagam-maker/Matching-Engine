import { useMemo, useEffect, useRef } from "react";
import { Grid, Typography, FormControlLabel, Checkbox, Box } from "@mui/material";
import { Controller, useWatch, useFormContext, type Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";
import { TextInput, SelectField, NumberInput, AutocompleteField, MultiAutocompleteField, FormCard } from "./FormHelpers";
import {
  WORK_STATUS_OPTIONS,
  ENGLISH_COMMUNICATION_OPTIONS,
  SHIFT_BASE_OPTIONS,
  DND_STATUS_OPTIONS,
  SKILL_ROLE_OPTIONS,
  getSkillsForRole
} from "../../config/options";

interface Props {
  control: Control<CandidateIntakeSchema>;
  setValue?: any;
}

const INDUSTRY_OPTIONS = [
  "BPO/Call Center", "IT/Software", "Banking/Finance", "Healthcare",
  "Retail", "Manufacturing", "Hospitality", "Education", "Logistics",
  "Real Estate", "Media/Entertainment", "Telecom", "Government", "Other"
];

const CITY_OPTIONS = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Gurugram", "Noida", "Jaipur", "Lucknow", "Chandigarh", "Other"
];

export function ProfessionalProfileDetails({ control, setValue: propSetValue }: Props) {
  const formContext = useFormContext<CandidateIntakeSchema>();
  const effectiveSetValue = propSetValue || formContext?.setValue;

  const workStatus = useWatch({ control, name: "professional_profile.work_status" });
  const totalCompanies = useWatch({ control, name: "professional_profile.total_companies" });
  const selectedRole = useWatch({ control, name: "professional_profile.skill_role" });
  const isExperienced = workStatus === "EXPERIENCED";

  // When user switches work_status dropdown explicitly
  const prevWorkStatusRef = useRef(workStatus);
  useEffect(() => {
    if (prevWorkStatusRef.current !== workStatus) {
      if (workStatus === "FRESHER" && typeof totalCompanies === "number" && totalCompanies > 0) {
        effectiveSetValue?.("professional_profile.total_companies", 0, { shouldDirty: true });
      } else if (workStatus === "EXPERIENCED" && (!totalCompanies || totalCompanies === 0)) {
        effectiveSetValue?.("professional_profile.total_companies", 1, { shouldDirty: true });
      }
      prevWorkStatusRef.current = workStatus;
    }
  }, [workStatus, totalCompanies, effectiveSetValue]);

  // When user sets total_companies > 0, automatically switch work_status to EXPERIENCED
  useEffect(() => {
    if (typeof totalCompanies === "number" && totalCompanies > 0 && workStatus === "FRESHER") {
      effectiveSetValue?.("professional_profile.work_status", "EXPERIENCED", { shouldDirty: true });
    }
  }, [totalCompanies, workStatus, effectiveSetValue]);

  // Dynamically compute skills list based on the chosen role
  const availableSkills = useMemo(() => {
    return getSkillsForRole(selectedRole);
  }, [selectedRole]);

  return (
    <FormCard title="Professional Profile & Job Preferences" subtitle="Specify work experience, core skills, communication proficiency, and job requirements">
      <Grid container spacing={2.5}>
        {/* Experience Summary */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>Work Experience Summary</Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="professional_profile.work_status" control={control} label="Work Status" options={WORK_STATUS_OPTIONS} required />
        </Grid>

        {isExperienced && (
          <>
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberInput name="professional_profile.total_experience_years" control={control} label="Total Experience (Years)" min={0} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberInput name="professional_profile.total_experience_months" control={control} label="Total Experience (Months)" min={0} />
            </Grid>
          </>
        )}

        <Grid size={{ xs: 12, sm: isExperienced ? 12 : 8 }}>
          <NumberInput
            name="professional_profile.total_companies"
            control={control}
            label="Total Companies Worked"
            required
            min={0}
            helperText={
              typeof totalCompanies === "number" && totalCompanies > 0
                ? `Dynamically opens ${totalCompanies} company ${totalCompanies === 1 ? "box" : "boxes"} in Employment History below`
                : "Enter number of companies worked (e.g. 2 or 3)"
            }
          />
        </Grid>

        {/* Skills & Industry */}
        <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>Skills & Domain</Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="professional_profile.english_communication" control={control} label="English Communication" options={ENGLISH_COMMUNICATION_OPTIONS} required />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteField
            name="professional_profile.skill_role"
            control={control}
            label="Skill / Role"
            options={SKILL_ROLE_OPTIONS}
            required
            freeSolo
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <MultiAutocompleteField
            name="professional_profile.skill"
            control={control}
            label="Primary Skill"
            options={availableSkills}
            required
            freeSolo
            placeholder="Select from role skills or type custom..."
            helperText={selectedRole ? `Skills tailored for "${selectedRole}". Multi-select or type custom skills.` : "Select a role above to filter skills or type your own"}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="professional_profile.industry" control={control} label="Industry Domain" options={INDUSTRY_OPTIONS} required />
        </Grid>

        {/* Job Preferences */}
        <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>Job & Shift Preferences</Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteField name="job_preferences.job_city" control={control} label="Preferred Job City" options={CITY_OPTIONS} required freeSolo />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="job_preferences.preferred_area" control={control} label="Preferred Specific Area / Locality" placeholder="e.g. Whitefield, HSR Layout, BKC" />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="job_preferences.shift_base" control={control} label="Shift Preference" options={SHIFT_BASE_OPTIONS} required />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="dnd_status" control={control} label="DND Status" options={DND_STATUS_OPTIONS} required />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberInput name="job_preferences.expected_salary_monthly" control={control} label="Expected Monthly Salary (₹)" min={0} />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Box sx={{ pt: 1 }}>
            <Controller
              name="job_preferences.work_from_home"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Interested in Work From Home (WFH)</Typography>}
                />
              )}
            />
          </Box>
        </Grid>
      </Grid>
    </FormCard>
  );
}

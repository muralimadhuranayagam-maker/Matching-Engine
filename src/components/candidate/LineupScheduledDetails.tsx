import { Grid, Divider } from "@mui/material";
import { Controller, type Control } from "react-hook-form";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { parse, format, isValid } from "date-fns";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";
import { TextInput, SelectField, NumberInput, AutocompleteField, FormCard } from "./FormHelpers";
import { CompanyExperienceList } from "./CompanyExperienceList";
import {
  ENGLISH_COMMUNICATION_OPTIONS, KNOWLEDGE_OF_HINDI_OPTIONS, BPO_EXPERIENCE_OPTIONS
} from "../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }

const CITY_OPTIONS = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune",
  "Ahmedabad", "Jaipur", "Lucknow", "Noida", "Gurugram", "Navi Mumbai", "Thane",
];

export function LineupScheduledDetails({ control }: Props) {
  return (
    <FormCard title="Line Up Scheduled Details" subtitle="Review & confirm candidate information required for interview lineup">
      <Grid container spacing={2.5}>
        {/* Role & Skill */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="lineup_scheduled_details.lineup_skill_role" control={control} label="Skill / Role" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="lineup_scheduled_details.lineup_skill" control={control} label="Primary Skill" required />
        </Grid>

        {/* Communication & Personal */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="lineup_scheduled_details.lineup_english_communication" control={control} label="English Communication" options={ENGLISH_COMMUNICATION_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="lineup_scheduled_details.mother_tongue" control={control} label="Mother Tongue" required placeholder="e.g. Tamil, Telugu, Hindi" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <SelectField name="lineup_scheduled_details.knowledge_of_hindi" control={control} label="Knowledge of Hindi" options={KNOWLEDGE_OF_HINDI_OPTIONS} required />
        </Grid>

        {/* DOB & Experience */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="lineup_scheduled_details.date_of_birth_lineup"
            control={control}
            render={({ field, fieldState }) => {
              let val: Date | null = null;
              if (field.value) { const p = parse(field.value, "dd-MM-yyyy", new Date()); val = isValid(p) ? p : null; }
              return (
                <DatePicker label="Date of Birth *" value={val}
                  onChange={(d) => field.onChange(d && isValid(d) ? format(d, "dd-MM-yyyy") : "")}
                  format="dd/MM/yyyy"
                  slotProps={{ textField: { fullWidth: true, error: !!fieldState.error, helperText: fieldState.error?.message, inputRef: field.ref, onBlur: field.onBlur } }}
                />
              );
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="lineup_scheduled_details.bpo_experience" control={control} label="BPO Experience" options={BPO_EXPERIENCE_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <NumberInput name="lineup_scheduled_details.total_companies_worked" control={control} label="Total Companies Worked" required min={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <NumberInput name="lineup_scheduled_details.last_monthly_salary" control={control} label="Last Monthly Salary (₹)" required min={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <NumberInput name="lineup_scheduled_details.expected_monthly_salary" control={control} label="Expected Monthly Salary (₹)" required min={0} />
        </Grid>

        {/* Address */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="lineup_scheduled_details.current_address_pincode" control={control} label="Current Address Pincode" required inputProps={{ maxLength: 6, inputMode: "numeric" }} helperText="6-digit pincode" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteField name="lineup_scheduled_details.address_area" control={control} label="Address Area" options={CITY_OPTIONS} required freeSolo />
        </Grid>

        {/* Reusable Master Employment Companies */}
        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 1 }} />
          <CompanyExperienceList control={control} namePath="employment_history.previous_companies" />
        </Grid>
      </Grid>
    </FormCard>
  );
}

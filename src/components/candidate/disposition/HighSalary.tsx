import { Grid } from "@mui/material";
import { useWatch, type Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { NumberInput, YesNoRadio, SelectField, TextInput, FormCard } from "../FormHelpers";
import { PAYING_PROCESS_NAMES, REMINDER_ACTIVE_PROCESS_OPTIONS } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }

export function HighSalary({ control }: Props) {
  const hasPayingCompany = useWatch({ control, name: "high_salary_assessment.has_paying_company" });
  return (
    <FormCard title="High Salary Assessment" subtitle="Evaluate salary expectations and matching">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberInput name="high_salary_assessment.expected_salary_monthly" control={control} label="Expected Monthly Salary (₹)" required min={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <YesNoRadio name="high_salary_assessment.communication_matches_salary" control={control} label="Communication Matches Salary?" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <YesNoRadio name="high_salary_assessment.experience_matches_salary" control={control} label="Experience Matches Salary?" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <YesNoRadio name="high_salary_assessment.has_paying_company" control={control} label="Has a Company Paying This Salary?" required />
        </Grid>
        {hasPayingCompany === "Yes" && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextInput name="high_salary_assessment.paying_company_name" control={control} label="Paying Company Name" required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectField name="high_salary_assessment.paying_process_name" control={control} label="Paying Process Name" options={PAYING_PROCESS_NAMES} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectField name="high_salary_assessment.reminder_active_process" control={control} label="Reminder – Active Process" options={REMINDER_ACTIVE_PROCESS_OPTIONS} required />
            </Grid>
          </>
        )}
      </Grid>
    </FormCard>
  );
}

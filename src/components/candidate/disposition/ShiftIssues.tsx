import { Grid } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { SelectField, YesNoRadio, FormCard } from "../FormHelpers";
import { SHIFT_BASE_OPTIONS, SHIFT_PREFERENCE_REASONS } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }
export function ShiftIssues({ control }: Props) {
  return (
    <FormCard title="Shift Issues Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="shift_issues_details.preferred_shift_choice" control={control} label="Preferred Shift" options={SHIFT_BASE_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="shift_issues_details.shift_preference_reason" control={control} label="Shift Preference Reason" options={SHIFT_PREFERENCE_REASONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <YesNoRadio name="shift_issues_details.shift_go_to_lineup" control={control} label="Proceed to Line Up?" required />
        </Grid>
      </Grid>
    </FormCard>
  );
}

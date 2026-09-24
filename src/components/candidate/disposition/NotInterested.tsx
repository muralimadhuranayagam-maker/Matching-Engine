import { Grid } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { SelectField, FormCard } from "../FormHelpers";
import { NOT_INTERESTED_REASONS } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }

export function NotInterested({ control }: Props) {
  return (
    <FormCard title="Not Interested Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <SelectField name="not_interested_details.not_interested_reason" control={control} label="Reason for Not Being Interested" options={NOT_INTERESTED_REASONS} required />
        </Grid>
      </Grid>
    </FormCard>
  );
}

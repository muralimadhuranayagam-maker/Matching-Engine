import { Grid } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { SelectField, FormCard } from "../FormHelpers";
import { NO_COMPANY_REASONS } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }
export function NoCompany({ control }: Props) {
  return (
    <FormCard title="No Company Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <SelectField name="no_company_details.no_company_reason" control={control} label="Reason (No Company)" options={NO_COMPANY_REASONS} required />
        </Grid>
      </Grid>
    </FormCard>
  );
}

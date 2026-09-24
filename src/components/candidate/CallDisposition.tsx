import { Grid, Alert } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";
import { AutocompleteField, FormCard } from "./FormHelpers";
import { CALL_DISPOSITION_OPTIONS } from "../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }

export function CallDisposition({ control }: Props) {
  return (
    <FormCard title="Call Disposition" subtitle="Select the outcome of this recruitment call">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12 }}>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            After selecting a disposition, only the relevant fields will be displayed below.
          </Alert>
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <AutocompleteField
            name="call_disposition"
            control={control}
            label="Call Disposition"
            options={CALL_DISPOSITION_OPTIONS}
            required
          />
        </Grid>
      </Grid>
    </FormCard>
  );
}

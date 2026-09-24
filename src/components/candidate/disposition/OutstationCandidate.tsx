import { Grid } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { TextInput, FormCard } from "../FormHelpers";

interface Props { control: Control<CandidateIntakeSchema>; }
export function OutstationCandidate({ control }: Props) {
  return (
    <FormCard title="Outstation Candidate Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="outstation_candidate_details.outstation_address_pincode" control={control} label="Outstation Address Pincode" required inputProps={{ maxLength: 6, inputMode: "numeric" }} helperText="6-digit pincode" />
        </Grid>
      </Grid>
    </FormCard>
  );
}

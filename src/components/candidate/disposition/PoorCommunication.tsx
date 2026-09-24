import { Grid } from "@mui/material";
import { type Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { SelectField, FormCard } from "../FormHelpers";
import { POOR_COMMUNICATION_REASONS, FIT_DOMESTIC_NON_VOICE_OPTIONS } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }

export function PoorCommunication({ control }: Props) {
  return (
    <FormCard title="Poor Communication Assessment" subtitle="Assess the communication issue and routing eligibility">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="poor_communication_assessment.poor_communication_reason" control={control} label="Communication Issue" options={POOR_COMMUNICATION_REASONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="poor_communication_assessment.fit_domestic_or_non_voice" control={control} label="Fit for Domestic / Non-Voice?" options={FIT_DOMESTIC_NON_VOICE_OPTIONS} required />
        </Grid>
      </Grid>
    </FormCard>
  );
}

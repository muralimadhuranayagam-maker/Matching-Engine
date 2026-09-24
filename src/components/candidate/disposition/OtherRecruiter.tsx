import { Grid } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { TextInput, FormCard } from "../FormHelpers";

interface Props { control: Control<CandidateIntakeSchema>; }
export function OtherRecruiter({ control }: Props) {
  return (
    <FormCard title="Other Recruiter Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="other_recruiter_details.assigned_other_recruiter" control={control} label="Assigned Recruiter Name" required />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextInput name="other_recruiter_details.other_recruiter_notes" control={control} label="Notes (Optional)" multiline rows={3} />
        </Grid>
      </Grid>
    </FormCard>
  );
}

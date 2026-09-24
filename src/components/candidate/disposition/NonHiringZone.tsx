import { Grid } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { TextInput, SelectField, YesNoRadio, FormCard } from "../FormHelpers";

interface Props { control: Control<CandidateIntakeSchema>; }

export function NonHiringZone({ control }: Props) {
  return (
    <FormCard title="Non Hiring Zone Details" subtitle="Location and relocation willingness">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="non_hiring_zone_details.candidate_pincode" control={control} label="Candidate Pincode" required inputProps={{ maxLength: 6, inputMode: "numeric" }} helperText="6-digit pincode" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="non_hiring_zone_details.candidate_area" control={control} label="Candidate Area" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="non_hiring_zone_details.no_hiring_zone_company" control={control} label="Company (No Hiring Zone)" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="non_hiring_zone_details.no_hiring_zone_process" control={control} label="Process (No Hiring Zone)" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="non_hiring_zone_details.stay_type" control={control} label="Stay Type" options={["PG", "With Family"]} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <YesNoRadio name="non_hiring_zone_details.will_relocate" control={control} label="Willing to Relocate?" required />
        </Grid>
      </Grid>
    </FormCard>
  );
}

import { Grid } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { TextInput, YesNoRadio, FormCard } from "../FormHelpers";

interface Props { control: Control<CandidateIntakeSchema>; }
export function WorkFromHome({ control }: Props) {
  return (
    <FormCard title="Work From Home Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="work_from_home_details.wfh_address_pincode" control={control} label="WFH Address Pincode" required inputProps={{ maxLength: 6, inputMode: "numeric" }} helperText="6-digit pincode" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <YesNoRadio name="work_from_home_details.flexible_to_work_from_office" control={control} label="Flexible to Work from Office?" required />
        </Grid>
      </Grid>
    </FormCard>
  );
}

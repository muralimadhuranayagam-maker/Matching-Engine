import { Grid } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { SelectField, YesNoRadio, FormCard } from "../FormHelpers";
import { OTHER_DOMAIN_NAMES } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }
export function OtherDomainExperience({ control }: Props) {
  return (
    <FormCard title="Other Domain Experience" subtitle="Assess fit for BPO role">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="other_domain_experience_details.other_domain_name" control={control} label="Other Domain Name" options={OTHER_DOMAIN_NAMES} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <YesNoRadio name="other_domain_experience_details.interested_in_bpo_job" control={control} label="Interested in BPO Job?" required />
        </Grid>
      </Grid>
    </FormCard>
  );
}

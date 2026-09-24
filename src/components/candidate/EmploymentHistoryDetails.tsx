import { Grid } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";
import { FormCard } from "./FormHelpers";
import { CompanyExperienceList } from "./CompanyExperienceList";

interface Props {
  control: Control<CandidateIntakeSchema>;
  setValue?: any;
}

export function EmploymentHistoryDetails({ control, setValue }: Props) {
  return (
    <FormCard
      title="Employment History"
      subtitle="Record details of current employment (if active) and all companies worked"
    >
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12 }}>
          <CompanyExperienceList
            control={control}
            setValue={setValue}
            namePath="employment_history.previous_companies"
          />
        </Grid>
      </Grid>
    </FormCard>
  );
}

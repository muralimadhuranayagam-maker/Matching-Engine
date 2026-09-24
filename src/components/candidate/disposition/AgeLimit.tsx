import { Grid } from "@mui/material";
import { Controller, type Control } from "react-hook-form";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { parse, format, isValid } from "date-fns";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { FormCard } from "../FormHelpers";

interface Props { control: Control<CandidateIntakeSchema>; }

export function AgeLimit({ control }: Props) {
  return (
    <FormCard title="Age Limit Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="age_limit_details.candidate_dob_age_limit"
            control={control}
            render={({ field, fieldState }) => {
              let val: Date | null = null;
              if (field.value) {
                const p = parse(field.value, "dd-MM-yyyy", new Date());
                val = isValid(p) ? p : null;
              }
              return (
                <DatePicker
                  label="Candidate Date of Birth *"
                  value={val}
                  onChange={(d) => field.onChange(d && isValid(d) ? format(d, "dd-MM-yyyy") : "")}
                  format="dd/MM/yyyy"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!fieldState.error,
                      helperText: fieldState.error?.message ?? "DD-MM-YYYY",
                      inputRef: field.ref,
                      onBlur: field.onBlur,
                    },
                  }}
                />
              );
            }}
          />
        </Grid>
      </Grid>
    </FormCard>
  );
}

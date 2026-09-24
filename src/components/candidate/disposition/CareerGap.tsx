import { Grid } from "@mui/material";
import { Controller, type Control } from "react-hook-form";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { parse, format, isValid } from "date-fns";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { SelectField, FormCard } from "../FormHelpers";
import { CAREER_GAP_REASONS, CAREER_GAP_GENDER_OPTIONS } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }

export function CareerGap({ control }: Props) {
  return (
    <FormCard title="Career Gap Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="career_gap_details.career_gap_gender" control={control} label="Gender" options={CAREER_GAP_GENDER_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="career_gap_details.career_gap_dob"
            control={control}
            render={({ field, fieldState }) => {
              let val: Date | null = null;
              if (field.value) {
                const p = parse(field.value, "dd-MM-yyyy", new Date());
                val = isValid(p) ? p : null;
              }
              return (
                <DatePicker
                  label="Date of Birth *"
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
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="career_gap_details.career_gap_reason" control={control} label="Career Gap Reason" options={CAREER_GAP_REASONS} required />
        </Grid>
      </Grid>
    </FormCard>
  );
}

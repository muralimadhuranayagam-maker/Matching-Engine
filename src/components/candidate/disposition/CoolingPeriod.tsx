import { Grid } from "@mui/material";
import { Controller, type Control } from "react-hook-form";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { parse, format, isValid } from "date-fns";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { TextInput, SelectField, FormCard } from "../FormHelpers";
import { REJECTION_ROUNDS, COOLING_PERIOD_DURATIONS } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }
export function CoolingPeriod({ control }: Props) {
  return (
    <FormCard title="Cooling Period Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="cooling_period_details.rejected_company_name" control={control} label="Rejected Company Name" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="cooling_period_details.rejection_round" control={control} label="Rejection Round" options={REJECTION_ROUNDS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="cooling_period_details.rejection_date"
            control={control}
            render={({ field, fieldState }) => {
              let val: Date | null = null;
              if (field.value) { const p = parse(field.value, "dd-MM-yyyy", new Date()); val = isValid(p) ? p : null; }
              return (
                <DatePicker label="Rejection Date *" value={val}
                  onChange={(d) => field.onChange(d && isValid(d) ? format(d, "dd-MM-yyyy") : "")}
                  format="dd/MM/yyyy"
                  slotProps={{ textField: { fullWidth: true, error: !!fieldState.error, helperText: fieldState.error?.message, inputRef: field.ref, onBlur: field.onBlur } }}
                />
              );
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="cooling_period_details.cooling_period_duration" control={control} label="Cooling Period Duration" options={COOLING_PERIOD_DURATIONS} required />
        </Grid>
      </Grid>
    </FormCard>
  );
}

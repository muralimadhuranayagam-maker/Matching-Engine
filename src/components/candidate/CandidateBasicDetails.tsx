import { useEffect } from "react";
import { Grid, Typography } from "@mui/material";
import { Controller, useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { parse, format, isValid, differenceInYears } from "date-fns";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";
import { TextInput, SelectField, FormCard } from "./FormHelpers";
import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  KNOWLEDGE_OF_HINDI_OPTIONS
} from "../../config/options";

interface Props {
  control: Control<CandidateIntakeSchema>;
  setValue: UseFormSetValue<CandidateIntakeSchema>;
}

export function CandidateBasicDetails({ control, setValue }: Props) {
  const dobStr = useWatch({ control, name: "personal.date_of_birth" });

  // Dynamically calculate age from date_of_birth
  useEffect(() => {
    if (dobStr && typeof dobStr === "string" && /^\d{2}-\d{2}-\d{4}$/.test(dobStr)) {
      const parsedDate = parse(dobStr, "dd-MM-yyyy", new Date());
      if (isValid(parsedDate)) {
        const computedAge = differenceInYears(new Date(), parsedDate);
        setValue("personal.age", Math.max(0, computedAge), { shouldValidate: true });
      }
    }
  }, [dobStr, setValue]);

  return (
    <FormCard title="Personal & Contact Information" subtitle="Enter the candidate's personal details and primary contact information">
      <Grid container spacing={2.5}>
        {/* Personal Details Section */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>Personal Details</Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="personal.first_name" control={control} label="First Name" required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="personal.last_name" control={control} label="Last Name" required />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="personal.gender" control={control} label="Gender" options={GENDER_OPTIONS} required />
        </Grid>

        {/* Date of Birth Picker */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Controller
            name="personal.date_of_birth"
            control={control}
            render={({ field, fieldState }) => {
              const dateVal = field.value ? parse(field.value, "dd-MM-yyyy", new Date()) : null;
              return (
                <DatePicker
                  label="Date of Birth *"
                  value={isValid(dateVal) ? dateVal : null}
                  onChange={(newDate) => {
                    if (newDate && isValid(newDate)) {
                      field.onChange(format(newDate, "dd-MM-yyyy"));
                    } else {
                      field.onChange("");
                    }
                  }}
                  format="dd-MM-yyyy"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!fieldState.error,
                      helperText: fieldState.error?.message ?? "Format: DD-MM-YYYY",
                    },
                  }}
                />
              );
            }}
          />
        </Grid>

        {/* Calculated Age */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput
            name="personal.age"
            control={control}
            label="Calculated Age (Years)"
            type="number"
            disabled
            helperText="Calculated automatically from Date of Birth"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="personal.marital_status" control={control} label="Marital Status" options={MARITAL_STATUS_OPTIONS} required />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput name="personal.mother_tongue" control={control} label="Mother Tongue" required placeholder="e.g. Hindi, Tamil, Bengali" />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="personal.knowledge_of_hindi" control={control} label="Knowledge of Hindi" options={KNOWLEDGE_OF_HINDI_OPTIONS} required />
        </Grid>

        {/* Contact Information Section */}
        <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>Contact Information</Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput
            name="contact.phone"
            control={control}
            label="Mobile Phone Number"
            required
            placeholder="10-digit mobile number"
            inputProps={{ maxLength: 10, inputMode: "numeric" }}
            helperText="10-digit Indian mobile number"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="contact.email" control={control} label="Email Address" required type="email" placeholder="name@example.com" />
        </Grid>
      </Grid>
    </FormCard>
  );
}

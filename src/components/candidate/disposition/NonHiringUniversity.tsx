import { Grid, Typography, Divider } from "@mui/material";
import type { Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { TextInput, SelectField, FormCard } from "../FormHelpers";
import { GAP_REASONS, DIPLOMA_TYPES } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }

const EDU_STATUS_OPTIONS = ["Regular", "Non-Regular", "Distance", "Open Board", "NIOS", "State Board", "CBSE", "ICSE", "Other"];

export function NonHiringUniversity({ control }: Props) {
  return (
    <FormCard title="Non Hiring University Details" subtitle="Document education history">
      <Grid container spacing={2.5}>
        {/* 10th */}
        <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary">10th Standard</Typography><Divider /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="non_hiring_university_details.non_hiring_uni_10th_status" control={control} label="10th Board Status" options={EDU_STATUS_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput name="non_hiring_university_details.non_hiring_uni_10th_year" control={control} label="10th Passing Year" placeholder="e.g. 2010" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="non_hiring_university_details.non_hiring_uni_10th_gap_reason" control={control} label="10th Gap Reason" options={GAP_REASONS} />
        </Grid>
        {/* 12th */}
        <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary">12th Standard</Typography><Divider /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="non_hiring_university_details.non_hiring_uni_12th_status" control={control} label="12th Board Status" options={EDU_STATUS_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput name="non_hiring_university_details.non_hiring_uni_12th_year" control={control} label="12th Passing Year" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="non_hiring_university_details.non_hiring_uni_12th_gap_reason" control={control} label="12th Gap Reason" options={GAP_REASONS} />
        </Grid>
        {/* Diploma */}
        <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary">Diploma</Typography><Divider /></Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <SelectField name="non_hiring_university_details.non_hiring_uni_diploma_status" control={control} label="Diploma Status" options={EDU_STATUS_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <SelectField name="non_hiring_university_details.non_hiring_uni_diploma_type" control={control} label="Diploma Type" options={DIPLOMA_TYPES} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextInput name="non_hiring_university_details.non_hiring_uni_diploma_year" control={control} label="Diploma Year" />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <SelectField name="non_hiring_university_details.non_hiring_uni_diploma_gap_reason" control={control} label="Diploma Gap Reason" options={GAP_REASONS} />
        </Grid>
        {/* Graduation */}
        <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary">Graduation</Typography><Divider /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="non_hiring_university_details.non_hiring_uni_graduation_status" control={control} label="Graduation Status" options={EDU_STATUS_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput name="non_hiring_university_details.non_hiring_uni_graduation_year" control={control} label="Graduation Year" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="non_hiring_university_details.non_hiring_uni_graduation_gap_reason" control={control} label="Graduation Gap Reason" options={GAP_REASONS} />
        </Grid>
      </Grid>
    </FormCard>
  );
}

import { Grid, Typography, Divider, Box } from "@mui/material";
import { useWatch, type Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";
import { TextInput, SelectField, NumberInput, FormCard } from "./FormHelpers";
import { GAP_REASONS, DIPLOMA_TYPES, BOARD_OPTIONS, GRADUATION_STATUS_OPTIONS } from "../../config/options";

interface Props {
  control: Control<CandidateIntakeSchema>;
}

const EDU_STATUS_OPTIONS = ["Completed", "Pursuing", "Discontinued", "Regular", "Distance", "Open Board", "Other"];

export function EducationDetails({ control }: Props) {
  const graduationStatus = useWatch({ control, name: "education.graduation.status" });
  const isPg = graduationStatus === "PG";

  return (
    <FormCard title="Education History" subtitle="Document candidate academic qualifications from 10th Standard through Graduation & PG">
      <Grid container spacing={2.5}>
        {/* 10th Standard */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>10th Standard (SSC / High School)</Typography>
          <Divider sx={{ mt: 0.5 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="education.tenth.status" control={control} label="10th Board" options={BOARD_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput name="education.tenth.school_name" control={control} label="10th School Name" placeholder="e.g. St. Xavier's High School" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput name="education.tenth.passing_year" control={control} label="Passing Year" placeholder="e.g. 2016" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberInput name="education.tenth.percentage" control={control} label="Percentage / Marks (%)" min={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="education.tenth.gap_reason" control={control} label="Education Gap Reason (if any)" options={GAP_REASONS} />
        </Grid>

        {/* 12th Standard */}
        <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>12th Standard (HSC / Intermediate)</Typography>
          <Divider sx={{ mt: 0.5 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="education.twelfth.status" control={control} label="12th Board" options={BOARD_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput name="education.twelfth.school_or_college_name" control={control} label="School / Junior College Name" placeholder="e.g. DPS / Loyola College" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput name="education.twelfth.passing_year" control={control} label="Passing Year" placeholder="e.g. 2018" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberInput name="education.twelfth.percentage" control={control} label="Percentage / Marks (%)" min={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="education.twelfth.gap_reason" control={control} label="Education Gap Reason (if any)" options={GAP_REASONS} />
        </Grid>

        {/* Diploma */}
        <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>Diploma (Polytechnic / Vocational)</Typography>
          <Divider sx={{ mt: 0.5 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <SelectField name="education.diploma.status" control={control} label="Diploma Status" options={EDU_STATUS_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <SelectField name="education.diploma.diploma_type" control={control} label="Diploma Type" options={DIPLOMA_TYPES} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextInput name="education.diploma.institution_name" control={control} label="Institution Name" placeholder="e.g. Govt Polytechnic" />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextInput name="education.diploma.passing_year" control={control} label="Passing Year" placeholder="e.g. 2019" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberInput name="education.diploma.percentage" control={control} label="Percentage / Marks (%)" min={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField name="education.diploma.gap_reason" control={control} label="Diploma Gap Reason (if any)" options={GAP_REASONS} />
        </Grid>

        {/* Graduation / PG */}
        <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
            {isPg ? "Postgraduation (PG) Qualification" : "Graduation (UG) Qualification"}
          </Typography>
          <Divider sx={{ mt: 0.5 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SelectField name="education.graduation.status" control={control} label="Graduation Status" options={GRADUATION_STATUS_OPTIONS} required />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput
            name="education.graduation.degree"
            control={control}
            label={isPg ? "PG Degree / Branch" : "Degree / Branch"}
            placeholder={isPg ? "e.g. MBA, M.Tech, MCA, M.Sc" : "e.g. B.Tech CS, B.Com, BBA, B.Sc"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput
            name="education.graduation.college_name"
            control={control}
            label={isPg ? "PG College Name" : "College Name"}
            placeholder={isPg ? "e.g. IIM Bangalore, IIT Bombay" : "e.g. St. Xavier's College"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput
            name="education.graduation.university_name"
            control={control}
            label={isPg ? "PG University Name" : "University Name"}
            placeholder={isPg ? "e.g. Autonomous / VTU" : "e.g. Mumbai University, VTU"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextInput
            name="education.graduation.passing_year"
            control={control}
            label={isPg ? "PG Passing Year" : "Passing Year"}
            placeholder={isPg ? "e.g. 2024" : "e.g. 2022"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <NumberInput
            name="education.graduation.percentage"
            control={control}
            label={isPg ? "PG Percentage (%)" : "Percentage (%)"}
            min={0}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberInput
            name="education.graduation.cgpa"
            control={control}
            label={isPg ? "PG CGPA (out of 10)" : "CGPA (out of 10)"}
            min={0}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SelectField
            name="education.graduation.gap_reason"
            control={control}
            label={isPg ? "PG Education Gap Reason (if any)" : "Graduation Gap Reason (if any)"}
            options={GAP_REASONS}
          />
        </Grid>

        {/* Dynamic Sub-record for UG when PG is selected */}
        {isPg && (
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: "background.paper",
                border: "1.5px dashed",
                borderColor: "primary.main",
                mt: 1,
              }}
            >
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 0.5 }}>
                Undergraduate (UG) Qualification Details
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                Please provide candidate's prior Bachelor's degree (UG) history below:
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextInput
                    name="education.graduation.undergraduation.degree"
                    control={control}
                    label="UG Degree / Branch"
                    placeholder="e.g. B.Tech CS, B.Com, B.Sc"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextInput
                    name="education.graduation.undergraduation.college_name"
                    control={control}
                    label="UG College Name"
                    placeholder="e.g. St. Xavier's College"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextInput
                    name="education.graduation.undergraduation.university_name"
                    control={control}
                    label="UG University Name"
                    placeholder="e.g. Mumbai University, VTU"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextInput
                    name="education.graduation.undergraduation.passing_year"
                    control={control}
                    label="UG Passing Year"
                    placeholder="e.g. 2022"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <NumberInput
                    name="education.graduation.undergraduation.percentage"
                    control={control}
                    label="UG Percentage (%)"
                    min={0}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <NumberInput
                    name="education.graduation.undergraduation.cgpa"
                    control={control}
                    label="UG CGPA (out of 10)"
                    min={0}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 12 }}>
                  <SelectField
                    name="education.graduation.undergraduation.gap_reason"
                    control={control}
                    label="UG Education Gap Reason (if any)"
                    options={GAP_REASONS}
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>
        )}
      </Grid>
    </FormCard>
  );
}

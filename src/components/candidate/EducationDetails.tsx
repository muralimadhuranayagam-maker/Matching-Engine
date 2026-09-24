import { useState, useEffect, useRef } from "react";
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

  // Watch passing years & gap reasons
  const tenthPassingYear = useWatch({ control, name: "education.tenth.passing_year" });
  const twelfthPassingYear = useWatch({ control, name: "education.twelfth.passing_year" });
  const twelfthGapReason = useWatch({ control, name: "education.twelfth.gap_reason" });

  const diplomaPassingYear = useWatch({ control, name: "education.diploma.passing_year" });
  const diplomaGapReason = useWatch({ control, name: "education.diploma.gap_reason" });

  const gradPassingYear = useWatch({ control, name: "education.graduation.passing_year" });
  const gradGapReason = useWatch({ control, name: "education.graduation.gap_reason" });

  const ugPassingYear = useWatch({ control, name: "education.graduation.undergraduation.passing_year" });
  const ugGapReason = useWatch({ control, name: "education.graduation.undergraduation.gap_reason" });

  // Parse years
  const tenthYear = parseInt(String(tenthPassingYear || "").trim(), 10);
  const twelfthYear = parseInt(String(twelfthPassingYear || "").trim(), 10);
  const diplomaYear = parseInt(String(diplomaPassingYear || "").trim(), 10);
  const gradYear = parseInt(String(gradPassingYear || "").trim(), 10);
  const ugYear = parseInt(String(ugPassingYear || "").trim(), 10);

  const isValidTenth = !isNaN(tenthYear) && tenthYear >= 1970 && tenthYear <= 2099;
  const isValidTwelfth = !isNaN(twelfthYear) && twelfthYear >= 1970 && twelfthYear <= 2099;
  const isValidDiploma = !isNaN(diplomaYear) && diplomaYear >= 1970 && diplomaYear <= 2099;
  const isValidGrad = !isNaN(gradYear) && gradYear >= 1970 && gradYear <= 2099;
  const isValidUg = !isNaN(ugYear) && ugYear >= 1970 && ugYear <= 2099;

  // 10th to 12th gap (Standard duration is 2 years, e.g. 2019 -> 2021)
  const twelfthGapYears = (isValidTenth && isValidTwelfth) ? (twelfthYear - tenthYear - 2) : 0;
  const hasTwelfthGap = twelfthGapYears > 0;

  // Diploma gap
  let diplomaGapYears = 0;
  if (isValidDiploma) {
    if (isValidTwelfth) {
      diplomaGapYears = diplomaYear - twelfthYear - 2;
    } else if (isValidTenth) {
      diplomaGapYears = diplomaYear - tenthYear - 3;
    }
  }
  const hasDiplomaGap = diplomaGapYears > 0;

  // Graduation gap (Standard 3 years after 12th / Diploma)
  let gradGapYears = 0;
  if (isValidGrad) {
    if (isValidTwelfth) {
      gradGapYears = gradYear - twelfthYear - 3;
    } else if (isValidDiploma) {
      gradGapYears = gradYear - diplomaYear - 3;
    }
  }
  const hasGradGap = gradGapYears > 0;

  // PG gap (Standard 2 years after UG)
  let pgGapYears = 0;
  if (isPg && isValidGrad && isValidUg) {
    pgGapYears = gradYear - ugYear - 2;
  }
  const hasPgGap = pgGapYears > 0;

  // Auto-open state and triggers
  const [twelfthGapOpen, setTwelfthGapOpen] = useState(false);
  const prevTwelfthTriggerRef = useRef<string>("");

  useEffect(() => {
    if (hasTwelfthGap && !twelfthGapReason) {
      const triggerKey = `${tenthYear}-${twelfthYear}`;
      if (prevTwelfthTriggerRef.current !== triggerKey) {
        prevTwelfthTriggerRef.current = triggerKey;
        setTwelfthGapOpen(true);
      }
    } else if (!hasTwelfthGap) {
      setTwelfthGapOpen(false);
      prevTwelfthTriggerRef.current = "";
    }
  }, [hasTwelfthGap, tenthYear, twelfthYear, twelfthGapReason]);

  const [diplomaGapOpen, setDiplomaGapOpen] = useState(false);
  const prevDiplomaTriggerRef = useRef<string>("");

  useEffect(() => {
    if (hasDiplomaGap && !diplomaGapReason) {
      const triggerKey = `${diplomaYear}`;
      if (prevDiplomaTriggerRef.current !== triggerKey) {
        prevDiplomaTriggerRef.current = triggerKey;
        setDiplomaGapOpen(true);
      }
    } else if (!hasDiplomaGap) {
      setDiplomaGapOpen(false);
      prevDiplomaTriggerRef.current = "";
    }
  }, [hasDiplomaGap, diplomaYear, diplomaGapReason]);

  const [gradGapOpen, setGradGapOpen] = useState(false);
  const prevGradTriggerRef = useRef<string>("");

  useEffect(() => {
    if (hasGradGap && !gradGapReason) {
      const triggerKey = `${gradYear}`;
      if (prevGradTriggerRef.current !== triggerKey) {
        prevGradTriggerRef.current = triggerKey;
        setGradGapOpen(true);
      }
    } else if (!hasGradGap) {
      setGradGapOpen(false);
      prevGradTriggerRef.current = "";
    }
  }, [hasGradGap, gradYear, gradGapReason]);

  const [pgGapOpen, setPgGapOpen] = useState(false);
  const prevPgTriggerRef = useRef<string>("");

  useEffect(() => {
    if (hasPgGap && !gradGapReason) {
      const triggerKey = `${gradYear}-${ugYear}`;
      if (prevPgTriggerRef.current !== triggerKey) {
        prevPgTriggerRef.current = triggerKey;
        setPgGapOpen(true);
      }
    } else if (!hasPgGap) {
      setPgGapOpen(false);
      prevPgTriggerRef.current = "";
    }
  }, [hasPgGap, gradYear, ugYear, gradGapReason]);

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
          <SelectField
            name="education.twelfth.gap_reason"
            control={control}
            label={hasTwelfthGap ? `Education Gap Reason (${twelfthGapYears} Year Gap Detected)` : "Education Gap Reason (if any)"}
            options={GAP_REASONS}
            required={hasTwelfthGap}
            open={twelfthGapOpen}
            onOpen={() => setTwelfthGapOpen(true)}
            onClose={() => setTwelfthGapOpen(false)}
            helperText={hasTwelfthGap ? `⚠️ ${twelfthGapYears} year education gap detected between 10th (${tenthYear}) and 12th (${twelfthYear}). Reason is required.` : undefined}
          />
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
          <SelectField
            name="education.diploma.gap_reason"
            control={control}
            label={hasDiplomaGap ? `Diploma Gap Reason (${diplomaGapYears} Year Gap Detected)` : "Diploma Gap Reason (if any)"}
            options={GAP_REASONS}
            required={hasDiplomaGap}
            open={diplomaGapOpen}
            onOpen={() => setDiplomaGapOpen(true)}
            onClose={() => setDiplomaGapOpen(false)}
            helperText={hasDiplomaGap ? `⚠️ ${diplomaGapYears} year education gap detected. Reason is required.` : undefined}
          />
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
            label={
              isPg
                ? (hasPgGap ? `PG Education Gap Reason (${pgGapYears} Year Gap Detected)` : "PG Education Gap Reason (if any)")
                : (hasGradGap ? `Graduation Gap Reason (${gradGapYears} Year Gap Detected)` : "Graduation Gap Reason (if any)")
            }
            options={GAP_REASONS}
            required={isPg ? hasPgGap : hasGradGap}
            open={isPg ? pgGapOpen : gradGapOpen}
            onOpen={() => isPg ? setPgGapOpen(true) : setGradGapOpen(true)}
            onClose={() => isPg ? setPgGapOpen(false) : setGradGapOpen(false)}
            helperText={
              isPg
                ? (hasPgGap ? `⚠️ ${pgGapYears} year gap detected after UG. Reason is required.` : undefined)
                : (hasGradGap ? `⚠️ ${gradGapYears} year gap detected after 12th/Diploma. Reason is required.` : undefined)
            }
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

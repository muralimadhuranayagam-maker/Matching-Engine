import {
  Box, Typography, Grid, Paper, Chip, Button, Stack
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";
import { shouldShowLineup } from "../../lib/branchingLogic";

interface Props {
  values: CandidateIntakeSchema;
  onBack?: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function ReviewRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
      <Typography variant="body2" color="text.secondary" sx={{ mr: 2, minWidth: 180 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "right" }}>{String(value)}</Typography>
    </Box>
  );
}

export function CandidateReview({ values, onBack, onSubmit, isSubmitting }: Props) {
  const p = values.personal;
  const c = values.contact;
  const a = values.address;
  const e = values.education;
  const prof = values.professional_profile;
  const emp = values.employment_history;
  const pref = values.job_preferences;

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3, borderRadius: 2,
          border: "1px solid", borderColor: "primary.main",
          background: "linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(156,39,176,0.05) 100%)",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }} color="primary.main" gutterBottom>
          Candidate Master Profile & Call Outcome Review
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please verify all candidate profile sections before final submission.
        </Typography>

        <Grid container spacing={3}>
          {/* Candidate Personal & Contact */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="primary" gutterBottom>Personal & Contact</Typography>
            <ReviewRow label="Full Name" value={p ? `${p.first_name} ${p.last_name}` : undefined} />
            <ReviewRow label="Gender" value={p?.gender} />
            <ReviewRow label="Date of Birth" value={p?.date_of_birth} />
            <ReviewRow label="Calculated Age" value={p?.age ? `${p.age} Years` : undefined} />
            <ReviewRow label="Marital Status" value={p?.marital_status} />
            <ReviewRow label="Mother Tongue" value={p?.mother_tongue} />
            <ReviewRow label="Phone Number" value={c?.phone} />
            <ReviewRow label="Email Address" value={c?.email} />
          </Grid>

          {/* Address Details */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="primary" gutterBottom>Address Details</Typography>
            <ReviewRow label="Current City" value={a?.current?.city} />
            <ReviewRow label="Current Area" value={a?.current?.area} />
            <ReviewRow label="Current Pincode" value={a?.current?.pincode} />
            <ReviewRow label="Permanent City" value={a?.permanent?.city} />
            <ReviewRow label="Permanent Area" value={a?.permanent?.area} />
            <ReviewRow label="Permanent Pincode" value={a?.permanent?.pincode} />
          </Grid>

          {/* Professional Profile */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="primary" gutterBottom>Professional Profile</Typography>
            <ReviewRow label="Work Status" value={prof?.work_status} />
            <ReviewRow label="Experience (Y/M)" value={prof?.total_experience_years !== undefined ? `${prof.total_experience_years}Y ${prof.total_experience_months ?? 0}M` : undefined} />
            <ReviewRow label="Total Companies" value={prof?.total_companies} />
            <ReviewRow label="Skill / Role" value={prof?.skill_role} />
            <ReviewRow label="Primary Skill" value={Array.isArray(prof?.skill) ? prof.skill.join(", ") : prof?.skill} />
            <ReviewRow label="Industry Domain" value={prof?.industry} />
            <ReviewRow label="English Communication" value={prof?.english_communication} />
          </Grid>

          {/* Education Summary */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="primary" gutterBottom>Education Summary</Typography>
            <ReviewRow label="10th Board / Year" value={e?.tenth?.status ? `${e.tenth.status} (${e.tenth.passing_year || 'N/A'})` : undefined} />
            <ReviewRow label="12th Board / Year" value={e?.twelfth?.status ? `${e.twelfth.status} (${e.twelfth.passing_year || 'N/A'})` : undefined} />
            <ReviewRow label="Diploma Status" value={e?.diploma?.status} />
            <ReviewRow
              label={e?.graduation?.status === "PG" ? "Postgraduation (PG)" : "Graduation (UG)"}
              value={e?.graduation?.status ? `${e.graduation.status}${e.graduation.degree ? ` - ${e.graduation.degree}` : ""}` : undefined}
            />
            {e?.graduation?.status === "PG" && e?.graduation?.undergraduation && (
              <ReviewRow
                label="Undergraduation (UG)"
                value={e.graduation.undergraduation.degree ? `UG - ${e.graduation.undergraduation.degree}` : "UG Details Added"}
              />
            )}
          </Grid>

          {/* Employment History & Job Preferences */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="primary" gutterBottom>Employment & Preferences</Typography>
            <ReviewRow label="Current Company" value={emp?.current?.company_name} />
            <ReviewRow label="Previous Companies" value={`${emp?.previous_companies?.length ?? 0} Companies Added`} />
            <ReviewRow label="Job City" value={pref?.job_city} />
            <ReviewRow label="Preferred Area" value={pref?.preferred_area} />
            <ReviewRow label="Shift Preference" value={pref?.shift_base} />
            <ReviewRow label="WFH Interested" value={pref?.work_from_home ? "Yes" : "No"} />
            <ReviewRow label="Expected Salary" value={pref?.expected_salary_monthly ? `₹${pref.expected_salary_monthly.toLocaleString()}` : undefined} />
          </Grid>

          {/* Recruiter Call Disposition */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="primary" gutterBottom>Recruiter Call Outcome</Typography>
            <Box sx={{ mb: 1.5 }}>
              <Chip label={values.call_disposition} color="primary" variant="filled" />
            </Box>
            <ReviewRow label="DND Status" value={values.dnd_status} />
            {shouldShowLineup(values) && (
              <>
                <ReviewRow label="Lineup Status" value="Lineup Scheduled Required" />
                <ReviewRow
                  label="Lineup Skill"
                  value={
                    values.lineup_scheduled_details?.lineup_skill ||
                    (Array.isArray(values.professional_profile?.skill)
                      ? values.professional_profile.skill.join(", ")
                      : values.professional_profile?.skill)
                  }
                />
              </>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "flex-end", mt: 3 }}>
        {onBack && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<EditIcon />}
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back to Edit
          </Button>
        )}
        <Button
          variant="contained"
          size="large"
          endIcon={<SendIcon />}
          onClick={onSubmit}
          disabled={isSubmitting}
          sx={{
            background: "linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)",
            px: 5,
            py: 1.5,
            fontWeight: 700,
            fontSize: "1.05rem",
            boxShadow: "0 4px 16px rgba(25, 118, 210, 0.4)",
            "&:hover": {
              background: "linear-gradient(135deg, #1565c0 0%, #7b1fa2 100%)",
            }
          }}
        >
          {isSubmitting ? "Submitting Candidate..." : "Submit Candidate"}
        </Button>
      </Stack>
    </Box>
  );
}

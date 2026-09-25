import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Grid,
  Paper,
  Chip,
  Divider,
  Button,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import DescriptionIcon from "@mui/icons-material/Description";
import CodeIcon from "@mui/icons-material/Code";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SchoolIcon from "@mui/icons-material/School";
import WorkIcon from "@mui/icons-material/Work";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CallIcon from "@mui/icons-material/Call";
import type { CandidateItem } from "../../services/candidateService";
import { CandidateInterviewSection } from "./CandidateInterviewSection";

interface CandidateDetailModalProps {
  open: boolean;
  onClose: () => void;
  candidate: CandidateItem | null;
}

function DetailRow({ label, value }: { label: string; value?: any }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        py: 0.75,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150, fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>
        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
      </Typography>
    </Box>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 2.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
          {title}
        </Typography>
      </Box>
      <Divider sx={{ mb: 1.5 }} />
      {children}
    </Paper>
  );
}

export function CandidateDetailModal({ open, onClose, candidate }: CandidateDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!candidate) return null;

  const profile = candidate.profile || (candidate as any).candidate_data || {};
  const p = profile.personal || {};
  const c = profile.contact || {};
  const a = profile.address || {};
  const e = profile.education || {};
  const prof = profile.professional_profile || {};
  const emp = profile.employment_history || {};
  const currentEmp = emp.current || {};
  const pref = profile.job_preferences || {};
  const sal = profile.salary || {};
  const lineup = (profile.lineup_scheduled_details || {}) as any;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const skillsList: string[] = Array.isArray(prof.skill)
    ? prof.skill
    : typeof prof.skill === "string" && prof.skill
    ? prof.skill.split(",").map((s: string) => s.trim())
    : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2.5,
            bgcolor: "background.default",
            backgroundImage: "none",
            maxHeight: "92vh",
          },
        },
      }}
    >
      {/* Top Header */}
      <DialogTitle
        sx={{
          p: 2.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <DescriptionIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {candidate.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Candidate Profile"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {candidate.candidate_id} • Created: {new Date(candidate.created_at).toLocaleString()}
            </Typography>
          </Box>
          <Chip
            label={prof.work_status || candidate.work_status || "FRESHER"}
            color={prof.work_status === "EXPERIENCED" ? "primary" : "default"}
            size="small"
            sx={{ fontWeight: 700 }}
          />
          {profile.call_disposition && (
            <Chip
              label={profile.call_disposition}
              color="info"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Main Split Body: Left = Filled Form, Right = Stored JSON */}
      <DialogContent sx={{ p: { xs: 2, md: 3 }, overflowY: "auto" }}>
        <Grid container spacing={3}>
          {/* ============================================================ */}
          {/* LEFT SIDE: Filled Candidate Intake Form */}
          {/* ============================================================ */}
          <Grid size={{ xs: 12, md: 7, lg: 7.5 }}>
            <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "primary.main" }}>
                  Candidate Intake Form (Filled)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Complete structured fields populated during voice call / intake submission
                </Typography>
              </Box>
              <Chip label="Verified Form Data" color="success" size="small" variant="outlined" />
            </Box>

            {/* 1. Personal & Contact Information */}
            <SectionCard title="1. Personal & Contact Details" icon={<PersonIcon fontSize="small" />}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailRow label="First Name" value={p.first_name} />
                  <DetailRow label="Last Name" value={p.last_name} />
                  <DetailRow label="Gender" value={p.gender} />
                  <DetailRow label="Date of Birth" value={p.date_of_birth} />
                  <DetailRow label="Calculated Age" value={p.age ? `${p.age} Years` : undefined} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailRow label="Phone Number" value={c.phone || candidate.phone} />
                  <DetailRow label="Email Address" value={c.email || candidate.email} />
                  <DetailRow label="Marital Status" value={p.marital_status} />
                  <DetailRow label="Mother Tongue" value={p.mother_tongue} />
                  <DetailRow label="Hindi Proficiency" value={p.knowledge_of_hindi} />
                </Grid>
              </Grid>
            </SectionCard>

            {/* 2. Address Details */}
            <SectionCard title="2. Address Details" icon={<LocationOnIcon fontSize="small" />}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", textTransform: "uppercase" }}>
                    Current Address
                  </Typography>
                  <DetailRow label="Address Line" value={a.current?.address_line} />
                  <DetailRow label="Area / Locality" value={a.current?.area} />
                  <DetailRow label="City" value={a.current?.city} />
                  <DetailRow label="State" value={a.current?.state} />
                  <DetailRow label="Pincode" value={a.current?.pincode} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
                    Permanent Address
                  </Typography>
                  <DetailRow label="Address Line" value={a.permanent?.address_line} />
                  <DetailRow label="Area / Locality" value={a.permanent?.area} />
                  <DetailRow label="City" value={a.permanent?.city} />
                  <DetailRow label="State" value={a.permanent?.state} />
                  <DetailRow label="Pincode" value={a.permanent?.pincode} />
                </Grid>
              </Grid>
            </SectionCard>

            {/* 3. Education History */}
            <SectionCard title="3. Education History" icon={<SchoolIcon fontSize="small" />}>
              <Grid container spacing={2}>
                {/* 10th */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                    10th Standard
                  </Typography>
                  <DetailRow label="Status" value={e.tenth?.status} />
                  <DetailRow label="School Name" value={e.tenth?.school_name} />
                  <DetailRow label="Passing Year" value={e.tenth?.passing_year} />
                  <DetailRow label="Percentage" value={e.tenth?.percentage ? `${e.tenth.percentage}%` : undefined} />
                </Grid>

                {/* 12th */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                    12th Standard
                  </Typography>
                  <DetailRow label="Status" value={e.twelfth?.status} />
                  <DetailRow label="College / School" value={e.twelfth?.school_or_college_name} />
                  <DetailRow label="Passing Year" value={e.twelfth?.passing_year} />
                  <DetailRow label="Percentage" value={e.twelfth?.percentage ? `${e.twelfth.percentage}%` : undefined} />
                </Grid>

                {/* Graduation */}
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                    Graduation ({
                      e.graduation?.status
                        ? e.graduation.status
                        : e.graduation?.passing_year && Number(e.graduation.passing_year) > new Date().getFullYear()
                          ? `Pursuing - Expected ${e.graduation.passing_year}`
                          : "UG"
                    })
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailRow label="Degree / Course" value={e.graduation?.degree} />
                      <DetailRow label="College Name" value={e.graduation?.college_name} />
                      <DetailRow label="University" value={e.graduation?.university_name} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailRow label="Passing Year" value={e.graduation?.passing_year} />
                      <DetailRow label="Percentage / CGPA" value={e.graduation?.percentage ? `${e.graduation.percentage}%` : e.graduation?.cgpa ? `${e.graduation.cgpa} CGPA` : undefined} />
                      <DetailRow label="Gap Reason" value={e.graduation?.gap_reason} />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </SectionCard>

            {/* 4. Professional Profile & Job Preferences */}
            <SectionCard title="4. Professional Profile & Job Preferences" icon={<WorkIcon fontSize="small" />}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailRow label="Work Status" value={prof.work_status} />
                  <DetailRow
                    label="Total Experience"
                    value={
                      prof.total_experience_years !== undefined
                        ? `${prof.total_experience_years} Years ${prof.total_experience_months || 0} Months`
                        : undefined
                    }
                  />
                  <DetailRow label="Total Companies" value={prof.total_companies} />
                  <DetailRow label="Skill / Role Category" value={prof.skill_role} />
                  <DetailRow label="Industry Domain" value={prof.industry} />
                  <DetailRow label="English Communication" value={prof.english_communication} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailRow label="Preferred Job City" value={pref.job_city} />
                  <DetailRow label="Preferred Area" value={pref.preferred_area} />
                  <DetailRow label="Shift Preference" value={pref.shift_base} />
                  <DetailRow label="Work From Home" value={pref.work_from_home} />
                  <DetailRow
                    label="Current Monthly Salary"
                    value={sal.current_monthly_salary ? `₹${Number(sal.current_monthly_salary).toLocaleString()}` : undefined}
                  />
                  <DetailRow
                    label="Expected Monthly Salary"
                    value={
                      pref.expected_salary_monthly
                        ? `₹${Number(pref.expected_salary_monthly).toLocaleString()}`
                        : sal.expected_monthly_salary
                        ? `₹${Number(sal.expected_monthly_salary).toLocaleString()}`
                        : undefined
                    }
                  />
                </Grid>

                {/* Primary Skills Chips */}
                {skillsList.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                        Primary Technical & Professional Skills:
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {skillsList.map((skill, idx) => (
                          <Chip
                            key={idx}
                            label={skill}
                            color="primary"
                            variant="filled"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </SectionCard>

            {/* 5. Employment History */}
            {prof.work_status === "EXPERIENCED" && (
              <SectionCard title="5. Current Employment Details" icon={<BusinessCenterIcon fontSize="small" />}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailRow label="Company Name" value={currentEmp.company_name} />
                    <DetailRow label="Designation / Role" value={currentEmp.role} />
                    <DetailRow label="Process / Project" value={currentEmp.process_name} />
                    <DetailRow label="Skills Used" value={currentEmp.skill} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailRow label="Joining Date" value={currentEmp.joining_date} />
                    <DetailRow
                      label="Monthly Salary"
                      value={currentEmp.monthly_salary ? `₹${Number(currentEmp.monthly_salary).toLocaleString()}` : undefined}
                    />
                    <DetailRow label="Notice Period" value={currentEmp.notice_period} />
                    <DetailRow label="Reason For Leaving" value={currentEmp.reason_for_leaving} />
                  </Grid>
                </Grid>
              </SectionCard>
            )}

            {/* 6. Recruiter Call Outcome & Disposition */}
            <SectionCard title="6. Recruiter Call Outcome & Disposition" icon={<CallIcon fontSize="small" />}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailRow label="Call Disposition" value={profile.call_disposition} />
                  <DetailRow label="DND Status" value={profile.dnd_status} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {lineup.scheduled_date_time && (
                    <DetailRow label="Lineup Date & Time" value={lineup.scheduled_date_time} />
                  )}
                  {lineup.interview_mode && (
                    <DetailRow label="Interview Mode" value={lineup.interview_mode} />
                  )}
                  {lineup.interview_city && (
                    <DetailRow label="Interview City" value={lineup.interview_city} />
                  )}
                  {lineup.lineup_company && (
                    <DetailRow label="Target Company" value={lineup.lineup_company} />
                  )}
                </Grid>
              </Grid>
            </SectionCard>

            {/* 7. AI Interview Agent Screening & JD Evaluation (MCP) */}
            <CandidateInterviewSection candidateId={candidate.candidate_id} />
          </Grid>

          {/* ============================================================ */}
          {/* RIGHT SIDE: Stored Candidate Profile JSON */}
          {/* ============================================================ */}
          <Grid size={{ xs: 12, md: 5, lg: 4.5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                position: "sticky",
                top: 0,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CodeIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Stored Candidate Profile JSON
                  </Typography>
                </Box>
                <Tooltip title={copied ? "Copied!" : "Copy JSON"}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                    onClick={handleCopyJson}
                    sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </Tooltip>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                Canonical PostgreSQL JSON profile evaluated by the Matching Engine
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Box
                component="pre"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: "#0d1117",
                  color: "#c9d1d9",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  overflowX: "auto",
                  overflowY: "auto",
                  maxHeight: "68vh",
                  fontSize: "0.75rem",
                  fontFamily: "'Fira Code', 'Roboto Mono', monospace",
                  lineHeight: 1.5,
                  "&::-webkit-scrollbar": { width: 8, height: 8 },
                  "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.2)", borderRadius: 4 },
                }}
              >
                {JSON.stringify(profile, null, 2)}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import {
  Box, Container, Typography, Button, Alert, Paper,
  Stack, Chip, ThemeProvider
} from "@mui/material";
import { darkFormTheme } from "../../theme/theme";
import { FormProvider, useWatch } from "react-hook-form";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

import { useCandidateIntake, shouldShowLineup, buildPayload, clearDraft } from "../../hooks/useCandidateIntake";
import { useLiveIntakeSocket } from "../../hooks/useLiveIntakeSocket";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";

import { CandidateBasicDetails } from "./CandidateBasicDetails";
import { AddressDetails } from "./AddressDetails";
import { EducationDetails } from "./EducationDetails";
import { ProfessionalProfileDetails } from "./ProfessionalProfileDetails";
import { EmploymentHistoryDetails } from "./EmploymentHistoryDetails";
import { CallDisposition } from "./CallDisposition";
import { CandidateReview } from "./CandidateReview";
import { LineupScheduledDetails } from "./LineupScheduledDetails";

// Disposition branches
import { PoorCommunication } from "./disposition/PoorCommunication";
import { NonHiringZone } from "./disposition/NonHiringZone";
import { NotInterested } from "./disposition/NotInterested";
import { HighSalary } from "./disposition/HighSalary";
import { AgeLimit } from "./disposition/AgeLimit";
import { CareerGap } from "./disposition/CareerGap";
import { NoCompany } from "./disposition/NoCompany";
import { OtherDomainExperience } from "./disposition/OtherDomainExperience";
import { BusyCallMeBack } from "./disposition/BusyCallMeBack";
import { WorkFromHome } from "./disposition/WorkFromHome";
import { OutstationCandidate } from "./disposition/OutstationCandidate";
import { ShiftIssues } from "./disposition/ShiftIssues";
import { NonHiringUniversity } from "./disposition/NonHiringUniversity";
import { ServingNotice } from "./disposition/ServingNotice";
import { CoolingPeriod } from "./disposition/CoolingPeriod";
import { OtherRecruiter } from "./disposition/OtherRecruiter";
import { CallDisconnected } from "./disposition/CallDisconnected";
import { DISPOSITION_RULES, ALL_BRANCH_KEYS } from "../../config/dispositions";

const SECTIONS = [
  { id: "section-personal", label: "1. Personal & Contact" },
  { id: "section-address", label: "2. Address Details" },
  { id: "section-education", label: "3. Education History" },
  { id: "section-professional", label: "4. Professional Profile" },
  { id: "section-employment", label: "5. Employment History" },
  { id: "section-call-outcome", label: "6. Call Outcome" },
  { id: "section-review-submit", label: "7. Review & Submit" },
];

/** Renders the correct branch component for the selected disposition */
function DispositionBranch({ disposition, control }: { disposition: string; control: any }) {
  switch (disposition) {
    case "Poor Communication":       return <PoorCommunication control={control} />;
    case "Non Hiring Zone":          return <NonHiringZone control={control} />;
    case "Not Interested":           return <NotInterested control={control} />;
    case "High Salary":              return <HighSalary control={control} />;
    case "Age Limit":                return <AgeLimit control={control} />;
    case "Career Gap":               return <CareerGap control={control} />;
    case "No Company":               return <NoCompany control={control} />;
    case "Other Domain Experience":  return <OtherDomainExperience control={control} />;
    case "Busy, Call me Back":       return <BusyCallMeBack control={control} />;
    case "Work from Home":           return <WorkFromHome control={control} />;
    case "Out Station Candidate":    return <OutstationCandidate control={control} />;
    case "Shift Issues":             return <ShiftIssues control={control} />;
    case "Non Hiring University":    return <NonHiringUniversity control={control} />;
    case "Serving Notice":           return <ServingNotice control={control} />;
    case "Cooling Period":           return <CoolingPeriod control={control} />;
    case "Other Recruiter":          return <OtherRecruiter control={control} />;
    case "Call Disconnected":        return <CallDisconnected control={control} />;
    case "Voice Mail":
    case "No Education Documents":
    case "No Experience Documents":
    case "Need Weekend Off":
    case "Line Up Scheduled":
      return null;
    default:
      return null;
  }
}

import { useQueryClient } from "@tanstack/react-query";

interface CandidateIntakeFormProps {
  onNavigateTab?: (tab: string) => void;
}

export function CandidateIntakeForm({ onNavigateTab }: CandidateIntakeFormProps) {
  const queryClient = useQueryClient();
  const { form, mutation, persistDraft } = useCandidateIntake();
  const { control, reset, getValues, setValue, trigger } = form;

  // Session ID for live SnapServe voice call correlation (passed via URL query ?session=... or default)
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("session") || params.get("callId") || "live_candidate_call";
    }
    return "live_candidate_call";
  });

  const {
    isConnected: isLiveConnected,
    isSyncing: isLiveSyncing,
  } = useLiveIntakeSocket({
    sessionId,
    form,
    enabled: true,
  });

  const [activeSection, setActiveSection] = useState("section-personal");
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const disposition = useWatch({ control, name: "call_disposition" });
  const formValues = useWatch({ control }) as Partial<CandidateIntakeSchema>;

  // Clear stale branch data when disposition changes
  useEffect(() => {
    if (!disposition) return;
    const rule = DISPOSITION_RULES[disposition as keyof typeof DISPOSITION_RULES];
    ALL_BRANCH_KEYS.forEach((key) => {
      if (key === "lineup_scheduled_details") return; // preserve lineup
      if (key !== rule?.branchKey) {
        form.setValue(key as any, undefined as any);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disposition]);

  // Auto-save draft
  useEffect(() => {
    const interval = setInterval(() => persistDraft(), 5000);
    return () => clearInterval(interval);
  }, [persistDraft]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showLineup = shouldShowLineup(formValues);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  const handleFinalSubmit = async () => {
    setValidationError(null);
    try {
      // Validate core required fields
      const isValid = await trigger([
        "personal.first_name",
        "personal.last_name",
        "personal.gender",
        "contact.phone",
        "contact.email",
        "call_disposition",
      ]);

      if (!isValid) {
        setValidationError("Please fill in all mandatory fields highlighted in red before submitting.");
        // Scroll to the first error in the form
        setTimeout(() => {
          const firstErrorEl = document.querySelector(".Mui-error, [aria-invalid='true']");
          if (firstErrorEl) {
            firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
        return;
      }

      const values = getValues();
      const payload = buildPayload(values);

      mutation.mutate(payload, {
        onSuccess: (data) => {
          setSubmitted(true);
          setSubmittedId(data.candidate_id || data.id || null);
          clearDraft();
          // Invalidate React Query caches so candidates list and dashboard immediately sync
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
          queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
          queryClient.invalidateQueries({ queryKey: ["recentMatches"] });
        },
        onError: (err: any) => {
          console.error("Submission failed:", err);
          setValidationError(err?.message || "Failed to submit candidate. Please check details and retry.");
        },
      });
    } catch (err: any) {
      console.error("Payload build error:", err);
      setValidationError("An unexpected error occurred while preparing the submission.");
    }
  };

  const handleAddAnother = () => {
    reset();
    setSubmitted(false);
    setSubmittedId(null);
    setValidationError(null);
    scrollToSection("section-personal");
  };

  // ---- Submitted Success Screen ----
  if (submitted) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
        <CheckCircleOutlinedIcon sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
          Candidate Submitted!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          The candidate master profile and call outcome have been successfully recorded and synced with the Matching Engine.
        </Typography>
        {submittedId && (
          <Chip label={`Reference ID: ${submittedId}`} color="primary" sx={{ mb: 3, fontWeight: 700, fontSize: "0.95rem", py: 2, px: 1 }} />
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4, justifyContent: "center" }}>
          {onNavigateTab && (
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => onNavigateTab("candidates")}
            >
              View in Candidates List
            </Button>
          )}
          {onNavigateTab && (
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              onClick={() => onNavigateTab("dashboard")}
            >
              View Engine Dashboard
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={handleAddAnother}
            size="large"
          >
            Add Another Candidate
          </Button>
        </Stack>
      </Container>
    );
  }

  // ---- Main Form (Single Unified Page with Smooth Scroll) ----
  return (
    <ThemeProvider theme={darkFormTheme}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box
          sx={{
            p: { xs: 2.5, sm: 4.5 },
            borderRadius: 4,
            background: "linear-gradient(180deg, #0e1320 0%, #080c14 100%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            color: "#f8fafc",
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 3.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }} spacing={2}>
              <Box>
                <Chip
                  label="Candidate Master Intake • Recruiter Console"
                  size="small"
                  sx={{
                    mb: 1.5,
                    bgcolor: "rgba(59, 130, 246, 0.15)",
                    color: "#60a5fa",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                  }}
                />
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{
                    fontWeight: 800,
                    background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Candidate Intake Form
                </Typography>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                  Single-page master candidate profile and recruiter call outcome intake. Fill in all sections below and submit at the end.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                {isLiveConnected ? (
                  <Chip
                    icon={
                      <FiberManualRecordIcon
                        sx={{
                          fontSize: "10px !important",
                          color: "#10b981 !important",
                          animation: isLiveSyncing ? "pulse 1s infinite" : "none",
                          "@keyframes pulse": {
                            "0%": { opacity: 1, transform: "scale(1)" },
                            "50%": { opacity: 0.3, transform: "scale(1.3)" },
                            "100%": { opacity: 1, transform: "scale(1)" },
                          },
                        }}
                      />
                    }
                    label={isLiveSyncing ? "AI Voice Updating..." : "SnapServe Call Live"}
                    size="small"
                    sx={{
                      bgcolor: "rgba(16, 185, 129, 0.12)",
                      color: "#34d399",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                    }}
                  />
                ) : (
                  <Chip
                    icon={<PhoneInTalkIcon sx={{ fontSize: "13px !important", color: "#94a3b8 !important" }} />}
                    label="Voice Auto-Fill Ready"
                    size="small"
                    variant="outlined"
                    sx={{
                      color: "#94a3b8",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  />
                )}
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to reset all form fields?")) {
                      reset();
                    }
                  }}
                  sx={{
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    "&:hover": { borderColor: "error.main", bgcolor: "rgba(239, 68, 68, 0.1)" },
                  }}
                >
                  Reset Form
                </Button>
              </Stack>
            </Stack>
          </Box>

          {/* Sticky Quick-Jump Section Pills Navigation */}
          <Paper
            elevation={3}
            sx={{
              p: 1.5,
              mb: 4,
              borderRadius: 2.5,
              position: "sticky",
              top: 16,
              zIndex: 100,
              backdropFilter: "blur(20px)",
              background: "rgba(10, 14, 24, 0.94)",
              border: "1px solid",
              borderColor: "rgba(255, 255, 255, 0.14)",
              boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
              overflowX: "auto",
            }}
          >
            <Stack direction="row" spacing={1} sx={{ minWidth: "max-content" }}>
              {SECTIONS.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <Chip
                    key={sec.id}
                    label={sec.label}
                    clickable
                    onClick={() => scrollToSection(sec.id)}
                    color={isActive ? "primary" : "default"}
                    variant={isActive ? "filled" : "outlined"}
                    sx={{
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "0.82rem",
                      transition: "all 0.2s ease-in-out",
                      ...(isActive && {
                        boxShadow: "0 2px 10px rgba(59, 130, 246, 0.45)",
                        bgcolor: "primary.main",
                        color: "#ffffff",
                      }),
                    }}
                  />
                );
              })}
            </Stack>
          </Paper>

          {/* Validation Alert if triggered */}
          {validationError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setValidationError(null)}>
              {validationError}
            </Alert>
          )}

          {/* All 7 Sections In A Single Scrollable Page */}
          <FormProvider {...form}>
            <form noValidate onSubmit={(e) => { e.preventDefault(); handleFinalSubmit(); }}>
              {/* Section 1 - Personal & Contact Information */}
              <Box id="section-personal" sx={{ scrollMarginTop: "100px", mb: 4 }}>
                <CandidateBasicDetails control={control} setValue={setValue} />
              </Box>

              {/* Section 2 - Address Details */}
              <Box id="section-address" sx={{ scrollMarginTop: "100px", mb: 4 }}>
                <AddressDetails control={control} setValue={setValue} getValues={getValues} />
              </Box>

              {/* Section 3 - Education History */}
              <Box id="section-education" sx={{ scrollMarginTop: "100px", mb: 4 }}>
                <EducationDetails control={control} />
              </Box>

              {/* Section 4 - Professional Profile & Job Preferences */}
              <Box id="section-professional" sx={{ scrollMarginTop: "100px", mb: 4 }}>
                <ProfessionalProfileDetails control={control} setValue={setValue} />
              </Box>

              {/* Section 5 - Employment History */}
              <Box id="section-employment" sx={{ scrollMarginTop: "100px", mb: 4 }}>
                <EmploymentHistoryDetails control={control} setValue={setValue} />
              </Box>

              {/* Section 6 - Call Outcome & Disposition Details */}
              <Box id="section-call-outcome" sx={{ scrollMarginTop: "100px", mb: 4 }}>
                <CallDisposition control={control} />
                {disposition && (
                  <Box sx={{ mt: 3 }}>
                    <DispositionBranch disposition={disposition} control={control} />
                  </Box>
                )}
                {showLineup && (
                  <Box sx={{ mt: 3 }}>
                    <LineupScheduledDetails control={control} />
                  </Box>
                )}
              </Box>

              {/* Section 7 - Review & Final Submission */}
              <Box id="section-review-submit" sx={{ scrollMarginTop: "100px", mb: 6 }}>
                {mutation.isError && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    Submission failed: {(mutation.error as Error)?.message ?? "Server error. Please try again."}
                  </Alert>
                )}

                <CandidateReview
                  values={formValues as CandidateIntakeSchema}
                  onSubmit={handleFinalSubmit}
                  isSubmitting={mutation.isPending}
                />
              </Box>
            </form>
          </FormProvider>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Divider,
  Paper,
  Stack,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import CancelIcon from "@mui/icons-material/Cancel";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

interface MatchEvidence {
  requirement: string;
  candidate_evidence: string;
  status: string;
}

export interface MatchDetailData {
  match_id: string;
  candidate_name: string;
  candidate_id: string;
  job_title: string;
  job_id: string;
  overall_score: number;
  status: string;
  score_breakdown: {
    skills?: number;
    experience?: number;
    role_responsibilities?: number;
    education?: number;
    location?: number;
    shift?: number;
    other?: number;
  };
  matched_requirements?: MatchEvidence[];
  missing_requirements?: MatchEvidence[];
  partial_requirements?: MatchEvidence[];
  llm_validation?: {
    llm_validated: boolean;
    confidence_score: number;
    explanation: string;
    key_strengths?: string[];
    potential_risks?: string[];
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: MatchDetailData | null;
}

export function MatchDetailModal({ open, onClose, data }: Props) {
  if (!data) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success.main";
    if (score >= 70) return "primary.main";
    if (score >= 60) return "warning.main";
    return "error.main";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: "Strong Match", color: "success" as const };
    if (score >= 70) return { label: "Good / Review", color: "primary" as const };
    if (score >= 60) return { label: "Partial Match", color: "warning" as const };
    return { label: "Low Match", color: "error" as const };
  };

  const badge = getScoreBadge(data.overall_score);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Match Evidence & Score Breakdown
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {data.candidate_name} ({data.candidate_id}) ⟷ {data.job_title} ({data.job_id})
          </Typography>
        </Box>
        <Chip label={badge.label} color={badge.color} variant="filled" sx={{ fontWeight: 700 }} />
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ py: 2.5 }}>
        {/* Overall Score Header Banner */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            bgcolor: "background.default",
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
              Calculated Overall Fit
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: getScoreColor(data.overall_score) }}>
              {data.overall_score}%
            </Typography>
          </Box>
          <Box sx={{ maxWidth: 450, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Composite weighted match calculated deterministically across skills, experience, responsibilities, qualification, and location.
            </Typography>
          </Box>
        </Paper>

        {/* 7-Criteria Weighted Score Breakdown */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }} color="primary">
          Weighted Criteria Breakdown
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Technical Skills (35%)", value: data.score_breakdown?.skills ?? 0 },
            { label: "Relevant Experience (25%)", value: data.score_breakdown?.experience ?? 0 },
            { label: "Role & Domain Fit (15%)", value: data.score_breakdown?.role_responsibilities ?? 0 },
            { label: "Education Qualification (10%)", value: data.score_breakdown?.education ?? 0 },
            { label: "Location & Commute (5%)", value: data.score_breakdown?.location ?? 0 },
            { label: "Shift Suitability (5%)", value: data.score_breakdown?.shift ?? 0 },
            { label: "Other Requirements (5%)", value: data.score_breakdown?.other ?? 0 },
          ].map((crit, idx) => (
            <Grid key={idx} size={{ xs: 12, sm: 6 }}>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{crit.label}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: getScoreColor(crit.value) }}>
                    {crit.value}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={crit.value}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: "rgba(255,255,255,0.08)",
                    "& .MuiLinearProgress-bar": { bgcolor: getScoreColor(crit.value) },
                  }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Sarvam AI Qualitative Validation */}
        {data.llm_validation && (
          <Box sx={{ mb: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(91,143,249,0.08)",
                border: "1px solid",
                borderColor: "primary.main",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <AutoAwesomeIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
                  Sarvam-105B Qualitative Validation
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                {data.llm_validation.explanation}
              </Typography>
              {data.llm_validation.key_strengths && data.llm_validation.key_strengths.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                  {data.llm_validation.key_strengths.map((st, i) => (
                    <Chip key={i} label={st} size="small" color="primary" variant="outlined" />
                  ))}
                </Stack>
              )}
            </Paper>
          </Box>
        )}

        {/* Itemized Evidence: Matched, Partial, Missing */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }} color="primary">
          Requirement-by-Requirement Evidence
        </Typography>

        <Stack spacing={1.5}>
          {/* Matched */}
          {data.matched_requirements?.map((m, i) => (
            <Paper
              key={`match-${i}`}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: "background.default",
                borderLeft: "4px solid #4caf87",
                border: "1px solid",
                borderColor: "divider",
                borderLeftColor: "#4caf87",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.requirement}</Typography>
                <Chip label="MATCH" size="small" color="success" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
              </Box>
              <Typography variant="caption" color="text.secondary">{m.candidate_evidence}</Typography>
            </Paper>
          ))}

          {/* Partial */}
          {data.partial_requirements?.map((p, i) => (
            <Paper
              key={`partial-${i}`}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: "background.default",
                borderLeft: "4px solid #ffb74d",
                border: "1px solid",
                borderColor: "divider",
                borderLeftColor: "#ffb74d",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <WarningIcon color="warning" fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.requirement}</Typography>
                <Chip label="PARTIAL" size="small" color="warning" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
              </Box>
              <Typography variant="caption" color="text.secondary">{p.candidate_evidence}</Typography>
            </Paper>
          ))}

          {/* Missing */}
          {data.missing_requirements?.map((mis, i) => (
            <Paper
              key={`missing-${i}`}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: "background.default",
                borderLeft: "4px solid #f4516c",
                border: "1px solid",
                borderColor: "divider",
                borderLeftColor: "#f4516c",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CancelIcon color="error" fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{mis.requirement}</Typography>
                <Chip label="MISSING" size="small" color="error" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
              </Box>
              <Typography variant="caption" color="text.secondary">{mis.candidate_evidence}</Typography>
            </Paper>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close Evidence Viewer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

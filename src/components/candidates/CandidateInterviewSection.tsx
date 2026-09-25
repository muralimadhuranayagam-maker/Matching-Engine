import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  LinearProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import PsychologyIcon from "@mui/icons-material/Psychology";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import StarIcon from "@mui/icons-material/Star";
import { useQuery } from "@tanstack/react-query";
import { interviewService } from "../../services/interviewService";

export function CandidateInterviewSection({ candidateId }: { candidateId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["candidate-interviews", candidateId],
    queryFn: () => interviewService.getCandidateSessions(candidateId),
    enabled: Boolean(candidateId),
    staleTime: 10000,
  });

  const [expandedSession, setExpandedSession] = useState<string | false>(false);

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSession(isExpanded ? panel : false);
  };

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading AI Interview Agent evaluations...
          </Typography>
        </Box>
      </Paper>
    );
  }

  if (isError || !data || data.total_sessions === 0) {
    return (
      <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <RecordVoiceOverIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            7. AI Interview Agent Screening (MCP)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          No active interview recordings or evaluation completed yet for this candidate. The SnapServe AI Voice Agent dynamically generates questions from candidate form data and evaluates answers against JD criteria upon call initiation.
        </Typography>
      </Paper>
    );
  }

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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PsychologyIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
            7. AI Interview Agent Screening & JD Evaluation (MCP)
          </Typography>
        </Box>
        <Chip
          label={`${data.total_sessions} Session${data.total_sessions > 1 ? "s" : ""}`}
          color="primary"
          size="small"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Stack spacing={2}>
        {data.sessions.map((session) => {
          const evalData = session.evaluation;
          const score = session.interview_score || evalData?.overall_interview_score || 0;

          return (
            <Accordion
              key={session.session_id}
              expanded={expandedSession === session.session_id || data.total_sessions === 1}
              onChange={handleChange(session.session_id)}
              sx={{
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px !important",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", pr: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Session ID: {session.session_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {session.job_id ? `Target Job: ${session.job_id}` : "General Screening"} • {new Date(session.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center" }}>
                    {score > 0 && (
                      <Chip
                        icon={<StarIcon sx={{ fontSize: "14px !important" }} />}
                        label={`Score: ${score.toFixed(1)}%`}
                        color={score >= 75 ? "success" : score >= 60 ? "warning" : "error"}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                    <Chip
                      label={session.status}
                      size="small"
                      variant="outlined"
                      color={session.status === "EVALUATED" ? "success" : "info"}
                    />
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                {/* Score Progress */}
                {score > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        JD Competency & Interview Fit Score
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {score.toFixed(1)} / 100
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={score}
                      color={score >= 75 ? "success" : score >= 60 ? "warning" : "error"}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                )}

                {/* Evaluation Insights */}
                {evalData && (
                  <Box sx={{ mb: 2 }}>
                    {evalData.executive_summary && (
                      <Alert severity="info" sx={{ mb: 1.5, py: 0.5, fontSize: "0.85rem" }}>
                        <strong>AI Summary:</strong> {evalData.executive_summary}
                      </Alert>
                    )}

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                      {/* Strengths */}
                      {evalData.strengths && evalData.strengths.length > 0 && (
                        <Paper sx={{ p: 1.5, bgcolor: "rgba(46, 125, 50, 0.08)", border: "1px solid rgba(46, 125, 50, 0.2)" }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "success.main", display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                            <CheckCircleIcon sx={{ fontSize: 14 }} /> Verified Strengths
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: "0.8rem" }}>
                            {evalData.strengths.map((str, i) => (
                              <li key={i}>{str}</li>
                            ))}
                          </ul>
                        </Paper>
                      )}

                      {/* Gaps */}
                      {evalData.gaps && evalData.gaps.length > 0 && (
                        <Paper sx={{ p: 1.5, bgcolor: "rgba(211, 47, 47, 0.08)", border: "1px solid rgba(211, 47, 47, 0.2)" }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "error.main", display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                            <CancelIcon sx={{ fontSize: 14 }} /> Identified Gaps / Risks
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: "0.8rem" }}>
                            {evalData.gaps.map((gap, i) => (
                              <li key={i}>{gap}</li>
                            ))}
                          </ul>
                        </Paper>
                      )}
                    </Box>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Paper>
  );
}

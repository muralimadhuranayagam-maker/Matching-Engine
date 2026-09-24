import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  Card,
  CardContent,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import DescriptionIcon from "@mui/icons-material/Description";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { dashboardService } from "../../services/dashboardService";

interface Props {
  onNavigateTab: (tab: string) => void;
}

export function MatchingDashboard({ onNavigateTab }: Props) {
  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: () => dashboardService.getSummary(),
  });

  const { data: recent, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["recentMatches"],
    queryFn: () => dashboardService.getRecentMatches(10),
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 70) return "primary";
    if (score >= 60) return "warning";
    return "error";
  };

  return (
    <Box>
      {/* Welcome Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Recruitment Matching Engine V1
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deterministic weighted scoring & Sarvam-105B AI validation pipeline
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetchSummary()}>
            Refresh
          </Button>
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => onNavigateTab("candidate_intake")}>
            New Candidate
          </Button>
        </Stack>
      </Paper>

      {/* Metrics Summary Cards (Requirement 35) */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          {
            title: "Total Candidates",
            value: summary?.total_candidates ?? 0,
            icon: <PeopleIcon sx={{ fontSize: 28, color: "primary.main" }} />,
            subtitle: "Profiles in database",
            action: () => onNavigateTab("candidates"),
          },
          {
            title: "Active Job Descriptions",
            value: summary?.total_active_jobs ?? 0,
            icon: <DescriptionIcon sx={{ fontSize: 28, color: "secondary.main" }} />,
            subtitle: `${summary?.jobs_processed ?? 0} processed into canonical JSON`,
            action: () => onNavigateTab("jobs"),
          },
          {
            title: "Matches Generated",
            value: summary?.matches_generated ?? 0,
            icon: <BoltIcon sx={{ fontSize: 28, color: "#ffb74d" }} />,
            subtitle: "Candidate ↔ Job pairs evaluated",
            action: () => onNavigateTab("candidates"),
          },
          {
            title: "Strong Matches (≥ 80%)",
            value: summary?.strong_matches ?? 0,
            icon: <CheckCircleIcon sx={{ fontSize: 28, color: "success.main" }} />,
            subtitle: "High hiring suitability",
            action: () => onNavigateTab("candidates"),
          },
        ].map((card, idx) => (
          <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" },
              }}
              onClick={card.action}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {card.title}
                  </Typography>
                  {card.icon}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>
                  {isLoadingSummary ? <CircularProgress size={24} /> : card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.subtitle}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Matches Log (Requirement 35) */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Recent Match Generations
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Latest candidate-job pairs processed by the matching pipeline
            </Typography>
          </Box>
          <Chip label="Live Feed" color="success" variant="outlined" size="small" />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: "background.default" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Candidate Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Matched Job Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Overall Score</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Match Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Evaluated At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingRecent ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : !recent?.recent_matches.length ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No matches recorded yet. Submit a candidate or upload a Job Description to start.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                recent.recent_matches.map((m) => (
                  <TableRow key={m.match_id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{m.candidate_name}</TableCell>
                    <TableCell>{m.job_title}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${m.overall_score}%`}
                        color={getScoreColor(m.overall_score)}
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={m.status} size="small" variant="outlined" color={getScoreColor(m.overall_score)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(m.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

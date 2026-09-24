import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Drawer,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  IconButton,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import WorkIcon from "@mui/icons-material/Work";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { candidateService, type CandidateItem, type CandidateMatchItem } from "../../services/candidateService";
import { MatchDetailModal, type MatchDetailData } from "../matches/MatchDetailModal";

export function CandidatesList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [isMatchesDrawerOpen, setIsMatchesDrawerOpen] = useState(false);
  const [activeMatchData, setActiveMatchData] = useState<MatchDetailData | null>(null);
  const [isRawJsonOpen, setIsRawJsonOpen] = useState(false);
  const [rawJsonData, setRawJsonData] = useState<any>(null);

  // Fetch candidates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["candidates", searchTerm],
    queryFn: () => candidateService.getCandidates(searchTerm),
  });

  // Fetch candidate matching jobs
  const { data: matchesData, isLoading: isLoadingMatches, refetch: refetchMatches } = useQuery({
    queryKey: ["candidateMatches", selectedCandidate?.candidate_id],
    queryFn: () => candidateService.getCandidateMatches(selectedCandidate!.candidate_id),
    enabled: !!selectedCandidate && isMatchesDrawerOpen,
  });

  // Trigger manual rematch mutation
  const rematchMutation = useMutation({
    mutationFn: (candidateId: string) => candidateService.triggerMatching(candidateId),
    onSuccess: () => {
      refetchMatches();
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
    },
  });

  const handleOpenMatches = (cand: CandidateItem) => {
    setSelectedCandidate(cand);
    setIsMatchesDrawerOpen(true);
  };

  const handleOpenRawJson = (cand: CandidateItem) => {
    setRawJsonData(cand.profile);
    setIsRawJsonOpen(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 70) return "primary";
    if (score >= 60) return "warning";
    return "error";
  };

  return (
    <Box>
      {/* Top Header & Search Bar */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Candidate Directory & Matching
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review saved candidate profiles and inspect ranked Job Description matches
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Search by ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 260 }}
            />
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} size="medium">
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Candidates Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Table>
          <TableHead sx={{ bgcolor: "background.default" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Candidate ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Candidate Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contact Info</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Primary Skill</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submitted At</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                    Loading candidates...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !data?.candidates.length ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    No candidates found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Submit candidate information from the Candidate Intake tab to start matching.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.candidates.map((cand) => (
                <TableRow key={cand.candidate_id} hover>
                  <TableCell sx={{ fontWeight: 700, fontFamily: "monospace", color: "primary.main" }}>
                    {cand.candidate_id}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{cand.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{cand.phone || "N/A"}</Typography>
                    <Typography variant="caption" color="text.secondary">{cand.email || ""}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={cand.skill || "General"} size="small" variant="outlined" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Chip label={cand.work_status} size="small" color={cand.work_status === "FRESHER" ? "secondary" : "info"} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(cand.created_at).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<WorkIcon />}
                        onClick={() => handleOpenMatches(cand)}
                      >
                        Matches
                      </Button>
                      <IconButton size="small" onClick={() => handleOpenRawJson(cand)} title="View Profile JSON">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Candidate Matching Jobs Drawer (Requirement 27 & 29) */}
      <Drawer
        anchor="right"
        open={isMatchesDrawerOpen}
        onClose={() => setIsMatchesDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 540 }, p: 3 } } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Matching Jobs for Candidate
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedCandidate?.name} ({selectedCandidate?.candidate_id})
            </Typography>
          </Box>
          <IconButton onClick={() => setIsMatchesDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Ranked Suitable Jobs ({matchesData?.matches?.length ?? 0})
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => selectedCandidate && rematchMutation.mutate(selectedCandidate.candidate_id)}
            disabled={rematchMutation.isPending}
          >
            {rematchMutation.isPending ? "Matching..." : "Re-run Matching"}
          </Button>
        </Box>

        {isLoadingMatches ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
              Evaluating candidate against active JDs...
            </Typography>
          </Box>
        ) : !matchesData?.matches.length ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: "center", bgcolor: "background.default", borderRadius: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              No matches generated yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Ensure active Job Descriptions are uploaded and click "Re-run Matching" above.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2} sx={{ overflowY: "auto", pr: 0.5 }}>
            {matchesData.matches.map((match: CandidateMatchItem, idx: number) => (
              <Card
                key={match.match_id}
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "background.default",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <CardContent sx={{ pb: "16px !important" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Box sx={{ maxWidth: "70%" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {idx + 1}. {match.job_title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {match.location} • {match.employment_type}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${match.overall_score}%`}
                      color={getScoreColor(match.overall_score)}
                      sx={{ fontWeight: 800, fontSize: "0.85rem" }}
                    />
                  </Box>

                  {/* Highlights */}
                  <Stack spacing={0.5} sx={{ mt: 1.5, mb: 2 }}>
                    {match.matched_requirements?.slice(0, 3).map((mr, i) => (
                      <Typography key={i} variant="caption" sx={{ color: "success.main", display: "block" }}>
                        ✓ {mr.requirement}
                      </Typography>
                    ))}
                    {match.missing_requirements?.slice(0, 2).map((ms, i) => (
                      <Typography key={i} variant="caption" sx={{ color: "error.main", display: "block" }}>
                        ✗ {ms.requirement}
                      </Typography>
                    ))}
                  </Stack>

                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AutoAwesomeIcon />}
                      onClick={() =>
                        setActiveMatchData({
                          ...match,
                          candidate_name: selectedCandidate?.name || "Candidate",
                          candidate_id: selectedCandidate?.candidate_id || "",
                        })
                      }
                    >
                      View Breakdown & Evidence
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Drawer>

      {/* Raw Profile JSON Viewer (Requirement 55) */}
      <Drawer
        anchor="right"
        open={isRawJsonOpen}
        onClose={() => setIsRawJsonOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 500 }, p: 3 } } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Stored Candidate Profile JSON
          </Typography>
          <IconButton onClick={() => setIsRawJsonOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box
          component="pre"
          sx={{
            p: 2,
            borderRadius: 1.5,
            bgcolor: "background.default",
            overflow: "auto",
            fontSize: "0.75rem",
            fontFamily: "monospace",
          }}
        >
          {JSON.stringify(rawJsonData, null, 2)}
        </Box>
      </Drawer>

      {/* Detailed Match Breakdown & Evidence Modal */}
      <MatchDetailModal
        open={!!activeMatchData}
        onClose={() => setActiveMatchData(null)}
        data={activeMatchData}
      />
    </Box>
  );
}

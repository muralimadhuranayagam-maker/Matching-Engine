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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import WorkIcon from "@mui/icons-material/Work";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
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

  // Multi-selection state
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "single"; candidate: CandidateItem } | { type: "bulk"; candidateIds: string[] } | null
  >(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // Delete single candidate mutation
  const deleteSingleMutation = useMutation({
    mutationFn: (candidateId: string) => candidateService.deleteCandidate(candidateId),
    onSuccess: (_, candidateId) => {
      setActionMessage({ type: "success", text: `Candidate (${candidateId}) deleted successfully.` });
      setSelectedCandidateIds((prev) => prev.filter((id) => id !== candidateId));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recentMatches"] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Failed to delete candidate" });
      setDeleteTarget(null);
    },
  });

  // Bulk delete candidates mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (candidateIds: string[]) => candidateService.bulkDeleteCandidates(candidateIds),
    onSuccess: (res) => {
      setActionMessage({ type: "success", text: res.message || `Successfully deleted ${res.deleted_count} candidate(s).` });
      setSelectedCandidateIds([]);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recentMatches"] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Failed to delete selected candidates" });
      setDeleteTarget(null);
    },
  });

  const candidateList = data?.candidates ?? [];
  const allSelected = candidateList.length > 0 && selectedCandidateIds.length === candidateList.length;
  const someSelected = selectedCandidateIds.length > 0 && selectedCandidateIds.length < candidateList.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(candidateList.map((c) => c.candidate_id));
    }
  };

  const handleToggleSelectOne = (candidateId: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "single") {
      deleteSingleMutation.mutate(deleteTarget.candidate.candidate_id);
    } else {
      bulkDeleteMutation.mutate(deleteTarget.candidateIds);
    }
  };

  const isDeleting = deleteSingleMutation.isPending || bulkDeleteMutation.isPending;

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
      {/* Alert Notification */}
      {actionMessage && (
        <Alert
          severity={actionMessage.type}
          sx={{ mb: 2.5, borderRadius: 2 }}
          onClose={() => setActionMessage(null)}
        >
          {actionMessage.text}
        </Alert>
      )}

      {/* Top Header & Search Bar */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Candidate Directory & Matching ({data?.total ?? 0})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review saved candidate profiles and inspect ranked Job Description matches
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            {selectedCandidateIds.length > 0 && (
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setDeleteTarget({ type: "bulk", candidateIds: selectedCandidateIds })}
                sx={{ fontWeight: 700 }}
              >
                Delete Selected ({selectedCandidateIds.length})
              </Button>
            )}
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
              sx={{ width: 240 }}
            />
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} size="medium">
              Refresh
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Multi-Select Floating Action Banner */}
      {selectedCandidateIds.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            px: 2.5,
            mb: 2,
            borderRadius: 2,
            bgcolor: "error.dark",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {selectedCandidateIds.length} Candidate{selectedCandidateIds.length > 1 ? "s" : ""} selected for batch deletion
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              size="small"
              variant="outlined"
              sx={{ color: "white", borderColor: "rgba(255,255,255,0.6)", "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" } }}
              onClick={() => setSelectedCandidateIds([])}
            >
              Cancel Selection
            </Button>
            <Button
              size="small"
              variant="contained"
              sx={{ bgcolor: "#ffffff", color: "error.main", fontWeight: 800, "&:hover": { bgcolor: "#f1f5f9" } }}
              startIcon={<DeleteSweepIcon />}
              onClick={() => setDeleteTarget({ type: "bulk", candidateIds: selectedCandidateIds })}
            >
              Delete All {selectedCandidateIds.length} Candidates
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Candidates Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Table>
          <TableHead sx={{ bgcolor: "background.default" }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                  disabled={isLoading || candidateList.length === 0}
                  aria-label="Select all candidates"
                />
              </TableCell>
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
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                    Loading candidates...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !candidateList.length ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    No candidates found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Submit candidate information from the Candidate Intake tab to start matching.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              candidateList.map((cand) => {
                const isChecked = selectedCandidateIds.includes(cand.candidate_id);
                return (
                  <TableRow
                    key={cand.candidate_id}
                    hover
                    selected={isChecked}
                    sx={{
                      transition: "background-color 0.15s ease",
                      "&.Mui-selected": {
                        bgcolor: "action.selected",
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isChecked}
                        onChange={() => handleToggleSelectOne(cand.candidate_id)}
                        aria-label={`Select candidate ${cand.candidate_id}`}
                      />
                    </TableCell>
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
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center" }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<WorkIcon />}
                          onClick={() => handleOpenMatches(cand)}
                        >
                          Matches
                        </Button>
                        <Tooltip title="View Profile JSON">
                          <IconButton size="small" onClick={() => handleOpenRawJson(cand)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Candidate">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget({ type: "single", candidate: cand })}
                            sx={{
                              "&:hover": {
                                bgcolor: "error.light",
                                color: "error.dark",
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog (Single & Multi) */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 2.5, p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
          <WarningAmberIcon color="error" sx={{ fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {deleteTarget?.type === "bulk"
              ? `Delete ${deleteTarget.candidateIds.length} Candidates?`
              : "Delete Candidate?"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ color: "text.primary", mb: 1.5 }}>
            {deleteTarget?.type === "bulk" ? (
              <>
                Are you sure you want to permanently delete all{" "}
                <strong>{deleteTarget.candidateIds.length}</strong> selected candidate profiles?
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <strong>{deleteTarget?.candidate.name}</strong> (
                <code>{deleteTarget?.candidate.candidate_id}</code>)?
              </>
            )}
          </DialogContentText>
          <Alert severity="warning" sx={{ fontSize: "0.82rem" }}>
            This action will permanently delete the candidate's profile and all generated job match records.
            This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteTarget(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ fontWeight: 700 }}
          >
            {isDeleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>


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

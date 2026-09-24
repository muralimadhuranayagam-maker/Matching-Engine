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
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { jobService, type JobItem, type JobMatchingCandidate } from "../../services/jobService";
import { JobUploadSection } from "./JobUploadSection";
import { MatchDetailModal, type MatchDetailData } from "../matches/MatchDetailModal";

export function JobsList() {
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [isCandidatesDrawerOpen, setIsCandidatesDrawerOpen] = useState(false);
  const [isCanonicalJsonOpen, setIsCanonicalJsonOpen] = useState(false);
  const [canonicalJsonData, setCanonicalJsonData] = useState<any>(null);
  const [activeMatchData, setActiveMatchData] = useState<MatchDetailData | null>(null);

  // Multi-selection state
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<{ type: "single"; job: JobItem } | { type: "bulk"; jobIds: string[] } | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch jobs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobService.getJobs(),
  });

  // Fetch reverse matching candidates for a job
  const { data: candidatesData, isLoading: isLoadingCandidates, refetch: refetchCandidates } = useQuery({
    queryKey: ["jobCandidates", selectedJob?.job_id],
    queryFn: () => jobService.getJobCandidates(selectedJob!.job_id),
    enabled: !!selectedJob && isCandidatesDrawerOpen,
  });

  // Trigger manual job rematch mutation
  const rematchMutation = useMutation({
    mutationFn: (jobId: string) => jobService.triggerJobMatching(jobId),
    onSuccess: () => {
      refetchCandidates();
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
    },
  });

  // Delete single JD mutation
  const deleteSingleMutation = useMutation({
    mutationFn: (jobId: string) => jobService.deleteJob(jobId),
    onSuccess: (_, jobId) => {
      setActionMessage({ type: "success", text: `Job Description (${jobId}) deleted successfully.` });
      setSelectedJobIds((prev) => prev.filter((id) => id !== jobId));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recentMatches"] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Failed to delete Job Description" });
      setDeleteTarget(null);
    },
  });

  // Bulk delete JDs mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (jobIds: string[]) => jobService.bulkDeleteJobs(jobIds),
    onSuccess: (res) => {
      setActionMessage({ type: "success", text: `Successfully deleted ${res.deleted_count} Job Description(s).` });
      setSelectedJobIds([]);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recentMatches"] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Failed to delete selected Job Descriptions" });
      setDeleteTarget(null);
    },
  });

  const jobsList = data?.jobs || [];
  const allSelected = jobsList.length > 0 && selectedJobIds.length === jobsList.length;
  const someSelected = selectedJobIds.length > 0 && selectedJobIds.length < jobsList.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(jobsList.map((j) => j.job_id));
    }
  };

  const handleToggleSelectOne = (jobId: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "single") {
      deleteSingleMutation.mutate(deleteTarget.job.job_id);
    } else {
      bulkDeleteMutation.mutate(deleteTarget.jobIds);
    }
  };

  const handleOpenCandidates = (job: JobItem) => {
    setSelectedJob(job);
    setIsCandidatesDrawerOpen(true);
  };

  const handleOpenCanonicalJson = (job: JobItem) => {
    setCanonicalJsonData(job.structured_data || {});
    setIsCanonicalJsonOpen(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 70) return "primary";
    if (score >= 60) return "warning";
    return "error";
  };

  const isDeleting = deleteSingleMutation.isPending || bulkDeleteMutation.isPending;

  return (
    <Box>
      {/* Upload Dropzone Section */}
      <JobUploadSection onUploadComplete={() => refetch()} />

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

      {/* JDs Table Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Job Descriptions ({data?.total ?? 0})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Canonical structured JDs, batch management, and reverse candidate matching
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {selectedJobIds.length > 0 && (
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setDeleteTarget({ type: "bulk", jobIds: selectedJobIds })}
                sx={{ fontWeight: 700 }}
              >
                Delete Selected ({selectedJobIds.length})
              </Button>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
              Refresh
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Multi-Select Floating Action Banner */}
      {selectedJobIds.length > 0 && (
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
            {selectedJobIds.length} Job Description{selectedJobIds.length > 1 ? "s" : ""} selected for batch deletion
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              size="small"
              variant="outlined"
              sx={{ color: "white", borderColor: "rgba(255,255,255,0.6)", "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" } }}
              onClick={() => setSelectedJobIds([])}
            >
              Cancel Selection
            </Button>
            <Button
              size="small"
              variant="contained"
              sx={{ bgcolor: "#ffffff", color: "error.main", fontWeight: 800, "&:hover": { bgcolor: "#f1f5f9" } }}
              startIcon={<DeleteSweepIcon />}
              onClick={() => setDeleteTarget({ type: "bulk", jobIds: selectedJobIds })}
            >
              Delete All {selectedJobIds.length} JDs
            </Button>
          </Stack>
        </Paper>
      )}

      {/* JDs Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
        }}
      >
        <Table>
          <TableHead sx={{ bgcolor: "background.default" }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                  disabled={isLoading || jobsList.length === 0}
                  aria-label="Select all job descriptions"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Job ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Job Title</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Document File</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type / Size</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Processing Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Uploaded At</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                    Loading Job Descriptions...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !jobsList.length ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    No Job Descriptions uploaded
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload your first JD above in PDF, DOCX, or TXT format.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              jobsList.map((job) => {
                const isChecked = selectedJobIds.includes(job.job_id);
                return (
                  <TableRow
                    key={job.job_id}
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
                        onChange={() => handleToggleSelectOne(job.job_id)}
                        aria-label={`Select job ${job.job_id}`}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: "monospace", color: "primary.main" }}>
                      {job.job_id}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{job.title}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{job.original_filename}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={job.file_type.toUpperCase()} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={job.processing_status}
                        size="small"
                        color={
                          job.processing_status === "COMPLETED"
                            ? "success"
                            : job.processing_status === "OCR_REQUIRED"
                            ? "warning"
                            : "error"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(job.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center" }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PeopleIcon />}
                          onClick={() => handleOpenCandidates(job)}
                          disabled={job.processing_status !== "COMPLETED"}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          Candidates
                        </Button>
                        <Tooltip title="View Canonical JSON">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenCanonicalJson(job)}
                            sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Job Description">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget({ type: "single", job })}
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
              ? `Delete ${deleteTarget.jobIds.length} Job Descriptions?`
              : "Delete Job Description?"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ color: "text.primary", mb: 1.5 }}>
            {deleteTarget?.type === "bulk" ? (
              <>
                Are you sure you want to permanently delete all{" "}
                <strong>{deleteTarget.jobIds.length}</strong> selected Job Descriptions?
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <strong>{deleteTarget?.job.title}</strong> (
                <code>{deleteTarget?.job.job_id}</code>)?
              </>
            )}
          </DialogContentText>
          <Alert severity="warning" sx={{ fontSize: "0.82rem" }}>
            This action will also remove any candidate match results and uploaded document files associated with this job.
            This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={isDeleting}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ fontWeight: 700 }}
          >
            {isDeleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reverse Matching: Job -> Candidates Drawer */}
      <Drawer
        anchor="right"
        open={isCandidatesDrawerOpen}
        onClose={() => setIsCandidatesDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 540 }, p: 3 } } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Matching Candidates for Job
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedJob?.title} ({selectedJob?.job_id})
            </Typography>
          </Box>
          <IconButton onClick={() => setIsCandidatesDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Ranked Suitable Candidates ({candidatesData?.total_candidates ?? 0})
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => selectedJob && rematchMutation.mutate(selectedJob.job_id)}
            disabled={rematchMutation.isPending}
          >
            {rematchMutation.isPending ? "Matching..." : "Re-run Matching"}
          </Button>
        </Box>

        {isLoadingCandidates ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
              Evaluating candidate pool against Job requirements...
            </Typography>
          </Box>
        ) : !candidatesData?.candidates.length ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: "center", bgcolor: "background.default", borderRadius: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              No candidates matched this job yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Submit candidate profiles or click "Re-run Matching" above.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2} sx={{ overflowY: "auto", pr: 0.5 }}>
            {candidatesData.candidates.map((cand: JobMatchingCandidate, idx: number) => (
              <Card
                key={cand.match_id}
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <CardContent sx={{ pb: "16px !important" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Box sx={{ maxWidth: "70%" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {idx + 1}. {cand.candidate_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {cand.candidate_id} • {cand.skill || "General"} • {cand.work_status}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${cand.overall_score}%`}
                      color={getScoreColor(cand.overall_score)}
                      sx={{ fontWeight: 800, fontSize: "0.85rem" }}
                    />
                  </Box>

                  {/* Highlights */}
                  <Stack spacing={0.5} sx={{ mt: 1.5, mb: 2 }}>
                    {cand.matched_requirements?.slice(0, 3).map((mr, i) => (
                      <Typography key={i} variant="caption" sx={{ color: "success.main", display: "block" }}>
                        ✓ {mr.requirement}
                      </Typography>
                    ))}
                    {cand.missing_requirements?.slice(0, 2).map((ms, i) => (
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
                          ...cand,
                          job_title: selectedJob?.title || "Job Requirement",
                          job_id: selectedJob?.job_id || "",
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

      {/* Canonical JD JSON Viewer */}
      <Drawer
        anchor="right"
        open={isCanonicalJsonOpen}
        onClose={() => setIsCanonicalJsonOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 500 }, p: 3 } } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Canonical JD JSON Specification
          </Typography>
          <IconButton onClick={() => setIsCanonicalJsonOpen(false)}>
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
          {JSON.stringify(canonicalJsonData, null, 2)}
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

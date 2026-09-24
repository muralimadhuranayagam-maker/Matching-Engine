import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import { jobService, type BatchUploadResult } from "../../services/jobService";

interface Props {
  onUploadComplete: () => void;
}

export function JobUploadSection({ onUploadComplete }: Props) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<BatchUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => {
        const ext = file.name.split(".").pop()?.toLowerCase();
        return ["pdf", "docx", "doc", "txt"].includes(ext || "");
      });
      if (droppedFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...droppedFiles]);
        setUploadResult(null);
        setUploadError(null);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await jobService.uploadBatchJobs(selectedFiles);
      setUploadResult(res);
      setSelectedFiles([]);
      onUploadComplete();
    } catch (err: any) {
      setUploadError(err.message || "Failed to process files");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3 },
        mb: 3,
        borderRadius: 2.5,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.primary" }}>
          Batch Upload Job Descriptions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: "0.875rem" }}>
          Upload multiple Job Descriptions simultaneously (PDF, DOCX, TXT). Supports 20–30+ files processed asynchronously via Sarvam-105B.
        </Typography>
      </Box>

      {/* Drag & Drop / File Selector Area */}
      <Box
        component="label"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          boxSizing: "border-box",
          border: "2px dashed",
          borderColor: isDragging ? "primary.main" : "divider",
          borderRadius: 2.5,
          py: 4.5,
          px: 3,
          textAlign: "center",
          bgcolor: isDragging ? "rgba(37, 99, 235, 0.04)" : "background.default",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          mb: 2,
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "rgba(37, 99, 235, 0.02)",
          },
        }}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {/* Upload Icon Badge */}
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: isDragging ? "primary.main" : "rgba(37, 99, 235, 0.08)",
            color: isDragging ? "#ffffff" : "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1.75,
            transition: "all 0.2s ease-in-out",
            transform: isDragging ? "scale(1.1)" : "scale(1)",
            boxShadow: isDragging ? "0 0 0 6px rgba(37, 99, 235, 0.15)" : "none",
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 28 }} />
        </Box>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}>
          Click to Select Files or Drop Job Descriptions Here
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: "0.85rem" }}>
          Select multiple documents to automatically parse and normalize JD criteria
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 1 }}>
          <Chip label="PDF" size="small" variant="outlined" sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600, borderColor: "divider", bgcolor: "background.paper" }} />
          <Chip label="DOCX" size="small" variant="outlined" sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600, borderColor: "divider", bgcolor: "background.paper" }} />
          <Chip label="TXT" size="small" variant="outlined" sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600, borderColor: "divider", bgcolor: "background.paper" }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", ml: 0.5 }}>
            • Max 15MB per file • 20–30+ files supported
          </Typography>
        </Box>
      </Box>

      {/* Selected File List Preview */}
      {selectedFiles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
              Files Selected for Upload ({selectedFiles.length})
            </Typography>
            <Button size="small" color="error" onClick={() => setSelectedFiles([])} sx={{ textTransform: "none", fontWeight: 600 }}>
              Clear All
            </Button>
          </Box>
          <Paper elevation={0} sx={{ maxHeight: 200, overflowY: "auto", bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <List dense disablePadding>
              {selectedFiles.map((file, idx) => (
                <ListItem
                  key={idx}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => handleRemoveFile(idx)} sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                  sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <InsertDriveFileIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={`${(file.size / 1024).toFixed(1)} KB`}
                    slotProps={{ primary: { sx: { fontSize: "0.85rem", fontWeight: 600, color: "text.primary" } } }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      )}

      {/* Upload Action Button */}
      {selectedFiles.length > 0 && (
        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUploadIcon />}
          onClick={handleUpload}
          disabled={isUploading}
          sx={{ fontWeight: 700 }}
        >
          {isUploading ? `Processing ${selectedFiles.length} JDs with Sarvam-105B...` : `Upload & Process ${selectedFiles.length} Files`}
        </Button>
      )}

      {/* Progress Bar during Upload */}
      {isUploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Extracting text, validating schemas, generating embeddings, and normalizing skills...
          </Typography>
        </Box>
      )}

      {/* Error Message */}
      {uploadError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {uploadError}
        </Alert>
      )}

      {/* Batch Processing Summary Results (Requirement 6 & 33) */}
      {uploadResult && (
        <Box sx={{ mt: 2.5 }}>
          <Alert severity={uploadResult.failed_files > 0 ? "warning" : "success"} sx={{ mb: 2 }}>
            Batch complete: {uploadResult.successful_files} of {uploadResult.total_files} files processed successfully into Canonical JD format.
          </Alert>
          <Paper elevation={0} sx={{ p: 2, bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
            <Stack spacing={1}>
              {uploadResult.jobs.map((j, i) => (
                <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {j.status === "COMPLETED" ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : j.status === "OCR_REQUIRED" ? (
                      <WarningIcon color="warning" fontSize="small" />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {j.filename}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {j.message}
                    </Typography>
                    <Chip
                      label={j.status}
                      size="small"
                      color={j.status === "COMPLETED" ? "success" : j.status === "OCR_REQUIRED" ? "warning" : "error"}
                      sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
      )}
    </Paper>
  );
}

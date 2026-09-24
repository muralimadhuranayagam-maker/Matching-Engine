import { createTheme } from "@mui/material";

/**
 * 1. Global Application Theme (Clean White / Off-White Canvas)
 * High-end SaaS look (Stripe / Vercel inspired)
 */
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb",
      light: "#3b82f6",
      dark: "#1d4ed8",
    },
    secondary: {
      main: "#7c3aed",
      light: "#8b5cf6",
      dark: "#6d28d9",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
    },
    divider: "#e2e8f0",
    success: { main: "#10b981", light: "#34d399", dark: "#059669" },
    error: { main: "#ef4444", light: "#f87171", dark: "#dc2626" },
    warning: { main: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
    action: {
      hover: "#f1f5f9",
      selected: "#e0f2fe",
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.75px" },
    h5: { fontWeight: 800, letterSpacing: "-0.5px" },
    h6: { fontWeight: 700, letterSpacing: "-0.3px" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, letterSpacing: "0.1px" },
    body1: { fontSize: "0.9375rem", lineHeight: 1.6 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
        },
        contained: {
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          "&:hover": { boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "#e2e8f0",
          fontSize: "0.875rem",
        },
        head: {
          fontWeight: 700,
          color: "#475569",
          backgroundColor: "#f8fafc",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "#f8fafc",
          },
        },
      },
    },
  },
});

/**
 * 2. Senior UI Designer Form Theme (Executive Black / Obsidian Luxury Command Center)
 * Applied to the Candidate Intake Form and form containers.
 */
export const darkFormTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#1d4ed8",
    },
    secondary: {
      main: "#a855f7",
      light: "#c084fc",
      dark: "#7e22ce",
    },
    background: {
      default: "#0a0e17",
      paper: "#111827",
    },
    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
    },
    divider: "rgba(255, 255, 255, 0.12)",
    success: { main: "#10b981", light: "#34d399", dark: "#059669" },
    error: { main: "#f43f5e", light: "#fb7185", dark: "#e11d48" },
    warning: { main: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.75px" },
    h5: { fontWeight: 800, letterSpacing: "-0.5px" },
    h6: { fontWeight: 700, letterSpacing: "-0.3px" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, letterSpacing: "0.1px" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#070b12",
          borderRadius: 8,
          transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.14)",
          },
          "&:hover": {
            backgroundColor: "#090f1a",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.35)",
          },
          "&.Mui-focused": {
            backgroundColor: "#090f1a",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#3b82f6",
            borderWidth: 2,
            boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.25)",
          },
        },
        input: {
          color: "#f8fafc",
          "&::placeholder": {
            color: "#64748b",
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#94a3b8",
          "&.Mui-focused": {
            color: "#60a5fa",
            fontWeight: 600,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: "#94a3b8",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
        },
        contained: {
          boxShadow: "0 4px 14px rgba(59, 130, 246, 0.35)",
          "&:hover": { boxShadow: "0 6px 20px rgba(59, 130, 246, 0.45)" },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

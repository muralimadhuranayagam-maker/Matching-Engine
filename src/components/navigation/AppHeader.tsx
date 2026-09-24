import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Container } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PeopleIcon from "@mui/icons-material/People";
import DescriptionIcon from "@mui/icons-material/Description";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BoltIcon from "@mui/icons-material/Bolt";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppHeader({ activeTab, onTabChange }: Props) {
  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "#ffffff",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: "space-between", flexWrap: "wrap", py: 1.25, minHeight: 64 }}>
          {/* Logo & Brand Title */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                p: 1.1,
                borderRadius: 2.5,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              }}
            >
              <BoltIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                color="text.primary"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.15,
                  fontSize: "1.05rem",
                  letterSpacing: "-0.3px",
                }}
              >
                Recruitment Matching Engine
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                Hybrid AI Candidate-JD Matching Engine V1
              </Typography>
            </Box>
          </Box>

          {/* Status & Navigation Tabs */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => onTabChange(val)}
              indicatorColor="primary"
              textColor="primary"
              sx={{
                minHeight: 44,
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  bgcolor: "primary.main",
                },
              }}
            >
              <Tab
                icon={<PersonAddIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Candidate Intake"
                value="candidate_intake"
                sx={{
                  minHeight: 44,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textTransform: "none",
                  color: "text.secondary",
                  "&.Mui-selected": { color: "primary.main", fontWeight: 700 },
                }}
              />
              <Tab
                icon={<PeopleIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Candidates"
                value="candidates"
                sx={{
                  minHeight: 44,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textTransform: "none",
                  color: "text.secondary",
                  "&.Mui-selected": { color: "primary.main", fontWeight: 700 },
                }}
              />
              <Tab
                icon={<DescriptionIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Job Descriptions"
                value="jobs"
                sx={{
                  minHeight: 44,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textTransform: "none",
                  color: "text.secondary",
                  "&.Mui-selected": { color: "primary.main", fontWeight: 700 },
                }}
              />
              <Tab
                icon={<DashboardIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Engine Dashboard"
                value="dashboard"
                sx={{
                  minHeight: 44,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textTransform: "none",
                  color: "text.secondary",
                  "&.Mui-selected": { color: "primary.main", fontWeight: 700 },
                }}
              />
            </Tabs>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

import { useState } from "react";
import { Box, Container } from "@mui/material";
import { AppHeader } from "./components/navigation/AppHeader";
import { CandidateIntakeForm } from "./components/candidate/CandidateIntakeForm";
import { CandidatesList } from "./components/candidates/CandidatesList";
import { JobsList } from "./components/jobs/JobsList";
import { MatchingDashboard } from "./components/dashboard/MatchingDashboard";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      {/* App Header with Navigation Tabs */}
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Body View */}
      <Container maxWidth="xl" sx={{ py: 3.5 }}>
        {activeTab === "candidate_intake" && (
          <Box>
            <CandidateIntakeForm onNavigateTab={setActiveTab} />
          </Box>
        )}

        {activeTab === "candidates" && (
          <Box>
            <CandidatesList />
          </Box>
        )}

        {activeTab === "jobs" && (
          <Box>
            <JobsList />
          </Box>
        )}

        {activeTab === "dashboard" && (
          <Box>
            <MatchingDashboard onNavigateTab={setActiveTab} />
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default App;

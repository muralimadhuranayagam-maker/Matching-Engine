// ============================================================
// Centralized option lists for all form select/autocomplete fields
// ============================================================

export const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
export const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Widowed"] as const;

export const WORK_STATUS_OPTIONS = ["FRESHER", "EXPERIENCED"] as const;

export const ENGLISH_COMMUNICATION_OPTIONS = [
  "Excellent", "Very good", "Good", "Average", "Poor"
] as const;

export const QUALIFICATION_OPTIONS = ["10th", "12th", "Graduate"] as const;

export const GRADUATION_STATUS_OPTIONS = ["UG", "PG"] as const;

export const BOARD_OPTIONS = [
  "State Board",
  "CBSE",
  "ICSE",
  "ISC",
  "IB (International Baccalaureate)",
  "IGCSE / Cambridge",
  "Open Board (NIOS)",
  "Other"
] as const;

export const SHIFT_BASE_OPTIONS = [
  "Any shift", "Day shift only", "Night shift only",
  "UK Shift", "US Shift", "AUS Shift", "Domestic Shift", "Rotational"
] as const;

export const DND_STATUS_OPTIONS = ["Activate", "Deactivate"] as const;

export const YES_NO_OPTIONS = ["Yes", "No"] as const;

export const CALL_DISPOSITION_OPTIONS = [
  "Poor Communication", "Non Hiring Zone", "Not Interested", "High Salary",
  "Age Limit", "Career Gap", "No Company", "Voice Mail",
  "Other Domain Experience", "Busy, Call me Back", "Work from Home",
  "Out Station Candidate", "Shift Issues", "Non Hiring University",
  "No Education Documents", "No Experience Documents", "Serving Notice",
  "Line Up Scheduled", "Call Disconnected", "Cooling Period",
  "Need Weekend Off", "Other Recruiter"
] as const;

export const POOR_COMMUNICATION_REASONS = [
  "Heavy accent", "Grammar issues", "Lack of vocabulary",
  "Unable to comprehend", "Stammering", "MTI", "Other"
] as const;

export const FIT_DOMESTIC_NON_VOICE_OPTIONS = [
  "Domestic (Voice)", "Non-Voice", "Neither"
] as const;

export const NOT_INTERESTED_REASONS = [
  "DND (Do Not Disturb)", "Just Joined Another Company", "Hate JobShop",
  "Calls are disturbing", "Not Looking for Change", "Other"
] as const;

export const PAYING_PROCESS_NAMES = [
  "Avengers Customer Service", "Avengers Technical Support", "Arena Quality Analyst",
  "Logan Technical Support", "Navigator Customer Support", "Arena Spanish Support",
  "Algebra Customer Support", "Dales Customer Support", "Emirates Customer Support",
  "Enchilda Customer Support", "Energy Australia Customer Support",
  "Air Asia Customer support", "RB Customer Support", "Netradyne Customer Support",
  "FB Customer Support", "Jade Dragon Technical Support",
  "Avalon Technical Support Voice-DVP", "RP Customer Support - Voice"
] as const;

export const REMINDER_ACTIVE_PROCESS_OPTIONS = ["Yes - Remind Me", "No"] as const;

export const CAREER_GAP_REASONS = [
  "No Gap", "Clearing backlogs", "Family business", "Pursuing Higher education",
  "Absconded from company", "Family issues", "Others"
] as const;

export const NO_COMPANY_REASONS = [
  "Poor Communication", "High Salary", "Not Interested", "Other Domain Experience",
  "Age Limit", "Career Gap", "No Education Documents", "No Experience Documents",
  "Skill Based Job Not Found"
] as const;

export const OTHER_DOMAIN_NAMES = [
  "Accounts", "Finance", "Software Development", "IT Support", "Sales",
  "Marketing", "Customer Service", "Administration", "Human Resources",
  "Banking", "Insurance", "Healthcare", "Retail", "Hospitality",
  "Education", "Engineering", "Manufacturing", "Legal", "Media"
] as const;

export const SHIFT_PREFERENCE_REASONS = [
  "Studying", "Married", "Family Pressure", "Health Issues",
  "Transportation Issues", "Other"
] as const;

export const GAP_REASONS = [
  "Finishing Backlogs", "Was ideal", "Family Concerns", "Financial Issues", "Others"
] as const;

export const DIPLOMA_TYPES = [
  "10+1 Diploma", "10+2 Diploma", "10+3 Diploma", "10+2 +3 Diploma"
] as const;

export const REJECTION_ROUNDS = [
  "HR Round", "VNA Round", "Operation Round", "Test Reject"
] as const;

export const COOLING_PERIOD_DURATIONS = [
  "1 Day Cooling Period", "7 Day Cooling Period", "15 Day Cooling Period",
  "30 Day Cooling Period", "45 Day Cooling Period", "60 Day Cooling Period",
  "90 Day Cooling Period"
] as const;

export const KNOWLEDGE_OF_HINDI_OPTIONS = [
  "Excellent - I am from North India, and I am as fluent in Hindi as a native speaker",
  "Very good - A Hindi speaker would easily understand what I say",
  "Good - I may have some difficulty understanding certain Hindi accents",
  "Average - I may not understand everything a Hindi-speaking customer says",
  "Poor - I may not be able to understand what a Hindi speaker says"
] as const;

export const BPO_EXPERIENCE_OPTIONS = ["FRESHER", "EXPERIENCED"] as const;

export const CAREER_GAP_GENDER_OPTIONS = ["Male", "Female"] as const;

export const SKILL_ROLE_OPTIONS = [
  "Software Engineer",
  "Customer Support Associate",
  "Technical Support Executive",
  "Quality Analyst",
  "Team Leader",
  "Process Trainer",
  "Operations Manager",
  "Data Entry Operator",
  "Sales Executive",
  "MIS Executive",
  "HR Executive",
  "Other"
] as const;

export const ROLE_SKILLS_MAP: Record<string, string[]> = {
  "Software Engineer": [
    "C#",
    "ASP.NET Core",
    ".NET Core",
    "MySQL",
    "React",
    "Angular",
    "JavaScript",
    "TypeScript",
    "Node.js",
    "Python",
    "Java",
    "Spring Boot",
    "SQL / PostgreSQL",
    "MongoDB",
    "FastAPI / Django",
    "Vue.js",
    "HTML5 / CSS3 / Tailwind",
    "REST APIs / GraphQL",
    "Docker & Kubernetes",
    "AWS / Azure / GCP",
    "Git / GitHub",
    "CI/CD Pipelines",
    "Microservices Architecture",
    "Unit Testing / TDD"
  ],
  "Customer Support Associate": [
    "Inbound Customer Support",
    "Outbound Customer Support",
    "Voice Process - Domestic",
    "Voice Process - International",
    "Live Chat Support",
    "Email Support & Ticketing",
    "Blended Customer Service",
    "Customer Retention & Loyalty",
    "Escalation Management",
    "CRM & Zendesk / Freshdesk",
    "Query & Grievance Handling",
    "Active Listening & Empathy",
    "First Contact Resolution (FCR)",
    "Customer Satisfaction (CSAT)"
  ],
  "Technical Support Executive": [
    "L1 Technical Support",
    "L2 Technical Support",
    "Hardware & Desktop Troubleshooting",
    "Software Installation & Configuration",
    "Network Support (LAN/WAN/DNS/DHCP)",
    "Remote Desktop Support (AnyDesk/TeamViewer)",
    "Active Directory & User Management",
    "VPN & Firewall Troubleshooting",
    "Windows OS / Linux / macOS Support",
    "ServiceNow / Jira Service Management",
    "Incident & Ticket Lifecycle Management",
    "Email & Outlook Configuration"
  ],
  "Quality Analyst": [
    "Call Auditing & Transaction Monitoring",
    "Call Scoring & Evaluation Form Scoring",
    "Fatal & Critical Error Identification",
    "CSAT & NPS Analysis",
    "First Contact Resolution (FCR) Tracking",
    "Recruiter & Agent Coaching / Feedback",
    "Calibration Sessions with Leadership",
    "Root Cause Analysis (RCA)",
    "Process Adherence & Compliance Monitoring",
    "Quality Metrics & Performance Dashboards"
  ],
  "Team Leader": [
    "Team Leadership & People Management",
    "SLA & KPI Tracking & Achievement",
    "Shrinkage & Attrition Control",
    "Rostering & Shift Scheduling",
    "Performance Appraisals & 1-on-1 Reviews",
    "Floor Management & Escalation Handling",
    "Recruitment & Agent Onboarding",
    "Productivity & Utilization Improvement",
    "Client Stakeholder Communication",
    "Process Governance & Reporting"
  ],
  "Process Trainer": [
    "New Hire Training (NHT)",
    "On-the-Job Training (OJT)",
    "Process Knowledge & Workflow Training",
    "Soft Skills & Communication Training",
    "Voice & Accent (V&A) Training",
    "Training Need Analysis (TNA)",
    "Process Knowledge Tests (PKT)",
    "Training Content & Curriculum Development",
    "Learning Management Systems (LMS)",
    "Throughput & Certification Management"
  ],
  "Operations Manager": [
    "Floor Operations Management",
    "Client Relationship & Account Management",
    "P&L & Budget Management",
    "Strategic Capacity & Workforce Planning",
    "Business Continuity Planning (BCP)",
    "Six Sigma & Lean Process Optimization",
    "Executive Stakeholder Reporting & QBRs",
    "Cross-functional Team Leadership",
    "Risk & Compliance Management"
  ],
  "Data Entry Operator": [
    "Fast Typing Speed (40+ WPM)",
    "High Accuracy Typing (98%+)",
    "Advanced Microsoft Excel",
    "Google Sheets",
    "Alpha-numeric Data Entry",
    "Data Cleansing & Validation",
    "Document Indexing & Archiving",
    "OCR & Data Extraction",
    "Confidential Data Management",
    "Speed & Attention to Detail"
  ],
  "Sales Executive": [
    "Outbound Cold Calling",
    "B2B Sales & Account Management",
    "B2C Direct Sales",
    "Lead Generation & Qualification",
    "Sales Pipeline & Funnel Management",
    "Product Demonstration & Pitching",
    "Negotiation & Closing Deals",
    "Cross-Selling & Up-Selling",
    "CRM Tools (Salesforce/HubSpot)",
    "Monthly & Quarterly Target Achievement"
  ],
  "MIS Executive": [
    "Advanced Microsoft Excel (VLOOKUP, INDEX-MATCH, XLOOKUP)",
    "Excel Macros & VBA Automation",
    "Power BI & Dashboard Design",
    "Tableau Data Visualizations",
    "Daily, Weekly & Monthly MIS Reporting",
    "SQL Queries & Database Extraction",
    "Data Cleaning & Transformation (ETL)",
    "Variance & Trend Analysis",
    "Automated Report Generation"
  ],
  "HR Executive": [
    "End-to-End Talent Acquisition",
    "Candidate Sourcing & Screening",
    "Job Portal Management (Naukri/LinkedIn/Indeed)",
    "Interview Scheduling & Coordination",
    "Offer Negotiation & Release",
    "Employee Onboarding & Induction",
    "HRMS & HRIS Administration",
    "Payroll & Attendance Tracking",
    "Statutory Compliance (PF/ESI/Gratuity)",
    "Employee Engagement & Retention",
    "Exit Interviews & FnF Settlement"
  ],
  "Other": [
    "Customer Service",
    "Technical Support",
    "Software Development",
    "Data Entry & Operations",
    "Sales & Business Development",
    "Problem Solving & Analytical Thinking",
    "Time Management",
    "Documentation & Reporting",
    "Team Collaboration"
  ]
};

export function getSkillsForRole(role?: string | null): string[] {
  if (!role || !role.trim()) {
    return [
      ...ROLE_SKILLS_MAP["Software Engineer"].slice(0, 8),
      ...ROLE_SKILLS_MAP["Customer Support Associate"].slice(0, 6),
      ...ROLE_SKILLS_MAP["Technical Support Executive"].slice(0, 4),
      ...ROLE_SKILLS_MAP["Sales Executive"].slice(0, 4)
    ];
  }

  const trimmed = role.trim();

  if (ROLE_SKILLS_MAP[trimmed]) {
    return ROLE_SKILLS_MAP[trimmed];
  }

  const match = Object.entries(ROLE_SKILLS_MAP).find(
    ([k]) => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) {
    return match[1];
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("software") || lower.includes("developer") || lower.includes("engineer") || lower.includes("programmer") || lower.includes("coder")) {
    return ROLE_SKILLS_MAP["Software Engineer"];
  }
  if (lower.includes("support") && (lower.includes("tech") || lower.includes("it"))) {
    return ROLE_SKILLS_MAP["Technical Support Executive"];
  }
  if (lower.includes("support") || lower.includes("customer") || lower.includes("bpo") || lower.includes("voice") || lower.includes("call")) {
    return ROLE_SKILLS_MAP["Customer Support Associate"];
  }
  if (lower.includes("quality") || lower.includes("qa") || lower.includes("audit")) {
    return ROLE_SKILLS_MAP["Quality Analyst"];
  }
  if (lower.includes("leader") || lower.includes("lead") || lower.includes("supervisor")) {
    return ROLE_SKILLS_MAP["Team Leader"];
  }
  if (lower.includes("train") || lower.includes("coach") || lower.includes("mentor")) {
    return ROLE_SKILLS_MAP["Process Trainer"];
  }
  if (lower.includes("operat") || lower.includes("delivery") || lower.includes("om")) {
    return ROLE_SKILLS_MAP["Operations Manager"];
  }
  if (lower.includes("data") || lower.includes("entry") || lower.includes("typing")) {
    return ROLE_SKILLS_MAP["Data Entry Operator"];
  }
  if (lower.includes("sale") || lower.includes("bd") || lower.includes("marketing")) {
    return ROLE_SKILLS_MAP["Sales Executive"];
  }
  if (lower.includes("mis") || lower.includes("report") || lower.includes("excel")) {
    return ROLE_SKILLS_MAP["MIS Executive"];
  }
  if (lower.includes("hr") || lower.includes("talent") || lower.includes("recruit")) {
    return ROLE_SKILLS_MAP["HR Executive"];
  }

  return ROLE_SKILLS_MAP["Other"] || [];
}


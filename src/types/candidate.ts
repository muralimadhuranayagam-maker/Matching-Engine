// ============================================================
// Candidate Intake Form – Production TypeScript Type Definitions
// Separates Master Candidate Profile from Recruiter Call Disposition
// ============================================================

export type Gender = "Male" | "Female" | "Other";
export type MaritalStatus = "Single" | "Married" | "Divorced" | "Widowed";
export type WorkStatus = "FRESHER" | "EXPERIENCED";
export type EnglishCommunication = "Excellent" | "Very good" | "Good" | "Average" | "Poor";
export type Qualification = "10th" | "12th" | "Graduate";
export type ShiftBase = "Any shift" | "Day shift only" | "Night shift only" | "UK Shift" | "US Shift" | "AUS Shift" | "Domestic Shift" | "Rotational";
export type DndStatus = "Activate" | "Deactivate";
export type YesNo = "Yes" | "No";
export type FitDomesticOrNonVoice = "Domestic (Voice)" | "Non-Voice" | "Neither";
export type BpoExperience = "FRESHER" | "EXPERIENCED";

export type CallDisposition =
  | "Poor Communication" | "Non Hiring Zone" | "Not Interested" | "High Salary"
  | "Age Limit" | "Career Gap" | "No Company" | "Voice Mail"
  | "Other Domain Experience" | "Busy, Call me Back" | "Work from Home"
  | "Out Station Candidate" | "Shift Issues" | "Non Hiring University"
  | "No Education Documents" | "No Experience Documents" | "Serving Notice"
  | "Line Up Scheduled" | "Call Disconnected" | "Cooling Period"
  | "Need Weekend Off" | "Other Recruiter";

export type KnowledgeOfHindi =
  | "Excellent - I am from North India, and I am as fluent in Hindi as a native speaker"
  | "Very good - A Hindi speaker would easily understand what I say"
  | "Good - I may have some difficulty understanding certain Hindi accents"
  | "Average - I may not understand everything a Hindi-speaking customer says"
  | "Poor - I may not be able to understand what a Hindi speaker says";

// ------------------------------------------------------------
// Master Candidate Profile Structure
// ------------------------------------------------------------

export interface PersonalInformation {
  first_name: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  age?: number | null;
  marital_status: MaritalStatus;
  mother_tongue: string;
  knowledge_of_hindi: KnowledgeOfHindi;
}

export interface ContactInformation {
  phone: string;
  email: string;
}

export interface AddressBlock {
  address_line?: string;
  pincode: string;
  area: string;
  city: string;
  state?: string;
}

export interface AddressInformation {
  current: AddressBlock;
  permanent: AddressBlock;
}

export interface TenthEducation {
  school_name?: string;
  status: string;
  passing_year?: string;
  percentage?: number | null;
  gap_reason?: string;
}

export interface TwelfthEducation {
  school_or_college_name?: string;
  status: string;
  passing_year?: string;
  percentage?: number | null;
  gap_reason?: string;
}

export interface DiplomaEducation {
  institution_name?: string;
  status: string;
  diploma_type?: string;
  passing_year?: string;
  percentage?: number | null;
  gap_reason?: string;
}

export interface UndergraduationEducation {
  college_name?: string;
  university_name?: string;
  degree?: string;
  passing_year?: string;
  percentage?: number | null;
  cgpa?: number | null;
  gap_reason?: string;
}

export interface GraduationEducation {
  college_name?: string;
  university_name?: string;
  degree?: string;
  status: string;
  passing_year?: string;
  percentage?: number | null;
  cgpa?: number | null;
  gap_reason?: string;
  undergraduation?: UndergraduationEducation;
}

export interface EducationHistory {
  tenth: TenthEducation;
  twelfth: TwelfthEducation;
  diploma: DiplomaEducation;
  graduation: GraduationEducation;
}

export interface ProfessionalProfile {
  work_status: WorkStatus;
  total_experience_years?: number | null;
  total_experience_months?: number | null;
  total_companies: number;
  skill_role: string;
  skill: string;
  industry: string;
  english_communication: EnglishCommunication;
}

export interface CurrentEmployment {
  company_name?: string;
  role?: string;
  process_name?: string;
  skill?: string;
  joining_date?: string;
  last_working_day?: string;
  monthly_salary?: number | null;
  notice_period?: string;
  reason_for_leaving?: string;
}

export interface PreviousCompanyEntry {
  company_name: string;
  process_name: string;
  skill: string;
  role: string;
  start_date: string;
  end_date: string;
  last_salary?: number | null;
  reason_for_leaving?: string;
  has_pay_slip: YesNo;
  has_offer_letter: YesNo;
  has_experience_letter: YesNo;
}

export interface EmploymentHistory {
  current: CurrentEmployment;
  previous_companies: PreviousCompanyEntry[];
}

export interface JobPreferences {
  job_city: string;
  preferred_area?: string;
  shift_base: ShiftBase;
  work_from_home: boolean;
  expected_salary_monthly?: number | null;
}

export interface SalaryInformation {
  current_monthly_salary?: number | null;
  expected_monthly_salary?: number | null;
}

export interface AvailabilityInformation {
  last_working_day?: string;
  notice_period?: string;
  available_from?: string;
}

// ------------------------------------------------------------
// Recruiter Call Disposition & Branching Objects
// ------------------------------------------------------------

export type PoorCommunicationReason = "Heavy accent" | "Grammar issues" | "Lack of vocabulary" | "Unable to comprehend" | "Stammering" | "MTI" | "Other";
export interface PoorCommunicationAssessment {
  poor_communication_reason: PoorCommunicationReason;
  fit_domestic_or_non_voice: FitDomesticOrNonVoice;
}

export type StayType = "PG" | "With Family";
export interface NonHiringZoneDetails {
  candidate_pincode: string;
  candidate_area: string;
  no_hiring_zone_company: string;
  no_hiring_zone_process: string;
  stay_type: StayType;
  will_relocate: YesNo;
}

export type NotInterestedReason = "DND (Do Not Disturb)" | "Just Joined Another Company" | "Hate JobShop" | "Calls are disturbing" | "Not Looking for Change" | "Other";
export interface NotInterestedDetails { not_interested_reason: NotInterestedReason; }

export type PayingProcessName =
  | "Avengers Customer Service" | "Avengers Technical Support" | "Arena Quality Analyst"
  | "Logan Technical Support" | "Navigator Customer Support" | "Arena Spanish Support"
  | "Algebra Customer Support" | "Dales Customer Support" | "Emirates Customer Support"
  | "Enchilda Customer Support" | "Energy Australia Customer Support"
  | "Air Asia Customer support" | "RB Customer Support" | "Netradyne Customer Support"
  | "FB Customer Support" | "Jade Dragon Technical Support"
  | "Avalon Technical Support Voice-DVP" | "RP Customer Support - Voice";

export interface HighSalaryAssessment {
  expected_salary_monthly: number;
  communication_matches_salary: YesNo;
  experience_matches_salary: YesNo;
  has_paying_company: YesNo;
  paying_company_name?: string;
  paying_process_name?: PayingProcessName;
  reminder_active_process?: "Yes - Remind Me" | "No";
}

export interface AgeLimitDetails { candidate_dob_age_limit: string; }

export type CareerGapGender = "Male" | "Female";
export type CareerGapReason = "No Gap" | "Clearing backlogs" | "Family business" | "Pursuing Higher education" | "Absconded from company" | "Family issues" | "Others";
export interface CareerGapDetails {
  career_gap_gender: CareerGapGender;
  career_gap_dob: string;
  career_gap_reason: CareerGapReason;
}

export type NoCompanyReason = "Poor Communication" | "High Salary" | "Not Interested" | "Other Domain Experience" | "Age Limit" | "Career Gap" | "No Education Documents" | "No Experience Documents" | "Skill Based Job Not Found";
export interface NoCompanyDetails { no_company_reason: NoCompanyReason; }

export type OtherDomainName = "Accounts" | "Finance" | "Software Development" | "IT Support" | "Sales" | "Marketing" | "Customer Service" | "Administration" | "Human Resources" | "Banking" | "Insurance" | "Healthcare" | "Retail" | "Hospitality" | "Education" | "Engineering" | "Manufacturing" | "Legal" | "Media";
export interface OtherDomainExperienceDetails {
  other_domain_name: OtherDomainName;
  interested_in_bpo_job: YesNo;
}

export interface BusyCallMeBackDetails {
  able_to_judge_communication: YesNo;
  callback_english_communication?: EnglishCommunication;
  send_details_for_callback?: YesNo;
}

export interface WorkFromHomeDetails {
  wfh_address_pincode: string;
  flexible_to_work_from_office: YesNo;
}

export interface OutstationCandidateDetails { outstation_address_pincode: string; }

export type ShiftPreferenceReason = "Studying" | "Married" | "Family Pressure" | "Health Issues" | "Transportation Issues" | "Other";
export interface ShiftIssuesDetails {
  preferred_shift_choice: ShiftBase;
  shift_preference_reason: ShiftPreferenceReason;
  shift_go_to_lineup: YesNo;
}

export type GapReason = "Finishing Backlogs" | "Was ideal" | "Family Concerns" | "Financial Issues" | "Others";
export type DiplomaType = "10+1 Diploma" | "10+2 Diploma" | "10+3 Diploma" | "10+2 +3 Diploma";
export interface NonHiringUniversityDetails {
  non_hiring_uni_10th_status: string;
  non_hiring_uni_10th_year?: string;
  non_hiring_uni_10th_gap_reason?: GapReason;
  non_hiring_uni_12th_status: string;
  non_hiring_uni_12th_year?: string;
  non_hiring_uni_12th_gap_reason?: GapReason;
  non_hiring_uni_diploma_status: string;
  non_hiring_uni_diploma_type?: DiplomaType;
  non_hiring_uni_diploma_year?: string;
  non_hiring_uni_diploma_gap_reason?: GapReason;
  non_hiring_uni_graduation_status: string;
  non_hiring_uni_graduation_year?: string;
  non_hiring_uni_graduation_gap_reason?: GapReason;
}

export interface ServingNoticeDetails {
  serving_notice_skill: string;
  serving_notice_english_communication: EnglishCommunication;
  current_working_company: string;
  last_working_day: string;
  fit_target_company: string;
  fit_target_process: string;
  reminder_job_available: YesNo;
}

export type RejectionRound = "HR Round" | "VNA Round" | "Operation Round" | "Test Reject";
export type CoolingPeriodDuration = "1 Day Cooling Period" | "7 Day Cooling Period" | "15 Day Cooling Period" | "30 Day Cooling Period" | "45 Day Cooling Period" | "60 Day Cooling Period" | "90 Day Cooling Period";
export interface CoolingPeriodDetails {
  rejected_company_name: string;
  rejection_round: RejectionRound;
  rejection_date: string;
  cooling_period_duration: CoolingPeriodDuration;
}

export interface OtherRecruiterDetails {
  assigned_other_recruiter: string;
  other_recruiter_notes?: string;
}

export interface CallDisconnectedDetails {
  call_duration_seconds: number;
  call_disconnected_judge_communication: YesNo;
  call_disconnected_english_communication?: EnglishCommunication;
  call_disconnected_fit_domestic_or_non_voice?: FitDomesticOrNonVoice;
  call_disconnected_send_details_for_callback?: YesNo;
}

export interface LineupScheduledDetailsType {
  lineup_skill_role: string;
  lineup_skill: string;
  lineup_english_communication: EnglishCommunication;
  mother_tongue: string;
  knowledge_of_hindi: KnowledgeOfHindi;
  date_of_birth_lineup: string;
  bpo_experience: BpoExperience;
  total_companies_worked: number;
  last_monthly_salary: number;
  expected_monthly_salary: number;
  current_address_pincode: string;
  address_area: string;
  companies?: PreviousCompanyEntry[];
}

// ------------------------------------------------------------
// Final Target Payload Contract
// ------------------------------------------------------------

export interface CandidateIntakeFormPayload {
  personal: PersonalInformation;
  contact: ContactInformation;
  address: AddressInformation;
  education: EducationHistory;
  professional_profile: ProfessionalProfile;
  employment_history: EmploymentHistory;
  job_preferences: JobPreferences;
  salary: SalaryInformation;
  availability: AvailabilityInformation;
  dnd_status: DndStatus;
  call_disposition: CallDisposition;

  // Conditional Recruiter Disposition Branches
  poor_communication_assessment?: PoorCommunicationAssessment;
  non_hiring_zone_details?: NonHiringZoneDetails;
  not_interested_details?: NotInterestedDetails;
  high_salary_assessment?: HighSalaryAssessment;
  age_limit_details?: AgeLimitDetails;
  career_gap_details?: CareerGapDetails;
  no_company_details?: NoCompanyDetails;
  other_domain_experience_details?: OtherDomainExperienceDetails;
  busy_call_me_back_details?: BusyCallMeBackDetails;
  work_from_home_details?: WorkFromHomeDetails;
  outstation_candidate_details?: OutstationCandidateDetails;
  shift_issues_details?: ShiftIssuesDetails;
  non_hiring_university_details?: NonHiringUniversityDetails;
  serving_notice_details?: ServingNoticeDetails;
  cooling_period_details?: CoolingPeriodDetails;
  other_recruiter_details?: OtherRecruiterDetails;
  call_disconnected_details?: CallDisconnectedDetails;
  lineup_scheduled_details?: LineupScheduledDetailsType;

  is_submitted: boolean;
}

export type CandidateFormValues = Omit<CandidateIntakeFormPayload, "is_submitted">;

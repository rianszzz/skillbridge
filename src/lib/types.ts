export type Field = "informatics" | "design" | "marketing";
export type Role =
  | "Junior Web Developer"
  | "Junior Graphic Designer"
  | "Junior Digital Marketer";

export type Criterion = {
  id: string;
  label: string;
  weight: number;
  anchors: Record<"0" | "25" | "50" | "75" | "100", string>;
  anchorRequirements: Record<"0" | "25" | "50" | "75" | "100", string>;
  insufficientEvidence: string;
  acceptedEvidence: string;
};

type EvidenceQuote = { reference: string; quote: string };
type CriterionDetails = {
  met_indicators: string[];
  missing_indicators: string[];
  evidence_quotes: EvidenceQuote[];
  next_action: string;
};

export type CriterionScore = {
  criterion_id: string;
  evidence_sufficiency: "sufficient" | "insufficient_evidence";
  score: number | null;
  confidence: "low" | "medium" | "high";
  reason: string;
  evidence_refs: string[];
  details?: CriterionDetails;
};

export type AssessmentResult = {
  id: string;
  createdAt: string;
  role: Role;
  sourceUrl: string;
  evidenceType?: "github" | "image" | "pdf";
  rubric_version: "1.0" | "1.1";
  evidence_sufficiency: "sufficient" | "insufficient_evidence";
  criteria: CriterionScore[];
  strengths: string[];
  gaps: string[];
  limitations: string[];
  finalScore: number | null;
};

export type JobFitEvaluation = {
  score: number; // Anchor: 0, 25, 50, 75, 100
  fitLevel: "high" | "medium" | "low";
  matchingCriteria: string[];
  missingCriteria: string[];
  summary: string;
  recommendation: string;
};

export type TalentCandidate = {
  id: string;
  assessmentId: string;
  candidateName: string;
  email: string;
  phone?: string;
  location?: string;
  photoUrl?: string;
  resumeFileName?: string;
  resumeUrl?: string;
  coverLetterMode?: "upload" | "write" | "none";
  coverLetterFileName?: string;
  role: Role | string;
  field: string;
  finalScore: number;
  evidenceType: "github" | "image" | "pdf" | string;
  strengths: string[];
  gaps: string[];
  createdAt: string;
  sourceUrl?: string;
  isDemo: boolean;
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  fitEvaluation?: JobFitEvaluation | null;
  status?: ApplicationStatus;
  coverLetter?: string;
};

export type TalentPoolFilters = {
  field?: string;
  minScore?: number;
  jobId?: string | "all";
};

export type EmploymentType = "fulltime" | "internship" | "contract" | "parttime";
export type WorkplaceType = "onsite" | "hybrid" | "remote";
export type MinEducation = "smk" | "diploma" | "bachelor" | "any";
export type ExperienceLevel = "fresh_graduate" | "under_1_year" | "1_to_2_years";
export type CompensationType = "paid" | "unpaid";
export type JobStatus = "active" | "closed";
export type ApplicationStatus = "pending" | "reviewed" | "shortlisted" | "rejected" | "accepted";
export type JobEvidenceType = "github" | "image" | "pdf";

export type JobPosting = {
  id: string;
  recruiterId?: string;
  companyName: string;
  companyLogo?: string;
  title: string;
  field: Field;
  targetRole: Role | string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  location: string;
  minEducation: MinEducation;
  experienceLevel: ExperienceLevel;
  compensationType: CompensationType;
  salaryMin: number | null;
  salaryMax: number | null;
  showSalary: boolean;
  benefits: string[];
  highlights: string[];
  description?: string;
  responsibilities: string[];
  requiredSkills: string[];
  acceptedEvidenceTypes: JobEvidenceType[];
  minSkillbridgeScore: number;
  status: JobStatus;
  createdAt: string;
  updatedAt?: string;
  isDemo: boolean;
};

export type JobApplication = {
  id: string;
  jobId: string;
  recruiterId?: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  phone?: string;
  location?: string;
  photoUrl?: string;
  resumeFileName?: string;
  resumeUrl?: string;
  coverLetterMode?: "upload" | "write" | "none";
  coverLetterFileName?: string;
  assessmentId?: string | null;
  skillbridgeScore?: number | null;
  portfolioUrl?: string;
  coverLetter?: string;
  fitEvaluation?: JobFitEvaluation | null;
  status: ApplicationStatus;
  appliedAt: string;
  isDemo?: boolean;
  jobTitle?: string;
  companyName?: string;
};

export type JobFilters = {
  field?: Field | "all";
  targetRole?: Role | string;
  employmentType?: EmploymentType | "all";
  workplaceType?: WorkplaceType | "all";
  minEducation?: MinEducation | "all";
  experienceLevel?: ExperienceLevel | "all";
  compensationType?: CompensationType | "all";
  minScore?: number;
  candidateScore?: number;
  searchQuery?: string;
  status?: JobStatus | "all";
};



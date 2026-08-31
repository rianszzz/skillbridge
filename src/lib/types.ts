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

export type EvidenceQuote = { reference: string; quote: string };
export type CriterionDetails = {
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

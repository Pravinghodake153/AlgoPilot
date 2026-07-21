// ──────────────────────────────────────────────
// AlgoPilot — Shared TypeScript Types
// ──────────────────────────────────────────────

// ─── Enums ───────────────────────────────────

export type ProgrammingLanguage = "cpp" | "java" | "python" | "javascript" | "typescript" | "go";

export type Difficulty = "easy" | "medium" | "hard";

export type InterviewStyle = "standard" | "product" | "startup" | "service";

export type InterviewDuration = 10 | 20 | 30 | 45;

export type InterviewStatus =
  | "setup"
  | "in_progress"
  | "completed"
  | "cancelled";

export type MessageRole = "assistant" | "user" | "system";

export type InterviewMode = "voice" | "text";

export type AIState = "idle" | "listening" | "thinking" | "speaking";

// ─── Interview Setup ─────────────────────────

export interface InterviewSetup {
  language: ProgrammingLanguage;
  difficulty: Difficulty;
  style: InterviewStyle;
  duration: InterviewDuration;
}

// ─── Coding Problem ──────────────────────────

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  examples: ProblemExample[];
  constraints: string[];
  starterCode: Partial<Record<ProgrammingLanguage, string>>;
  tags: string[];
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

// ─── Interview ───────────────────────────────

export interface Interview {
  id: string;
  userId: string;
  language: ProgrammingLanguage;
  difficulty: Difficulty;
  style: InterviewStyle;
  duration: InterviewDuration;
  status: InterviewStatus;
  problemTitle: string;
  problemDescription: string;
  code: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

// ─── Message ─────────────────────────────────

export interface Message {
  id: string;
  interviewId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

// ─── Code Execution ──────────────────────────

export interface CodeExecutionRequest {
  sourceCode: string;
  languageId: number;
  stdin?: string;
}

export interface CodeExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  statusDescription: string;
  statusId: number;
  time: string | null;
  memory: number | null;
}

// ─── Report ──────────────────────────────────

export interface InterviewReport {
  id: string;
  interviewId: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  optimizationScore: number;
  codeQualityScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
  nextSteps?: string[];
  transcriptAnnotations?: { messageIndex: number; tag: string; rationale: string }[];
  timeComplexity?: string;
  spaceComplexity?: string;
  isSolved?: boolean;
  estimatedLevel?: string;
  isPublic?: boolean;
  createdAt: string;
}

// ─── Judge0 Language IDs ─────────────────────

export const LANGUAGE_CONFIG: Record<
  ProgrammingLanguage,
  { id: number; name: string; monacoId: string; extension: string }
> = {
  cpp: { id: 54, name: "C++", monacoId: "cpp", extension: "cpp" },
  java: { id: 62, name: "Java", monacoId: "java", extension: "java" },
  python: { id: 71, name: "Python", monacoId: "python", extension: "py" },
  javascript: {
    id: 63,
    name: "JavaScript",
    monacoId: "javascript",
    extension: "js",
  },
  typescript: {
    id: 74,
    name: "TypeScript",
    monacoId: "typescript",
    extension: "ts",
  },
  go: { id: 60, name: "Go", monacoId: "go", extension: "go" },
};

// ─── Duration Config ─────────────────────────

export const DURATION_CONFIG: {
  value: InterviewDuration;
  label: string;
  available: boolean;
  followUpQuestions: { min: number; max: number };
}[] = [
  {
    value: 10,
    label: "10 minutes",
    available: true,
    followUpQuestions: { min: 2, max: 3 },
  },
  {
    value: 20,
    label: "20 minutes",
    available: true,
    followUpQuestions: { min: 4, max: 5 },
  },
  {
    value: 30,
    label: "30 minutes",
    available: false,
    followUpQuestions: { min: 5, max: 7 },
  },
  {
    value: 45,
    label: "45 minutes",
    available: false,
    followUpQuestions: { min: 7, max: 10 },
  },
];

// ─── Supported Languages (for UI selectors) ─

export const SUPPORTED_LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "go", label: "Go" },
] as const;

// ─── Interview Durations (for UI selectors) ──

export const INTERVIEW_DURATIONS = [
  { value: 10, label: "10 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
] as const;

// ─── Interview Styles (for UI selectors) ─────

export const INTERVIEW_STYLES = [
  { value: "standard", label: "Standard" },
  { value: "product", label: "Product-company (DSA)" },
  { value: "startup", label: "Startup (Practical/System)" },
  { value: "service", label: "Service-company (Fundamentals)" },
] as const;

// ─── API Responses ───────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

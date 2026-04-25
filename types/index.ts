export interface RepoFile {
  path: string
  content: string
  size: number
  tokens: number
}

export interface DemoRepo {
  name: string
  totalFiles: number
  files: RepoFile[]
}

export interface FileEntry {
  path: string
  tokens: number
  category: "relevant" | "irrelevant" | "noise"
  size: number
}

export interface FileDecision {
  path: string
  tokens: number
  decision: "allowed" | "blocked" | "summarized"
  reason: string
  relevanceScore: number
}

export interface CodePatch {
  file: string
  before: string
  after: string
  description: string
}

export interface TestResult {
  description: string
  input: { subtotal: number; discount: number; taxRate: number }
  expected: number
  actual: number
  passed: boolean
}

export interface NovaOutput {
  rootCause: string
  patch: CodePatch
  testResult: TestResult
  tokensUsed: number
}

export interface BaselineRunData {
  task: string
  totalTokens: number
  irrelevantPct: number
  fileCount: number
  files: FileEntry[]
  novaOutput: NovaOutput
}

export interface MoonshotRunResult {
  tokenCount: number
  reductionPct: number
  fileCount: number
  files: FileDecision[]
  novaOutput: NovaOutput
}

export interface ContextPacket {
  task: string
  decisions: FileDecision[]
  totalTokens: number
  prompt: string
}

export interface ContextSnapshot {
  label: string
  tokenCount: number
  files: string[]
  preview: string
}

export type PipelineStage =
  | "task-input"
  | "repo-scanner"
  | "token-estimator"
  | "relevance-scorer"
  | "context-router"
  | "prompt-builder"
  | "nova-api"
  | "output"

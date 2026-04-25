import type { RepoFile, FileDecision } from "@/types"
import { scoreRelevance } from "./relevanceScorer"

const SUMMARY_TOKENS = 200
const LARGE_FILE_THRESHOLD = 5000
const LOW_RELEVANCE_THRESHOLD = 0.1
const SUMMARIZE_SCORE_THRESHOLD = 0.5

/**
 * Routes repo files into allowed/blocked/summarized decisions.
 * Precondition: budget > 0, files is non-empty
 * Postcondition: sum of allowed tokens <= budget, every file has exactly one decision
 */
export function routeContext(
  files: RepoFile[],
  task: string,
  budget = 20000
): FileDecision[] {
  const scored = files.map(f => ({
    file: f,
    score: scoreRelevance(f, task),
  }))

  // Sort descending by relevance score
  scored.sort((a, b) => b.score - a.score)

  const decisions: FileDecision[] = []
  let tokensUsed = 0

  for (const { file, score } of scored) {
    if (score < LOW_RELEVANCE_THRESHOLD) {
      decisions.push({
        path: file.path,
        decision: "blocked",
        reason: "Low relevance score",
        tokens: file.tokens,
        relevanceScore: score,
      })
    } else if (file.tokens > LARGE_FILE_THRESHOLD && score < SUMMARIZE_SCORE_THRESHOLD) {
      if (tokensUsed + SUMMARY_TOKENS <= budget) {
        decisions.push({
          path: file.path,
          decision: "summarized",
          reason: "Large file with partial relevance - summary included",
          tokens: SUMMARY_TOKENS,
          relevanceScore: score,
        })
        tokensUsed += SUMMARY_TOKENS
      } else {
        decisions.push({
          path: file.path,
          decision: "blocked",
          reason: "Token budget exceeded",
          tokens: file.tokens,
          relevanceScore: score,
        })
      }
    } else if (tokensUsed + file.tokens <= budget) {
      decisions.push({
        path: file.path,
        decision: "allowed",
        reason: "High relevance to task",
        tokens: file.tokens,
        relevanceScore: score,
      })
      tokensUsed += file.tokens
    } else {
      decisions.push({
        path: file.path,
        decision: "blocked",
        reason: "Token budget exceeded",
        tokens: file.tokens,
        relevanceScore: score,
      })
    }
  }

  if (!decisions.some(d => d.decision === "allowed" || d.decision === "summarized") && scored.length > 0) {
    const best = scored[0]
    const idx = decisions.findIndex(d => d.path === best.file.path)
    if (idx >= 0) {
      decisions[idx] = {
        path: best.file.path,
        decision: "allowed",
        reason: "Best available file included as budget fallback",
        tokens: best.file.tokens,
        relevanceScore: best.score,
      }
    }
  }

  return decisions
}

/**
 * Builds the optimized prompt from routing decisions.
 */
export function buildPrompt(
  task: string,
  decisions: FileDecision[],
  repoFiles: RepoFile[]
): string {
  const fileMap = new Map(repoFiles.map(f => [f.path, f]))
  let prompt = `Task: ${task}\n\nRelevant files:\n\n`

  for (const decision of decisions) {
    if (decision.decision === "allowed") {
      const file = fileMap.get(decision.path)
      if (file) {
        prompt += `// ${file.path}\n${file.content}\n\n`
      }
    } else if (decision.decision === "summarized") {
      prompt += `// ${decision.path} [SUMMARIZED]\n// ${decision.reason}\n\n`
    }
  }

  return prompt
}

/**
 * Returns total tokens for allowed + summarized decisions.
 */
export function countAllowedTokens(decisions: FileDecision[]): number {
  return decisions
    .filter(d => d.decision === "allowed" || d.decision === "summarized")
    .reduce((sum, d) => sum + d.tokens, 0)
}

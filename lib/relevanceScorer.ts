import type { RepoFile } from "@/types"

const BOOST_KEYWORDS = ["checkout", "discount", "tax", "cart", "test"]
const PENALTY_KEYWORDS = [
  "package-lock",
  "generated",
  "logs",
  "auth",
  "admin",
  "payments",
  "inventory",
  "analytics",
  "legacy",
  "readme",
  "node_modules",
]

/**
 * Scores a file's relevance to a task.
 * Precondition: file.path is non-empty, task is non-empty
 * Postcondition: 0.0 <= result <= 1.0
 */
export function scoreRelevance(file: RepoFile, task: string): number {
  let score = 0
  const pathLower = file.path.toLowerCase()
  const contentLower = (file.content || "").toLowerCase()
  const taskLower = task.toLowerCase()

  // Extract task keywords
  const taskWords = taskLower.split(/\W+/).filter(w => w.length > 3)

  // Boost for path keyword matches
  for (const kw of BOOST_KEYWORDS) {
    if (pathLower.includes(kw)) score += 0.25
    if (contentLower.includes(kw)) score += 0.08
  }

  // Boost for task-specific word matches in path
  for (const word of taskWords) {
    if (pathLower.includes(word)) score += 0.15
  }

  // Penalty for noise paths
  for (const kw of PENALTY_KEYWORDS) {
    if (pathLower.includes(kw)) score -= 0.35
  }

  // Extra penalty for lock files and logs
  if (pathLower.endsWith(".log") || pathLower.includes("package-lock")) {
    score -= 0.5
  }

  return Math.max(0, Math.min(1, score))
}

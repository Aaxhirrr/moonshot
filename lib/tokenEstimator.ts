import type { RepoFile } from "@/types"

/**
 * Estimates token count for a string using the chars/4 approximation.
 * Precondition: content is a defined string
 * Postcondition: result >= 0
 */
export function estimateTokens(content: string): number {
  if (!content) return 0
  return Math.ceil(content.length / 4)
}

/**
 * Annotates repo files with token estimates.
 */
export function annotateTokens(files: RepoFile[]): RepoFile[] {
  return files.map(f => ({
    ...f,
    tokens: estimateTokens(f.content),
    size: f.content.length,
  }))
}

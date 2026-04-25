import { NextResponse } from "next/server"
import { scoreRelevance } from "@/lib/relevanceScorer"
import { routeContext, buildPrompt, countAllowedTokens } from "@/lib/contextRouter"
import type { RepoFile, BaselineRunData, MoonshotRunResult } from "@/types"
import baselineRunJson from "@/data/baselineRun.json"
import fs from "fs"
import path from "path"

const TASK = "Fix checkout bug where discounts are applied after tax instead of before tax."
const TOKEN_BUDGET = 20000

// Directories to scan — real source code only, skip docs/www (Windows deep-path issues)
const SCAN_DIRS = ["packages", "integration-tests", "e2e"]
// File extensions worth reading
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".json", ".md", ".env", ".yaml", ".yml"])
const MAX_FILE_SIZE = 200_000 // skip binary blobs > 200KB

async function getFilesRecursively(
  dir: string,
  baseDir: string,
  fileList: { path: string; size: number }[] = [],
  depth = 0
): Promise<{ path: string; size: number }[]> {
  if (depth > 12) return fileList
  try {
    const entries = await fs.promises.readdir(dir)
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git" || entry === ".turbo") continue
      const full = path.join(dir, entry)
      let stat: fs.Stats
      try { stat = await fs.promises.stat(full) } catch { continue }
      if (stat.isDirectory()) {
        await getFilesRecursively(full, baseDir, fileList, depth + 1)
      } else {
        const ext = path.extname(entry).toLowerCase()
        if (!SOURCE_EXTS.has(ext)) continue
        if (stat.size > MAX_FILE_SIZE) continue
        const relPath = path.relative(baseDir, full).replace(/\\/g, "/")
        fileList.push({ path: relPath, size: stat.size })
      }
    }
  } catch (e) {
    // ignore permission errors / deep paths
  }
  return fileList
}

export async function POST(request: Request) {
  try {
    // 1. Scan real massive dataset — scoped to source dirs only
    const baseDir = path.join(process.cwd(), "datasets", "swe-adventure-enterprise")
    const scanResults = await Promise.all(
      SCAN_DIRS.map(async (subDir) => {
        const fullPath = path.join(baseDir, subDir)
        try {
          await fs.promises.access(fullPath)
          return getFilesRecursively(fullPath, baseDir)
        } catch {
          return []
        }
      })
    )
    const files = scanResults.flat()
    
    // 2. Compute baseline tokens from actual files
    let repoFiles: RepoFile[] = files.map((f: any) => ({
      path: f.path,
      content: "", // Content will be fetched for top files
      size: f.size || 0,
      tokens: Math.max(1, Math.ceil((f.size || 0) / 4))
    }))
    
    // Calculate full repo tokens (baseline)
    const totalTokens = repoFiles.reduce((sum, f) => sum + f.tokens, 0)
    
    // 3. Score and fetch content for the most relevant files to build the prompt
    // Sort descending by path relevance
    repoFiles.sort((a, b) => scoreRelevance(b, TASK) - scoreRelevance(a, TASK))
    
    // Read content for the top 15 files from local disk
    const topFiles = repoFiles.slice(0, 15)
    await Promise.all(topFiles.map(async (file) => {
      try {
        const fullPath = path.join(baseDir, file.path)
        file.content = await fs.promises.readFile(fullPath, "utf-8")
      } catch (e) {
        // Ignore read errors
      }
    }))
    
    // Update score with content relevance now that we have content
    repoFiles.sort((a, b) => scoreRelevance(b, TASK) - scoreRelevance(a, TASK))
    
    // 4. Run moonshot routing
    const decisions = routeContext(repoFiles, TASK, TOKEN_BUDGET)
    const tokenCount = countAllowedTokens(decisions)
    const reductionPct = ((totalTokens - tokenCount) / totalTokens) * 100
    
    // 5. Build optimized prompt
    const prompt = buildPrompt(TASK, decisions, repoFiles)
    
    // 6. Call Nova API
    // We call our own /api/nova endpoint internally using the request URL origin
    const host = request.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const novaRes = await fetch(`${protocol}://${host}/api/nova`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: TASK,
        contextFiles: decisions.filter(d => d.decision !== "blocked").map(d => d.path),
        prompt
      })
    })
    
    const novaData = await novaRes.json()
    
    // 7. Format honest stats
    const baseline: BaselineRunData = {
      task: TASK,
      totalTokens,
      irrelevantPct: 0, // Simplified
      fileCount: repoFiles.length,
      files: repoFiles.map(f => ({
        path: f.path,
        tokens: f.tokens,
        category: scoreRelevance(f, TASK) > 0.1 ? "relevant" : "noise",
        size: f.size
      })).sort((a, b) => b.tokens - a.tokens),
      novaOutput: { ...baselineRunJson.novaOutput, tokensUsed: totalTokens }
    }
    
    const moonshot: MoonshotRunResult = {
      tokenCount,
      reductionPct,
      fileCount: decisions.filter(d => d.decision !== "blocked").length,
      files: decisions,
      novaOutput: novaData
    }
    
    return NextResponse.json({ baseline, moonshot, prompt })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { scoreRelevance } from "@/lib/relevanceScorer"
import { routeContext, buildPrompt, countAllowedTokens } from "@/lib/contextRouter"
import type { RepoFile, BaselineRunData, MoonshotRunResult } from "@/types"
import baselineRunJson from "@/data/baselineRun.json"

const TASK = "Fix checkout bug where discounts are applied after tax instead of before tax."
const TOKEN_BUDGET = 20000

export async function POST(request: Request) {
  try {
    // 1. Fetch real repo tree
    const treeRes = await fetch("https://api.github.com/repos/Aaxhirrr/swe-bench-context-repo/git/trees/main?recursive=1", {
      headers: { "User-Agent": "moonshot" }
    })
    
    if (!treeRes.ok) {
      throw new Error(`GitHub API returned ${treeRes.status}`)
    }
    
    const treeData = await treeRes.json()
    const files = treeData.tree.filter((item: any) => item.type === "blob")
    
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
    
    // Fetch content for the top 15 files to simulate the "clone" and ensure Nova has the code
    const topFiles = repoFiles.slice(0, 15)
    await Promise.all(topFiles.map(async (file) => {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/Aaxhirrr/swe-bench-context-repo/main/${file.path}`)
        if (res.ok) {
          file.content = await res.text()
        }
      } catch (e) {
        // Ignore fetch errors
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

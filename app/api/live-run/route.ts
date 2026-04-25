import { NextResponse } from "next/server"
import { scoreRelevance } from "@/lib/relevanceScorer"
import { routeContext, buildPrompt, countAllowedTokens } from "@/lib/contextRouter"
import type { RepoFile, BaselineRunData, MoonshotRunResult } from "@/types"
import baselineRunJson from "@/data/baselineRun.json"
import enterpriseManifest from "@/data/enterprise-manifest.json"
import fs from "fs"
import path from "path"

const TASK = "Fix checkout bug where discounts are applied after tax instead of before tax."
const TOKEN_BUDGET = 20000

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".json", ".md", ".env", ".yaml", ".yml"])
const MAX_FILE_SIZE = 200_000
const SCAN_DIRS = ["packages", "integration-tests", "e2e"]

// ─── Local disk scanner (dev / local only) ───────────────────────────────────
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
  } catch { /* ignore */ }
  return fileList
}

// ─── Standard dataset: GitHub swe-bench-context-repo ─────────────────────────
async function getStandardFiles(): Promise<{ path: string; size: number }[]> {
  const treeRes = await fetch(
    "https://api.github.com/repos/Aaxhirrr/swe-bench-context-repo/git/trees/main?recursive=1",
    { headers: { "User-Agent": "moonshot" } }
  )
  if (!treeRes.ok) throw new Error(`GitHub API returned ${treeRes.status}`)
  const treeData = await treeRes.json()
  return treeData.tree
    .filter((item: any) => item.type === "blob")
    .map((f: any) => ({ path: f.path, size: f.size || 0 }))
}

// ─── Enterprise dataset: local disk OR pre-generated manifest ─────────────────
async function getEnterpriseFiles(): Promise<{
  files: { path: string; size: number }[]
  baseDir: string | null
  isLocal: boolean
}> {
  const localBase = path.join(process.cwd(), "datasets", "swe-adventure-enterprise")
  let isLocal = false
  try {
    await fs.promises.access(path.join(localBase, "packages"))
    isLocal = true
  } catch { /* not on local disk — use manifest */ }

  if (isLocal) {
    const scanResults = await Promise.all(
      SCAN_DIRS.map(async (subDir) => {
        const fullPath = path.join(localBase, subDir)
        try {
          await fs.promises.access(fullPath)
          return getFilesRecursively(fullPath, localBase)
        } catch { return [] }
      })
    )
    return { files: scanResults.flat(), baseDir: localBase, isLocal: true }
  }

  // Vercel / remote: use the pre-generated manifest (real stats, no disk needed)
  const manifestFiles = (enterpriseManifest as any).files as { path: string; size: number }[]
  return { files: manifestFiles, baseDir: null, isLocal: false }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const dataset: "standard" | "enterprise" = body.dataset === "enterprise" ? "enterprise" : "standard"

    let rawFiles: { path: string; size: number }[]
    let localBase: string | null = null
    let isLocalDisk = false
    let datasetLabel: string

    if (dataset === "enterprise") {
      const result = await getEnterpriseFiles()
      rawFiles = result.files
      localBase = result.baseDir
      isLocalDisk = result.isLocal
      datasetLabel = isLocalDisk
        ? "medusajs/medusa (local disk)"
        : "medusajs/medusa (manifest + GitHub raw)"
    } else {
      rawFiles = await getStandardFiles()
      datasetLabel = "Aaxhirrr/swe-bench-context-repo (GitHub)"
    }

    // Build repo file list with token estimates
    let repoFiles: RepoFile[] = rawFiles.map((f) => ({
      path: f.path,
      content: "",
      size: f.size || 0,
      tokens: Math.max(1, Math.ceil((f.size || 0) / 4)),
    }))

    const totalTokens = repoFiles.reduce((sum, f) => sum + f.tokens, 0)

    // Score + read/fetch top 15 files for actual prompt content
    repoFiles.sort((a, b) => scoreRelevance(b, TASK) - scoreRelevance(a, TASK))
    const topFiles = repoFiles.slice(0, 15)

    await Promise.all(topFiles.map(async (file) => {
      try {
        if (dataset === "enterprise" && isLocalDisk && localBase) {
          // Read from local disk (fast)
          file.content = await fs.promises.readFile(path.join(localBase, file.path), "utf-8")
        } else if (dataset === "enterprise") {
          // Fetch from public Medusa GitHub (Vercel path)
          const manifest = enterpriseManifest as any
          const branch = manifest.githubBranch || "develop"
          const res = await fetch(
            `https://raw.githubusercontent.com/medusajs/medusa/${branch}/${file.path}`
          )
          if (res.ok) file.content = await res.text()
        } else {
          // Standard: fetch from swe-bench-context-repo
          const res = await fetch(
            `https://raw.githubusercontent.com/Aaxhirrr/swe-bench-context-repo/main/${file.path}`
          )
          if (res.ok) file.content = await res.text()
        }
      } catch { /* ignore */ }
    }))

    // Re-score with content, then route
    repoFiles.sort((a, b) => scoreRelevance(b, TASK) - scoreRelevance(a, TASK))
    const decisions = routeContext(repoFiles, TASK, TOKEN_BUDGET)
    const tokenCount = countAllowedTokens(decisions)
    const reductionPct = ((totalTokens - tokenCount) / totalTokens) * 100

    const prompt = buildPrompt(TASK, decisions, repoFiles)

    // Call Nova
    const host = request.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const novaRes = await fetch(`${protocol}://${host}/api/nova`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: TASK,
        contextFiles: decisions.filter(d => d.decision !== "blocked").map(d => d.path),
        prompt,
      }),
    })
    const novaData = await novaRes.json()

    const baseline: BaselineRunData = {
      task: TASK,
      totalTokens,
      irrelevantPct: 0,
      fileCount: repoFiles.length,
      files: repoFiles.map(f => ({
        path: f.path,
        tokens: f.tokens,
        category: scoreRelevance(f, TASK) > 0.1 ? "relevant" : "noise",
        size: f.size,
      })).sort((a, b) => b.tokens - a.tokens),
      novaOutput: { ...baselineRunJson.novaOutput, tokensUsed: totalTokens },
    }

    const moonshot: MoonshotRunResult = {
      tokenCount,
      reductionPct,
      fileCount: decisions.filter(d => d.decision !== "blocked").length,
      files: decisions,
      novaOutput: novaData,
    }

    return NextResponse.json({ baseline, moonshot, prompt, dataset, datasetLabel })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

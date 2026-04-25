const fs = require("fs")
const path = require("path")

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".json", ".md", ".env", ".yaml", ".yml"])
const MAX_FILE_SIZE = 200_000
const SCAN_DIRS = ["packages", "integration-tests", "e2e"]

async function getFilesRecursively(dir, baseDir, fileList = [], depth = 0) {
  if (depth > 12) return fileList
  try {
    const entries = await fs.promises.readdir(dir)
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git" || entry === ".turbo") continue
      const full = path.join(dir, entry)
      let stat
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
  } catch (e) {}
  return fileList
}

async function main() {
  const baseDir = path.join(__dirname, "..", "datasets", "swe-adventure-enterprise")
  const results = await Promise.all(
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
  const files = results.flat()
  const totalTokens = files.reduce((sum, f) => sum + Math.max(1, Math.ceil(f.size / 4)), 0)

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "medusajs/medusa",
    githubRepo: "medusajs/medusa",
    githubBranch: "develop",
    fileCount: files.length,
    totalTokens,
    files: files.map(f => ({
      path: f.path,
      size: f.size,
      tokens: Math.max(1, Math.ceil(f.size / 4))
    }))
  }

  const outPath = path.join(__dirname, "..", "data", "enterprise-manifest.json")
  await fs.promises.writeFile(outPath, JSON.stringify(manifest, null, 2))
  console.log(`✅ Manifest written: ${files.length} files, ${totalTokens.toLocaleString()} tokens`)
  console.log(`   → ${outPath}`)
}

main().catch(console.error)

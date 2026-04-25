"use client"

import { useMemo, useState, useEffect } from "react"
import { DemoComparison } from "@/components/demo/demo-comparison"
import baselineRunJson from "@/data/baselineRun.json"
import demoRepoJson from "@/data/demoRepo.json"
import { buildPrompt, countAllowedTokens, routeContext } from "@/lib/contextRouter"
import type { BaselineRunData, ContextSnapshot, DemoRepo, MoonshotRunResult } from "@/types"

const TASK = "Fix checkout bug where discounts are applied after tax instead of before tax."
const TOKEN_BUDGET = 20000

function formatFilePreview(paths: string[]) {
  return paths
    .slice(0, 8)
    .map(path => `// ${path}\n${path.includes("package-lock") ? "{ ... 24k tokens of lockfile noise ... }" : "/* source preview included in context */"}`)
    .join("\n\n")
}

export default function AnalysisPage() {
  const [baselineFixture, setBaselineFixture] = useState<BaselineRunData>(baselineRunJson as BaselineRunData)
  const [moonshotRun, setMoonshotRun] = useState<MoonshotRunResult | null>(null)
  const [optimizedPrompt, setOptimizedPrompt] = useState<string>("")
  const demoRepo = demoRepoJson as DemoRepo

  useEffect(() => {
    fetch("/api/live-run", { method: "POST" })
      .then(res => res.json())
      .then(liveData => {
        if (liveData && liveData.baseline && liveData.moonshot) {
          setBaselineFixture(liveData.baseline)
          setMoonshotRun(liveData.moonshot)
          if (liveData.prompt) {
            setOptimizedPrompt(liveData.prompt)
          }
        }
      })
      .catch(() => null)
  }, [])

  const contextSnapshots = useMemo<{ before: ContextSnapshot; after: ContextSnapshot }>(() => {
    const baselineFiles = baselineFixture.files.map(file => file.path)
    
    // Fallback to demo calculation if moonshotRun is not loaded yet
    const fallbackDecisions = routeContext(demoRepo.files, TASK, TOKEN_BUDGET)
    const activeFiles = moonshotRun ? moonshotRun.files : fallbackDecisions
    const tokenCount = moonshotRun ? moonshotRun.tokenCount : countAllowedTokens(fallbackDecisions)
    
    const optimizedFiles = activeFiles
      .filter(file => file.decision === "allowed" || file.decision === "summarized")
      .map(file => file.path)

    return {
      before: {
        label: "Baseline Context",
        tokenCount: baselineFixture.totalTokens,
        files: baselineFiles,
        preview: formatFilePreview(baselineFiles),
      },
      after: {
        label: "moonshot Context",
        tokenCount: tokenCount,
        files: optimizedFiles,
        preview: optimizedPrompt || buildPrompt(TASK, fallbackDecisions, demoRepo.files).slice(0, 900),
      },
    }
  }, [baselineFixture, demoRepo.files, moonshotRun, optimizedPrompt])

  if (!moonshotRun) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2EFE5] px-4 py-6 text-[#111]">
        <div className="animate-pulse font-mono text-[11px] uppercase tracking-[0.2em] text-black/40">
          Scanning local dataset (medusajs/medusa)...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F2EFE5] px-4 py-6 text-[#111] md:px-8 lg:px-12">
      <nav className="mx-auto mb-8 flex max-w-7xl items-center justify-between rounded-2xl border border-black/[0.07] bg-white/55 px-5 py-3 backdrop-blur-xl">
        <a href="/" className="font-pixel text-xs tracking-[0.25em] text-black/65">moonshot</a>
        <div className="flex items-center gap-4">
          <a href="/ld" className="hidden text-xs tracking-widest text-black/35 transition hover:text-black/70 sm:block">
            LD
          </a>
          <a href="https://github.com/Aaxhirrr/moonshot" target="_blank" rel="noreferrer" className="hidden text-xs tracking-widest text-black/35 transition hover:text-black/70 sm:block">
            GitHub
          </a>
          <a href="/" className="rounded-xl border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-black/55 transition hover:bg-black/[0.03]">
            Home
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl">
        <DemoComparison
          task={TASK}
          baselineFixture={baselineFixture}
          baselineResult={baselineFixture}
          moonshotResult={moonshotRun}
          projectedMoonshotTokens={moonshotRun ? moonshotRun.tokenCount : 17920}
          isRunningBaseline={false}
          isRunningMoonshot={false}
          activeStage="output"
          beforeContext={contextSnapshots.before}
          afterContext={contextSnapshots.after}
          onRunBaseline={() => undefined}
          onRunMoonshot={() => undefined}
          onRunFullDemo={() => undefined}
          analysisOnly
        />

        <section className="mt-8 rounded-2xl border border-black/[0.07] bg-white/45 p-5 text-sm leading-relaxed text-black/40">
          Dataset note: this public demo commits sanitized mooncart fixtures only. The raw hackathon archive remains local and ignored because it contains environment files, IDE caches, and bulky source artifacts.
        </section>
      </div>
    </main>
  )
}

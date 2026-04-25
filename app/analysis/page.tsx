"use client"

import { useMemo } from "react"
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
  const baselineFixture = baselineRunJson as BaselineRunData
  const demoRepo = demoRepoJson as DemoRepo

  const moonshotRun = useMemo<MoonshotRunResult>(() => {
    const decisions = routeContext(demoRepo.files, TASK, TOKEN_BUDGET)
    const tokenCount = countAllowedTokens(decisions)
    const reductionPct = baselineFixture.totalTokens > 0
      ? ((baselineFixture.totalTokens - tokenCount) / baselineFixture.totalTokens) * 100
      : 0

    return {
      tokenCount,
      reductionPct,
      fileCount: decisions.filter(d => d.decision === "allowed" || d.decision === "summarized").length,
      files: decisions,
      novaOutput: {
        ...baselineFixture.novaOutput,
        tokensUsed: tokenCount,
      },
    }
  }, [baselineFixture, demoRepo.files])

  const contextSnapshots = useMemo<{ before: ContextSnapshot; after: ContextSnapshot }>(() => {
    const baselineFiles = baselineFixture.files.map(file => file.path)
    const optimizedFiles = moonshotRun.files
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
        tokenCount: moonshotRun.tokenCount,
        files: optimizedFiles,
        preview: buildPrompt(TASK, moonshotRun.files, demoRepo.files).slice(0, 900),
      },
    }
  }, [baselineFixture, demoRepo.files, moonshotRun])

  return (
    <main className="min-h-screen bg-[#F2EFE5] px-4 py-6 text-[#111] md:px-8 lg:px-12">
      <nav className="mx-auto mb-8 flex max-w-7xl items-center justify-between rounded-2xl border border-black/[0.07] bg-white/55 px-5 py-3 backdrop-blur-xl">
        <a href="/" className="font-pixel text-xs tracking-[0.25em] text-black/65">moonshot</a>
        <div className="flex items-center gap-4">
          <a href="/ld" className="hidden text-xs tracking-widest text-black/35 transition hover:text-black/70 sm:block">
            LD
          </a>
          <a href="/demo" className="hidden text-xs tracking-widest text-black/35 transition hover:text-black/70 sm:block">
            Stable Demo
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
          projectedMoonshotTokens={moonshotRun.tokenCount}
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

"use client"

import { useMemo } from "react"
import { LiveEngineRun } from "@/components/demo/live-engine-run"
import baselineRunJson from "@/data/baselineRun.json"
import demoRepoJson from "@/data/demoRepo.json"
import { countAllowedTokens, routeContext } from "@/lib/contextRouter"
import type { BaselineRunData, DemoRepo, MoonshotRunResult } from "@/types"

const TASK = "Fix checkout bug where discounts are applied after tax instead of before tax."
const TOKEN_BUDGET = 20000

export default function DemoPage() {
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

  return (
    <main className="min-h-screen bg-[#F2EFE5] px-4 py-6 text-[#111] md:px-8 lg:px-12">
      <nav className="mx-auto mb-8 flex max-w-7xl items-center justify-between rounded-2xl border border-black/[0.07] bg-white/55 px-5 py-3 backdrop-blur-xl">
        <a href="/" className="font-pixel text-xs tracking-[0.25em] text-black/65">moonshot</a>
        <div className="flex items-center gap-4">
          <a href="/ld" className="hidden text-xs tracking-widest text-black/35 transition hover:text-black/70 sm:block">
            Live Demo
          </a>
          <a href="/analysis" className="hidden text-xs tracking-widest text-black/35 transition hover:text-black/70 sm:block">
            Analysis
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
        <LiveEngineRun
          task={TASK}
          baselineFixture={baselineFixture}
          moonshotRun={moonshotRun}
        />
      </div>
    </main>
  )
}

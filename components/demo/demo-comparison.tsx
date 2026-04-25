"use client"

import type { BaselineRunData, ContextSnapshot, MoonshotRunResult, PipelineStage } from "@/types"
import { ArchitectureDiagram } from "./architecture-diagram"
import { ContextDiff } from "./context-diff"
import { FileDecisionTimeline } from "./file-decision-timeline"
import { NovaOutputPanel } from "./nova-output-panel"
import { TokenFlamegraph } from "./token-flamegraph"

type DemoComparisonProps = {
  task: string
  baselineFixture: BaselineRunData
  baselineResult: BaselineRunData | null
  moonshotResult: MoonshotRunResult | null
  projectedMoonshotTokens: number
  isRunningBaseline: boolean
  isRunningMoonshot: boolean
  activeStage?: PipelineStage
  beforeContext: ContextSnapshot
  afterContext: ContextSnapshot
  onRunBaseline: () => void
  onRunMoonshot: () => void
  onRunFullDemo: () => void
  analysisOnly?: boolean
}

function formatTokens(tokens: number) {
  return tokens.toLocaleString()
}

function MetricCard({
  label,
  value,
  detail,
  active = false,
}: {
  label: string
  value: string
  detail: string
  active?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-5 ${active ? "border-black/15 bg-white/80" : "border-black/[0.07] bg-white/55"}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-black/35">{label}</div>
      <div className="serif-numerals mt-3 text-4xl font-light text-black/85">{value}</div>
      <p className="mt-2 text-sm leading-relaxed text-black/40">{detail}</p>
    </div>
  )
}

export function DemoComparison({
  task,
  baselineFixture,
  baselineResult,
  moonshotResult,
  projectedMoonshotTokens,
  isRunningBaseline,
  isRunningMoonshot,
  activeStage,
  beforeContext,
  afterContext,
  onRunBaseline,
  onRunMoonshot,
  onRunFullDemo,
  analysisOnly = false,
}: DemoComparisonProps) {
  const baselineTokens = baselineFixture.totalTokens
  const moonshotTokens = moonshotResult?.tokenCount ?? projectedMoonshotTokens
  const savedTokens = Math.max(0, baselineTokens - moonshotTokens)
  const reductionPct = baselineTokens > 0 ? (savedTokens / baselineTokens) * 100 : 0
  const canRunMoonshot = Boolean(baselineResult) && !isRunningBaseline && !isRunningMoonshot
  const moonshotFileCount = moonshotResult?.fileCount ?? "4-6"

  return (
    <div className="space-y-6">
      <section id="analysis" className="rounded-[2rem] border border-black/[0.07] bg-[#fbf9f1]/85 p-6 shadow-sm md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-black/[0.07] bg-black/[0.035] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-black/45">
              Demo results and analysis
            </div>
            <h1 className="display max-w-4xl text-5xl leading-[0.95] md:text-7xl">
              After the run: what changed?
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-black/45">
              The live run above is the product moment. This analysis view breaks down the token economics, routing decisions, context diff, and Nova patch so judges can see exactly what moonshot optimized.
            </p>
          </div>

          <div className="rounded-2xl border border-black/[0.07] bg-white/70 p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-black/35">Developer task</div>
            <p className="mt-3 text-lg leading-relaxed text-black/70">{task}</p>
            {analysisOnly ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <a
                  href="/demo"
                  className="rounded-xl bg-[#111] px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#333]"
                >
                  Run live demo
                </a>
                <a
                  href="https://github.com/Aaxhirrr/moonshot"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-black/10 px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-black/65 transition hover:border-black/20 hover:bg-black/[0.03]"
                >
                  GitHub
                </a>
              </div>
            ) : (
              <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <button
                  onClick={onRunBaseline}
                  disabled={isRunningBaseline || isRunningMoonshot}
                  className="rounded-xl bg-[#111] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRunningBaseline ? "Running" : "Run baseline"}
                </button>
                <button
                  onClick={onRunMoonshot}
                  disabled={!canRunMoonshot}
                  className="rounded-xl border border-black/10 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-black/65 transition hover:border-black/20 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isRunningMoonshot ? "Routing" : "Run moonshot"}
                </button>
                <button
                  onClick={onRunFullDemo}
                  disabled={isRunningBaseline || isRunningMoonshot}
                  className="rounded-xl border border-emerald-700/15 bg-emerald-50 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Run all
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Baseline context"
          value={baselineResult || isRunningBaseline ? formatTokens(baselineTokens) : "Ready"}
          detail={`${baselineFixture.fileCount} files, ${baselineFixture.irrelevantPct}% irrelevant or noisy context.`}
          active={Boolean(baselineResult) || isRunningBaseline}
        />
        <MetricCard
          label="moonshot context"
          value={moonshotResult || isRunningMoonshot ? formatTokens(moonshotTokens) : "Pending"}
          detail={`${moonshotFileCount} files allowed or summarized before Nova.`}
          active={Boolean(moonshotResult) || isRunningMoonshot}
        />
        <MetricCard
          label="Context waste avoided"
          value={formatTokens(savedTokens)}
          detail="Tokens avoided every time this coding task runs."
          active={Boolean(moonshotResult)}
        />
        <MetricCard
          label="Reduction"
          value={`${reductionPct.toFixed(1)}%`}
          detail="Economic angle: invisible context cost made visible."
          active={Boolean(moonshotResult)}
        />
      </section>

      <ArchitectureDiagram activeStage={activeStage} />

      <section className="grid gap-6 xl:grid-cols-2">
        <TokenFlamegraph
          files={baselineResult?.files ?? baselineFixture.files}
          totalTokens={baselineTokens}
          variant="baseline"
        />
        <TokenFlamegraph
          files={moonshotResult?.files ?? []}
          totalTokens={moonshotTokens}
          variant="moonshot"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <FileDecisionTimeline decisions={moonshotResult?.files ?? []} animated={isRunningMoonshot || Boolean(moonshotResult)} />
        <ContextDiff before={beforeContext} after={afterContext} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <NovaOutputPanel
          output={baselineResult?.novaOutput ?? null}
          isLoading={isRunningBaseline}
          variant="baseline"
        />
        <NovaOutputPanel
          output={moonshotResult?.novaOutput ?? null}
          isLoading={isRunningMoonshot}
          variant="moonshot"
        />
      </section>
    </div>
  )
}

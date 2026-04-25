"use client"

import type { BaselineRunData, MoonshotRunResult, PipelineStage } from "@/types"

type LiveEngineRunProps = {
  task: string
  baselineFixture: BaselineRunData
  baselineResult: BaselineRunData | null
  moonshotResult: MoonshotRunResult | null
  isRunningBaseline: boolean
  isRunningMoonshot: boolean
  activeStage?: PipelineStage
  onRunFullDemo: () => void
  onRunBaseline: () => void
  onRunMoonshot: () => void
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  "task-input": "task accepted",
  "repo-scanner": "scanning mooncart",
  "token-estimator": "estimating tokens",
  "relevance-scorer": "ranking relevance",
  "context-router": "routing context",
  "prompt-builder": "building lean prompt",
  "nova-api": "calling Nova",
  output: "patch ready",
}

function formatTokens(tokens: number) {
  return tokens.toLocaleString()
}

function TerminalLine({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "good" | "warn" | "bad" | "strong"
  children: React.ReactNode
}) {
  const color = {
    muted: "text-white/45",
    good: "text-emerald-300",
    warn: "text-amber-300",
    bad: "text-red-300",
    strong: "text-white/80",
  }[tone]

  return <div className={`font-mono text-[11px] leading-6 ${color}`}>{children}</div>
}

function RunPanel({
  title,
  subtitle,
  status,
  tokens,
  files,
  variant,
  children,
}: {
  title: string
  subtitle: string
  status: string
  tokens: string
  files: string
  variant: "baseline" | "moonshot"
  children: React.ReactNode
}) {
  const accent = variant === "baseline" ? "from-red-500/18" : "from-emerald-500/20"
  const badge = variant === "baseline"
    ? "border-red-400/20 bg-red-400/10 text-red-200"
    : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#10100f] shadow-2xl">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} via-transparent to-transparent`} />
      <div className="relative z-10 border-b border-white/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">{subtitle}</div>
            <h3 className="serif-fine mt-2 text-3xl font-normal text-white/90">{title}</h3>
          </div>
          <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${badge}`}>
            {status}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Tokens</div>
            <div className="serif-numerals mt-2 text-3xl font-light text-white/90">{tokens}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Context files</div>
            <div className="serif-numerals mt-2 text-3xl font-light text-white/90">{files}</div>
          </div>
        </div>
      </div>
      <div className="relative z-10 min-h-[310px] p-5">{children}</div>
    </div>
  )
}

export function LiveEngineRun({
  task,
  baselineFixture,
  baselineResult,
  moonshotResult,
  isRunningBaseline,
  isRunningMoonshot,
  activeStage,
  onRunFullDemo,
  onRunBaseline,
  onRunMoonshot,
}: LiveEngineRunProps) {
  const running = isRunningBaseline || isRunningMoonshot
  const baselineStatus = isRunningBaseline ? "running" : baselineResult ? "complete" : "idle"
  const moonshotStatus = isRunningMoonshot ? "routing" : moonshotResult ? "optimized" : "waiting"
  const moonshotTokens = moonshotResult?.tokenCount ?? 17920
  const activeLabel = activeStage ? STAGE_LABELS[activeStage] : "ready"

  return (
    <section id="live-run" className="mb-8 rounded-[2rem] border border-black/[0.07] bg-[#111] p-4 text-white shadow-2xl md:p-6 lg:p-8">
      <div className="mb-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/45">
            Live engine run
          </div>
          <h1 className="display max-w-4xl text-5xl leading-[0.95] text-white md:text-7xl">
            Run the same bug through two AI context paths.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/45">
            This is the product moment: baseline dumps the whole repo into Nova, while moonshot acts as the pre-inference engine that scans, ranks, routes, and sends only what matters.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Prompt</div>
          <p className="mt-3 text-lg leading-relaxed text-white/75">{task}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onRunFullDemo}
              disabled={running}
              className="rounded-xl bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#111] transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? activeLabel : "Run live demo"}
            </button>
            <button
              onClick={onRunBaseline}
              disabled={running}
              className="rounded-xl border border-white/15 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Baseline only
            </button>
            <button
              onClick={onRunMoonshot}
              disabled={running}
              className="rounded-xl border border-emerald-300/20 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-300/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              moonshot only
            </button>
          </div>
          <a
            href="https://github.com/Aaxhirrr/moonshot"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex font-mono text-[11px] text-white/35 underline-offset-4 transition hover:text-white/70 hover:underline"
          >
            github.com/Aaxhirrr/moonshot
          </a>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RunPanel
          title="Baseline Nova"
          subtitle="Whole repo dumped into context"
          status={baselineStatus}
          tokens={baselineResult || isRunningBaseline ? formatTokens(baselineFixture.totalTokens) : "0"}
          files={baselineResult || isRunningBaseline ? `${baselineFixture.fileCount}` : "0"}
          variant="baseline"
        >
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <TerminalLine tone="strong">$ nova.invoke --context ./mooncart/**</TerminalLine>
            {(isRunningBaseline || baselineResult) && (
              <>
                <TerminalLine>reading package-lock.json ... 24,800 tokens</TerminalLine>
                <TerminalLine>reading logs/checkout-debug.log ... 12,000 tokens</TerminalLine>
                <TerminalLine tone="warn">warning: 84% of context appears irrelevant/noisy</TerminalLine>
                <TerminalLine>sending 14 files to Nova</TerminalLine>
                <TerminalLine tone={baselineResult ? "good" : "muted"}>
                  {baselineResult ? "patch generated, but paid for the full context dump" : "waiting for Nova response ..."}
                </TerminalLine>
              </>
            )}
            {!isRunningBaseline && !baselineResult && (
              <>
                <TerminalLine>idle: no files sent yet</TerminalLine>
                <TerminalLine>baseline will send lockfiles, logs, auth, admin, payments, and checkout code together</TerminalLine>
              </>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/30">Patch preview</div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-white/45">
{baselineResult
  ? baselineResult.novaOutput.patch.after
  : "// Waiting for baseline output...\n// The fix will still be correct, but the prompt is bloated."}
            </pre>
          </div>
        </RunPanel>

        <RunPanel
          title="moonshot Engine"
          subtitle="Pre-inference context routing"
          status={moonshotStatus}
          tokens={moonshotResult || isRunningMoonshot ? formatTokens(moonshotTokens) : "0"}
          files={moonshotResult || isRunningMoonshot ? `${moonshotResult?.fileCount ?? 6}` : "0"}
          variant="moonshot"
        >
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <TerminalLine tone="strong">$ moonshot run --task "checkout discount before tax"</TerminalLine>
            {(isRunningMoonshot || moonshotResult) && (
              <>
                <TerminalLine tone="good">scan complete: 14 files discovered</TerminalLine>
                <TerminalLine>score src/checkout/cart.ts ... 0.97 allowed</TerminalLine>
                <TerminalLine>block package-lock.json ... low signal</TerminalLine>
                <TerminalLine>summarize src/promotions/coupon-rules.ts ... 200 tokens</TerminalLine>
                <TerminalLine tone="good">optimized packet ready for Nova</TerminalLine>
              </>
            )}
            {!isRunningMoonshot && !moonshotResult && (
              <>
                <TerminalLine>idle: engine waiting for task</TerminalLine>
                <TerminalLine>moonshot will route only files connected to the bug before Nova sees them</TerminalLine>
              </>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/45">Decision</div>
              <div className="mt-2 font-mono text-[11px] leading-relaxed text-emerald-100/70">
                allowed: checkout/cart, discounts, taxes, test<br />
                summarized: promotions rules<br />
                blocked: lockfile, logs, auth, admin
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/45">Result</div>
              <div className="mt-2 font-mono text-[11px] leading-relaxed text-emerald-100/70">
                same root cause<br />
                same cart patch<br />
                same passing test<br />
                less context waste
              </div>
            </div>
          </div>
        </RunPanel>
      </div>
    </section>
  )
}

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
  "task-input": "Task accepted",
  "repo-scanner": "Scanning repo",
  "token-estimator": "Estimating tokens",
  "relevance-scorer": "Ranking files",
  "context-router": "Routing context",
  "prompt-builder": "Building packet",
  "nova-api": "Calling Nova",
  output: "Patch ready",
}

const BASELINE_STEPS = [
  { label: "Collect repo glob", detail: "mooncart/**", tone: "neutral" },
  { label: "Pack full context", detail: "14 files bundled", tone: "warn" },
  { label: "Send to Nova", detail: "86,240 input tokens", tone: "bad" },
  { label: "Patch returned", detail: "Correct fix, expensive context", tone: "neutral" },
] as const

const MOONSHOT_STEPS = [
  { label: "Scan mooncart", detail: "14 files discovered", tone: "neutral" },
  { label: "Score relevance", detail: "checkout files rise to top", tone: "good" },
  { label: "Block noise", detail: "lockfile, logs, auth, admin", tone: "good" },
  { label: "Summarize partials", detail: "coupon rules compressed", tone: "good" },
  { label: "Send lean packet", detail: "17,920 input tokens", tone: "good" },
] as const

function formatTokens(tokens: number) {
  return tokens.toLocaleString()
}

function statusLabel(isRunning: boolean, complete: boolean, idle: string) {
  if (isRunning) return "Running"
  if (complete) return "Complete"
  return idle
}

function StepRow({
  index,
  label,
  detail,
  tone,
  active,
  complete,
}: {
  index: number
  label: string
  detail: string
  tone: "neutral" | "warn" | "bad" | "good"
  active: boolean
  complete: boolean
}) {
  const palette = {
    neutral: "border-black/10 bg-white text-black/55",
    warn: "border-amber-500/20 bg-amber-50 text-amber-800/70",
    bad: "border-red-500/20 bg-red-50 text-red-800/70",
    good: "border-emerald-600/20 bg-emerald-50 text-emerald-800/70",
  }[tone]

  return (
    <div
      className={`grid grid-cols-[34px_1fr] gap-3 rounded-2xl border p-3 transition-all duration-300 ${
        complete || active ? palette : "border-black/[0.06] bg-white/55 text-black/30"
      }`}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl font-mono text-[10px] ${
        active ? "bg-black text-white" : complete ? "bg-black/[0.08] text-black/50" : "bg-black/[0.035] text-black/25"
      }`}>
        {String(index + 1).padStart(2, "0")}
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          {active && <span className="h-2 w-2 rounded-full bg-black" />}
        </div>
        <p className="mt-1 text-xs leading-relaxed opacity-70">{detail}</p>
      </div>
    </div>
  )
}

function RunTrack({
  title,
  eyebrow,
  status,
  tokens,
  files,
  waste,
  variant,
  running,
  complete,
  steps,
}: {
  title: string
  eyebrow: string
  status: string
  tokens: string
  files: string
  waste: string
  variant: "baseline" | "moonshot"
  running: boolean
  complete: boolean
  steps: readonly { label: string; detail: string; tone: "neutral" | "warn" | "bad" | "good" }[]
}) {
  const accent = variant === "baseline" ? "bg-[#FCE7D9] text-[#7C2D12]" : "bg-[#DDF4E8] text-[#14532D]"
  const border = variant === "baseline" ? "border-orange-900/10" : "border-emerald-900/10"
  const activeStep = running ? Math.min(steps.length - 1, Math.floor(Date.now() / 900) % steps.length) : -1

  return (
    <div className={`rounded-[1.75rem] border ${border} bg-[#FFFCF4] p-5 shadow-[0_24px_80px_rgba(36,28,14,0.08)]`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-black/35">{eyebrow}</div>
          <h2 className="serif-fine mt-2 text-3xl font-normal text-black/85">{title}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${accent}`}>
          {status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-black/[0.06] bg-white/75 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-black/30">Tokens</div>
          <div className="serif-numerals mt-2 text-3xl font-light text-black/85">{tokens}</div>
        </div>
        <div className="rounded-2xl border border-black/[0.06] bg-white/75 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-black/30">Files</div>
          <div className="serif-numerals mt-2 text-3xl font-light text-black/85">{files}</div>
        </div>
        <div className="rounded-2xl border border-black/[0.06] bg-white/75 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-black/30">Waste</div>
          <div className="serif-numerals mt-2 text-3xl font-light text-black/85">{waste}</div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {steps.map((step, index) => (
          <StepRow
            key={step.label}
            index={index}
            label={step.label}
            detail={step.detail}
            tone={step.tone}
            active={running && index === activeStep}
            complete={complete || (running && index < activeStep)}
          />
        ))}
      </div>
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
  const baselineComplete = Boolean(baselineResult)
  const moonshotComplete = Boolean(moonshotResult)
  const moonshotTokens = moonshotResult?.tokenCount ?? 17920
  const saved = baselineFixture.totalTokens - moonshotTokens
  const activeLabel = activeStage ? STAGE_LABELS[activeStage] : "Ready"

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-black/[0.07] bg-[#F7F1DF] p-4 shadow-[0_30px_100px_rgba(46,36,18,0.14)] md:p-6 lg:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 15% 5%, rgba(255,255,255,0.9), transparent 32%), radial-gradient(circle at 88% 12%, rgba(109,147,114,0.18), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.55), transparent 45%)",
        }}
      />

      <div className="relative z-10">
        <div className="mb-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-black/[0.08] bg-white/60 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-black/45">
              Live moonshot engine
            </div>
            <h1 className="display mt-5 max-w-4xl text-5xl leading-[0.95] text-black md:text-7xl">
              One bug. Two context strategies.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-black/50">
              Run baseline Nova beside moonshot. The left path ships a full repo dump; the right path performs pre-inference routing and sends a smaller packet to the same model.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-black/[0.08] bg-[#111] p-5 text-white shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Task prompt</div>
            <p className="mt-3 text-lg leading-relaxed text-white/80">{task}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={onRunFullDemo}
                disabled={running}
                className="rounded-xl bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#111] transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? activeLabel : "Run engine"}
              </button>
              <button
                onClick={onRunBaseline}
                disabled={running}
                className="rounded-xl border border-white/15 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Baseline
              </button>
              <button
                onClick={onRunMoonshot}
                disabled={running}
                className="rounded-xl border border-emerald-300/25 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-300/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              >
                moonshot
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[11px] text-white/35">
              <a href="https://github.com/Aaxhirrr/moonshot" target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-white/70 hover:underline">
                github.com/Aaxhirrr/moonshot
              </a>
              <span>/</span>
              <a href="/analysis" className="underline-offset-4 hover:text-white/70 hover:underline">
                view analysis
              </a>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-black/[0.07] bg-white/65 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/35">Context avoided</div>
            <div className="serif-numerals mt-2 text-4xl font-light">{formatTokens(Math.max(0, saved))}</div>
          </div>
          <div className="rounded-2xl border border-black/[0.07] bg-white/65 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/35">Same output</div>
            <div className="serif-fine mt-2 text-3xl font-normal">Patch + test</div>
          </div>
          <div className="rounded-2xl border border-black/[0.07] bg-white/65 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/35">Current stage</div>
            <div className="serif-fine mt-2 text-3xl font-normal">{activeLabel}</div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_auto_1fr] xl:items-stretch">
          <RunTrack
            title="Baseline Nova"
            eyebrow="Naive context path"
            status={statusLabel(isRunningBaseline, baselineComplete, "Idle")}
            tokens={baselineComplete || isRunningBaseline ? formatTokens(baselineFixture.totalTokens) : "0"}
            files={baselineComplete || isRunningBaseline ? `${baselineFixture.fileCount}` : "0"}
            waste={baselineComplete || isRunningBaseline ? "84%" : "-"}
            variant="baseline"
            running={isRunningBaseline}
            complete={baselineComplete}
            steps={BASELINE_STEPS}
          />

          <div className="hidden w-[76px] items-center justify-center xl:flex">
            <div className="rounded-full border border-black/[0.08] bg-white/80 px-3 py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-black/35 shadow-sm">
              vs
            </div>
          </div>

          <RunTrack
            title="moonshot"
            eyebrow="Context engine path"
            status={statusLabel(isRunningMoonshot, moonshotComplete, "Ready")}
            tokens={moonshotComplete || isRunningMoonshot ? formatTokens(moonshotTokens) : "0"}
            files={moonshotComplete || isRunningMoonshot ? `${moonshotResult?.fileCount ?? 6}` : "0"}
            waste={moonshotComplete || isRunningMoonshot ? "low" : "-"}
            variant="moonshot"
            running={isRunningMoonshot}
            complete={moonshotComplete}
            steps={MOONSHOT_STEPS}
          />
        </div>
      </div>
    </section>
  )
}

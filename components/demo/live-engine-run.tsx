"use client"

import { useMemo, useState } from "react"
import type { BaselineRunData, FileDecision, FileEntry, MoonshotRunResult } from "@/types"

type LiveEngineRunProps = {
  task: string
  baselineFixture: BaselineRunData
  moonshotRun: MoonshotRunResult
}

type RunMode = "baseline" | "moonshot" | "compare"
type TabKey = "repo" | "flamegraph" | "packet" | "patch"
type Tone = "muted" | "info" | "good" | "warn" | "bad"

type TerminalLine = {
  text: string
  tone?: Tone
}

type ScriptStep = {
  label: string
  detail: string
  log: string
  tone: Tone
}

const BASELINE_SCRIPT: ScriptStep[] = [
  { label: "Load task", detail: "checkout discount bug", log: "[task] loaded checkout discount bug", tone: "info" },
  { label: "Read repo glob", detail: "mooncart/**", log: "[baseline] reading mooncart/**", tone: "muted" },
  { label: "Pack lockfile", detail: "package-lock.json included", log: "[baseline] package-lock.json added: 24,800 tokens", tone: "bad" },
  { label: "Pack logs", detail: "debug traces included", log: "[baseline] logs/checkout-debug.log added: 12,000 tokens", tone: "bad" },
  { label: "Pack unrelated modules", detail: "auth, admin, payments, inventory", log: "[baseline] unrelated modules still included", tone: "warn" },
  { label: "Build prompt", detail: "14 files bundled", log: "[baseline] prompt assembled with 14 files", tone: "warn" },
  { label: "Invoke Nova", detail: "86,240 tokens sent", log: "[nova] baseline invocation: 86,240 input tokens", tone: "warn" },
  { label: "Patch ready", detail: "correct fix, bloated context", log: "[done] baseline patch generated", tone: "good" },
]

const MOONSHOT_SCRIPT: ScriptStep[] = [
  { label: "Load task", detail: "checkout discount bug", log: "[task] loaded checkout discount bug", tone: "info" },
  { label: "Scan repository", detail: "14 files indexed", log: "[scan] indexing mooncart repository", tone: "info" },
  { label: "Estimate token load", detail: "86,240 baseline tokens", log: "[token] estimated full-context load: 86,240", tone: "info" },
  { label: "Score relevance", detail: "checkout files ranked highest", log: "[score] ranking files by task relevance", tone: "info" },
  { label: "Route context", detail: "block noise, keep signal", log: "[route] blocking lockfile, logs, auth, admin", tone: "good" },
  { label: "Summarize bulky partials", detail: "coupon rules -> 200 tokens", log: "[route] summarizing src/promotions/coupon-rules.ts", tone: "good" },
  { label: "Build packet", detail: "6 useful context entries", log: "[prompt] optimized packet assembled: 17,920 tokens", tone: "good" },
  { label: "Invoke Nova", detail: "same fix, smaller input", log: "[nova] moonshot invocation: lean context packet", tone: "good" },
  { label: "Patch ready", detail: "test passes", log: "[done] optimized run complete", tone: "good" },
]

const COMMANDS = [
  "fix checkout discount bug",
  "compare",
  "run baseline",
  "run moonshot",
  "show repo",
  "show flamegraph",
  "show packet",
  "show patch",
  "reset",
]

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function formatTokens(tokens: number) {
  return tokens.toLocaleString()
}

function toneClass(tone: Tone = "muted") {
  return {
    muted: "text-stone-400",
    info: "text-sky-300",
    good: "text-emerald-300",
    warn: "text-amber-300",
    bad: "text-red-300",
  }[tone]
}

function decisionClass(decision?: FileDecision["decision"] | FileEntry["category"]) {
  if (decision === "allowed" || decision === "relevant") return "border-emerald-700/15 bg-emerald-50 text-emerald-800"
  if (decision === "summarized") return "border-amber-700/15 bg-amber-50 text-amber-800"
  if (decision === "blocked" || decision === "noise") return "border-red-700/15 bg-red-50 text-red-800"
  return "border-stone-300 bg-stone-50 text-stone-500"
}

function useVisibleBaselineFiles(files: FileEntry[], count: number) {
  return useMemo(() => {
    if (count <= 1) return []
    const visible = Math.min(files.length, Math.max(1, count * 2 - 2))
    return files.slice(0, visible)
  }, [count, files])
}

function useVisibleMoonshotFiles(files: FileDecision[], count: number) {
  return useMemo(() => {
    if (count <= 1) return []
    const ordered = [
      ...files.filter(file => file.decision === "allowed"),
      ...files.filter(file => file.decision === "summarized"),
      ...files.filter(file => file.decision === "blocked"),
    ]
    const visible = Math.min(ordered.length, Math.max(1, count * 2 - 2))
    return ordered.slice(0, visible)
  }, [count, files])
}

function TrackPanel({
  title,
  kicker,
  totalTokens,
  visibleTokens,
  finalFiles,
  visibleFiles,
  running,
  complete,
  steps,
  stepCount,
  variant,
}: {
  title: string
  kicker: string
  totalTokens: number
  visibleTokens: number
  finalFiles: number
  visibleFiles: number
  running: boolean
  complete: boolean
  steps: ScriptStep[]
  stepCount: number
  variant: "baseline" | "moonshot"
}) {
  const accent = variant === "baseline" ? "bg-red-500" : "bg-emerald-500"
  const soft = variant === "baseline" ? "from-red-100/80" : "from-emerald-100/80"
  const displayTokens = complete ? totalTokens : visibleTokens
  const displayFiles = complete ? finalFiles : visibleFiles

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#fffdf6] p-5 shadow-[0_18px_70px_rgba(54,43,22,0.08)]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${soft} via-transparent to-transparent opacity-70`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-stone-400">{kicker}</div>
            <h2 className="serif-fine mt-2 text-3xl font-normal text-stone-950">{title}</h2>
          </div>
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">
            {running ? "running" : complete ? "complete" : "idle"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Tokens</div>
            <div className="serif-numerals mt-2 text-3xl font-light text-stone-950">{formatTokens(displayTokens)}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Files</div>
            <div className="serif-numerals mt-2 text-3xl font-light text-stone-950">{displayFiles}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Signal</div>
            <div className="serif-numerals mt-2 text-3xl font-light text-stone-950">{variant === "baseline" ? "low" : "high"}</div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {steps.map((step, index) => {
            const active = running && index === stepCount - 1
            const visible = index < stepCount || complete
            return (
              <div
                key={step.label}
                className={`grid grid-cols-[10px_1fr] gap-3 rounded-2xl border p-3 transition-all duration-300 ${
                  visible ? "border-stone-200 bg-white/85 text-stone-700" : "border-stone-200/70 bg-white/35 text-stone-300"
                }`}
              >
                <div className={`mt-1.5 h-2.5 w-2.5 rounded-full ${active ? accent : visible ? "bg-stone-400" : "bg-stone-200"}`} />
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{step.label}</span>
                    {active && <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-400">now</span>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">{step.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RepoExplorer({ decisions, visibleCount }: { decisions: FileDecision[]; visibleCount: number }) {
  const sorted = [
    ...decisions.filter(file => file.decision === "allowed"),
    ...decisions.filter(file => file.decision === "summarized"),
    ...decisions.filter(file => file.decision === "blocked"),
  ]

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {sorted.map((file, index) => {
        const visible = index < visibleCount
        return (
          <div
            key={file.path}
            className={`rounded-2xl border p-3 transition-all duration-300 ${
              visible ? decisionClass(file.decision) : "border-stone-200 bg-white/45 text-stone-300"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-mono text-[11px]">{file.path}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{visible ? file.decision : "queued"}</span>
            </div>
            <p className="mt-2 font-mono text-[10px] opacity-70">
              {visible ? `${file.tokens.toLocaleString()} tokens / score ${file.relevanceScore.toFixed(2)}` : "waiting for router"}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function Flamegraph({
  baselineFiles,
  moonshotFiles,
}: {
  baselineFiles: FileEntry[]
  moonshotFiles: FileDecision[]
}) {
  const entries = [
    ...baselineFiles.map(file => ({ path: file.path, tokens: file.tokens, label: file.category, side: "baseline" })),
    ...moonshotFiles.map(file => ({ path: file.path, tokens: file.tokens, label: file.decision, side: "moonshot" })),
  ].sort((a, b) => b.tokens - a.tokens)
  const max = Math.max(1, ...entries.map(entry => entry.tokens))

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div key={`${entry.side}-${entry.path}`}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="truncate font-mono text-[11px] text-stone-600">{entry.path}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-400">{entry.side}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-full rounded-full transition-all duration-700 ${entry.side === "baseline" ? "bg-red-400" : "bg-emerald-500"}`}
                style={{ width: `${Math.max(4, (entry.tokens / max) * 100)}%` }}
              />
            </div>
            <span className="w-20 text-right font-mono text-[11px] text-stone-400">{entry.tokens.toLocaleString()}</span>
          </div>
        </div>
      ))}
      {entries.length === 0 && <p className="text-sm text-stone-400">Run the engine to build the flamegraph.</p>}
    </div>
  )
}

function PacketViewer({ decisions }: { decisions: FileDecision[] }) {
  const included = decisions.filter(file => file.decision === "allowed" || file.decision === "summarized")
  return (
    <pre className="max-h-[360px] overflow-hidden rounded-2xl border border-stone-200 bg-[#111] p-5 font-mono text-[11px] leading-relaxed text-stone-200">
{`Task:
  fix checkout bug where discounts are applied after tax

Included context:
${included.map(file => `  ${file.decision === "summarized" ? "~" : "+"} ${file.path} (${file.tokens.toLocaleString()} tokens)`).join("\n")}

Blocked:
${decisions.filter(file => file.decision === "blocked").slice(0, 6).map(file => `  - ${file.path}`).join("\n")}
`}
    </pre>
  )
}

function PatchViewer({ run }: { run: MoonshotRunResult }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Root cause</div>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{run.novaOutput.rootCause}</p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-[#111] p-4 lg:col-span-2">
        <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-stone-500">Patch</div>
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-stone-200">{run.novaOutput.patch.after}</pre>
      </div>
      <div className="rounded-2xl border border-emerald-700/15 bg-emerald-50 p-4 lg:col-span-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-800/50">Test result</div>
        <p className="mt-2 text-sm text-emerald-900/70">
          Passed: {run.novaOutput.testResult.description}. Expected {run.novaOutput.testResult.expected}, actual {run.novaOutput.testResult.actual}.
        </p>
      </div>
    </div>
  )
}

export function LiveEngineRun({ task, baselineFixture, moonshotRun }: LiveEngineRunProps) {
  const [input, setInput] = useState("")
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { text: "moonshot console ready", tone: "good" },
    { text: "try: fix checkout discount bug, compare, show repo, show packet", tone: "muted" },
  ])
  const [isRunning, setIsRunning] = useState(false)
  const [baselineStepCount, setBaselineStepCount] = useState(0)
  const [moonshotStepCount, setMoonshotStepCount] = useState(0)
  const [tab, setTab] = useState<TabKey>("repo")

  const visibleBaselineFiles = useVisibleBaselineFiles(baselineFixture.files, baselineStepCount)
  const visibleMoonshotFiles = useVisibleMoonshotFiles(moonshotRun.files, moonshotStepCount)
  const baselineTokens = baselineStepCount >= BASELINE_SCRIPT.length
    ? baselineFixture.totalTokens
    : visibleBaselineFiles.reduce((sum, file) => sum + file.tokens, 0)
  const moonshotTokens = moonshotStepCount >= MOONSHOT_SCRIPT.length
    ? moonshotRun.tokenCount
    : visibleMoonshotFiles.filter(file => file.decision !== "blocked").reduce((sum, file) => sum + file.tokens, 0)
  const savings = Math.max(0, baselineFixture.totalTokens - moonshotRun.tokenCount)

  function addLine(line: TerminalLine) {
    setTerminalLines(lines => [...lines.slice(-13), line])
  }

  function reset() {
    setBaselineStepCount(0)
    setMoonshotStepCount(0)
    setTab("repo")
    setTerminalLines([
      { text: "moonshot console reset", tone: "good" },
      { text: "try: compare", tone: "muted" },
    ])
  }

  async function run(mode: RunMode) {
    if (isRunning) return
    setIsRunning(true)
    setBaselineStepCount(0)
    setMoonshotStepCount(0)
    setTab("repo")
    addLine({ text: `$ ${mode}`, tone: "muted" })
    addLine({ text: "[engine] run started", tone: "info" })

    const maxSteps = Math.max(
      mode === "moonshot" ? 0 : BASELINE_SCRIPT.length,
      mode === "baseline" ? 0 : MOONSHOT_SCRIPT.length,
    )

    for (let i = 0; i < maxSteps; i++) {
      await delay(i === 0 ? 250 : 520)
      if (mode !== "moonshot" && BASELINE_SCRIPT[i]) {
        setBaselineStepCount(i + 1)
        addLine({ text: BASELINE_SCRIPT[i].log, tone: BASELINE_SCRIPT[i].tone })
      }
      if (mode !== "baseline" && MOONSHOT_SCRIPT[i]) {
        setMoonshotStepCount(i + 1)
        addLine({ text: MOONSHOT_SCRIPT[i].log, tone: MOONSHOT_SCRIPT[i].tone })
      }
      if (i === 4) setTab("flamegraph")
      if (i === 6) setTab("packet")
    }

    setTab("patch")
    addLine({ text: `[analytics] avoided ${savings.toLocaleString()} context tokens`, tone: "good" })
    addLine({ text: "[done] same checkout fix, smaller prompt", tone: "good" })
    setIsRunning(false)
  }

  function runCommand(raw: string) {
    const command = raw.trim().toLowerCase()
    if (!command) return
    setInput("")

    if (command.includes("reset")) {
      reset()
      return
    }
    if (command.includes("repo")) {
      setTab("repo")
      addLine({ text: "$ show repo", tone: "muted" })
      addLine({ text: "[view] repo explorer opened", tone: "info" })
      return
    }
    if (command.includes("flame") || command.includes("analytics")) {
      setTab("flamegraph")
      addLine({ text: "$ show flamegraph", tone: "muted" })
      addLine({ text: "[view] token flamegraph opened", tone: "info" })
      return
    }
    if (command.includes("packet") || command.includes("diff")) {
      setTab("packet")
      addLine({ text: "$ show packet", tone: "muted" })
      addLine({ text: "[view] optimized packet opened", tone: "info" })
      return
    }
    if (command.includes("patch") || command.includes("output")) {
      setTab("patch")
      addLine({ text: "$ show patch", tone: "muted" })
      addLine({ text: "[view] Nova patch opened", tone: "info" })
      return
    }
    if (command.includes("baseline")) {
      void run("baseline")
      return
    }
    if (command.includes("moonshot") || command.includes("optimize")) {
      void run("moonshot")
      return
    }

    addLine({ text: `$ ${raw}`, tone: "muted" })
    addLine({ text: `[task] ${task}`, tone: "info" })
    addLine({ text: "[select] type compare, run baseline, or run moonshot", tone: "muted" })
    if (command.includes("compare") || command.includes("fix") || command.includes("checkout")) {
      void run("compare")
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-[#F7F1DF] p-4 shadow-[0_30px_100px_rgba(46,36,18,0.14)] md:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.9),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(74,121,89,0.22),transparent_28%)]" />

      <div className="relative z-10">
        <div className="mb-6 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="inline-flex rounded-full border border-stone-300 bg-white/65 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-500">
              moonshot interactive console
            </div>
            <h1 className="display mt-5 max-w-4xl text-5xl leading-[0.95] text-stone-950 md:text-7xl">
              Type a task. Watch context get routed.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-600">
              This is the engine view: baseline sends the messy repo to Nova, while moonshot scores files, blocks token waste, builds a lean prompt packet, and returns the same checkout fix.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-stone-900/10 bg-[#111] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">terminal</div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
            </div>

            <div className="min-h-[260px] space-y-1 overflow-hidden">
              {terminalLines.map((line, index) => (
                <div key={`${line.text}-${index}`} className={`font-mono text-[12px] leading-6 ${toneClass(line.tone)}`}>
                  {line.text}
                </div>
              ))}
            </div>

            <form
              className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2"
              onSubmit={event => {
                event.preventDefault()
                runCommand(input)
              }}
            >
              <span className="font-mono text-sm text-emerald-300">moonshot&gt;</span>
              <input
                value={input}
                onChange={event => setInput(event.target.value)}
                disabled={isRunning}
                placeholder="fix checkout discount bug"
                className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/25 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isRunning}
                className="rounded-xl bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-950 disabled:opacity-40"
              >
                Enter
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {COMMANDS.slice(1, 7).map(command => (
                <button
                  key={command}
                  onClick={() => runCommand(command)}
                  disabled={isRunning}
                  className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] text-white/45 transition hover:bg-white/[0.06] hover:text-white/75 disabled:opacity-35"
                >
                  {command}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Baseline tokens</div>
            <div className="serif-numerals mt-2 text-4xl font-light">{formatTokens(baselineTokens)}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-400">moonshot tokens</div>
            <div className="serif-numerals mt-2 text-4xl font-light">{formatTokens(moonshotTokens)}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Tokens avoided</div>
            <div className="serif-numerals mt-2 text-4xl font-light">{formatTokens(Math.max(0, baselineFixture.totalTokens - moonshotRun.tokenCount))}</div>
          </div>
          <a href="/analysis" className="rounded-2xl border border-stone-900/10 bg-stone-950 p-4 text-white transition hover:-translate-y-0.5 hover:bg-stone-800">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">After run</div>
            <div className="serif-fine mt-2 text-3xl font-normal">Open analysis</div>
          </a>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_auto_1fr]">
          <TrackPanel
            title="Baseline Nova"
            kicker="Full repo context"
            totalTokens={baselineFixture.totalTokens}
            visibleTokens={baselineTokens}
            finalFiles={baselineFixture.fileCount}
            visibleFiles={visibleBaselineFiles.length}
            running={isRunning && baselineStepCount < BASELINE_SCRIPT.length && baselineStepCount > 0}
            complete={baselineStepCount >= BASELINE_SCRIPT.length}
            steps={BASELINE_SCRIPT}
            stepCount={baselineStepCount}
            variant="baseline"
          />

          <div className="hidden w-[72px] items-center justify-center xl:flex">
            <div className="rounded-full border border-stone-200 bg-white/80 px-3 py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400 shadow-sm">
              vs
            </div>
          </div>

          <TrackPanel
            title="moonshot"
            kicker="Context routing engine"
            totalTokens={moonshotRun.tokenCount}
            visibleTokens={moonshotTokens}
            finalFiles={moonshotRun.fileCount}
            visibleFiles={visibleMoonshotFiles.filter(file => file.decision !== "blocked").length}
            running={isRunning && moonshotStepCount < MOONSHOT_SCRIPT.length && moonshotStepCount > 0}
            complete={moonshotStepCount >= MOONSHOT_SCRIPT.length}
            steps={MOONSHOT_SCRIPT}
            stepCount={moonshotStepCount}
            variant="moonshot"
          />
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-stone-200 bg-white/70 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400">Live inspection</div>
              <h3 className="serif-fine mt-1 text-2xl font-normal">What moonshot is sending to Nova</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ["repo", "Repo"],
                ["flamegraph", "Flamegraph"],
                ["packet", "Prompt packet"],
                ["patch", "Patch"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                    tab === key ? "bg-stone-950 text-white" : "border border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === "repo" && <RepoExplorer decisions={moonshotRun.files} visibleCount={visibleMoonshotFiles.length} />}
          {tab === "flamegraph" && <Flamegraph baselineFiles={visibleBaselineFiles} moonshotFiles={visibleMoonshotFiles} />}
          {tab === "packet" && <PacketViewer decisions={moonshotRun.files} />}
          {tab === "patch" && <PatchViewer run={moonshotRun} />}
        </div>
      </div>
    </section>
  )
}

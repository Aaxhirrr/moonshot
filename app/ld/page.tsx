"use client"

import { useMemo, useState } from "react"
import datasetLab from "@/data/datasetLab.json"
import baselineRunJson from "@/data/baselineRun.json"
import demoRepoJson from "@/data/demoRepo.json"
import { countAllowedTokens, routeContext } from "@/lib/contextRouter"
import type { BaselineRunData, DemoRepo, FileDecision, MoonshotRunResult } from "@/types"

type LabDecision = "selected" | "blocked" | "summarized"

type LabFile = {
  path: string
  tokens: number
  score: number
  decision: LabDecision
  preview: string
}

type LabTask = {
  id: string
  repo: string
  language: string
  title: string
  issue: string
  baselineTokens: number
  optimizedTokens: number
  candidateFiles: LabFile[]
  cachedNova: {
    rootCause: string
    patch: string
    test: string
  }
}

type LabData = {
  summary: {
    name: string
    tasks: number
    files: number
    estimatedTokens: number
    languages: string[]
    repos: string[]
  }
  tasks: LabTask[]
}

type TabKey = "engine" | "dataset" | "repo" | "trace"
type Tone = "muted" | "info" | "good" | "warn" | "bad"

const TASK = "Fix checkout bug where discounts are applied after tax instead of before tax."
const TOKEN_BUDGET = 20000

const SCRIPTED_LOGS: { text: string; tone: Tone }[] = [
  { text: "[task] loaded mooncart checkout bug", tone: "info" },
  { text: "[scan] indexing sanitized mooncart fixture", tone: "info" },
  { text: "[token] baseline context estimate: 86,240", tone: "warn" },
  { text: "[score] checkout/cart.ts ranked 0.97", tone: "good" },
  { text: "[route] blocked package-lock.json and logs/checkout-debug.log", tone: "good" },
  { text: "[route] summarized src/promotions/coupon-rules.ts", tone: "good" },
  { text: "[prompt] optimized context packet: 17,920", tone: "good" },
  { text: "[nova] mock-safe patch ready", tone: "good" },
]

const LAB_LOGS: { text: string; tone: Tone }[] = [
  { text: "[dataset] loaded archive sample", tone: "info" },
  { text: "[scan] candidate files indexed", tone: "info" },
  { text: "[score] ranking task-specific files", tone: "info" },
  { text: "[route] blocking env, IDE, install noise", tone: "good" },
  { text: "[prompt] optimized packet ready for Nova", tone: "good" },
  { text: "[nova] live mode not called yet; cached response shown", tone: "warn" },
]

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

function decisionClass(decision: LabDecision | FileDecision["decision"]) {
  if (decision === "selected" || decision === "allowed") return "border-emerald-600/20 bg-emerald-50 text-emerald-800"
  if (decision === "summarized") return "border-amber-600/20 bg-amber-50 text-amber-800"
  return "border-red-600/20 bg-red-50 text-red-800"
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-stone-400">{label}</div>
      <div className="serif-numerals mt-2 text-4xl font-light text-stone-950">{value}</div>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">{detail}</p>
    </div>
  )
}

function Terminal({
  lines,
  input,
  setInput,
  runCommand,
  running,
}: {
  lines: { text: string; tone: Tone }[]
  input: string
  setInput: (value: string) => void
  runCommand: (command: string) => void
  running: boolean
}) {
  const suggestions = ["run scripted-demo", "open dataset-lab", "scan repo", "optimize context", "run nova --real", "reset"]

  return (
    <div className="rounded-[1.5rem] border border-stone-900/10 bg-[#111] p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">moonshot LD console</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">experiment safe</span>
      </div>
      <div className="min-h-[230px] space-y-1 overflow-hidden">
        {lines.map((line, index) => (
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
          disabled={running}
          placeholder="run scripted-demo"
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/25 disabled:opacity-50"
        />
        <button type="submit" disabled={running} className="rounded-xl bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-950 disabled:opacity-40">
          Enter
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map(command => (
          <button
            key={command}
            onClick={() => runCommand(command)}
            disabled={running}
            className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] text-white/45 transition hover:bg-white/[0.06] hover:text-white/75 disabled:opacity-35"
          >
            {command}
          </button>
        ))}
      </div>
    </div>
  )
}

function ScriptedEngine({
  baseline,
  moonshot,
  visibleSteps,
}: {
  baseline: BaselineRunData
  moonshot: MoonshotRunResult
  visibleSteps: number
}) {
  const moonshotFiles = moonshot.files.filter(file => file.decision !== "blocked")
  const visibleMoonshotFiles = moonshotFiles.slice(0, Math.max(0, visibleSteps - 2))
  const baselineTokens = visibleSteps >= SCRIPTED_LOGS.length ? baseline.totalTokens : baseline.files.slice(0, visibleSteps).reduce((sum, file) => sum + file.tokens, 0)
  const moonshotTokens = visibleSteps >= SCRIPTED_LOGS.length ? moonshot.tokenCount : visibleMoonshotFiles.reduce((sum, file) => sum + file.tokens, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Baseline" value={formatTokens(baselineTokens)} detail="Estimated full context sent to Nova." />
        <Metric label="moonshot" value={formatTokens(moonshotTokens)} detail="Optimized packet built by the router." />
        <Metric label="Avoided" value={formatTokens(Math.max(0, baseline.totalTokens - moonshot.tokenCount))} detail="Context tokens saved in the scripted run." />
        <Metric label="Result" value="Patch" detail="Same root cause, same passing checkout test." />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-red-900/10 bg-[#fffdf6] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400">Baseline Nova</div>
          <h3 className="serif-fine mt-2 text-3xl font-normal">Whole context dump</h3>
          <div className="mt-5 space-y-2">
            {baseline.files.slice(0, 8).map((file, index) => (
              <div key={file.path} className={`rounded-2xl border p-3 transition ${index < visibleSteps ? decisionClass(file.category === "relevant" ? "selected" : "blocked") : "border-stone-200 bg-white/50 text-stone-300"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-[11px]">{file.path}</span>
                  <span className="font-mono text-[10px]">{file.tokens.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-emerald-900/10 bg-[#fffdf6] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400">moonshot Engine</div>
          <h3 className="serif-fine mt-2 text-3xl font-normal">Route before Nova</h3>
          <div className="mt-5 space-y-2">
            {moonshot.files.slice(0, 8).map((file, index) => (
              <div key={file.path} className={`rounded-2xl border p-3 transition ${index < visibleSteps ? decisionClass(file.decision) : "border-stone-200 bg-white/50 text-stone-300"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-[11px]">{file.path}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{file.decision}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] opacity-65">score {file.relevanceScore.toFixed(2)} / {file.tokens.toLocaleString()} tokens</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DatasetLab({
  data,
  task,
  setTaskId,
}: {
  data: LabData
  task: LabTask
  setTaskId: (id: string) => void
}) {
  const selected = task.candidateFiles.filter(file => file.decision === "selected")
  const summarized = task.candidateFiles.filter(file => file.decision === "summarized")
  const blocked = task.candidateFiles.filter(file => file.decision === "blocked")

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Tasks" value={data.summary.tasks.toLocaleString()} detail={data.summary.name} />
        <Metric label="Files / snippets" value={data.summary.files.toLocaleString()} detail="Sanitized archive sample exposed in the lab." />
        <Metric label="Estimated tokens" value={formatTokens(data.summary.estimatedTokens)} detail="Baseline search space, not sent live." />
        <Metric label="Languages" value={data.summary.languages.join(" / ")} detail={data.summary.repos.join(", ")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400">Task selector</div>
          <div className="mt-4 space-y-2">
            {data.tasks.map(item => (
              <button
                key={item.id}
                onClick={() => setTaskId(item.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${item.id === task.id ? "border-stone-950 bg-stone-950 text-white" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"}`}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">{item.id} / {item.language}</div>
                <div className="mt-2 serif-fine text-xl font-normal">{item.title}</div>
                <div className="mt-1 text-xs opacity-65">{item.repo}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400">Selected task</div>
              <h3 className="serif-fine mt-2 text-3xl font-normal">{task.title}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-600">{task.issue}</p>
            </div>
            <button className="rounded-xl border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Run real Nova later
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Metric label="Baseline est." value={formatTokens(task.baselineTokens)} detail="Shown only; not sent live." />
            <Metric label="Optimized" value={formatTokens(task.optimizedTokens)} detail="Safe context packet for live Nova." />
            <Metric label="Selected" value={`${selected.length}`} detail="High relevance files." />
            <Metric label="Blocked" value={`${blocked.length}`} detail={`${summarized.length} summarized.`} />
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {task.candidateFiles.map(file => (
              <div key={file.path} className={`rounded-2xl border p-3 ${decisionClass(file.decision)}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-[11px]">{file.path}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{file.decision}</span>
                </div>
                <p className="mt-2 font-mono text-[10px] opacity-70">{file.tokens.toLocaleString()} tokens / score {file.score.toFixed(2)}</p>
                <p className="mt-2 text-xs leading-relaxed opacity-70">{file.preview}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RepoExplorer({
  moonshot,
  task,
}: {
  moonshot: MoonshotRunResult
  task: LabTask
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400">mooncart repo</div>
        <h3 className="serif-fine mt-2 text-3xl font-normal">Scripted fixture tree</h3>
        <div className="mt-5 space-y-2">
          {moonshot.files.map(file => (
            <div key={file.path} className={`rounded-2xl border p-3 ${decisionClass(file.decision)}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[11px]">{file.path}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{file.decision}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400">dataset repo</div>
        <h3 className="serif-fine mt-2 text-3xl font-normal">{task.repo}</h3>
        <div className="mt-5 space-y-2">
          {task.candidateFiles.map(file => (
            <div key={file.path} className={`rounded-2xl border p-3 ${decisionClass(file.decision)}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[11px]">{file.path}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{file.decision}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LDPage() {
  const data = datasetLab as LabData
  const baseline = baselineRunJson as BaselineRunData
  const demoRepo = demoRepoJson as DemoRepo
  const [tab, setTab] = useState<TabKey>("engine")
  const [input, setInput] = useState("")
  const [running, setRunning] = useState(false)
  const [visibleSteps, setVisibleSteps] = useState(0)
  const [logs, setLogs] = useState<{ text: string; tone: Tone }[]>([
    { text: "LD playground ready; stable /demo is untouched", tone: "good" },
    { text: "try: run scripted-demo or open dataset-lab", tone: "muted" },
  ])
  const [taskId, setTaskId] = useState(data.tasks[0].id)

  const moonshot = useMemo<MoonshotRunResult>(() => {
    const files = routeContext(demoRepo.files, TASK, TOKEN_BUDGET)
    const tokenCount = countAllowedTokens(files)
    return {
      tokenCount,
      reductionPct: ((baseline.totalTokens - tokenCount) / baseline.totalTokens) * 100,
      fileCount: files.filter(file => file.decision !== "blocked").length,
      files,
      novaOutput: { ...baseline.novaOutput, tokensUsed: tokenCount },
    }
  }, [baseline, demoRepo.files])

  const task = data.tasks.find(item => item.id === taskId) ?? data.tasks[0]

  function addLog(line: { text: string; tone: Tone }) {
    setLogs(current => [...current.slice(-16), line])
  }

  async function runScripted() {
    if (running) return
    setTab("engine")
    setRunning(true)
    setVisibleSteps(0)
    addLog({ text: "$ run scripted-demo", tone: "muted" })
    for (let i = 0; i < SCRIPTED_LOGS.length; i++) {
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 250 : 480))
      setVisibleSteps(i + 1)
      addLog(SCRIPTED_LOGS[i])
    }
    setRunning(false)
  }

  async function runDatasetLab() {
    if (running) return
    setTab("dataset")
    setRunning(true)
    addLog({ text: "$ open dataset-lab", tone: "muted" })
    for (const line of LAB_LOGS) {
      await new Promise(resolve => setTimeout(resolve, 360))
      addLog(line)
    }
    setRunning(false)
  }

  function runCommand(raw: string) {
    const command = raw.trim().toLowerCase()
    if (!command) return
    setInput("")

    if (command.includes("reset")) {
      setLogs([
        { text: "LD playground reset", tone: "good" },
        { text: "try: run scripted-demo", tone: "muted" },
      ])
      setVisibleSteps(0)
      setTab("engine")
      return
    }
    if (command.includes("dataset") || command.includes("lab")) {
      void runDatasetLab()
      return
    }
    if (command.includes("repo")) {
      setTab("repo")
      addLog({ text: "$ scan repo", tone: "muted" })
      addLog({ text: "[view] repo explorer opened", tone: "info" })
      return
    }
    if (command.includes("trace")) {
      setTab("trace")
      return
    }
    if (command.includes("nova")) {
      setTab("dataset")
      addLog({ text: "$ run nova --real", tone: "muted" })
      addLog({ text: "[nova] live Nova not wired on LD yet; cached response shown", tone: "warn" })
      return
    }
    void runScripted()
  }

  return (
    <main className="min-h-screen bg-[#F2EFE5] px-4 py-6 text-[#111] md:px-8 lg:px-12">
      <nav className="mx-auto mb-8 flex max-w-7xl items-center justify-between rounded-2xl border border-black/[0.07] bg-white/55 px-5 py-3 backdrop-blur-xl">
        <a href="/" className="font-pixel text-xs tracking-[0.25em] text-black/65">moonshot</a>
        <div className="flex items-center gap-4">
          <a href="/demo" className="hidden text-xs tracking-widest text-black/35 transition hover:text-black/70 sm:block">Stable Demo</a>
          <a href="/analysis" className="hidden text-xs tracking-widest text-black/35 transition hover:text-black/70 sm:block">Analysis</a>
          <a href="/" className="rounded-xl border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-black/55 transition hover:bg-black/[0.03]">Home</a>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-[2rem] border border-stone-200 bg-[#F7F1DF] p-4 shadow-[0_30px_100px_rgba(46,36,18,0.14)] md:p-6 lg:p-8">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="inline-flex rounded-full border border-stone-300 bg-white/65 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-500">LD playground</div>
              <h1 className="display mt-5 max-w-4xl text-5xl leading-[0.95] text-stone-950 md:text-7xl">Experiment with the real engine shape.</h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-600">
                `/demo` stays judge-safe. This page is where we test terminal commands, Dataset Lab, repo exploration, real-Nova hooks, and deeper run traces without risking the polished path.
              </p>
            </div>
            <Terminal lines={logs} input={input} setInput={setInput} runCommand={runCommand} running={running} />
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-stone-200 bg-white/65 p-3">
          <div className="flex flex-wrap gap-2">
            {([
              ["engine", "Engine Demo"],
              ["dataset", "Dataset Lab"],
              ["repo", "Repo Explorer"],
              ["trace", "Run Trace"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition ${tab === key ? "bg-stone-950 text-white" : "border border-stone-200 bg-white text-stone-500 hover:bg-stone-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {tab === "engine" && <ScriptedEngine baseline={baseline} moonshot={moonshot} visibleSteps={visibleSteps} />}
        {tab === "dataset" && <DatasetLab data={data} task={task} setTaskId={setTaskId} />}
        {tab === "repo" && <RepoExplorer moonshot={moonshot} task={task} />}
        {tab === "trace" && (
          <section className="rounded-[1.5rem] border border-stone-200 bg-[#111] p-5">
            <div className="mb-4 text-[10px] uppercase tracking-[0.22em] text-white/35">Run trace</div>
            <div className="space-y-1">
              {logs.map((line, index) => (
                <div key={`${line.text}-${index}`} className={`font-mono text-[12px] leading-6 ${toneClass(line.tone)}`}>{line.text}</div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

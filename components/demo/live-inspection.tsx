"use client"

import { useState } from "react"
import type { BaselineRunData, FileDecision, FileEntry, MoonshotRunResult } from "@/types"

function decisionClass(decision?: FileDecision["decision"] | FileEntry["category"]) {
  if (decision === "allowed" || decision === "relevant") return "border-emerald-700/15 bg-emerald-50 text-emerald-800"
  if (decision === "summarized") return "border-amber-700/15 bg-amber-50 text-amber-800"
  if (decision === "blocked" || decision === "noise") return "border-red-700/15 bg-red-50 text-red-800"
  return "border-stone-300 bg-stone-50 text-stone-500"
}

export function RepoExplorer({ decisions, visibleCount }: { decisions: FileDecision[]; visibleCount?: number }) {
  const sorted = [
    ...decisions.filter(file => file.decision === "allowed"),
    ...decisions.filter(file => file.decision === "summarized"),
    ...decisions.filter(file => file.decision === "blocked"),
  ]
  const count = visibleCount ?? sorted.length

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {sorted.map((file, index) => {
        const visible = index < count
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

export function Flamegraph({
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
      {entries.length === 0 && <p className="text-sm text-stone-400">No context files available.</p>}
    </div>
  )
}

export function PacketViewer({ decisions }: { decisions: FileDecision[] }) {
  const included = decisions.filter(file => file.decision === "allowed" || file.decision === "summarized")
  return (
    <pre className="max-h-[500px] overflow-auto rounded-2xl border border-stone-200 bg-[#111] p-5 font-mono text-[11px] leading-relaxed text-stone-200">
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

export function PatchViewer({ run }: { run: MoonshotRunResult }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Root cause</div>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{run.novaOutput.rootCause}</p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-[#111] p-4 lg:col-span-2">
        <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-stone-500">Patch</div>
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-stone-200">{run.novaOutput.patch.after || JSON.stringify(run.novaOutput.patch, null, 2)}</pre>
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

export function LiveInspectionViewer({
  baseline,
  moonshot
}: {
  baseline: BaselineRunData
  moonshot: MoonshotRunResult
}) {
  const [tab, setTab] = useState<"repo" | "flamegraph" | "packet" | "patch">("repo")

  return (
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

      {tab === "repo" && <RepoExplorer decisions={moonshot.files} />}
      {tab === "flamegraph" && <Flamegraph baselineFiles={baseline.files} moonshotFiles={moonshot.files} />}
      {tab === "packet" && <PacketViewer decisions={moonshot.files} />}
      {tab === "patch" && <PatchViewer run={moonshot} />}
    </div>
  )
}

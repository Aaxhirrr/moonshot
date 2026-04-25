"use client"

import type { ContextSnapshot } from "@/types"

type ContextDiffProps = {
  before: ContextSnapshot
  after: ContextSnapshot
}

function formatTokens(tokens: number) {
  return tokens.toLocaleString()
}

export function ContextDiff({ before, after }: ContextDiffProps) {
  const afterFiles = new Set(after.files)

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/70 p-5">
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-black/35">Before / after</div>
        <h3 className="serif-fine mt-1 text-2xl font-normal">Context diff</h3>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {[before, after].map(snapshot => {
          const isAfter = snapshot.label === after.label
          return (
            <div key={snapshot.label} className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/35">{snapshot.label}</div>
                  <div className="serif-numerals mt-1 text-3xl font-light">{formatTokens(snapshot.tokenCount)}</div>
                </div>
                <span className="rounded-full bg-black/[0.05] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-black/40">
                  {snapshot.files.length} files
                </span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {snapshot.files.map(file => {
                  const removed = !isAfter && !afterFiles.has(file)
                  return (
                    <span
                      key={`${snapshot.label}-${file}`}
                      className={`rounded-full border px-2.5 py-1 font-mono text-[10px] ${
                        removed
                          ? "border-red-500/15 bg-red-50 text-red-700/55 line-through"
                          : "border-emerald-600/15 bg-emerald-50 text-emerald-700/65"
                      }`}
                    >
                      {file}
                    </span>
                  )
                })}
              </div>

              <pre className="max-h-48 overflow-hidden rounded-lg border border-black/[0.06] bg-[#111] p-4 text-[11px] leading-relaxed text-white/70">
                {snapshot.preview}
              </pre>
            </div>
          )
        })}
      </div>
    </div>
  )
}

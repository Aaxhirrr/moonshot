"use client"

import { useEffect, useState } from "react"
import type { FileDecision, FileEntry } from "@/types"

export type FlamegraphEntry = {
  path: string
  tokens: number
  decision?: FileDecision["decision"]
  category?: FileEntry["category"]
  relevanceScore?: number
}

type TokenFlamegraphProps = {
  files: FlamegraphEntry[]
  totalTokens: number
  variant: "baseline" | "moonshot"
}

function formatTokens(tokens: number) {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(tokens >= 10000 ? 1 : 2)}k` : `${tokens}`
}

function styleFor(entry: FlamegraphEntry, variant: TokenFlamegraphProps["variant"]) {
  if (variant === "baseline") {
    if (entry.category === "relevant") return { label: "relevant", bar: "#111111", text: "text-black/70" }
    if (entry.category === "noise") return { label: "noise", bar: "#ef4444", text: "text-red-700/70" }
    return { label: "irrelevant", bar: "#f97316", text: "text-orange-700/70" }
  }

  if (entry.decision === "allowed") return { label: "allowed", bar: "#16a34a", text: "text-emerald-700" }
  if (entry.decision === "summarized") return { label: "summary", bar: "#ca8a04", text: "text-amber-700" }
  return { label: "blocked", bar: "#9ca3af", text: "text-black/35" }
}

export function TokenFlamegraph({ files, totalTokens, variant }: TokenFlamegraphProps) {
  const [ready, setReady] = useState(false)
  const maxTokens = Math.max(...files.map(file => file.tokens), 1)
  const sortedFiles = [...files].sort((a, b) => b.tokens - a.tokens)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 120)
    return () => clearTimeout(t)
  }, [files.length])

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/70 p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-black/35">
            {variant === "baseline" ? "Baseline context" : "moonshot context"}
          </div>
          <h3 className="serif-fine mt-1 text-2xl font-normal">Token flamegraph</h3>
        </div>
        <div className="font-mono text-sm text-black/45">{formatTokens(totalTokens)} tokens</div>
      </div>

      <div className="space-y-3">
        {sortedFiles.map(file => {
          const style = styleFor(file, variant)
          const width = ready ? Math.max(5, (file.tokens / maxTokens) * 100) : 0
          const pct = totalTokens > 0 ? (file.tokens / totalTokens) * 100 : 0

          return (
            <div key={`${variant}-${file.path}`} className="group">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[11px] text-black/55">{file.path}</span>
                <span className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] ${style.text}`}>
                  {style.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/[0.05]">
                  <div
                    className="h-full rounded-full transition-[width] duration-1000 ease-out"
                    style={{ width: `${width}%`, background: style.bar }}
                  />
                </div>
                <span className="w-20 text-right font-mono text-[11px] text-black/40">
                  {formatTokens(file.tokens)} / {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

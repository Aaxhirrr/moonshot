"use client"

import { useEffect, useState } from "react"
import type { FileDecision } from "@/types"

type FileDecisionTimelineProps = {
  decisions: FileDecision[]
  animated?: boolean
}

function badgeClass(decision: FileDecision["decision"]) {
  if (decision === "allowed") return "border-emerald-600/20 bg-emerald-50 text-emerald-700"
  if (decision === "summarized") return "border-amber-600/20 bg-amber-50 text-amber-700"
  return "border-black/10 bg-black/[0.04] text-black/40"
}

export function FileDecisionTimeline({ decisions, animated = false }: FileDecisionTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(animated ? 0 : decisions.length)

  useEffect(() => {
    if (!animated) {
      setVisibleCount(decisions.length)
      return
    }

    setVisibleCount(0)
    const t = setInterval(() => {
      setVisibleCount(count => {
        if (count >= decisions.length) {
          clearInterval(t)
          return count
        }
        return count + 1
      })
    }, 150)
    return () => clearInterval(t)
  }, [animated, decisions.length])

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/70 p-5">
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-black/35">Routing log</div>
        <h3 className="serif-fine mt-1 text-2xl font-normal">File decision timeline</h3>
      </div>

      <div className="max-h-[460px] space-y-2 overflow-hidden">
        {decisions.slice(0, visibleCount).map((decision, index) => (
          <div
            key={decision.path}
            className="grid grid-cols-[32px_1fr] gap-3 rounded-xl border border-black/[0.05] bg-black/[0.015] p-3"
            style={{ animation: `fadeInUp 360ms cubic-bezier(0.16,1,0.3,1) ${Math.min(index, 8) * 20}ms both` }}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/[0.04] font-mono text-[10px] text-black/35">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="truncate font-mono text-[11px] text-black/60">{decision.path}</span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${badgeClass(decision.decision)}`}>
                  {decision.decision}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-black/35">
                <span>{decision.reason}</span>
                <span>{decision.tokens.toLocaleString()} tokens</span>
                <span>score {decision.relevanceScore.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

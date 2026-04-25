"use client"

import type { PipelineStage } from "@/types"

type ArchitectureDiagramProps = {
  activeStage?: PipelineStage
}

const STAGES: { id: PipelineStage; label: string; detail: string }[] = [
  { id: "task-input", label: "Task", detail: "Checkout bug" },
  { id: "repo-scanner", label: "Scan", detail: "mooncart files" },
  { id: "token-estimator", label: "Tokens", detail: "chars / 4" },
  { id: "relevance-scorer", label: "Score", detail: "task-aware ranking" },
  { id: "context-router", label: "Route", detail: "allow/block/summary" },
  { id: "prompt-builder", label: "Prompt", detail: "lean packet" },
  { id: "nova-api", label: "Nova", detail: "mock-safe output" },
  { id: "output", label: "Patch", detail: "same fix" },
]

export function ArchitectureDiagram({ activeStage }: ArchitectureDiagramProps) {
  const activeIndex = activeStage ? STAGES.findIndex(stage => stage.id === activeStage) : -1

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/70 p-5">
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-black/35">Architecture</div>
        <h3 className="serif-fine mt-1 text-2xl font-normal">Pipeline from task to patch</h3>
      </div>

      <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
        {STAGES.map((stage, index) => {
          const isActive = index === activeIndex
          const isDone = activeIndex >= 0 && index < activeIndex

          return (
            <div
              key={stage.id}
              className={`relative rounded-xl border p-4 transition-all duration-300 ${
                isActive
                  ? "border-black/20 bg-black/[0.06] shadow-sm"
                  : isDone
                    ? "border-emerald-600/15 bg-emerald-50"
                    : "border-black/[0.06] bg-black/[0.02]"
              }`}
            >
              <div className="mb-3 font-mono text-[10px] text-black/25">{String(index + 1).padStart(2, "0")}</div>
              <div className="serif-fine text-lg font-normal">{stage.label}</div>
              <div className="mt-1 text-xs leading-relaxed text-black/35">{stage.detail}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import type { NovaOutput } from "@/types"

type NovaOutputPanelProps = {
  output: NovaOutput | null
  isLoading: boolean
  variant: "baseline" | "moonshot"
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.03] p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-black/35">{label}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-black/60">{code}</pre>
    </div>
  )
}

export function NovaOutputPanel({ output, isLoading, variant }: NovaOutputPanelProps) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/70 p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-black/35">
            {variant === "baseline" ? "Baseline Nova" : "moonshot + mock Nova"}
          </div>
          <h3 className="serif-fine mt-1 text-2xl font-normal">Nova output</h3>
        </div>
        {output && (
          <span className="rounded-full bg-black/[0.05] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-black/40">
            {output.tokensUsed.toLocaleString()} tokens
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-black/[0.05]" />
          ))}
        </div>
      )}

      {!isLoading && !output && (
        <div className="rounded-xl border border-dashed border-black/10 p-8 text-center text-sm text-black/35">
          Run the demo to reveal the Nova patch and test result.
        </div>
      )}

      {!isLoading && output && (
        <div className="space-y-4">
          <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-black/35">Root cause</div>
            <p className="text-sm leading-relaxed text-black/55">{output.rootCause}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <CodeBlock label="Before" code={output.patch.before} />
            <CodeBlock label="After" code={output.patch.after} />
          </div>

          <div className="rounded-xl border border-emerald-600/15 bg-emerald-50 p-4">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700/65">Test result</span>
              <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-700">
                {output.testResult.passed ? "passed" : "failed"}
              </span>
            </div>
            <p className="text-sm text-emerald-900/65">{output.testResult.description}</p>
            <p className="mt-2 font-mono text-[11px] text-emerald-900/45">
              expected {output.testResult.expected}, actual {output.testResult.actual}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

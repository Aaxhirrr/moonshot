"use client"

import { useState } from "react"

// A deliberately ambient control: just a slider, no label, no icon.
// Sits bottom-right and subtly dims the page via a fixed overlay.
export function BrightnessSlider() {
  const [value, setValue] = useState(95)

  // 100 = no dim, 0 = full black overlay. Linear feels right for a UI knob.
  const dim = (100 - value) / 100

  return (
    <>
      {/* Dim layer — sits below the slider, above all content */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-[45]"
        style={{
          background: `rgba(12, 10, 8, ${dim * 0.85})`,
          transition: "background 120ms ease",
        }}
      />

      {/* Slider pill — bottom right */}
      <div
        className="fixed bottom-5 right-5 z-[60] flex items-center px-3.5 py-2.5 rounded-full border border-black/10"
        style={{
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          background: "rgba(255,255,255,0.55)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label="Adjust"
          className="ambient-slider"
        />
      </div>
    </>
  )
}

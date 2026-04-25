"use client"

import { useEffect, useRef, useState } from "react"

// Splits text into words and reveals each with staggered opacity+blur+translateY
// matching the AGENTIC intro animation style.
//
// Editorial emphasis: wrap any word in _underscores_ to render it italic
// (e.g., "Six stories we _actually_ discussed"). Works great with Fraunces.
export function RevealText({
  children,
  className = "",
  as: Tag = "h2",
  stagger = 80,       // ms between each word
  duration = 700,     // ms per word transition
  delay = 0,          // initial delay before first word
  threshold = 0.2,    // IntersectionObserver threshold
}: {
  children: string
  className?: string
  as?: "h1" | "h2" | "h3" | "p" | "span"
  stagger?: number
  duration?: number
  delay?: number
  threshold?: number
}) {
  const ref       = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  // Split on spaces but preserve line breaks (rendered via <br />).
  // Words wrapped in _underscores_ render italic for editorial emphasis.
  const parts = children.split(/(\n)/g)
  const words: { word: string; italic: boolean; index: number }[] = []
  let wordIndex = 0
  parts.forEach((part) => {
    if (part === "\n") {
      words.push({ word: "\n", italic: false, index: wordIndex++ })
    } else {
      part.split(" ").forEach((w, i, arr) => {
        if (!w) return
        const italic = w.length > 2 && w.startsWith("_") && w.endsWith("_")
        const cleaned = italic ? w.slice(1, -1) : w
        const withSpace = i < arr.length - 1 ? cleaned + " " : cleaned
        words.push({ word: withSpace, italic, index: wordIndex++ })
      })
    }
  })

  return (
    // @ts-ignore — dynamic tag
    <Tag ref={ref} className={className} style={{ display: "block", overflow: "hidden" }}>
      {words.map(({ word, italic, index }) => {
        if (word === "\n") return <br key={`br-${index}`} />

        const wordDelay = delay + index * stagger

        return (
          <span
            key={index}
            style={{
              display:    "inline-block",
              fontStyle:  italic ? "italic" : undefined,
              fontWeight: italic ? 300 : undefined,
              color:      italic ? "rgba(0,0,0,0.55)" : undefined,
              opacity:    visible ? 1 : 0,
              filter:     visible ? "blur(0px)" : "blur(8px)",
              transform:  visible ? "translateY(0)" : "translateY(12px)",
              transition: visible
                ? `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${wordDelay}ms,
                   filter  ${duration}ms cubic-bezier(0.16,1,0.3,1) ${wordDelay}ms,
                   transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${wordDelay}ms`
                : "none",
            }}
          >
            {word}
          </span>
        )
      })}
    </Tag>
  )
}

import { NextResponse } from "next/server"
import type { NovaOutput } from "@/types"

const DEFAULT_BASE_URL = "https://api.nova.amazon.com/v1"
const DEFAULT_MODEL = "nova-premier-v1"

type NovaRequest = {
  prompt?: string
  task?: string
  contextFiles?: string[]
}

type NovaApiResponse = NovaOutput & {
  mode: "live" | "mock" | "cached"
  model: string
  note?: string
}

function fallbackResponse(note: string, model = process.env.NOVA_MODEL || DEFAULT_MODEL): NovaApiResponse {
  return {
    mode: "mock",
    model,
    note,
    rootCause:
      "Discount was applied to the post-tax total instead of the pre-tax subtotal. The checkout total applies tax first, then subtracts the discount from the inflated amount.",
    patch: {
      file: "src/checkout/cart.ts",
      before:
        "// Apply tax first, then discount (BUG)\nconst total = subtotal * (1 + taxRate)\nconst discounted = total - discount",
      after:
        "// Apply discount first, then tax (FIXED)\nconst discounted = subtotal - discount\nconst total = discounted * (1 + taxRate)",
      description:
        "Move discount application before tax calculation so tax is charged only on the amount the customer actually pays.",
    },
    testResult: {
      description: "subtotal 100, discount 20, tax 10% should equal 88",
      input: { subtotal: 100, discount: 20, taxRate: 0.1 },
      expected: 88,
      actual: 88,
      passed: true,
    },
    tokensUsed: 17920,
  }
}

function extractText(data: unknown): string {
  const value = data as {
    choices?: Array<{ message?: { content?: string } }>
    output?: { message?: { content?: Array<{ text?: string }> } }
    content?: Array<{ text?: string }>
    message?: string
    text?: string
  }

  return (
    value.choices?.[0]?.message?.content ||
    value.output?.message?.content?.[0]?.text ||
    value.content?.[0]?.text ||
    value.message ||
    value.text ||
    ""
  )
}

function completionUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, "")
  if (normalized.endsWith("/chat/completions")) return normalized
  return `${normalized}/chat/completions`
}

function normalizeLiveResponse(data: unknown, model: string): NovaApiResponse {
  const text = extractText(data)

  try {
    const parsed = JSON.parse(text) as Partial<NovaOutput>
    if (parsed.rootCause && parsed.patch && parsed.testResult) {
      return {
        ...parsed,
        mode: "live",
        model,
        tokensUsed: parsed.tokensUsed ?? 0,
      } as NovaApiResponse
    }
  } catch {
    // Plain text is still useful in the live demo; wrap it as a Nova output.
  }

  return {
    ...fallbackResponse("Live Nova returned plain text; wrapped for display.", model),
    mode: "live",
    rootCause: text || "Nova returned an empty response.",
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as NovaRequest
  const prompt = body.prompt?.trim()
  const apiBaseUrl = process.env.NOVA_API_BASE_URL || DEFAULT_BASE_URL
  const apiKey = process.env.NOVA_API_KEY
  const model = process.env.NOVA_MODEL || DEFAULT_MODEL
  const timeoutMs = Number(process.env.NOVA_TIMEOUT_MS || 20000)

  if (!prompt) {
    return NextResponse.json(fallbackResponse("Missing prompt; showing cached mock response.", model), { status: 400 })
  }

  if (!apiKey) {
    return NextResponse.json(fallbackResponse("NOVA_API_KEY is missing; showing cached mock response.", model))
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(completionUrl(apiBaseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_completion_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "You are Nova helping a developer fix a coding task. Return concise JSON with rootCause, patch { file, before, after, description }, testResult { description, input, expected, actual, passed }, and tokensUsed.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        fallbackResponse(`Nova API returned HTTP ${response.status}; showing cached mock response.`, model),
        { status: 200 },
      )
    }

    return NextResponse.json(normalizeLiveResponse(await response.json(), model))
  } catch (error) {
    clearTimeout(timeout)
    const note = error instanceof Error && error.name === "AbortError"
      ? `Nova timed out after ${timeoutMs}ms; showing cached mock response.`
      : "Nova request failed; showing cached mock response."
    return NextResponse.json(fallbackResponse(note, model))
  }
}

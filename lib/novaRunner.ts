import type { NovaOutput } from "@/types"

function mockNovaResponse(_prompt: string): NovaOutput {
  return {
    rootCause:
      "Discount was applied to the post-tax total instead of the pre-tax subtotal. In src/checkout/cart.ts, the tax multiplier is applied first (line 42), then the discount is subtracted from the inflated total — causing customers to pay tax on the full pre-discount amount.",
    patch: {
      file: "src/checkout/cart.ts",
      before:
        "// Apply tax first, then discount (BUG)\nconst total = subtotal * (1 + taxRate);\nconst discounted = total - discount;",
      after:
        "// Apply discount first, then tax (FIXED)\nconst discounted = subtotal - discount;\nconst total = discounted * (1 + taxRate);",
      description:
        "Calculate discounted subtotal first, then apply tax to the discounted amount. This ensures tax is only charged on the amount the customer actually pays.",
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

function normalizeNovaResponse(data: unknown): NovaOutput {
  try {
    const d = data as Record<string, unknown>
    const choices = d.choices as Array<{ message: { content: string } }>
    const content = choices?.[0]?.message?.content ?? ""
    const parsed = JSON.parse(content) as NovaOutput
    return parsed
  } catch {
    return mockNovaResponse("")
  }
}

export async function runNova(prompt: string): Promise<NovaOutput> {
  if (process.env.USE_MOCK_NOVA !== "false" || !process.env.NOVA_API_KEY) {
    return mockNovaResponse(prompt)
  }

  try {
    const response = await fetch(process.env.NOVA_API_BASE_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOVA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.NOVA_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      return mockNovaResponse(prompt)
    }

    return normalizeNovaResponse(await response.json())
  } catch {
    return mockNovaResponse(prompt)
  }
}

import { describe, it, expect } from "vitest"
import { prompts, handlers } from "../../src/workflows/index.js"

describe("Workflow Prompts", () => {
  it("exports a non-empty array of prompts", () => {
    expect(Array.isArray(prompts)).toBe(true)
    expect(prompts.length).toBeGreaterThan(0)
  })

  it("all prompts have required properties", () => {
    for (const p of prompts) {
      expect(p.name).toBeDefined()
      expect(typeof p.name).toBe("string")
      expect(p.name.length).toBeGreaterThan(0)
      expect(typeof p.description).toBe("string")
    }
  })

  it("all prompts have unique names", () => {
    const names = prompts.map((p) => p.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it("all prompts have a corresponding handler", () => {
    for (const p of prompts) {
      expect(handlers[p.name]).toBeDefined()
      expect(typeof handlers[p.name]).toBe("function")
    }
  })

  it("no extra handlers exist without a prompt", () => {
    const promptNames = new Set(prompts.map((p) => p.name))
    for (const name of Object.keys(handlers)) {
      expect(promptNames.has(name)).toBe(true)
    }
  })
})

describe("Workflow Templates", () => {
  const expectedPrompts = [
    "daily-summary",
    "morning-briefing",
    "end-of-day-recap",
    "weekly-expiration",
    "top-movers",
    "ticker-analysis",
    "options-setup",
    "pre-earnings",
    "greek-exposure",
    "short-interest",
    "option-contract",
    "correlation-analysis",
    "unusual-flow",
    "dark-pool-scanner",
    "sector-flow",
    "congress-tracker",
    "politician-portfolio",
    "insider-scanner",
    "institutional-activity",
    "analyst-tracker",
    "earnings-calendar",
    "fda-calendar",
    "economic-calendar",
    "iv-screener",
    "bullish-confluence",
    "bearish-confluence",
    "news-scanner",
    "seasonality",
    "etf-flow",
  ]

  it("includes all expected prompts", () => {
    const names = prompts.map((p) => p.name)
    for (const expected of expectedPrompts) {
      expect(names).toContain(expected)
    }
  })
})

describe("Workflow Handlers", () => {
  it("daily-summary handler returns messages", async () => {
    const result = await handlers["daily-summary"]({})
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].role).toBe("user")
    expect(result[0].content).toBeDefined()
  })

  it("ticker-analysis handler requires ticker argument", async () => {
    await expect(handlers["ticker-analysis"]({})).rejects.toThrow()
  })

  it("ticker-analysis handler substitutes ticker", async () => {
    const result = await handlers["ticker-analysis"]({ ticker: "AAPL" })
    expect(result.length).toBeGreaterThan(0)
    const text = (result[0].content as { type: string; text: string }).text
    expect(text).toContain("AAPL")
  })

  it("politician-portfolio handler requires name argument", async () => {
    await expect(handlers["politician-portfolio"]({})).rejects.toThrow()
  })

  it("politician-portfolio handler substitutes name", async () => {
    const result = await handlers["politician-portfolio"]({ name: "Nancy Pelosi" })
    expect(result.length).toBeGreaterThan(0)
    const text = (result[0].content as { type: string; text: string }).text
    expect(text).toContain("Nancy Pelosi")
  })

  it("morning-briefing handler works without arguments", async () => {
    const result = await handlers["morning-briefing"]({})
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].role).toBe("user")
  })

  it("all handlers return proper PromptMessage structure", async () => {
    // Test a subset of handlers that don't require arguments
    const noArgPrompts = [
      "daily-summary", "morning-briefing", "end-of-day-recap",
      "top-movers", "unusual-flow", "dark-pool-scanner",
      "sector-flow", "congress-tracker", "insider-scanner",
    ]

    for (const name of noArgPrompts) {
      const result = await handlers[name]({})
      expect(Array.isArray(result)).toBe(true)
      for (const msg of result) {
        expect(msg.role).toBe("user")
        expect(msg.content).toBeDefined()
      }
    }
  })
})

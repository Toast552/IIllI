import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock the gateway before any catalog imports
vi.mock("../../src/gateway.js", () => ({
  request: vi.fn().mockResolvedValue({ payload: { mocked: true } }),
  sanitizeSegment: vi.fn((value: unknown) => {
    if (value === undefined || value === null) throw new Error("Path segment is required")
    const s = String(value)
    if (s.includes("/") || s.includes("\\") || s.includes("..")) throw new Error("Invalid path segment")
    return encodeURIComponent(s)
  }),
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  faultJson: vi.fn((msg: string) => JSON.stringify({ error: msg })),
  breakerSnapshot: vi.fn(() => ({ phase: "closed", faults: 0 })),
}))

import { allTools } from "../../src/catalog/index.js"
import { request } from "../../src/gateway.js"

const mockRequest = request as ReturnType<typeof vi.fn>

describe("Tool Registry", () => {
  it("exports a non-empty array of compiled tools", () => {
    expect(Array.isArray(allTools)).toBe(true)
    expect(allTools.length).toBeGreaterThan(0)
  })

  it("all tools have required properties", () => {
    for (const tool of allTools) {
      expect(tool.name).toBeDefined()
      expect(typeof tool.name).toBe("string")
      expect(tool.name.length).toBeGreaterThan(0)

      expect(tool.description).toBeDefined()
      expect(typeof tool.description).toBe("string")
      expect(tool.description.length).toBeGreaterThan(0)

      expect(tool.inputSchema).toBeDefined()
      expect(typeof tool.handler).toBe("function")
    }
  })

  it("all tools have unique names", () => {
    const names = allTools.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe("Tool Names", () => {
  const expectedTools = [
    "uw_stock",
    "uw_options",
    "uw_market",
    "uw_flow",
    "uw_darkpool",
    "uw_congress",
    "uw_insider",
    "uw_institutions",
    "uw_earnings",
    "uw_etf",
    "uw_screener",
    "uw_shorts",
    "uw_seasonality",
    "uw_news",
    "uw_alerts",
    "uw_politicians",
    "uw_fundamentals",
    "uw_technicals",
    "get_fundamental_breakdown",
    "get_stock_financials",
    "get_income_statements",
    "get_balance_sheets",
    "get_cash_flows",
    "get_earnings_history",
    "get_technical_indicator",
  ]

  it("contains all expected tools", () => {
    const toolNames = allTools.map((t) => t.name)
    for (const expected of expectedTools) {
      expect(toolNames).toContain(expected)
    }
  })
})

describe("Tool Annotations", () => {
  it("all tools have readOnlyHint annotation", () => {
    for (const tool of allTools) {
      expect(tool.annotations?.readOnlyHint).toBe(true)
    }
  })

  it("all tools have idempotentHint annotation", () => {
    for (const tool of allTools) {
      expect(tool.annotations?.idempotentHint).toBe(true)
    }
  })
})

describe("Handler Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest.mockResolvedValue({ payload: { test: "response" } })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("catalog tool handlers return structured responses", async () => {
    const stockTool = allTools.find((t) => t.name === "uw_stock")!
    const result = await stockTool.handler({ command: "ticker_exchanges" })

    expect(typeof result).toBe("object")
    expect(result).toHaveProperty("text")
    expect(typeof (result as any).text).toBe("string")
    expect(() => JSON.parse((result as any).text)).not.toThrow()
  })

  it("catalog tool handlers return error for invalid command", async () => {
    const stockTool = allTools.find((t) => t.name === "uw_stock")!
    const result = await stockTool.handler({ command: "invalid_command_xyz" })

    expect(typeof result).toBe("object")
    expect(result).toHaveProperty("text")
    const parsed = JSON.parse((result as any).text)
    expect(parsed.error).toBeDefined()
  })

  it("catalog tool handlers make API calls via request()", async () => {
    const stockTool = allTools.find((t) => t.name === "uw_stock")!
    await stockTool.handler({ command: "info", ticker: "AAPL" })

    expect(mockRequest).toHaveBeenCalled()
  })

  it("standalone tool handlers work correctly", async () => {
    const fundamentalTool = allTools.find((t) => t.name === "get_fundamental_breakdown")!
    const result = await fundamentalTool.handler({ ticker: "AAPL" })

    expect(typeof result).toBe("object")
    expect(result).toHaveProperty("text")
    expect(mockRequest).toHaveBeenCalled()
  })

  it("multiple handlers can be called sequentially", async () => {
    const stock = allTools.find((t) => t.name === "uw_stock")!
    const flow = allTools.find((t) => t.name === "uw_flow")!
    const market = allTools.find((t) => t.name === "uw_market")!

    await stock.handler({ command: "ticker_exchanges" })
    await flow.handler({ command: "flow_alerts" })
    await market.handler({ command: "market_tide" })

    expect(mockRequest).toHaveBeenCalledTimes(3)
  })
})

describe("Request/Response Cycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("successful API response flows through correctly", async () => {
    const mockData = { ticker: "AAPL", price: 175.50, volume: 1000000 }
    mockRequest.mockResolvedValue({ payload: mockData })

    const stockTool = allTools.find((t) => t.name === "uw_stock")!
    const result = await stockTool.handler({ command: "info", ticker: "AAPL" })
    expect(result).toHaveProperty("text")
    expect(result).toHaveProperty("structuredContent")
    const parsed = JSON.parse((result as any).text)

    expect(parsed).toEqual(mockData)
    expect((result as any).structuredContent).toEqual(mockData)
  })

  it("API fault flows through correctly", async () => {
    mockRequest.mockResolvedValue({ fault: "API rate limit exceeded" })

    const stockTool = allTools.find((t) => t.name === "uw_stock")!
    const result = await stockTool.handler({ command: "info", ticker: "AAPL" })
    expect(result).toHaveProperty("text")
    const parsed = JSON.parse((result as any).text)

    expect(parsed.error).toBe("API rate limit exceeded")
  })

  it("validation errors are returned before API call", async () => {
    const stockTool = allTools.find((t) => t.name === "uw_stock")!
    const result = await stockTool.handler({ command: "ohlc", ticker: "AAPL" }) // missing candle_size

    expect(result).toHaveProperty("text")
    const parsed = JSON.parse((result as any).text)
    expect(parsed.error).toBeDefined()
    expect(mockRequest).not.toHaveBeenCalled()
  })
})

describe("Tool Input Schema", () => {
  it("catalog tools use command discriminator", () => {
    for (const tool of allTools) {
      if (tool.name.startsWith("get_")) continue

      const schema = tool.inputSchema
      // Discriminated unions produce oneOf or anyOf in JSON Schema
      if (schema.oneOf) {
        for (const variant of schema.oneOf as any[]) {
          expect(variant.properties?.command).toBeDefined()
        }
      } else if (schema.anyOf) {
        for (const variant of schema.anyOf as any[]) {
          expect(variant.properties?.command).toBeDefined()
        }
      }
    }
  })

  it("standalone tools have a flat params schema", () => {
    for (const tool of allTools) {
      if (!tool.name.startsWith("get_")) continue
      expect(tool.inputSchema.properties).toBeDefined()
      expect(tool.inputSchema.properties.ticker || tool.inputSchema.properties.indicator).toBeDefined()
    }
  })
})

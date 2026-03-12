import { describe, it, expect, vi } from "vitest"

// Mock the gateway before any imports that need it
vi.mock("../../src/gateway.js", () => ({
  request: vi.fn().mockResolvedValue({ payload: {} }),
  sanitizeSegment: vi.fn((v: unknown) => encodeURIComponent(String(v))),
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  faultJson: vi.fn((msg: string) => JSON.stringify({ error: msg })),
}))

import { initializeDocs } from "../../src/docs/index.js"
import { allTools } from "../../src/catalog/index.js"

describe("initializeDocs", () => {
  const { resources, handlers } = initializeDocs(allTools)

  it("returns resources array", () => {
    expect(Array.isArray(resources)).toBe(true)
    expect(resources.length).toBe(2)
  })

  it("includes api-reference resource", () => {
    const apiRef = resources.find((r) => r.uri === "docs://api-reference")
    expect(apiRef).toBeDefined()
    expect(apiRef!.name).toBe("API Reference")
    expect(apiRef!.mimeType).toBe("text/markdown")
  })

  it("includes tools-summary resource", () => {
    const summary = resources.find((r) => r.uri === "docs://tools-summary")
    expect(summary).toBeDefined()
    expect(summary!.name).toBe("Tools Summary")
    expect(summary!.mimeType).toBe("application/json")
  })

  it("has handlers for all resources", () => {
    for (const res of resources) {
      expect(handlers[res.uri]).toBeDefined()
      expect(typeof handlers[res.uri]).toBe("function")
    }
  })
})

describe("API Reference content", () => {
  const { handlers } = initializeDocs(allTools)

  it("generates markdown content", async () => {
    const content = await handlers["docs://api-reference"]()
    expect(typeof content).toBe("string")
    expect(content).toContain("# Unusual Whales API Reference")
  })

  it("lists tool count", async () => {
    const content = await handlers["docs://api-reference"]()
    expect(content).toContain(`${allTools.length} tools available`)
  })

  it("contains tool names as headings", async () => {
    const content = await handlers["docs://api-reference"]()
    expect(content).toContain("## uw_stock")
    expect(content).toContain("## uw_flow")
  })

  it("includes input schema sections", async () => {
    const content = await handlers["docs://api-reference"]()
    expect(content).toContain("### Input Schema")
  })
})

describe("Tools Summary content", () => {
  const { handlers } = initializeDocs(allTools)

  it("generates valid JSON", async () => {
    const content = await handlers["docs://tools-summary"]()
    expect(() => JSON.parse(content)).not.toThrow()
  })

  it("includes totalTools count", async () => {
    const content = await handlers["docs://tools-summary"]()
    const parsed = JSON.parse(content)
    expect(parsed.totalTools).toBe(allTools.length)
  })

  it("includes tools array with names and descriptions", async () => {
    const content = await handlers["docs://tools-summary"]()
    const parsed = JSON.parse(content)
    expect(Array.isArray(parsed.tools)).toBe(true)
    expect(parsed.tools.length).toBe(allTools.length)

    for (const t of parsed.tools) {
      expect(t.name).toBeDefined()
      expect(t.description).toBeDefined()
    }
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { z } from "zod"

// Mock the gateway module before importing engine
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
}))

import { compileCatalog, compileStandalone } from "../../src/engine.js"
import type { ToolCatalog, StandaloneSpec } from "../../src/engine.js"
import { request } from "../../src/gateway.js"

const mockRequest = request as ReturnType<typeof vi.fn>

describe("compileCatalog", () => {
  const catalog: ToolCatalog = {
    id: "test_tool",
    summary: "A test tool with multiple commands",
    commands: [
      {
        name: "get_info",
        route: "/api/thing/{id}/info",
        params: z.object({ id: z.string() }),
      },
      {
        name: "list_all",
        route: "/api/things",
        params: z.object({ limit: z.number().optional() }),
      },
      {
        name: "search",
        route: "/api/things/search",
        params: z.object({ q: z.string() }),
        queryRenames: { q: "query" },
      },
    ],
  }

  let compiled: ReturnType<typeof compileCatalog>

  beforeEach(() => {
    compiled = compileCatalog(catalog)
    vi.clearAllMocks()
    mockRequest.mockResolvedValue({ payload: { result: "ok" } })
  })

  it("produces a CompiledTool with correct name", () => {
    expect(compiled.name).toBe("test_tool")
  })

  it("produces a CompiledTool with correct description", () => {
    expect(compiled.description).toBe("A test tool with multiple commands")
  })

  it("generates a valid inputSchema", () => {
    expect(compiled.inputSchema).toBeDefined()
    expect(compiled.inputSchema.type || compiled.inputSchema).toBeDefined()
  })

  it("has a zodInputSchema for MCP registration", () => {
    expect(compiled.zodInputSchema).toBeDefined()
  })

  it("sets default annotations", () => {
    expect(compiled.annotations?.readOnlyHint).toBe(true)
    expect(compiled.annotations?.idempotentHint).toBe(true)
    expect(compiled.annotations?.openWorldHint).toBe(true)
  })

  it("uses custom annotations when provided", () => {
    const withHints: ToolCatalog = {
      ...catalog,
      hints: { readOnlyHint: true, idempotentHint: false },
    }
    const result = compileCatalog(withHints)
    expect(result.annotations?.readOnlyHint).toBe(true)
    expect(result.annotations?.idempotentHint).toBe(false)
  })

  it("handler resolves path params from route template", async () => {
    await compiled.handler({ command: "get_info", id: "abc123" })
    expect(mockRequest).toHaveBeenCalledWith("/api/thing/abc123/info", {})
  })

  it("handler passes non-path params as query", async () => {
    await compiled.handler({ command: "list_all", limit: 50 })
    expect(mockRequest).toHaveBeenCalledWith("/api/things", { limit: 50 })
  })

  it("handler applies queryRenames", async () => {
    await compiled.handler({ command: "search", q: "test" })
    expect(mockRequest).toHaveBeenCalledWith("/api/things/search", { query: "test" })
  })

  it("handler returns structured output on success", async () => {
    const result = await compiled.handler({ command: "list_all" })
    expect(typeof result).toBe("object")
    expect(result).toHaveProperty("text")
    const parsed = JSON.parse((result as { text: string }).text)
    expect(parsed.result).toBe("ok")
  })

  it("handler returns structuredContent on success", async () => {
    const result = await compiled.handler({ command: "list_all" })
    expect(result).toHaveProperty("structuredContent")
    expect((result as any).structuredContent).toEqual({ result: "ok" })
  })

  it("handler returns error for unknown command", async () => {
    const result = await compiled.handler({ command: "nonexistent" })
    const parsed = JSON.parse((result as { text: string }).text)
    expect(parsed.error).toBeDefined()
  })

  it("handler returns error for missing required params", async () => {
    const result = await compiled.handler({ command: "get_info" }) // missing id
    const parsed = JSON.parse((result as { text: string }).text)
    expect(parsed.error).toBeDefined()
  })

  it("handler returns fault from gateway", async () => {
    mockRequest.mockResolvedValue({ fault: "Service down" })
    const result = await compiled.handler({ command: "list_all" })
    const parsed = JSON.parse((result as { text: string }).text)
    expect(parsed.error).toBe("Service down")
  })

  it("handler catches thrown errors", async () => {
    mockRequest.mockRejectedValue(new Error("network failure"))
    const result = await compiled.handler({ command: "list_all" })
    const parsed = JSON.parse((result as { text: string }).text)
    expect(parsed.error).toContain("network failure")
  })

  it("does not send command field as a query param", async () => {
    await compiled.handler({ command: "list_all", limit: 10 })
    const [, query] = mockRequest.mock.calls[0]
    expect(query).not.toHaveProperty("command")
  })
})

describe("compileStandalone", () => {
  const spec: StandaloneSpec = {
    id: "get_widget",
    summary: "Fetch a widget by ID",
    route: "/api/widget/{widget_id}",
    params: z.object({
      widget_id: z.string(),
      format: z.string().optional(),
    }),
  }

  let compiled: ReturnType<typeof compileStandalone>

  beforeEach(() => {
    compiled = compileStandalone(spec)
    vi.clearAllMocks()
    mockRequest.mockResolvedValue({ payload: { widget: "data" } })
  })

  it("produces a CompiledTool with correct name", () => {
    expect(compiled.name).toBe("get_widget")
  })

  it("produces a CompiledTool with correct description", () => {
    expect(compiled.description).toBe("Fetch a widget by ID")
  })

  it("handler resolves path params", async () => {
    await compiled.handler({ widget_id: "w123" })
    expect(mockRequest).toHaveBeenCalledWith("/api/widget/w123", {})
  })

  it("handler passes remaining params as query", async () => {
    await compiled.handler({ widget_id: "w123", format: "json" })
    expect(mockRequest).toHaveBeenCalledWith("/api/widget/w123", { format: "json" })
  })

  it("handler returns structured output on success", async () => {
    const result = await compiled.handler({ widget_id: "w123" })
    expect(result).toHaveProperty("text")
    expect(result).toHaveProperty("structuredContent")
    const parsed = JSON.parse((result as { text: string }).text)
    expect(parsed.widget).toBe("data")
  })

  it("handler returns validation error for missing params", async () => {
    const result = await compiled.handler({}) // missing widget_id
    const parsed = JSON.parse((result as { text: string }).text)
    expect(parsed.error).toBeDefined()
  })

  it("handler returns fault from gateway", async () => {
    mockRequest.mockResolvedValue({ fault: "timeout" })
    const result = await compiled.handler({ widget_id: "w123" })
    const parsed = JSON.parse((result as { text: string }).text)
    expect(parsed.error).toBe("timeout")
  })
})

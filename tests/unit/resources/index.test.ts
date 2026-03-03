import { describe, it, expect } from "vitest"
import { initializeResources } from "../../../src/resources/index.js"
import type { ToolDefinition } from "../../../src/tools/index.js"

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: "test_tool",
    description: "A test tool",
    inputSchema: { type: "object", properties: {}, required: [] },
    ...overrides,
  }
}

describe("initializeResources", () => {
  it("creates resource definitions and handlers", () => {
    const { resources, handlers } = initializeResources([makeTool()])
    expect(resources).toHaveLength(2)
    expect(Object.keys(handlers)).toHaveLength(2)
  })

  it("creates API reference resource", () => {
    const { resources, handlers } = initializeResources([])
    const ref = resources.find((r) => r.uri === "docs://api-reference")
    expect(ref).toBeDefined()
    expect(ref?.name).toBe("API Reference")
    expect(ref?.mimeType).toBe("text/markdown")
    expect(handlers["docs://api-reference"]).toBeDefined()
  })

  it("creates tools summary resource", () => {
    const { resources, handlers } = initializeResources([])
    const summary = resources.find((r) => r.uri === "docs://tools-summary")
    expect(summary).toBeDefined()
    expect(summary?.name).toBe("Tools Summary")
    expect(summary?.mimeType).toBe("application/json")
    expect(handlers["docs://tools-summary"]).toBeDefined()
  })

  it("api reference handler returns markdown with tool info", async () => {
    const tools = [
      makeTool({ name: "tool_one", description: "First tool\nWith details", annotations: { readOnlyHint: true, idempotentHint: true } }),
      makeTool({ name: "tool_two", description: "Second tool" }),
    ]
    const { handlers } = initializeResources(tools)
    const md = await handlers["docs://api-reference"]()

    expect(md).toContain("# Unusual Whales API Reference")
    expect(md).toContain("## tool_one")
    expect(md).toContain("## tool_two")
    expect(md).toContain("First tool")
    expect(md).toContain("### Input Schema")
    expect(md).toContain("- Read-only operation")
    expect(md).toContain("- Idempotent operation")
    expect(md).toContain("1. [tool_one](#toolone)")
    expect(md).toContain("2. [tool_two](#tooltwo)")
  })

  it("api reference omits annotations section when none present", async () => {
    const { handlers } = initializeResources([makeTool({ name: "simple_tool" })])
    const md = await handlers["docs://api-reference"]()
    expect(md).toContain("## simple_tool")
    expect(md).not.toContain("### Annotations")
  })

  it("tools summary handler returns valid JSON", async () => {
    const tools = [
      makeTool({ name: "tool_a", description: "First line\nSecond line", inputSchema: { type: "object", properties: {}, required: ["action"] }, annotations: { readOnlyHint: true } }),
      makeTool({ name: "tool_b", description: "Another tool", inputSchema: { type: "object", properties: {}, required: ["param"] } }),
    ]
    const { handlers } = initializeResources(tools)
    const json = await handlers["docs://tools-summary"]()
    const parsed = JSON.parse(json)

    expect(parsed.totalTools).toBe(2)
    expect(parsed.tools).toHaveLength(2)
    expect(parsed.tools[0].name).toBe("tool_a")
    expect(parsed.tools[0].description).toBe("First line")
    expect(parsed.tools[0].requiredParameters).toEqual(["action"])
    expect(parsed.tools[0].annotations).toEqual({ readOnlyHint: true })
    expect(parsed.tools[1].name).toBe("tool_b")
    expect(parsed.tools[1].requiredParameters).toEqual(["param"])
  })
})

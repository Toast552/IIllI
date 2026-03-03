import type { ToolDefinition } from "../tools/index.js"

export type ResourceHandler = () => Promise<string>

export interface ResourceDefinition {
  uri: string
  name: string
  description: string
  mimeType: string
}

function renderApiReference(tools: ToolDefinition[]): string {
  const toc = tools.map((t, i) => `${i + 1}. [${t.name}](#${t.name.replace(/_/g, "")})`).join("\n")

  const sections = tools.map((tool) => {
    const parts = [`## ${tool.name}`, "", tool.description, "", "### Input Schema", "", "```json", JSON.stringify(tool.inputSchema, null, 2), "```", ""]

    if (tool.annotations) {
      const hints = []
      if (tool.annotations.readOnlyHint) hints.push("- Read-only operation")
      if (tool.annotations.idempotentHint) hints.push("- Idempotent operation")
      if (tool.annotations.openWorldHint) hints.push("- Open world (may return unexpected fields)")
      if (tool.annotations.destructiveHint) hints.push("- Destructive operation")
      if (hints.length > 0) parts.push("### Annotations", "", ...hints, "")
    }

    return parts.join("\n")
  })

  return ["# Unusual Whales API Reference", "", `${tools.length} tools available.`, "", toc, "", ...sections].join("\n")
}

function renderToolsSummary(tools: ToolDefinition[]): string {
  return JSON.stringify({
    totalTools: tools.length,
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description.split("\n")[0],
      requiredParameters: tool.inputSchema.required || [],
      annotations: tool.annotations || {},
    })),
  }, null, 2)
}

export function initializeResources(tools: ToolDefinition[]): {
  resources: ResourceDefinition[]
  handlers: Record<string, ResourceHandler>
} {
  const entries: Array<{ def: ResourceDefinition; fn: ResourceHandler }> = [
    {
      def: { uri: "docs://api-reference", name: "API Reference", description: "Complete reference documentation for all Unusual Whales API tools", mimeType: "text/markdown" },
      fn: async () => renderApiReference(tools),
    },
    {
      def: { uri: "docs://tools-summary", name: "Tools Summary", description: "Summary of available tools with their actions and parameters", mimeType: "application/json" },
      fn: async () => renderToolsSummary(tools),
    },
  ]

  return {
    resources: entries.map((e) => e.def),
    handlers: Object.fromEntries(entries.map((e) => [e.def.uri, e.fn])),
  }
}

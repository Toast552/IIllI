import type { ZodSchema } from "zod"
import type { ApiResponse } from "../client.js"
import { formatZodError } from "../schemas.js"

export class PathBuilder {
  private params: Map<string, string> = new Map()

  add(name: string, value: unknown, required: boolean = true): this {
    if (value === undefined || value === null) {
      if (required) throw new Error(`${name} is required`)
      return this
    }
    const str = String(value)
    if (str.includes("/") || str.includes("\\") || str.includes("..")) {
      throw new Error(`Invalid ${name}: contains path characters`)
    }
    if (str.length === 0) throw new Error(`${name} cannot be empty`)
    this.params.set(name, encodeURIComponent(str))
    return this
  }

  clear(): this {
    this.params.clear()
    return this
  }

  build(template: string): string {
    let path = template
    const matches = template.match(/\{([^}]+)\}/g)
    if (matches) {
      for (const match of matches) {
        const paramName = match.slice(1, -1)
        const value = this.params.get(paramName)
        if (value === undefined) throw new Error(`Missing required parameter: ${paramName}`)
        path = path.replace(match, value)
      }
    }
    return path
  }
}

export interface ToolResponse {
  text: string
  structuredContent?: unknown
}

export function formatToolResponse(result: ApiResponse): ToolResponse {
  if (result.error) {
    return {
      text: JSON.stringify({ error: result.error }, null, 2),
    }
  }

  return {
    text: JSON.stringify(result.data, null, 2),
    structuredContent: result.data,
  }
}

export function formatToolError(message: string): ToolResponse {
  return {
    text: JSON.stringify({ error: message }, null, 2),
  }
}

type ActionHandler<TInput> = (data: TInput) => Promise<ApiResponse>

type ActionHandlers<TInput> = {
  [K in TInput extends { action_type: infer A } ? A & string : never]: ActionHandler<
    Extract<TInput, { action_type: K }>
  >
}

export function createToolHandler<TInput>(
  schema: ZodSchema<TInput>,
  handlers: ActionHandlers<TInput>,
): (args: Record<string, unknown>) => Promise<ToolResponse> {
  return async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const parsed = schema.safeParse(args)

    if (!parsed.success) {
      return formatToolError(`Invalid input: ${formatZodError(parsed.error)}`)
    }

    const data = parsed.data as TInput & { action_type: string }
    const action = data.action_type

    const handler = handlers[action as keyof typeof handlers]

    if (!handler) {
      return formatToolError(`Unknown action: ${action}`)
    }

    try {
      const result = await handler(data as never)
      return formatToolResponse(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return formatToolError(`Error executing ${action}: ${message}`)
    }
  }
}

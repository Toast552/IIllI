import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema } from "../schemas.js"
import { formatToolError, formatToolResponse, PathBuilder } from "./helpers.js"
import type { ToolDefinition, ToolHandler } from "./index.js"

const reportTypeSchema = z.enum(["annual", "quarterly"])
  .describe("Optional report type filter: annual or quarterly.")
  .optional()

const technicalFunctionSchema = z.enum([
  "SMA", "EMA", "RSI", "MACD", "BBANDS", "STOCH", "ADX", "ATR",
  "OBV", "VWAP", "CCI", "WILLR", "AROON", "MFI",
]).describe("Technical indicator function to compute.")

const intervalSchema = z.enum([
  "1min", "5min", "15min", "30min", "60min", "daily", "weekly", "monthly",
]).describe("Time interval. Defaults to daily.").optional()

const seriesTypeSchema = z.enum([
  "close", "open", "high", "low",
]).describe("Price series to use. Defaults to close.").optional()

const basicTickerSchema = z.object({
  ticker: tickerSchema,
})

const reportTickerSchema = z.object({
  ticker: tickerSchema,
  report_type: reportTypeSchema,
})

const avTechnicalIndicatorSchema = z.object({
  ticker: tickerSchema,
  function: technicalFunctionSchema,
  interval: intervalSchema,
  time_period: z.number()
    .int()
    .min(1)
    .max(500)
    .describe("Number of data points for the indicator calculation (e.g. 14 for RSI-14).")
    .optional(),
  series_type: seriesTypeSchema,
})

function buildSimpleHandler<T extends z.ZodTypeAny>(
  schema: T,
  fetcher: (data: z.infer<T>) => ReturnType<typeof uwFetch>,
): ToolHandler {
  return async (args) => {
    const parsed = schema.safeParse(args)
    if (!parsed.success) {
      return formatToolError(`Invalid input: ${parsed.error.message}`)
    }

    try {
      const result = await fetcher(parsed.data)
      return formatToolResponse(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return formatToolError(message)
    }
  }
}

export const publicStockDataTools: ToolDefinition[] = [
  {
    name: "get_fundamental_breakdown",
    description: `Get filing-based fundamentals for a ticker, including earnings, revenue, cash flow, dividends, EPS, balance sheet trends, and revenue breakdowns by product or geography.
Use this for company financial statement analysis and medium/long-term fundamental context.`,
    inputSchema: toJsonSchema(basicTickerSchema),
    zodInputSchema: basicTickerSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_stock_financials",
    description: `Get combined stock financials for a ticker, including income statements, balance sheets, cash flows, and earnings.`,
    inputSchema: toJsonSchema(basicTickerSchema),
    zodInputSchema: basicTickerSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_income_statements",
    description: `Get income statement data for a ticker, including revenue, gross profit, operating income, EBITDA, and net income.`,
    inputSchema: toJsonSchema(reportTickerSchema),
    zodInputSchema: reportTickerSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_balance_sheets",
    description: `Get balance sheet data for a ticker, including assets, liabilities, equity, debt structure, and shares outstanding.`,
    inputSchema: toJsonSchema(reportTickerSchema),
    zodInputSchema: reportTickerSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_cash_flows",
    description: `Get cash flow statement data for a ticker, including operating, investing, and financing cash flows, capex, dividends, and buybacks.`,
    inputSchema: toJsonSchema(reportTickerSchema),
    zodInputSchema: reportTickerSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_earnings_history",
    description: `Get earnings history for a ticker with reported EPS, estimated EPS, surprise amount, surprise percentage, report date, and report timing.`,
    inputSchema: toJsonSchema(reportTickerSchema),
    zodInputSchema: reportTickerSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_technical_indicator",
    description: `Get a technical indicator time series for a ticker.
Supports: SMA, EMA, RSI, MACD, BBANDS, STOCH, ADX, ATR, OBV, VWAP, CCI, WILLR, AROON, MFI.`,
    inputSchema: toJsonSchema(avTechnicalIndicatorSchema),
    zodInputSchema: avTechnicalIndicatorSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
]

export const publicStockDataHandlers: Record<string, ToolHandler> = {
  get_fundamental_breakdown: buildSimpleHandler(basicTickerSchema, async (data) => {
    const path = new PathBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/fundamental-breakdown")
    return uwFetch(path)
  }),

  get_stock_financials: buildSimpleHandler(basicTickerSchema, async (data) => {
    const path = new PathBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/financials")
    return uwFetch(path)
  }),

  get_income_statements: buildSimpleHandler(reportTickerSchema, async (data) => {
    const path = new PathBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/income-statements")
    return uwFetch(path, { report_type: data.report_type })
  }),

  get_balance_sheets: buildSimpleHandler(reportTickerSchema, async (data) => {
    const path = new PathBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/balance-sheets")
    return uwFetch(path, { report_type: data.report_type })
  }),

  get_cash_flows: buildSimpleHandler(reportTickerSchema, async (data) => {
    const path = new PathBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/cash-flows")
    return uwFetch(path, { report_type: data.report_type })
  }),

  get_earnings_history: buildSimpleHandler(reportTickerSchema, async (data) => {
    const path = new PathBuilder()
      .add("ticker", data.ticker)
      .build("/api/stock/{ticker}/earnings")
    return uwFetch(path, { report_type: data.report_type })
  }),

  get_technical_indicator: buildSimpleHandler(avTechnicalIndicatorSchema, async (data) => {
    const path = new PathBuilder()
      .add("ticker", data.ticker)
      .add("function", data.function)
      .build("/api/stock/{ticker}/technical-indicator/{function}")
    return uwFetch(path, {
      interval: data.interval,
      time_period: data.time_period,
      series_type: data.series_type,
    })
  }),
}

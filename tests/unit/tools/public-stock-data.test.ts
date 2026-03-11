import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  publicStockDataHandlers,
  publicStockDataTools,
} from "../../../src/tools/public-stock-data.js"

vi.mock("../../../src/client.js", () => ({
  uwFetch: vi.fn(),
}))

import { uwFetch } from "../../../src/client.js"

describe("public stock data tools", () => {
  it("registers the expected public-style stock tools", () => {
    expect(publicStockDataTools.map((tool) => tool.name)).toEqual([
      "get_fundamental_breakdown",
      "get_stock_financials",
      "get_income_statements",
      "get_balance_sheets",
      "get_cash_flows",
      "get_earnings_history",
      "get_technical_indicator",
    ])
  })
})

describe("public stock data handlers", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { ok: true } })
  })

  it("calls the financials endpoint", async () => {
    await publicStockDataHandlers.get_stock_financials({ ticker: "AAPL" })
    expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/financials")
  })

  it("passes report_type to income statements", async () => {
    await publicStockDataHandlers.get_income_statements({
      ticker: "AAPL",
      report_type: "quarterly",
    })
    expect(mockUwFetch).toHaveBeenCalledWith(
      "/api/stock/AAPL/income-statements",
      { report_type: "quarterly" },
    )
  })

  it("calls the technical indicator endpoint with query params", async () => {
    await publicStockDataHandlers.get_technical_indicator({
      ticker: "AAPL",
      function: "SMA",
      interval: "daily",
      time_period: 14,
      series_type: "close",
    })
    expect(mockUwFetch).toHaveBeenCalledWith(
      "/api/stock/AAPL/technical-indicator/SMA",
      {
        interval: "daily",
        time_period: 14,
        series_type: "close",
      },
    )
  })
})

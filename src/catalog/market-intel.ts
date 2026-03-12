import { z } from "zod"
import { ticker, dateStr } from "../validation.js"
import type { ToolCatalog } from "../engine.js"

export const marketIntelCatalog: ToolCatalog = {
  id: "uw_market",
  summary: `Access UnusualWhales market-wide data including market tide, sector ETFs, economic calendar, FDA calendar, and more.

Available commands:
- market_tide: Get market tide data showing net premium flow (date optional; otm_only, interval_5m optional)
- sector_tide: Get sector-specific tide (sector required; date optional)
- etf_tide: Get ETF-based tide (ticker required; date optional)
- sector_etfs: Get SPDR sector ETF statistics
- economic_calendar: Get economic calendar events
- fda_calendar: Get FDA calendar (announced_date_min/max, target_date_min/max, drug, ticker, limit optional)
- correlations: Get correlations between tickers (tickers required; interval, start_date, end_date optional)
- insider_buy_sells: Get total insider buy/sell statistics (limit optional)
- oi_change: Get top OI changes (date, limit, order optional)
- spike: Get SPIKE values (date optional)
- top_net_impact: Get top tickers by net premium (date, issue_types, limit optional)
- total_options_volume: Get total market options volume (limit optional)`,
  commands: [
    { name: "market_tide", route: "/api/market/market-tide", params: z.object({ date: dateStr.optional(), otm_only: z.boolean().describe("Only use OTM options").default(false).optional(), interval_5m: z.boolean().describe("Use 5-minute intervals").default(true).optional() }) },
    { name: "sector_tide", route: "/api/market/{sector}/sector-tide", params: z.object({ sector: z.string().describe("Market sector"), date: dateStr.optional() }) },
    { name: "etf_tide", route: "/api/market/{ticker}/etf-tide", params: z.object({ ticker: ticker.describe("Ticker symbol"), date: dateStr.optional() }) },
    { name: "sector_etfs", route: "/api/market/sector-etfs", params: z.object({}) },
    { name: "economic_calendar", route: "/api/market/economic-calendar", params: z.object({}) },
    { name: "fda_calendar", route: "/api/market/fda-calendar", params: z.object({ announced_date_min: z.string().describe("Minimum announced date").optional(), announced_date_max: z.string().describe("Maximum announced date").optional(), target_date_min: z.string().describe("Minimum target date").optional(), target_date_max: z.string().describe("Maximum target date").optional(), drug: z.string().describe("Drug name filter").optional(), ticker: ticker.optional(), limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional() }) },
    { name: "correlations", route: "/api/market/correlations", params: z.object({ tickers: z.string().describe("Ticker list for correlations"), interval: z.string().describe("Time interval (1y, 6m, 3m, 1m)").default("1Y").optional(), start_date: z.string().describe("Start date (YYYY-MM-DD)").optional(), end_date: z.string().describe("End date (YYYY-MM-DD)").optional() }) },
    { name: "insider_buy_sells", route: "/api/market/insider-buy-sells", params: z.object({ limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional() }) },
    { name: "oi_change", route: "/api/market/oi-change", params: z.object({ date: dateStr.optional(), limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional(), order: z.enum(["asc", "desc"]).describe("Sort direction").optional() }) },
    { name: "spike", route: "/api/market/spike", params: z.object({ date: dateStr.optional() }) },
    { name: "top_net_impact", route: "/api/market/top-net-impact", params: z.object({ date: dateStr.optional(), issue_types: z.string().describe("Issue types filter").optional(), limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional() }), queryRenames: { issue_types: "issue_types[]" } },
    { name: "total_options_volume", route: "/api/market/total-options-volume", params: z.object({ limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional() }) },
  ],
}

import { z } from "zod"
import { ticker, dateStr, expiry, flowGroup, flowOutput } from "../validation.js"
import type { ToolCatalog } from "../engine.js"

export const flowAnalysisCatalog: ToolCatalog = {
  id: "uw_flow",
  summary: `Access UnusualWhales options flow data including flow alerts, full tape, net flow, group flow, and lit exchange flow.

Available commands:
- flow_alerts: Get flow alerts with extensive filtering options
- full_tape: Get full options tape for a date (date required)
- net_flow_expiry: Get net flow by expiry date (date optional)
- group_greek_flow: Get greek flow (delta & vega) for a flow group (flow_group required; date optional)
- group_greek_flow_expiry: Get greek flow by expiry for a flow group (flow_group, expiry required; date optional)
- lit_flow_recent: Get recent lit exchange trades across the market
- lit_flow_ticker: Get lit exchange trades for a specific ticker (ticker required)
- unusual_tickers: Get tickers with unusual options activity

Flow groups: airline, bank, basic materials, china, communication services, consumer cyclical, consumer defensive, crypto, cyber, energy, financial services, gas, gold, healthcare, industrials, mag7, oil, real estate, refiners, reit, semi, silver, technology, uranium, utilities

Flow alerts filtering options include: ticker, premium range, volume range, OI range, DTE range, and more.
Lit flow filtering options include: premium range, size range, volume range, and timestamp filters.`,
  outputSchema: flowOutput,
  commands: [
    {
      name: "flow_alerts",
      route: "/api/option-trades/flow-alerts",
      params: z.object({
        ticker_symbol: z.string().describe("Comma-separated list of ticker symbols to filter by. Prefix with '-' to exclude tickers (e.g., 'AAPL,INTC' or '-TSLA,NVDA')").optional(),
        limit: z.number().int().min(1).max(500).describe("Maximum number of results").default(100).optional(),
        min_premium: z.number().int().nonnegative().default(0).describe("The minimum premium on the alert or trade").optional(),
        max_premium: z.number().int().nonnegative().describe("The maximum premium on the alert or trade").optional(),
        min_size: z.number().int().nonnegative().default(0).describe("The minimum size on that alert").optional(),
        max_size: z.number().int().nonnegative().describe("The maximum size on that alert").optional(),
        min_dte: z.number().int().min(0).describe("The minimum days to expiry").optional(),
        max_dte: z.number().int().min(0).describe("The maximum days to expiry").optional(),
        is_floor: z.boolean().default(true).describe("Whether a transaction is from the floor").optional(),
        is_sweep: z.boolean().default(true).describe("Whether a transaction is an intermarket sweep").optional(),
        is_multi_leg: z.boolean().describe("Whether the transaction is multi-leg").optional(),
        min_volume: z.number().int().nonnegative().describe("Minimum volume on the contract").optional(),
        max_volume: z.number().int().nonnegative().describe("Maximum volume on the contract").optional(),
        min_open_interest: z.number().int().nonnegative().describe("Minimum open interest").optional(),
        max_open_interest: z.number().int().nonnegative().describe("Maximum open interest").optional(),
        all_opening: z.boolean().default(true).describe("Whether all transactions are opening").optional(),
        is_call: z.boolean().default(true).describe("Whether a transaction is a call").optional(),
        is_put: z.boolean().default(true).describe("Whether a transaction is a put").optional(),
        is_ask_side: z.boolean().default(true).describe("Whether a transaction is ask side").optional(),
        is_bid_side: z.boolean().default(true).describe("Whether a transaction is bid side").optional(),
        is_otm: z.boolean().describe("Only include OTM contracts").optional(),
        size_greater_oi: z.boolean().describe("Size greater than open interest").optional(),
        vol_greater_oi: z.boolean().describe("Volume greater than open interest").optional(),
        rule_name: z.array(z.string()).describe("Filter by alert rule names").optional(),
        issue_types: z.array(z.string()).describe("Filter by issue types").optional(),
        min_diff: z.number().describe("Minimum OTM diff").optional(),
        max_diff: z.number().describe("Maximum OTM diff").optional(),
        min_volume_oi_ratio: z.number().int().min(0).describe("Minimum volume/OI ratio").optional(),
        max_volume_oi_ratio: z.number().int().min(0).describe("Maximum volume/OI ratio").optional(),
        min_ask_perc: z.number().min(0).max(1).describe("Minimum ask percentage (0-1)").optional(),
        max_ask_perc: z.number().min(0).max(1).describe("Maximum ask percentage (0-1)").optional(),
        min_bid_perc: z.number().min(0).max(1).describe("Minimum bid percentage (0-1)").optional(),
        max_bid_perc: z.number().min(0).max(1).describe("Maximum bid percentage (0-1)").optional(),
        min_bull_perc: z.number().min(0).max(1).describe("Minimum bull percentage (0-1)").optional(),
        max_bull_perc: z.number().min(0).max(1).describe("Maximum bull percentage (0-1)").optional(),
        min_bear_perc: z.number().min(0).max(1).describe("Minimum bear percentage (0-1)").optional(),
        max_bear_perc: z.number().min(0).max(1).describe("Maximum bear percentage (0-1)").optional(),
        min_skew: z.number().min(0).max(1).describe("Minimum skew (0-1)").optional(),
        max_skew: z.number().min(0).max(1).describe("Maximum skew (0-1)").optional(),
        min_price: z.number().min(0).describe("Minimum underlying price").optional(),
        max_price: z.number().min(0).describe("Maximum underlying price").optional(),
        min_iv_change: z.number().min(0).describe("Minimum IV change").optional(),
        max_iv_change: z.number().min(0).describe("Maximum IV change").optional(),
        min_size_vol_ratio: z.number().min(0).max(1).describe("Minimum size/volume ratio").optional(),
        max_size_vol_ratio: z.number().min(0).max(1).describe("Maximum size/volume ratio").optional(),
        min_spread: z.number().min(0).describe("Minimum spread").optional(),
        max_spread: z.number().min(0).max(1).describe("Maximum spread").optional(),
        min_marketcap: z.number().nonnegative().describe("Minimum market cap in USD").optional(),
        max_marketcap: z.number().nonnegative().describe("Maximum market cap in USD").optional(),
        newer_than: z.string().describe("Filter alerts newer than UTC timestamp").optional(),
        older_than: z.string().describe("Filter alerts older than UTC timestamp").optional(),
      }),
      queryRenames: { rule_name: "rule_name[]", issue_types: "issue_types[]" },
    },
    { name: "full_tape", route: "/api/option-trades/full-tape/{date}", params: z.object({ date: dateStr.describe("Date in YYYY-MM-DD format (required)") }) },
    { name: "net_flow_expiry", route: "/api/net-flow/expiry", params: z.object({ date: dateStr.optional(), moneyness: z.string().describe("Filter by moneyness (all, itm, otm, atm)").optional(), tide_type: z.string().describe("Filter by tide type (all, equity_only, etf_only, index_only)").optional(), expiration: z.string().describe("Filter by expiration type (weekly, zero_dte)").optional() }) },
    { name: "group_greek_flow", route: "/api/group-flow/{flow_group}/greek-flow", params: z.object({ flow_group: flowGroup, date: dateStr.optional() }) },
    { name: "group_greek_flow_expiry", route: "/api/group-flow/{flow_group}/greek-flow/{expiry}", params: z.object({ flow_group: flowGroup, expiry, date: dateStr.optional() }) },
    {
      name: "lit_flow_recent",
      route: "/api/lit-flow/recent",
      params: z.object({
        date: dateStr.optional(),
        limit: z.number().int().min(1).max(500).default(100).optional(),
        min_premium: z.number().int().nonnegative().default(0).describe("Minimum premium").optional(),
        max_premium: z.number().int().nonnegative().describe("Maximum premium").optional(),
        min_size: z.number().int().nonnegative().default(0).describe("Minimum size").optional(),
        max_size: z.number().int().nonnegative().describe("Maximum size").optional(),
        min_volume: z.number().int().nonnegative().default(0).describe("Minimum volume").optional(),
        max_volume: z.number().int().nonnegative().describe("Maximum volume").optional(),
      }),
    },
    {
      name: "lit_flow_ticker",
      route: "/api/lit-flow/{ticker}",
      params: z.object({
        ticker: ticker.describe("Ticker symbol (required)"),
        date: dateStr.optional(),
        limit: z.number().int().min(1).max(500).default(500).optional(),
        newer_than: z.string().describe("Filter trades newer than timestamp").optional(),
        older_than: z.string().describe("Filter trades older than timestamp").optional(),
        min_premium: z.number().int().nonnegative().default(0).describe("Minimum premium").optional(),
        max_premium: z.number().int().nonnegative().describe("Maximum premium").optional(),
        min_size: z.number().int().nonnegative().default(0).describe("Minimum size").optional(),
        max_size: z.number().int().nonnegative().describe("Maximum size").optional(),
        min_volume: z.number().int().nonnegative().default(0).describe("Minimum volume").optional(),
        max_volume: z.number().int().nonnegative().describe("Maximum volume").optional(),
      }),
    },
    { name: "unusual_tickers", route: "/api/option-trades/unusual-tickers", params: z.object({}) },
  ],
}

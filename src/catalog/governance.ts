import { z } from "zod"
import { ticker, dateStr, resultLimit } from "../validation.js"
import type { ToolCatalog } from "../engine.js"

export const congressCatalog: ToolCatalog = {
  id: "uw_congress",
  summary: `Access UnusualWhales congress trading data including trades by congress members.

Available commands:
- recent_trades: Get recent trades by congress members
- late_reports: Get recent late reports by congress members
- congress_trader: Get trades by a specific congress member (name required)`,
  commands: [
    { name: "recent_trades", route: "/api/congress/recent-trades", params: z.object({ ticker: ticker.optional(), date: dateStr.optional(), limit: resultLimit.min(1).max(200).default(100).describe("Maximum number of results (default 100, max 200)").optional() }) },
    { name: "late_reports", route: "/api/congress/late-reports", params: z.object({ ticker: ticker.optional(), date: dateStr.optional(), limit: resultLimit.min(1).max(200).default(100).describe("Maximum number of results (default 100, max 200)").optional() }) },
    { name: "congress_trader", route: "/api/congress/congress-trader", params: z.object({ name: z.string().describe("Congress member name").default("Nancy Pelosi").optional(), ticker: ticker.optional(), date: dateStr.optional(), limit: resultLimit.min(1).max(200).default(100).describe("Maximum number of results (default 100, max 200)").optional() }) },
  ],
}

export const politiciansCatalog: ToolCatalog = {
  id: "uw_politicians",
  summary: `PREMIUM TOOL — Requires a premium API plan. Contact support@unusualwhales.com to upgrade your access.

Access UnusualWhales politician portfolio and trading data.

Available commands:
- people: List all politicians
- portfolio: Get a politician's portfolio (politician_id required; optional: aggregate_all_portfolios)
- recent_trades: Get recent politician trades (optional: date, ticker, politician_id, filter_late_reports, disclosure_newer_than, disclosure_older_than, transaction_newer_than, transaction_older_than)
- holders: Get politicians holding a ticker (ticker required; optional: aggregate_all_portfolios)
- disclosures: Get annual disclosure file records (optional: politician_id, latest_only, year)`,
  commands: [
    { name: "people", route: "/api/politician-portfolios/people", params: z.object({}) },
    { name: "portfolio", route: "/api/politician-portfolios/{politician_id}", params: z.object({ politician_id: z.uuid().describe("Politician ID"), aggregate_all_portfolios: z.boolean().describe("Aggregate all portfolios").optional() }) },
    {
      name: "recent_trades",
      route: "/api/politician-portfolios/recent_trades",
      params: z.object({
        politician_id: z.uuid().describe("Politician ID").optional(),
        ticker: ticker.describe("Ticker symbol").optional(),
        limit: z.number().int().min(1).max(500).default(500).describe("Maximum number of results").optional(),
        page: z.number().describe("Page number for pagination").optional(),
        date: dateStr.describe("Filter by date").optional(),
        filter_late_reports: z.boolean().default(false).describe("Filter out late reports").optional(),
        disclosure_newer_than: dateStr.describe("Disclosures newer than date").optional(),
        disclosure_older_than: dateStr.describe("Disclosures older than date").optional(),
        transaction_newer_than: dateStr.describe("Transactions newer than date").optional(),
        transaction_older_than: dateStr.describe("Transactions older than date").optional(),
      }),
    },
    { name: "holders", route: "/api/politician-portfolios/holders/{ticker}", params: z.object({ ticker: ticker.describe("Ticker symbol (required)"), aggregate_all_portfolios: z.boolean().describe("Aggregate all portfolios").optional() }) },
    { name: "disclosures", route: "/api/politician-portfolios/disclosures", params: z.object({ politician_id: z.uuid().describe("Politician ID").optional(), latest_only: z.boolean().describe("Return only most recent disclosure").optional(), year: z.number().describe("Filter by disclosure year").optional() }) },
  ],
}

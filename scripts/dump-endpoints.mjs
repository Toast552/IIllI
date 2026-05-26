// One-shot dump of every endpoint in the catalog, as JSON, to stdout.
//
//   npx tsx scripts/dump-endpoints.mjs > endpoints.json
//
// Reads the same catalog the MCP server uses (src/catalog/*.ts) and outputs
// one JSON document with grouped catalogs + per-command route, description,
// params (as JSON Schema), premium flag, and queryRenames if any.

import { zodToJsonSchema } from "../src/validation.ts"

import { equitiesCatalog } from "../src/catalog/equities.ts"
import { derivativesCatalog } from "../src/catalog/derivatives.ts"
import { flowAnalysisCatalog } from "../src/catalog/flow-analysis.ts"
import { marketIntelCatalog } from "../src/catalog/market-intel.ts"
import { darkPoolsCatalog } from "../src/catalog/dark-pools.ts"
import { congressCatalog, politiciansCatalog } from "../src/catalog/governance.ts"
import { unusualTradesCatalog } from "../src/catalog/governance-unusual-trades.ts"
import { privateMarketsCatalog } from "../src/catalog/private-markets.ts"
import { companiesExtrasCatalog } from "../src/catalog/companies-extras.ts"
import { macroCatalog } from "../src/catalog/macro.ts"
import { forexCatalog } from "../src/catalog/forex.ts"
import { digitalCurrenciesCatalog } from "../src/catalog/digital-currencies.ts"
import { intelCatalog } from "../src/catalog/intel.ts"
import { insiderActivityCatalog } from "../src/catalog/insider-activity.ts"
import { institutionalCatalog } from "../src/catalog/institutional.ts"
import { calendarEventsCatalog } from "../src/catalog/calendar-events.ts"
import { fundTrackingCatalog } from "../src/catalog/fund-tracking.ts"
import { screeningCatalog } from "../src/catalog/screening.ts"
import { shortSellingCatalog } from "../src/catalog/short-selling.ts"
import { seasonalPatternsCatalog } from "../src/catalog/seasonal-patterns.ts"
import { headlinesCatalog } from "../src/catalog/headlines.ts"
import { notificationsCatalog } from "../src/catalog/notifications.ts"
import { digitalAssetsCatalog } from "../src/catalog/digital-assets.ts"
import { financialsCatalog } from "../src/catalog/financials.ts"
import { indicatorsCatalog } from "../src/catalog/indicators.ts"
import { predictionsCatalog } from "../src/catalog/predictions.ts"
import { publicDataSpecs } from "../src/catalog/public-data.ts"

const catalogs = [
  equitiesCatalog, derivativesCatalog, flowAnalysisCatalog, marketIntelCatalog,
  darkPoolsCatalog, congressCatalog, politiciansCatalog, unusualTradesCatalog,
  privateMarketsCatalog, companiesExtrasCatalog, macroCatalog, forexCatalog,
  digitalCurrenciesCatalog, intelCatalog, insiderActivityCatalog,
  institutionalCatalog, calendarEventsCatalog, fundTrackingCatalog,
  screeningCatalog, shortSellingCatalog, seasonalPatternsCatalog,
  headlinesCatalog, notificationsCatalog, digitalAssetsCatalog,
  financialsCatalog, indicatorsCatalog, predictionsCatalog,
]

function paramSchema(zodObject) {
  try {
    return zodToJsonSchema(zodObject)
  } catch (e) {
    return { error: String(e?.message ?? e) }
  }
}

const out = {
  generated_at: new Date().toISOString(),
  base_url: "https://api.unusualwhales.com",
  auth: "Bearer token via Authorization header. Get one at https://unusualwhales.com/api-tokens",
  catalogs: catalogs.map((c) => ({
    id: c.id,
    summary: c.summary,
    premium: c.premium ?? false,
    commands: c.commands.map((cmd) => ({
      name: cmd.name,
      route: cmd.route,
      premium: cmd.premium ?? false,
      params: paramSchema(cmd.params),
      ...(cmd.queryRenames ? { query_renames: cmd.queryRenames } : {}),
    })),
  })),
  standalone_endpoints: publicDataSpecs.map((s) => ({
    id: s.id,
    summary: s.summary,
    route: s.route,
    premium: s.premium ?? false,
    params: paramSchema(s.params),
    ...(s.queryRenames ? { query_renames: s.queryRenames } : {}),
  })),
}

process.stdout.write(JSON.stringify(out, null, 2))

// Compact endpoint dump — one row per endpoint, just enough to find what you
// need. Pair with docs/endpoints.json for the full param schemas.
//
//   npx tsx scripts/dump-endpoints-compact.mjs > docs/endpoints-compact.json

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

// Pull the "- name: short description" lines out of a catalog summary so we
// can attach a one-line blurb to each command.
function blurbsFromSummary(summary) {
  const map = {}
  if (typeof summary !== "string") return map
  for (const line of summary.split("\n")) {
    const m = line.match(/^-\s+([a-z_0-9]+):\s+(.+)$/i)
    if (m) map[m[1]] = m[2].trim()
  }
  return map
}

// Required keys = the params that complain when we hand the schema an empty
// object. Optionals stay silent (Zod accepts `undefined`), so any top-level
// path that shows up in `safeParse({}).error.issues` is required, regardless
// of the specific issue code (invalid_type, invalid_value, too_small, etc.).
function requiredKeys(zodObject) {
  try {
    const res = zodObject.safeParse({})
    if (res.success) return []
    const required = new Set()
    for (const issue of res.error?.issues ?? []) {
      if (typeof issue.path?.[0] === "string") required.add(issue.path[0])
    }
    return [...required]
  } catch {
    return []
  }
}

function paramKeys(zodObject) {
  try {
    const shape =
      typeof zodObject._def?.shape === "function"
        ? zodObject._def.shape()
        : zodObject.shape
    return Object.keys(shape ?? {})
  } catch {
    return []
  }
}

const groups = catalogs.map((c) => {
  const blurbs = blurbsFromSummary(c.summary)
  return {
    tool_id: c.id,
    premium: c.premium ?? false,
    commands: c.commands.map((cmd) => {
      const all = paramKeys(cmd.params)
      const required = requiredKeys(cmd.params)
      const optional = all.filter((k) => !required.includes(k))
      return {
        name: cmd.name,
        route: cmd.route,
        description: blurbs[cmd.name] ?? null,
        required,
        optional,
        premium: cmd.premium ?? false,
      }
    }),
  }
})

const standalone = publicDataSpecs.map((s) => {
  const all = paramKeys(s.params)
  const required = requiredKeys(s.params)
  return {
    tool_id: s.id,
    route: s.route,
    description: (s.summary || "").split("\n")[0],
    required,
    optional: all.filter((k) => !required.includes(k)),
    premium: s.premium ?? false,
  }
})

const out = {
  generated_at: new Date().toISOString(),
  base_url: "https://api.unusualwhales.com",
  auth: "Bearer token via Authorization header. Get one at https://unusualwhales.com/api-tokens",
  total_endpoints:
    groups.reduce((a, g) => a + g.commands.length, 0) + standalone.length,
  catalogs: groups,
  standalone_endpoints: standalone,
}

process.stdout.write(JSON.stringify(out, null, 2))

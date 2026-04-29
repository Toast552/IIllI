import { compileCatalog, compileStandalone } from "../engine.js"
import type { CompiledTool, ToolCatalog } from "../engine.js"

import { equitiesCatalog } from "./equities.js"
import { derivativesCatalog } from "./derivatives.js"
import { flowAnalysisCatalog } from "./flow-analysis.js"
import { marketIntelCatalog } from "./market-intel.js"
import { darkPoolsCatalog } from "./dark-pools.js"
import { congressCatalog, politiciansCatalog } from "./governance.js"
import { unusualTradesCatalog } from "./governance-unusual-trades.js"
import { privateMarketsCatalog } from "./private-markets.js"
import { companiesExtrasCatalog } from "./companies-extras.js"
import { macroCatalog } from "./macro.js"
import { forexCatalog } from "./forex.js"
import { digitalCurrenciesCatalog } from "./digital-currencies.js"
import { intelCatalog } from "./intel.js"
import { insiderActivityCatalog } from "./insider-activity.js"
import { institutionalCatalog } from "./institutional.js"
import { calendarEventsCatalog } from "./calendar-events.js"
import { fundTrackingCatalog } from "./fund-tracking.js"
import { screeningCatalog } from "./screening.js"
import { shortSellingCatalog } from "./short-selling.js"
import { seasonalPatternsCatalog } from "./seasonal-patterns.js"
import { headlinesCatalog } from "./headlines.js"
import { notificationsCatalog } from "./notifications.js"
import { digitalAssetsCatalog } from "./digital-assets.js"
import { financialsCatalog } from "./financials.js"
import { indicatorsCatalog } from "./indicators.js"
import { publicDataSpecs } from "./public-data.js"
import { predictionsCatalog } from "./predictions.js"

const TRUTHY = new Set(["1", "true", "yes", "on"])

function premiumEnabledForAll(): boolean {
  const v = process.env.UW_ENABLE_PREMIUM_TOOLS
  return typeof v === "string" && TRUTHY.has(v.toLowerCase())
}

function explicitlyEnabledIds(): Set<string> {
  const raw = process.env.UW_PREMIUM_TOOLS
  if (typeof raw !== "string" || raw.trim() === "") return new Set()
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  )
}

function filterPremiumCommands(catalog: ToolCatalog): ToolCatalog {
  if (premiumEnabledForAll()) return catalog
  const enabled = explicitlyEnabledIds()
  if (enabled.has(catalog.id)) return catalog

  const visibleCommands = catalog.commands.filter((cmd) => {
    if (!cmd.premium) return true
    return enabled.has(`${catalog.id}.${cmd.name}`)
  })

  if (visibleCommands.length === catalog.commands.length) return catalog
  return { ...catalog, commands: visibleCommands }
}

const rawCatalogs: ToolCatalog[] = [
  equitiesCatalog,
  derivativesCatalog,
  flowAnalysisCatalog,
  marketIntelCatalog,
  darkPoolsCatalog,
  congressCatalog,
  insiderActivityCatalog,
  institutionalCatalog,
  calendarEventsCatalog,
  fundTrackingCatalog,
  screeningCatalog,
  shortSellingCatalog,
  seasonalPatternsCatalog,
  headlinesCatalog,
  notificationsCatalog,
  politiciansCatalog,
  unusualTradesCatalog,
  privateMarketsCatalog,
  companiesExtrasCatalog,
  macroCatalog,
  forexCatalog,
  digitalCurrenciesCatalog,
  intelCatalog,
  digitalAssetsCatalog,
  financialsCatalog,
  indicatorsCatalog,
  predictionsCatalog,
]

const catalogTools = rawCatalogs
  .map(filterPremiumCommands)
  .filter((c) => c.commands.length > 0)
  .map(compileCatalog)

const standaloneTools = publicDataSpecs.map(compileStandalone)

function shouldRegister(tool: CompiledTool): boolean {
  if (!tool.premium) return true
  if (premiumEnabledForAll()) return true
  return explicitlyEnabledIds().has(tool.name)
}

const compiled: CompiledTool[] = [...catalogTools, ...standaloneTools]

export const allTools: CompiledTool[] = compiled.filter(shouldRegister)

const API_BASE = "https://api.unusualwhales.com"
const TIMEOUT_MS = 30_000
const WINDOW_MS = 60_000

function envInt(key: string, fallback: number): number {
  const val = parseInt(process.env[key] || String(fallback), 10)
  return isNaN(val) ? fallback : val
}

const perMinute = envInt("UW_RATE_LIMIT_PER_MINUTE", 120)
const retries = envInt("UW_MAX_RETRIES", 3)
const cbThreshold = envInt("UW_CIRCUIT_BREAKER_THRESHOLD", 5)
const cbTimeout = envInt("UW_CIRCUIT_BREAKER_RESET_TIMEOUT", 30000)
const cbSuccessNeeded = envInt("UW_CIRCUIT_BREAKER_SUCCESS_THRESHOLD", 2)

// --- Rate limiter (sliding window) ---

const timestamps: number[] = []

function checkRateLimit(): { ok: boolean; waitMs?: number } {
  const now = Date.now()
  while (timestamps.length > 0 && now - timestamps[0] >= WINDOW_MS) {
    timestamps.shift()
  }
  if (timestamps.length >= perMinute) {
    return { ok: false, waitMs: WINDOW_MS - (now - timestamps[0]) }
  }
  timestamps.push(now)
  return { ok: true }
}

// --- Circuit breaker ---

type CBState = "closed" | "open" | "half_open"

let cbState: CBState = "closed"
let cbFailures = 0
let cbSuccesses = 0
let _cbLastFailure = 0
let cbNextAttempt = 0

function cbCheck(): void {
  if (cbState === "open" && Date.now() >= cbNextAttempt) {
    cbState = "half_open"
    cbSuccesses = 0
    log("info", "circuit breaker half-open")
  }
}

function cbSuccess(): void {
  if (cbState === "half_open") {
    cbSuccesses++
    if (cbSuccesses >= cbSuccessNeeded) {
      cbState = "closed"
      cbFailures = 0
      cbSuccesses = 0
      _cbLastFailure = 0
      cbNextAttempt = 0
      log("info", "circuit breaker closed")
    }
  } else if (cbState === "closed" && cbFailures > 0) {
    cbFailures = 0
  }
}

function cbFailure(): void {
  cbFailures++
  _cbLastFailure = Date.now()
  if (cbState === "half_open" || (cbState === "closed" && cbFailures >= cbThreshold)) {
    cbState = "open"
    cbNextAttempt = Date.now() + cbTimeout
    cbSuccesses = 0
    log("warn", "circuit breaker open", { failures: cbFailures })
  }
}

export function getCBStatus(): { state: CBState; failures: number } {
  return { state: cbState, failures: cbFailures }
}

// --- Logger ---

type Level = "debug" | "info" | "warn" | "error"
const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const minLevel = LEVELS[(process.env.LOG_LEVEL as Level) || "info"] ?? 1

function log(level: Level, message: string, extra?: Record<string, unknown>): void {
  if (LEVELS[level] < minLevel) return
  const entry: Record<string, unknown> = { ts: new Date().toISOString(), level, message, ...extra }
  process.stderr.write(JSON.stringify(entry) + "\n")
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>): void => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>): void => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>): void => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>): void => log("error", msg, data),
}

// --- API client ---

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

export function encodePath(value: unknown): string {
  if (value === undefined || value === null) throw new Error("Path parameter is required")
  const str = String(value)
  if (str.includes("/") || str.includes("\\") || str.includes("..")) throw new Error("Invalid path parameter")
  return encodeURIComponent(str)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function uwFetch<T = unknown>(
  endpoint: string,
  params?: Record<string, string | number | boolean | string[] | undefined>,
): Promise<ApiResponse<T>> {
  const apiKey = process.env.UW_API_KEY
  if (!apiKey) return { error: "UW_API_KEY environment variable is not set" }

  const rate = checkRateLimit()
  if (!rate.ok) {
    return { error: `Rate limit exceeded (${perMinute}/min). Try again in ${Math.ceil((rate.waitMs || 0) / 1000)} seconds.` }
  }

  const url = new URL(endpoint, API_BASE)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "" || value === false) continue
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item))
      } else {
        url.searchParams.append(key, String(value))
      }
    }
  }

  cbCheck()
  if (cbState === "open") {
    const wait = Math.ceil((cbNextAttempt - Date.now()) / 1000)
    return { error: `Circuit breaker is open - API temporarily unavailable. Try again in ${wait}s` }
  }

  let lastError: string | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (res.ok) {
        cbSuccess()
        const text = await res.text()
        if (!text) return { data: {} as T }
        try {
          return { data: JSON.parse(text) as T }
        } catch {
          return { error: `Invalid JSON response: ${text.slice(0, 100)}` }
        }
      }

      if (res.status === 429) {
        cbSuccess()
        const after = res.headers.get("retry-after")
        return { error: `API rate limit exceeded (429).${after ? ` Retry after ${after} seconds.` : ""} You may be approaching your daily limit.` }
      }

      const errText = await res.text()
      lastError = `API error (${res.status}): ${errText}`

      if (res.status >= 400 && res.status < 500) {
        cbSuccess()
        return { error: lastError }
      }

      if (attempt < retries - 1) {
        const d = Math.pow(2, attempt) * 1000
        log("warn", "retrying after server error", { endpoint, status: res.status, attempt: attempt + 1, delayMs: d })
        await sleep(d)
        continue
      }
      cbFailure()
    } catch (err) {
      clearTimeout(timer)
      const e = err instanceof Error ? err : new Error(String(err))
      lastError = e.name === "AbortError" ? "Request timed out" : `Request failed: ${e.message}`

      if (attempt < retries - 1) {
        const d = Math.pow(2, attempt) * 1000
        log("warn", "retrying after network error", { endpoint, error: e.message, attempt: attempt + 1, delayMs: d })
        await sleep(d)
        continue
      }
      cbFailure()
    }
  }

  return { error: lastError ?? "Max retries exceeded" }
}

export function formatResponse<T>(result: ApiResponse<T>): string {
  if (result.error) return JSON.stringify({ error: result.error }, null, 2)
  return JSON.stringify(result.data, null, 2)
}

export function formatStructuredResponse<T>(result: ApiResponse<T>): { text: string; structuredContent?: T } {
  if (result.error) return { text: JSON.stringify({ error: result.error }, null, 2) }
  return { text: JSON.stringify(result.data, null, 2), structuredContent: result.data }
}

export function formatError(message: string): string {
  return JSON.stringify({ error: message })
}

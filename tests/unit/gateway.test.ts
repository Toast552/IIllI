import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sanitizeSegment, faultJson, breakerSnapshot, request, log } from "../../src/gateway.js"

describe("sanitizeSegment", () => {
  it("encodes a simple string", () => {
    expect(sanitizeSegment("AAPL")).toBe("AAPL")
  })

  it("encodes special characters", () => {
    expect(sanitizeSegment("BRK.B")).toBe("BRK.B")
  })

  it("encodes spaces", () => {
    expect(sanitizeSegment("some value")).toBe("some%20value")
  })

  it("throws on undefined", () => {
    expect(() => sanitizeSegment(undefined)).toThrow("Path segment is required")
  })

  it("throws on null", () => {
    expect(() => sanitizeSegment(null)).toThrow("Path segment is required")
  })

  it("throws on path with slash", () => {
    expect(() => sanitizeSegment("foo/bar")).toThrow("Invalid path segment")
  })

  it("throws on path with backslash", () => {
    expect(() => sanitizeSegment("foo\\bar")).toThrow("Invalid path segment")
  })

  it("throws on path traversal", () => {
    expect(() => sanitizeSegment("..")).toThrow("Invalid path segment")
  })

  it("converts numbers to strings", () => {
    expect(sanitizeSegment(42)).toBe("42")
  })
})

describe("faultJson", () => {
  it("returns a JSON error string", () => {
    const result = faultJson("something broke")
    const parsed = JSON.parse(result)
    expect(parsed.error).toBe("something broke")
  })

  it("result is valid JSON", () => {
    expect(() => JSON.parse(faultJson("test"))).not.toThrow()
  })
})

describe("breakerSnapshot", () => {
  it("returns phase and faults", () => {
    const snap = breakerSnapshot()
    expect(snap).toHaveProperty("phase")
    expect(snap).toHaveProperty("faults")
    expect(typeof snap.phase).toBe("string")
    expect(typeof snap.faults).toBe("number")
  })

  it("starts in closed phase", () => {
    const snap = breakerSnapshot()
    expect(snap.phase).toBe("closed")
  })
})

describe("log", () => {
  it("has all severity methods", () => {
    expect(typeof log.debug).toBe("function")
    expect(typeof log.info).toBe("function")
    expect(typeof log.warn).toBe("function")
    expect(typeof log.error).toBe("function")
  })

  it("writes JSON to stderr", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    log.error("test message", { extra: "data" })
    expect(spy).toHaveBeenCalled()
    const output = spy.mock.calls[0][0] as string
    const parsed = JSON.parse(output.trim())
    expect(parsed.severity).toBe("error")
    expect(parsed.msg).toBe("test message")
    expect(parsed.extra).toBe("data")
    expect(parsed.ts).toBeDefined()
    spy.mockRestore()
  })
})

describe("request", () => {
  const originalEnv = process.env.UW_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.UW_API_KEY = originalEnv
    } else {
      delete process.env.UW_API_KEY
    }
  })

  it("returns fault when API key is missing", async () => {
    delete process.env.UW_API_KEY
    const result = await request("/api/test")
    expect(result.fault).toContain("UW_API_KEY")
    expect(result.payload).toBeUndefined()
  })

  it("makes a successful request", async () => {
    process.env.UW_API_KEY = "test-key"
    const mockResponse = { ok: true, status: 200, text: () => Promise.resolve('{"data":"ok"}'), headers: new Headers() }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as Response)

    const result = await request("/api/test")
    expect(result.payload).toEqual({ data: "ok" })
    expect(result.fault).toBeUndefined()

    vi.restoreAllMocks()
  })

  it("appends query params to URL", async () => {
    process.env.UW_API_KEY = "test-key"
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, status: 200, text: () => Promise.resolve("{}"), headers: new Headers(),
    } as Response)

    await request("/api/test", { ticker: "AAPL", limit: 10 })

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain("ticker=AAPL")
    expect(calledUrl).toContain("limit=10")

    vi.restoreAllMocks()
  })

  it("skips undefined/empty/false query params", async () => {
    process.env.UW_API_KEY = "test-key"
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, status: 200, text: () => Promise.resolve("{}"), headers: new Headers(),
    } as Response)

    await request("/api/test", { a: undefined, b: "", c: false, d: "yes" })

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).not.toContain("a=")
    expect(calledUrl).not.toContain("b=")
    expect(calledUrl).not.toContain("c=")
    expect(calledUrl).toContain("d=yes")

    vi.restoreAllMocks()
  })

  it("handles 4xx errors without retry", async () => {
    process.env.UW_API_KEY = "test-key"
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false, status: 404, text: () => Promise.resolve("Not Found"), headers: new Headers(),
    } as Response)

    const result = await request("/api/missing")
    expect(result.fault).toContain("404")
    expect(result.fault).toContain("Not Found")

    vi.restoreAllMocks()
  })

  it("handles 429 rate limit response", async () => {
    process.env.UW_API_KEY = "test-key"
    const headers = new Headers({ "retry-after": "30" })
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false, status: 429, text: () => Promise.resolve("Too Many Requests"), headers,
    } as Response)

    const result = await request("/api/test")
    expect(result.fault).toContain("429")

    vi.restoreAllMocks()
  })

  it("handles empty response body", async () => {
    process.env.UW_API_KEY = "test-key"
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, status: 200, text: () => Promise.resolve(""), headers: new Headers(),
    } as Response)

    const result = await request("/api/test")
    expect(result.payload).toEqual({})

    vi.restoreAllMocks()
  })

  it("handles malformed JSON response", async () => {
    process.env.UW_API_KEY = "test-key"
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, status: 200, text: () => Promise.resolve("not json"), headers: new Headers(),
    } as Response)

    const result = await request("/api/test")
    expect(result.fault).toContain("Malformed JSON")

    vi.restoreAllMocks()
  })

  it("sends Authorization header with Bearer token", async () => {
    process.env.UW_API_KEY = "my-secret-key"
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, status: 200, text: () => Promise.resolve("{}"), headers: new Headers(),
    } as Response)

    await request("/api/test")

    const opts = fetchSpy.mock.calls[0][1] as RequestInit
    expect(opts.headers).toEqual(expect.objectContaining({ Authorization: "Bearer my-secret-key" }))

    vi.restoreAllMocks()
  })
})

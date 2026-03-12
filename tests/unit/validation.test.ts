import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  zodToJsonSchema,
  ticker,
  dateStr,
  expiry,
  resultLimit,
  optionKind,
  tradeSide,
  sortDir,
  pageNum,
  candleSize,
  delta,
  intradayFilter,
  stockScreenerOrderBy,
  contractScreenerOrderBy,
  seasonalityOrderBy,
} from "../../src/validation.js"

describe("zodToJsonSchema", () => {
  it("converts a simple object schema", () => {
    const schema = z.object({ name: z.string(), age: z.number() })
    const json = zodToJsonSchema(schema)
    expect(json.type).toBe("object")
    expect(json.properties).toBeDefined()
    expect(json.properties.name).toBeDefined()
    expect(json.properties.age).toBeDefined()
  })

  it("identifies required fields", () => {
    const schema = z.object({ req: z.string(), opt: z.string().optional() })
    const json = zodToJsonSchema(schema)
    expect(json.required).toContain("req")
    expect(json.required).not.toContain("opt")
  })

  it("strips $schema key", () => {
    const schema = z.object({ x: z.number() })
    const json = zodToJsonSchema(schema) as Record<string, unknown>
    expect(json.$schema).toBeUndefined()
  })
})

describe("ticker schema", () => {
  it("accepts valid tickers", () => {
    expect(ticker.safeParse("AAPL").success).toBe(true)
    expect(ticker.safeParse("MSFT").success).toBe(true)
    expect(ticker.safeParse("BRK.B").success).toBe(true)
  })

  it("rejects empty string", () => {
    expect(ticker.safeParse("").success).toBe(false)
  })

  it("rejects too-long ticker", () => {
    expect(ticker.safeParse("A".repeat(11)).success).toBe(false)
  })
})

describe("dateStr schema", () => {
  it("accepts YYYY-MM-DD format", () => {
    expect(dateStr.safeParse("2024-01-15").success).toBe(true)
  })

  it("rejects invalid formats", () => {
    expect(dateStr.safeParse("01-15-2024").success).toBe(false)
    expect(dateStr.safeParse("2024/01/15").success).toBe(false)
    expect(dateStr.safeParse("not-a-date").success).toBe(false)
  })
})

describe("expiry schema", () => {
  it("accepts YYYY-MM-DD format", () => {
    expect(expiry.safeParse("2024-06-21").success).toBe(true)
  })

  it("rejects invalid formats", () => {
    expect(expiry.safeParse("June 21").success).toBe(false)
  })
})

describe("resultLimit schema", () => {
  it("accepts valid limits", () => {
    expect(resultLimit.safeParse(1).success).toBe(true)
    expect(resultLimit.safeParse(100).success).toBe(true)
    expect(resultLimit.safeParse(500).success).toBe(true)
  })

  it("rejects values below 1", () => {
    expect(resultLimit.safeParse(0).success).toBe(false)
    expect(resultLimit.safeParse(-1).success).toBe(false)
  })

  it("rejects values above 500", () => {
    expect(resultLimit.safeParse(501).success).toBe(false)
  })

  it("rejects non-integers", () => {
    expect(resultLimit.safeParse(1.5).success).toBe(false)
  })
})

describe("optionKind schema", () => {
  it("accepts call and put variants", () => {
    expect(optionKind.safeParse("call").success).toBe(true)
    expect(optionKind.safeParse("put").success).toBe(true)
    expect(optionKind.safeParse("Call").success).toBe(true)
    expect(optionKind.safeParse("Put").success).toBe(true)
  })

  it("rejects invalid values", () => {
    expect(optionKind.safeParse("straddle").success).toBe(false)
  })
})

describe("tradeSide schema", () => {
  it("accepts valid sides", () => {
    for (const s of ["ALL", "ASK", "BID", "MID"]) {
      expect(tradeSide.safeParse(s).success).toBe(true)
    }
  })

  it("rejects invalid sides", () => {
    expect(tradeSide.safeParse("LIMIT").success).toBe(false)
  })
})

describe("sortDir schema", () => {
  it("accepts asc and desc", () => {
    expect(sortDir.safeParse("asc").success).toBe(true)
    expect(sortDir.safeParse("desc").success).toBe(true)
  })

  it("defaults to desc", () => {
    expect(sortDir.parse(undefined)).toBe("desc")
  })
})

describe("pageNum schema", () => {
  it("accepts positive integers", () => {
    expect(pageNum.safeParse(1).success).toBe(true)
    expect(pageNum.safeParse(100).success).toBe(true)
  })

  it("rejects zero and negative", () => {
    expect(pageNum.safeParse(0).success).toBe(false)
    expect(pageNum.safeParse(-1).success).toBe(false)
  })
})

describe("candleSize schema", () => {
  it("accepts valid sizes", () => {
    for (const s of ["1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d"]) {
      expect(candleSize.safeParse(s).success).toBe(true)
    }
  })

  it("rejects invalid sizes", () => {
    expect(candleSize.safeParse("2m").success).toBe(false)
    expect(candleSize.safeParse("1w").success).toBe(false)
  })
})

describe("delta schema", () => {
  it("accepts 10 and 25", () => {
    expect(delta.safeParse("10").success).toBe(true)
    expect(delta.safeParse("25").success).toBe(true)
  })

  it("rejects other values", () => {
    expect(delta.safeParse("50").success).toBe(false)
  })
})

describe("intradayFilter schema", () => {
  it("accepts valid filters", () => {
    for (const f of ["NetPremium", "Volume", "Trades"]) {
      expect(intradayFilter.safeParse(f).success).toBe(true)
    }
  })

  it("defaults to NetPremium", () => {
    expect(intradayFilter.parse(undefined)).toBe("NetPremium")
  })
})

describe("stockScreenerOrderBy schema", () => {
  it("accepts valid order fields", () => {
    expect(stockScreenerOrderBy.safeParse("iv_rank").success).toBe(true)
    expect(stockScreenerOrderBy.safeParse("premium").success).toBe(true)
    expect(stockScreenerOrderBy.safeParse("volume").success).toBe(true)
  })

  it("rejects unknown fields", () => {
    expect(stockScreenerOrderBy.safeParse("unknown_field").success).toBe(false)
  })
})

describe("contractScreenerOrderBy schema", () => {
  it("accepts valid order fields", () => {
    expect(contractScreenerOrderBy.safeParse("volume").success).toBe(true)
    expect(contractScreenerOrderBy.safeParse("premium").success).toBe(true)
    expect(contractScreenerOrderBy.safeParse("iv").success).toBe(true)
  })

  it("rejects unknown fields", () => {
    expect(contractScreenerOrderBy.safeParse("garbage").success).toBe(false)
  })
})

describe("seasonalityOrderBy schema", () => {
  it("accepts valid fields", () => {
    expect(seasonalityOrderBy.safeParse("month").success).toBe(true)
    expect(seasonalityOrderBy.safeParse("avg_change").success).toBe(true)
  })

  it("rejects unknown fields", () => {
    expect(seasonalityOrderBy.safeParse("invalid").success).toBe(false)
  })
})

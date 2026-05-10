import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("~/lib/server", () => ({
  getSession: vi.fn(),
}));

vi.mock("~/oauth/utils", () => ({
  urlEncode: vi.fn(),
}));

import {
  getAdaptiveDelay,
  updateRateLimitState,
  getRateLimitState,
  calculateDelay,
  parseRateLimitHeaders,
  sleep,
} from "../src/services/netsuite";

describe("parseRateLimitHeaders", () => {
  it("extracts rate limit info from X-Rate-Limit-* headers", () => {
    const headers = new Map([
      ["X-Rate-Limit-Limit", "100"],
      ["X-Rate-Limit-Remaining", "50"],
      ["X-Rate-Limit-Reset", "1735689600"],
    ]);
    const result = parseRateLimitHeaders({ headers } as any);
    expect(result).toEqual({
      limit: 100,
      remaining: 50,
      resetTime: 1735689600,
    });
  });

  it("extracts rate limit info from RateLimit-* headers", () => {
    const headers = new Map([
      ["RateLimit-Limit", "200"],
      ["RateLimit-Remaining", "10"],
      ["RateLimit-Reset", "1735689700"],
    ]);
    const result = parseRateLimitHeaders({ headers } as any);
    expect(result).toEqual({
      limit: 200,
      remaining: 10,
      resetTime: 1735689700,
    });
  });

  it("extracts Retry-After header", () => {
    const headers = new Map([["Retry-After", "5"]]);
    const result = parseRateLimitHeaders({ headers } as any);
    expect(result).toEqual({ retryAfter: 5 });
  });

  it("returns empty object when no rate limit headers present", () => {
    const headers = new Map([["Content-Type", "application/json"]]);
    const result = parseRateLimitHeaders({ headers } as any);
    expect(result).toEqual({});
  });

  it("prefers X-Rate-Limit-* over RateLimit-* headers", () => {
    const headers = new Map([
      ["X-Rate-Limit-Remaining", "50"],
      ["RateLimit-Remaining", "10"],
    ]);
    const result = parseRateLimitHeaders({ headers } as any);
    expect(result.remaining).toBe(50);
  });
});

describe("updateRateLimitState / getRateLimitState", () => {
  beforeEach(() => {
    updateRateLimitState({});
  });

  it("tracks rate limit state across updates", () => {
    updateRateLimitState({ remaining: 50, limit: 100 });
    expect(getRateLimitState()).toEqual({ remaining: 50, limit: 100 });
  });

  it("updates only provided fields", () => {
    updateRateLimitState({ remaining: 50, limit: 100 });
    updateRateLimitState({ remaining: 40 });
    const state = getRateLimitState();
    expect(state.remaining).toBe(40);
    expect(state.limit).toBe(100);
  });

  it("returns a copy that does not mutate internal state", () => {
    updateRateLimitState({ remaining: 50 });
    const copy = getRateLimitState();
    copy.remaining = 999;
    expect(getRateLimitState().remaining).toBe(50);
  });
});

describe("getAdaptiveDelay", () => {
  beforeEach(() => {
    updateRateLimitState({});
  });

  it("returns base delay when no rate limit info available", () => {
    expect(getAdaptiveDelay(200)).toBe(200);
  });

  it("returns base delay when remaining is high (>20)", () => {
    updateRateLimitState({ remaining: 50 });
    expect(getAdaptiveDelay(200)).toBe(200);
  });

  it("increases delay to 500ms when remaining <= 20", () => {
    updateRateLimitState({ remaining: 15 });
    expect(getAdaptiveDelay(200)).toBe(500);
  });

  it("increases delay to 1000ms when remaining <= 10", () => {
    updateRateLimitState({ remaining: 8 });
    expect(getAdaptiveDelay(200)).toBe(1000);
  });

  it("increases delay to 3000ms when remaining <= 3", () => {
    updateRateLimitState({ remaining: 2 });
    expect(getAdaptiveDelay(200)).toBe(3000);
  });

  it("does not reduce delay below base when remaining is high", () => {
    updateRateLimitState({ remaining: 100 });
    expect(getAdaptiveDelay(500)).toBe(500);
  });

  it("uses adaptive delay even when base is very low", () => {
    updateRateLimitState({ remaining: 5 });
    expect(getAdaptiveDelay(50)).toBe(1000);
  });
});

describe("calculateDelay", () => {
  it("uses Retry-After when provided", () => {
    expect(calculateDelay(0, 1000, 30000, 5)).toBe(5000);
  });

  it("caps Retry-After at maxDelay", () => {
    expect(calculateDelay(0, 1000, 2000, 10)).toBe(2000);
  });

  it("uses exponential backoff without Retry-After", () => {
    const delay = calculateDelay(2, 1000, 30000);
    expect(delay).toBeGreaterThanOrEqual(4000);
    expect(delay).toBeLessThanOrEqual(4400);
  });

  it("caps exponential backoff at maxDelay", () => {
    const delay = calculateDelay(10, 1000, 5000);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it("adds jitter to exponential backoff", () => {
    const delays = new Set<number>();
    for (let i = 0; i < 20; i++) {
      delays.add(calculateDelay(1, 1000, 30000));
    }
    expect(delays.size).toBeGreaterThan(1);
  });
});

describe("sleep", () => {
  it("resolves after the specified duration", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe("rate limit simulation: sequential PATCH requests", () => {
  beforeEach(() => {
    updateRateLimitState({});
  });

  it("should produce increasing delays as remaining decreases", () => {
    const delays: number[] = [];
    const remainingValues = [100, 80, 50, 25, 15, 10, 5, 3, 2];

    for (const remaining of remainingValues) {
      updateRateLimitState({ remaining, limit: 100 });
      delays.push(getAdaptiveDelay(200));
    }

    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }

    expect(delays[0]).toBe(200);
    expect(delays[delays.length - 1]).toBe(3000);
  });

  it("should simulate a full form submit scenario", () => {
    const baseDelay = 200;
    const itemLineCount = 10;
    const delays: number[] = [];
    let currentRemaining = 100;

    for (let i = 0; i < itemLineCount; i++) {
      updateRateLimitState({ remaining: currentRemaining, limit: 100 });
      delays.push(getAdaptiveDelay(baseDelay));
      currentRemaining = Math.max(0, currentRemaining - 1);
    }

    expect(delays[0]).toBe(baseDelay);

    const lastDelay = delays[delays.length - 1];
    expect(lastDelay).toBeGreaterThanOrEqual(baseDelay);

    const totalDelay = delays.reduce((sum, d) => sum + d, 0);
    expect(totalDelay).toBeGreaterThanOrEqual(itemLineCount * baseDelay);
  });
});

describe("rate limit simulation: batch GET requests", () => {
  beforeEach(() => {
    updateRateLimitState({});
  });

  it("should adapt delay between batches as remaining decreases", () => {
    const baseDelay = 200;
    const delays: number[] = [];
    let currentRemaining = 50;

    for (let batch = 0; batch < 5; batch++) {
      updateRateLimitState({ remaining: currentRemaining, limit: 100 });
      delays.push(getAdaptiveDelay(baseDelay));
      currentRemaining -= 2;
    }

    expect(delays[0]).toBe(baseDelay);
    expect(delays[4]).toBeGreaterThanOrEqual(delays[0]);
  });
});

describe("429 recovery scenario", () => {
  beforeEach(() => {
    updateRateLimitState({});
  });

  it("should calculate proper backoff delays for retry attempts", () => {
    const retryDelays: number[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      retryDelays.push(calculateDelay(attempt, 1000, 30000));
    }

    expect(retryDelays[0]).toBeLessThan(retryDelays[1]);
    expect(retryDelays[1]).toBeLessThan(retryDelays[2]);
  });

  it("should use server-provided Retry-After when available", () => {
    const delay = calculateDelay(0, 1000, 30000, 10);
    expect(delay).toBe(10000);
  });

  it("should adapt delay after rate limit info updates from 429 response", () => {
    updateRateLimitState({ remaining: 50 });
    expect(getAdaptiveDelay(200)).toBe(200);

    updateRateLimitState({ remaining: 2, retryAfter: 5 });
    expect(getAdaptiveDelay(200)).toBe(3000);
  });
});

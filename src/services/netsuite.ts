import fetch from "node-fetch";
import { getSession } from "~/lib/server";
import { urlEncode } from "~/oauth/utils";

const NETSUITE_ACCOUNT_ID = import.meta.env.VITE_NETSUITE_ACCOUNT_ID;
const NETSUITE_API_BASE_URL = `https://${NETSUITE_ACCOUNT_ID}.suitetalk.api.netsuite.com`;
const NETSUITE_CLIENT_ID = process.env.NETSUITE_ID;

class HTTPError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response,
  ) {
    super(message);
  }
}

interface NetSuiteRateLimitInfo {
  limit?: number;
  remaining?: number;
  resetTime?: number;
  retryAfter?: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface TokenRes {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
};

const getAccessToken = async () => {
  "use-server";
  const { data } = await getSession();

  return data.accessToken;
};

const getRefreshToken = async () => {
  "use-server";
  const { data } = await getSession();

  return data.refreshToken;
};

const updateSessionTokens = async (tokens: Tokens) => {
  "use-server";
  const session = await getSession();

  await session.update(tokens);
};

// Parse rate limit information from NetSuite response headers
function parseRateLimitHeaders(response: Response): NetSuiteRateLimitInfo {
  const rateLimitInfo: NetSuiteRateLimitInfo = {};

  // Common rate limit header patterns
  const limit =
    response.headers.get("X-Rate-Limit-Limit") ||
    response.headers.get("X-RateLimit-Limit") ||
    response.headers.get("RateLimit-Limit");

  const remaining =
    response.headers.get("X-Rate-Limit-Remaining") ||
    response.headers.get("X-RateLimit-Remaining") ||
    response.headers.get("RateLimit-Remaining");

  const reset =
    response.headers.get("X-Rate-Limit-Reset") ||
    response.headers.get("X-RateLimit-Reset") ||
    response.headers.get("RateLimit-Reset");

  const retryAfter = response.headers.get("Retry-After");

  if (limit) rateLimitInfo.limit = parseInt(limit, 10);
  if (remaining) rateLimitInfo.remaining = parseInt(remaining, 10);
  if (reset) rateLimitInfo.resetTime = parseInt(reset, 10);
  if (retryAfter) rateLimitInfo.retryAfter = parseInt(retryAfter, 10);

  return rateLimitInfo;
}

// Calculate delay for exponential backoff
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  retryAfter?: number,
): number {
  if (retryAfter) {
    // If server provides Retry-After header, use that (convert to milliseconds)
    return Math.min(retryAfter * 1000, maxDelay);
  }

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // Add up to 10% jitter

  return Math.min(exponentialDelay + jitter, maxDelay);
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function netsuiteRequest(
  endpoint: string,
  options: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: any;
    headers?: any;
    retryConfig?: Partial<RetryConfig>;
  },
) {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
  let accessToken = await getAccessToken();
  let refreshToken = await getRefreshToken();

  if (!accessToken) {
    throw new Error("NetSuite access token is not available.");
  }

  if (!refreshToken) {
    throw new Error("NetSuite refresh token is not available.");
  }

  const url = `${NETSUITE_API_BASE_URL}${endpoint}`;
  const baseHeaders = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  let lastError: Error | null = null;
  let lastRateLimitInfo: NetSuiteRateLimitInfo | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: options.method,
        headers: baseHeaders,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Parse rate limit info from headers (always available)
      const rateLimitInfo = parseRateLimitHeaders(response);
      lastRateLimitInfo = rateLimitInfo;

      // Log rate limit status for monitoring
      if (rateLimitInfo.remaining !== undefined) {
        console.log(
          `NetSuite API: ${rateLimitInfo.remaining}/${rateLimitInfo.limit || "unknown"} requests remaining`,
        );

        // Warn when approaching rate limit
        if (rateLimitInfo.remaining < 10) {
          console.warn(
            `NetSuite rate limit warning: Only ${rateLimitInfo.remaining} requests remaining`,
          );
        }
      }

      // Handle rate limit exceeded (429)
      if (response.status === 429) {
        const delay = calculateDelay(
          attempt,
          retryConfig.baseDelay,
          retryConfig.maxDelay,
          rateLimitInfo.retryAfter,
        );

        console.warn(
          `NetSuite rate limit hit. Attempt ${attempt + 1}/${retryConfig.maxRetries + 1}. Retrying in ${delay}ms`,
        );

        if (attempt < retryConfig.maxRetries) {
          await sleep(delay);
          continue; // Retry the request
        } else {
          throw new HTTPError(
            `Rate limit exceeded after ${retryConfig.maxRetries} retries`,
            429,
            response,
          );
        }
      }

      // Handle other non-success responses
      if (!response.ok) {
        const errorMessage = `NetSuite API error: ${response.status} ${response.statusText}`;

        // Some errors might be retryable (5xx server errors)
        if (response.status >= 500 && attempt < retryConfig.maxRetries) {
          const delay = calculateDelay(
            attempt,
            retryConfig.baseDelay,
            retryConfig.maxDelay,
          );
          console.warn(
            `${errorMessage}. Attempt ${attempt + 1}/${retryConfig.maxRetries + 1}. Retrying in ${delay}ms`,
          );

          await sleep(delay);
          continue; // Retry the request
        }

        if (response.status === 401) {
          console.warn("NetSuite token is expired, refreshing the token");
          if (!NETSUITE_CLIENT_ID)
            throw new Error("no client Id, unable to refresh token");

          if (!refreshToken) throw new Error("no refresh token in session");

          const refreshRes = await fetch(
            `${NETSUITE_API_BASE_URL}/services/rest/auth/oauth2/v1/token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
              },
              body: urlEncode({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: NETSUITE_CLIENT_ID,
              }),
            },
          );
          const res = (await refreshRes.json()) as TokenRes;
          console.log("Rerfesh res: ", res);
          const newTokens = {
            accessToken: res.access_token,
            refreshToken: res.refresh_token,
          };

          await updateSessionTokens(newTokens);

          accessToken = await getAccessToken();

          refreshToken = await getRefreshToken();

          await sleep(200);
          continue; // retry the request
        }

        throw new HTTPError(errorMessage, response.status, response);
      }

      // Success - parse and return JSON, but handle empty responses gracefully
      const responseText = await response.text();

      // If response is empty (common with PATCH operations), return success indicator
      if (!responseText.trim()) {
        // Log successful request with rate limit info
        if (rateLimitInfo.remaining !== undefined) {
          console.log(
            `NetSuite request successful (empty response). ${rateLimitInfo.remaining} requests remaining.`,
          );
        }

        return {
          success: true,
          message: "Operation completed successfully",
          status: response.status,
        };
      }

      // Try to parse as JSON
      let json;
      try {
        json = JSON.parse(responseText);
      } catch (parseError) {
        throw new HTTPError(
          `JSON parse error: Invalid JSON response from NetSuite. Response: ${responseText}`,
        );
      }

      if (!json) {
        throw new HTTPError(`JSON parse error: Empty response from NetSuite`);
      }

      // Log successful request with rate limit info
      if (rateLimitInfo.remaining !== undefined) {
        console.log(
          `NetSuite request successful. ${rateLimitInfo.remaining} requests remaining.`,
        );
      }

      return json;
    } catch (error) {
      lastError = error as Error;

      // If it's a network error or timeout, retry
      if (
        (error as any).code === "ECONNRESET" ||
        (error as any).code === "ETIMEDOUT" ||
        (error as any).code === "ENOTFOUND" ||
        error instanceof TypeError // Often indicates network issues
      ) {
        if (attempt < retryConfig.maxRetries) {
          const delay = calculateDelay(
            attempt,
            retryConfig.baseDelay,
            retryConfig.maxDelay,
          );
          console.warn(
            `Network error: ${error.message}. Attempt ${attempt + 1}/${retryConfig.maxRetries + 1}. Retrying in ${delay}ms`,
          );

          await sleep(delay);
          continue; // Retry the request
        }
      }

      // If it's an HTTPError or we've exhausted retries, don't retry
      if (error instanceof HTTPError || attempt >= retryConfig.maxRetries) {
        console.error("NetSuite API request failed:", {
          error: error.message,
          attempt: attempt + 1,
          rateLimitInfo: lastRateLimitInfo,
        });
        throw error;
      }
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error("NetSuite request failed for unknown reason");
}

// Utility function to make a lightweight request to check rate limit status
export async function checkNetSuiteRateLimit(): Promise<NetSuiteRateLimitInfo> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("NetSuite access token is not available.");
    }

    // Make a minimal request to check rate limit headers
    const url = `${NETSUITE_API_BASE_URL}/services/rest/record/v1/account`;
    const response = await fetch(url, {
      method: "HEAD", // Use HEAD to minimize data transfer
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseRateLimitHeaders(response);
  } catch (error) {
    console.error("Failed to check NetSuite rate limit:", error);
    return {};
  }
}

// Helper function to create a custom retry configuration
export function createRetryConfig(config: Partial<RetryConfig>): RetryConfig {
  return { ...DEFAULT_RETRY_CONFIG, ...config };
}

// Predefined retry configurations for different scenarios
export const retryConfigs = {
  // Quick operations that should fail fast
  aggressive: createRetryConfig({
    maxRetries: 1,
    baseDelay: 500,
    maxDelay: 5000,
  }),

  // Standard operations
  standard: DEFAULT_RETRY_CONFIG,

  // Critical operations that should retry extensively
  patient: createRetryConfig({
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 60000,
  }),

  // Background operations that can wait longer
  background: createRetryConfig({
    maxRetries: 10,
    baseDelay: 5000,
    maxDelay: 300000, // 5 minutes
  }),
};

// Enhanced request function with predefined retry strategy
export async function netsuiteRequestWithRetry(
  endpoint: string,
  options: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: any;
    headers?: any;
  },
  retryStrategy: keyof typeof retryConfigs = "standard",
) {
  return netsuiteRequest(endpoint, {
    ...options,
    retryConfig: retryConfigs[retryStrategy],
  });
}

// Batch request handler with built-in rate limit management
export async function netsuiteRequestBatch<T>(
  requests: Array<{
    endpoint: string;
    options: {
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      body?: any;
      headers?: any;
    };
  }>,
  batchOptions: {
    concurrency?: number;
    delayBetweenRequests?: number;
    retryStrategy?: keyof typeof retryConfigs;
  } = {},
): Promise<T[]> {
  // Check if this contains PATCH operations - use sequential processing for these
  const hasPatchOperations = requests.some(
    (req) => req.options.method === "PATCH",
  );

  if (hasPatchOperations) {
    console.log("Detected PATCH operations, using sequential processing");
    return netsuiteRequestSequential(requests, batchOptions);
  }

  const {
    concurrency = 3,
    delayBetweenRequests = 100,
    retryStrategy = "standard",
  } = batchOptions;

  const results: T[] = [];

  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);

    const batchPromises = batch.map(async ({ endpoint, options }) => {
      try {
        return await netsuiteRequestWithRetry(endpoint, options, retryStrategy);
      } catch (error) {
        console.error(`Batch request failed for ${endpoint}:`, error);
        throw error;
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result, batchIndex) => {
      const globalIndex = i + batchIndex;
      const request = batch[batchIndex];

      if (result.status === "fulfilled") {
        results.push(result.value);
        console.log(
          `Request ${globalIndex + 1}/${requests.length} succeeded: ${request.endpoint}`,
        );
      } else {
        console.error(`Request ${globalIndex + 1}/${requests.length} failed:`, {
          endpoint: request.endpoint,
          method: request.options.method,
          body: request.options.body,
          error: result.reason.message,
          status: result.reason.status,
        });

        throw result.reason;
      }
    });

    // Add delay between batches to be nice to the API
    if (i + concurrency < requests.length && delayBetweenRequests > 0) {
      await sleep(delayBetweenRequests);
    }
  }

  return results;
}

// Sequential processing for PATCH operations to avoid resource conflicts
async function netsuiteRequestSequential<T>(
  requests: Array<{
    endpoint: string;
    options: {
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      body?: any;
      headers?: any;
    };
  }>,
  batchOptions: {
    concurrency?: number;
    delayBetweenRequests?: number;
    retryStrategy?: keyof typeof retryConfigs;
  } = {},
): Promise<T[]> {
  const {
    delayBetweenRequests = 50, // Longer delay for PATCH operations
    retryStrategy = "standard",
  } = batchOptions;

  const results: T[] = [];

  for (let i = 0; i < requests.length; i++) {
    const { endpoint, options } = requests[i];

    try {
      console.log(
        `Processing sequential request ${i + 1}/${requests.length}: ${endpoint}`,
      );

      const result = await netsuiteRequestWithRetry(
        endpoint,
        options,
        retryStrategy,
      );

      results.push(result);
      console.log(`Sequential request ${i + 1} completed successfully`);

      // Add delay between requests except for the last one
      if (i < requests.length - 1 && delayBetweenRequests > 0) {
        console.log(`Waiting ${delayBetweenRequests}ms before next request...`);
        await sleep(delayBetweenRequests);
      }
    } catch (error) {
      console.error(`Sequential request ${i + 1} failed:`, {
        endpoint,
        method: options.method,
        body: options.body,
        error: (error as any).message,
        status: (error as any).status,
      });

      throw error;
    }
  }

  return results;
}

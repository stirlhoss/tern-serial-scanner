# NetSuite Rate Limiting Documentation

This document explains how to use the NetSuite rate limiting features implemented in the `netsuite.ts` service.

## Overview

The NetSuite service now includes comprehensive rate limit handling that:
- Automatically detects and handles 429 (Too Many Requests) responses
- Implements exponential backoff with jitter for retries
- Parses and logs rate limit information from response headers
- Provides different retry strategies for different use cases
- Includes batch processing with built-in rate limit management

## Basic Usage

### Standard Requests

Replace your existing `netsuiteRequest` calls with `netsuiteRequestWithRetry`:

```typescript
// Before
const result = await netsuiteRequest('/services/rest/record/v1/salesorder/123', {
  method: 'GET'
});

// After - with automatic rate limit handling
const result = await netsuiteRequestWithRetry('/services/rest/record/v1/salesorder/123', {
  method: 'GET'
}, 'standard');
```

### Available Retry Strategies

Choose the appropriate retry strategy based on your use case:

- **`aggressive`**: Quick operations that should fail fast (1 retry, max 5s delay)
- **`standard`**: Default strategy (3 retries, max 30s delay)
- **`patient`**: Critical operations (5 retries, max 60s delay)  
- **`background`**: Background jobs (10 retries, max 5min delay)

## Examples

### Sales Order Retrieval
```typescript
import { netsuiteRequestWithRetry } from "~/services/netsuite";

export async function getSalesOrder(soId: string) {
  try {
    const record = await netsuiteRequestWithRetry(
      `/services/rest/record/v1/salesorder/${soId}`,
      { method: "GET" },
      "standard" // Good for interactive requests
    );
    return record;
  } catch (error) {
    if (error.status === 429) {
      console.log("Rate limit exceeded, request was retried but still failed");
    }
    throw error;
  }
}
```

### Complex Queries
```typescript
export async function getTransactionLines(soNum: string) {
  const query = `SELECT ... FROM Transaction WHERE ...`;
  
  try {
    const result = await netsuiteRequestWithRetry(
      "/services/rest/query/v1/suiteql",
      {
        method: "POST",
        body: { q: query },
        headers: { Prefer: "transient" }
      },
      "patient" // Use patient strategy for complex queries
    );
    return result.items;
  } catch (error) {
    console.error("Complex query failed:", error);
    throw error;
  }
}
```

### Batch Processing
```typescript
import { netsuiteRequestBatch } from "~/services/netsuite";

export async function processMultipleSalesOrders(soIds: string[]) {
  const requests = soIds.map(id => ({
    endpoint: `/services/rest/record/v1/salesorder/${id}`,
    options: { method: 'GET' as const }
  }));

  try {
    const results = await netsuiteRequestBatch(requests, {
      concurrency: 3,        // Process 3 requests at once
      delayBetweenRequests: 200,  // 200ms delay between batches
      retryStrategy: 'standard'
    });
    
    return results;
  } catch (error) {
    console.error("Batch processing failed:", error);
    throw error;
  }
}
```

## Rate Limit Monitoring

### Check Current Status
```typescript
import { checkNetSuiteRateLimit } from "~/services/netsuite";

const rateLimitInfo = await checkNetSuiteRateLimit();
console.log(`${rateLimitInfo.remaining}/${rateLimitInfo.limit} requests remaining`);
```

### Use the Status API Endpoint

Visit `/api/netsuite-status` to get detailed rate limit information:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "rateLimit": {
    "limit": 1000,
    "remaining": 856,
    "resetTime": 1705315800,
    "resetIn": 3600,
    "retryAfter": null
  },
  "warning": null,
  "recommendations": ["Rate limit status is healthy"]
}
```

## Custom Configuration

### Custom Retry Configuration
```typescript
import { netsuiteRequest, createRetryConfig } from "~/services/netsuite";

const customRetryConfig = createRetryConfig({
  maxRetries: 2,
  baseDelay: 2000,
  maxDelay: 10000
});

const result = await netsuiteRequest('/some/endpoint', {
  method: 'GET',
  retryConfig: customRetryConfig
});
```

### Low-Level Request with Full Control
```typescript
import { netsuiteRequest } from "~/services/netsuite";

try {
  const result = await netsuiteRequest('/services/rest/record/v1/customer/123', {
    method: 'GET',
    retryConfig: {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 60000
    }
  });
} catch (error) {
  if (error.status === 429) {
    console.log("Rate limited even after retries");
  }
}
```

## Error Handling

The service throws `HTTPError` objects with additional information:

```typescript
try {
  const result = await netsuiteRequestWithRetry(endpoint, options);
} catch (error) {
  if (error instanceof HTTPError) {
    console.log(`HTTP ${error.status}: ${error.message}`);
    
    if (error.status === 429) {
      console.log("Rate limit exceeded");
    } else if (error.status >= 500) {
      console.log("Server error - request was retried");
    }
  } else {
    console.log("Network or other error:", error.message);
  }
}
```

## Best Practices

### 1. Choose the Right Retry Strategy
- Use `aggressive` for user-facing operations that need fast responses
- Use `standard` for most API calls
- Use `patient` for important operations that can tolerate delays
- Use `background` for batch jobs and non-time-sensitive operations

### 2. Monitor Rate Limit Status
- Check `/api/netsuite-status` regularly in your monitoring systems
- Set up alerts when remaining requests drop below thresholds
- Log rate limit information for analysis

### 3. Handle Peak Usage
```typescript
// Check rate limit before making expensive operations
const status = await checkNetSuiteRateLimit();
if (status.remaining && status.remaining < 10) {
  // Defer non-critical operations
  console.log("Rate limit low, skipping non-critical requests");
  return;
}
```

### 4. Batch Similar Requests
```typescript
// Instead of multiple individual requests
const results = await Promise.all([
  netsuiteRequestWithRetry('/record/1', { method: 'GET' }),
  netsuiteRequestWithRetry('/record/2', { method: 'GET' }),
  // ... more requests
]);

// Use batch processing with built-in rate limiting
const results = await netsuiteRequestBatch(
  requests,
  { concurrency: 3, delayBetweenRequests: 100 }
);
```

### 5. Graceful Degradation
```typescript
export async function getSalesOrderWithFallback(soId: string) {
  try {
    return await netsuiteRequestWithRetry(`/record/salesorder/${soId}`, {
      method: 'GET'
    }, 'standard');
  } catch (error) {
    if (error.status === 429) {
      // Return cached data or simplified response
      console.log("Rate limited, returning cached data");
      return getCachedSalesOrder(soId);
    }
    throw error;
  }
}
```

## Monitoring and Alerts

### Log Analysis
The service logs important rate limit events:
- Current remaining requests after each call
- Warnings when approaching rate limits  
- Retry attempts with delays
- Rate limit exceeded events

### Recommended Monitoring
- Set up alerts when remaining requests < 50
- Monitor average request rate over time
- Track retry rates to identify patterns
- Alert on repeated 429 errors despite retries

### Metrics to Track
- `netsuite.requests.remaining` - Current remaining requests
- `netsuite.requests.rate` - Requests per minute
- `netsuite.retries.count` - Number of retries performed
- `netsuite.errors.ratelimit` - Rate limit violations

## Troubleshooting

### Common Issues

**High Retry Rates**: 
- Check if you're making too many requests too quickly
- Consider using batch processing
- Increase delays between requests

**Persistent 429 Errors**:
- Verify your NetSuite account rate limits
- Check if other applications are using the same account
- Consider implementing request queuing

**Slow Response Times**:
- Monitor rate limit remaining - low limits cause more retries
- Consider reducing retry delays for time-sensitive operations
- Use `aggressive` retry strategy for interactive requests

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=netsuite:ratelimit
```

This will log additional information about retry decisions and rate limit calculations.

import { checkNetSuiteRateLimit } from "~/services/netsuite";
import { APIEvent } from "@solidjs/start/server";

export async function GET({ request }: APIEvent) {
  "use-server";

  try {
    const rateLimitInfo = await checkNetSuiteRateLimit();

    // Calculate status based on remaining requests
    let status = "healthy";
    let warning = null;

    if (rateLimitInfo.remaining !== undefined) {
      const remaining = rateLimitInfo.remaining;
      const limit = rateLimitInfo.limit || 100; // Default assumption
      const percentageRemaining = (remaining / limit) * 100;

      if (percentageRemaining <= 10) {
        status = "critical";
        warning = `Only ${remaining} requests remaining (${percentageRemaining.toFixed(1)}%)`;
      } else if (percentageRemaining <= 25) {
        status = "warning";
        warning = `${remaining} requests remaining (${percentageRemaining.toFixed(1)}%)`;
      }
    }

    // Calculate reset time if available
    let resetIn = null;
    if (rateLimitInfo.resetTime) {
      const now = Math.floor(Date.now() / 1000);
      const resetTimeSeconds = rateLimitInfo.resetTime;

      if (resetTimeSeconds > now) {
        resetIn = resetTimeSeconds - now;
      }
    }

    const response = {
      status,
      timestamp: new Date().toISOString(),
      rateLimit: {
        limit: rateLimitInfo.limit || null,
        remaining: rateLimitInfo.remaining || null,
        resetTime: rateLimitInfo.resetTime || null,
        resetIn: resetIn,
        retryAfter: rateLimitInfo.retryAfter || null,
      },
      warning,
      recommendations: [],
    };

    // Add recommendations based on status
    if (status === "critical") {
      response.recommendations.push(
        "Stop making non-essential requests immediately",
      );
      response.recommendations.push("Implement request queuing with delays");
      response.recommendations.push(
        `Wait ${resetIn ? `${resetIn} seconds` : "for rate limit reset"} before resuming`,
      );
    } else if (status === "warning") {
      response.recommendations.push("Reduce request frequency");
      response.recommendations.push("Consider batching requests");
      response.recommendations.push(
        "Monitor rate limit status more frequently",
      );
    } else {
      response.recommendations.push("Rate limit status is healthy");
    }

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-NetSuite-Status": status,
      },
    });
  } catch (error) {
    console.error("Failed to check NetSuite rate limit status:", error);

    return new Response(
      JSON.stringify(
        {
          status: "error",
          timestamp: new Date().toISOString(),
          error: "Failed to check rate limit status",
          message: error instanceof Error ? error.message : "Unknown error",
          rateLimit: null,
        },
        null,
        2,
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

import { json } from "@solidjs/router";
import type { APIEvent } from "@solidjs/start/server";
import { turso, initializeDB } from "~/lib/db";

export const GET = async (event: APIEvent) => {
  "use server";

  const results = {
    timestamp: new Date().toISOString(),
    status: "checking",
    dbConfig: {
      hasUrl: !!process.env.TURSO_DATABASE_URL || !!process.env.LOCAL_DB,
      hasSyncUrl: !!process.env.DB_URL,
      hasAuthToken: !!process.env.TURSO_AUTH_TOKEN,
      env: process.env.NODE_ENV || "unknown"
    },
    tests: {
      init: false,
      query: false
    },
    errors: [] as string[]
  };

  try {
    // Test database initialization
    const initSuccess = await initializeDB();
    results.tests.init = initSuccess;

    if (!initSuccess) {
      results.errors.push("Database initialization failed");
    }

    // Test a simple query
    try {
      const queryResult = await turso.execute({
        sql: "SELECT 1 as test_value"
      });

      results.tests.query = queryResult?.rows?.length > 0;

      if (!results.tests.query) {
        results.errors.push("Query test failed - no results returned");
      }
    } catch (queryError) {
      results.errors.push(`Query test error: ${queryError instanceof Error ? queryError.message : String(queryError)}`);
    }

    // Set overall status
    if (results.tests.init && results.tests.query) {
      results.status = "ok";
    } else {
      results.status = "error";
    }

    return json(results);
  } catch (error) {
    results.status = "error";
    results.errors.push(`General error: ${error instanceof Error ? error.message : String(error)}`);

    return json(results, { status: 500 });
  }
};

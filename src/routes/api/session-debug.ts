import { json } from "@solidjs/router";
import { getSession } from "~/lib/server";

export const GET = async () => {
  "use server";

  try {
    const session = await getSession();
    const sessionData = session.data;

    return json({
      status: "ok",
      hasSessionSecret: !!process.env.SESSION_SECRET,
      sessionSecretLength: process.env.SESSION_SECRET?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      sessionExists: !!sessionData,
      sessionId: sessionData?.id ? "present" : "missing",
      timestamp: new Date().toISOString(),
      // Don't expose actual session data in production
      ...(process.env.NODE_ENV !== "production" && {
        sessionData: sessionData,
      }),
    });
  } catch (error) {
    return json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        hasSessionSecret: !!process.env.SESSION_SECRET,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};

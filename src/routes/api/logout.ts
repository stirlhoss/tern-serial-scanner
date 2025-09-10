import { json } from "@solidjs/router";
import type { APIEvent } from "@solidjs/start/server";
import { getSession } from "~/lib/server";

export const POST = async (event: APIEvent) => {
  "use server";

  try {
    const session = await getSession();

    // Clear all session data
    await session.update({
      id: undefined,
      email: undefined,
      accessToken: undefined,
      refreshToken: undefined
    });

    // Also try to completely destroy the session
    await session.clear();

    return json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    return json(
      {
        success: false,
        message: "Error during logout",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

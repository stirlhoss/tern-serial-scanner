import { json } from "@solidjs/router";
import { getSession } from "~/lib/server";

export const POST = async () => {
  "use server";

  try {
    const session = await getSession();

    await session.clear();

    return json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    return json(
      {
        success: false,
        message: "Error during logout",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};

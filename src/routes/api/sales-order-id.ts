import { netsuiteRequestWithRetry } from "~/services/netsuite";
import { APIEvent } from "@solidjs/start/server";

export async function GET({ request }: APIEvent) {
  "use server";
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const soNum = searchParams.get("soNum");

  console.log(`Fetching transaction lines for SO: ${soNum}`);

  try {
    const record = await netsuiteRequestWithRetry(
      `/app/site/hosting/restlet.nl?script=2036&deploy=1&soNum=${soNum}`,
      {
        method: "GET",
      },
      "aggressive",
    );

    return JSON.stringify({ id: record.id });
  } catch (error) {
    console.error(
      `Failed to retrieve transaction lines for SO ${soNum}:`,
      error,
    );

    // Return a proper error response
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve transaction lines",
        message: error instanceof Error ? error.message : "Unknown error",
        soNum,
      }),
      {
        status:
          error instanceof Error && "status" in error
            ? (error as any).status || 500
            : 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

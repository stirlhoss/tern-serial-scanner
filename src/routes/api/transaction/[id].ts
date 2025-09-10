import { netsuiteRequestWithRetry } from "~/services/netsuite";
import { APIEvent } from "@solidjs/start/server";

interface Link {
  rel?: string;
  href?: string;
}

interface Item {
  id: number;
  links: Link[];
  trandate: string;
  tranid: string;
}

export interface SalesOrderTransactionLines {
  links: Link[];
  count: number;
  hasMore: boolean;
  items: Item[];
  offset: number;
  totalResults: number;
}

export async function GET({ params }: APIEvent) {
  "use server";
  const soNum = params.id;
  console.log(`Fetching transaction lines for SO: ${soNum}`);

  let query = `
      SELECT
          Transaction.tranid,
          Transaction.id,
          Transaction.trandate,
      FROM
          Transaction
      WHERE
          Transaction.type = 'SalesOrd'
      AND Transaction.tranid = '${soNum}'`;

  query = query.replace(/\s+|\s+/gm, " ").trim();

  try {
    const record = (await netsuiteRequestWithRetry(
      "/services/rest/query/v1/suiteql",
      {
        method: "POST",
        body: { q: query },
        headers: {
          Prefer: "transient",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      "aggressive",
    )) as SalesOrderTransactionLines;

    console.log(
      `Successfully retrieved ${record.items.length} transaction lines for SO: ${soNum}`,
    );

    return JSON.stringify({ id: record.items[0].id });
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

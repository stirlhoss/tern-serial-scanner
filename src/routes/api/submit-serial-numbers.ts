import {
  netsuiteRequestWithRetry,
  netsuiteRequestBatch,
  netsuiteRequest,
} from "~/services/netsuite";
import { APIEvent } from "@solidjs/start/server";

interface RequestBody {
  salesOrderId: string;
  salesOrderNumber: string;
  serialNumbers: SerialNumberData[];
}

export interface SerialNumberData {
  itemLineId: number;
  serialNumbers: string[];
}

export async function POST({ request }: APIEvent) {
  "use-server";

  if (request.headers.get("Content-Type")?.includes("application/json")) {
    const data = (await request.json()) as RequestBody;

    console.log(
      `Updating serial numbers for sales order items on SO: ${data.salesOrderId}`,
    );

    // Validate input data
    if (
      !data.salesOrderId ||
      !data.serialNumbers ||
      data.serialNumbers.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: "Missing salesOrderId or serialNumbers",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const itemRequests = data.serialNumbers.map((item) => {
      const serials: string = item.serialNumbers.join(`\n`);

      const body = { custcol_nsts_bike_serial_number: serials };

      return {
        endpoint: `/services/rest/record/v1/salesorder/${data.salesOrderId}/item/${item.itemLineId}`,
        options: {
          method: "PATCH" as const,
          body: body,
        },
      };
    });

    try {
      const results = await netsuiteRequestBatch(itemRequests, {
        retryStrategy: "standard",
      });

      console.log(
        `Successfully updated serial numbers for ${results.length} line items`,
      );

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.length,
          salesOrderId: data.salesOrderId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error: any) {
      console.error("Failed to update serial numbers:", {
        salesOrderId: data.salesOrderId,
        error: error.message,
        status: error.status,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          salesOrderId: data.salesOrderId,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
}

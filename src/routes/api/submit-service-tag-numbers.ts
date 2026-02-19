import { netsuiteRequestBatch } from "~/services/netsuite";
import { APIEvent } from "@solidjs/start/server";
interface Id {
  id: string;
}
interface RequestBody {
  salesOrderId: Id;
  salesOrderNumber: string;
  serviceTagNumbers: ServiceTagNumberData[];
}

export interface ServiceTagNumberData {
  itemLineId: number;
  tagNumbers: string[];
}

export async function POST({ request }: APIEvent) {
  "use server";

  if (request.headers.get("Content-Type")?.includes("application/json")) {
    const data = (await request.json()) as RequestBody;

    console.log(
      `Updating service tag numbers for sales order items on SO: ${data.salesOrderId.id}`,
    );

    // Validate input data
    if (
      !data.salesOrderId ||
      !data.serviceTagNumbers ||
      data.serviceTagNumbers.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: "Missing salesOrderId or serviceTagNumbers",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    console.log(JSON.stringify(data.salesOrderId.id, null, 2));
    const itemRequests = data.serviceTagNumbers.map((item) => {
      const serviceTags: string = item.tagNumbers.join(`\n`);

      const body = { custcol_kaizco_service_tag_number: serviceTags };

      return {
        endpoint: `/services/rest/record/v1/salesorder/${data.salesOrderId.id}/item/${item.itemLineId}`,
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
        `Successfully updated service tag numbers for ${results.length} line items`,
      );

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.length,
          salesOrderId: data.salesOrderId.id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error: any) {
      console.error("Failed to update service tag numbers:", {
        salesOrderId: data.salesOrderId.id,
        error: error.message,
        status: error.status,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          salesOrderId: data.salesOrderId.id,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
}

import {
  netsuiteRequestWithRetry,
  netsuiteRequestBatch,
} from "~/services/netsuite";
import { APIEvent } from "@solidjs/start/server";

interface Link {
  rel: string;
  href: string;
}

interface itemLink {
  links: Link[];
}

interface SOItemsRecord {
  links: Link[];
  items: itemLink[];
  totalResults: number;
}

interface Item {
  links: Link[];
  amount: number;
  commitmentFirm: boolean;
  costEstimate: number;
  costEstimateRate: number;
  costEstimateType: {
    id: string;
    refName: string;
  };
  createWo: number;
  custcol1: string;
  custcol_2663_isperson: number;
  custcol_nsts_bike_serial_number: string;
  custcol_statistical_value_base_curr: number;
  description: string;
  excludeFromPredictiveRisk: number;
  expectedShipDate: string;
  inventoryDetail: {
    rel: string;
  };
  isAllocateFirmInvtOnly: number;
  isClosed: number;
  isFreezeFirmAllocation: number;
  isOpen: number;
  item: {
    links: Link[];
    id: string;
    refName: string;
  };
  itemType: {
    id: string;
    refName: string;
  };
  line: 1;
  linked: number;
  location: {
    links: Link[];
    id: string;
    refName: string;
  };
  marginal: number;
  orderAllocationStrategy: {
    links: Link[];
    id: string;
    refName: string;
  };
  price: {
    links: Link[];
    id: string;
    refName: string;
  };
  printItems: number;
  quantity: number;
  quantityAllocated: number;
  quantityAvailable: number;
  quantityBackOrdered: number;
  quantityBilled: number;
  quantityCommitted: number;
  quantityFulfilled: number;
  rate: number;
  rateSchedule: string;
  requestedDate: string;
}

export async function GET({ params }: APIEvent) {
  "use server";
  const soId = params.id;
  console.log(`Fetching sales order items for SO: ${soId}`);

  try {
    // First, get the list of items for this sales order
    const itemsRecord = (await netsuiteRequestWithRetry(
      `/services/rest/record/v1/salesOrder/${soId}/item`,
      {
        method: "GET",
      },
      "aggressive",
    )) as SOItemsRecord;

    console.log(`Found ${itemsRecord.items.length} items for SO: ${soId}`);

    if (itemsRecord.items.length === 0) {
      return [];
    }

    // Prepare batch requests for all item details
    const itemRequests = itemsRecord.items.map((item) => {
      const link = URL.parse(item.links[0].href);
      if (!link || !link.pathname) {
        throw new Error(
          `Invalid link for item: ${JSON.stringify(item.links[0])}`,
        );
      }

      return {
        endpoint: link.pathname,
        options: {
          method: "GET" as const,
        },
      };
    });

    // Execute batch request with rate limiting
    const itemDetails = (await netsuiteRequestBatch<Item>(itemRequests, {
      concurrency: 5, // Process 5 items at once
      delayBetweenRequests: 100, // 100ms delay between batches
      retryStrategy: "aggressive",
    })) as Item[];

    console.log(
      `Successfully retrieved details for ${itemDetails.length} items`,
    );

    // Sort by line number to maintain order
    const sortedItems = itemDetails.sort((a, b) => a.line - b.line);

    return sortedItems;
  } catch (error) {
    console.error(`Failed to retrieve items for SO ${soId}:`, error);

    // Return a proper error response
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve sales order items",
        message: error instanceof Error ? error.message : "Unknown error",
        soId,
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

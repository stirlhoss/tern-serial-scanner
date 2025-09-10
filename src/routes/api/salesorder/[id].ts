import { netsuiteRequestWithRetry } from "~/services/netsuite";
import { APIEvent } from "@solidjs/start/server";

interface Link {
  rel: string;
  href: string;
}

interface Reference {
  links: Link[];
  id: string;
  refName: string;
}

interface AddressReference {
  links: Link[];
}

interface SORecord {
  links: Link[];
  altShippingCost: number;
  billAddress: string;
  billingAddress: AddressReference;
  billingAddress_text: string;
  canBeUnapproved: boolean;
  canHaveStackable: boolean;
  checkNumber: string;
  createdDate: string;
  currency: Reference;
  custbody_15699_exclude_from_ep_process: boolean;
  custbody_3805_dunning_letters_toemail: boolean;
  custbody_3805_dunning_letters_toprint: boolean;
  custbody_3805_dunning_paused: boolean;
  custbody_acs_canadian_customer: boolean;
  custbody_atlas_exist_cust_hdn: Reference;
  custbody_atlas_new_cust_hdn: Reference;
  custbody_atlas_no_hdn: Reference;
  custbody_atlas_yes_hdn: Reference;
  custbody_emea_transaction_type: string;
  custbody_esc_created_date: string;
  custbody_esc_last_modified_date: string;
  custbody_kaizco_go_live: boolean;
  custbody_kaizco_ignore_hold: boolean;
  custbody_kaizco_pre_order: boolean;
  custbody_kaizco_warranty_order_cbox: boolean;
  custbody_kz_so_sent_to_dilos: boolean;
  custbody_nondeductible_ref_tran: AddressReference;
  custbody_nsts_pdfs_emailed_check: boolean;
  custbody_nsts_tran_mailto_addresses: boolean;
  custbody_nsts_tran_mult_emails: string;
  custbody_paystand_events: AddressReference;
  custbody_paystand_guid: string;
  custbody_ps_autopay_email_sent: boolean;
  custbody_ps_autopay_fail_payer_notifi: boolean;
  custbody_ps_autopay_success_payer_noti: boolean;
  custbody_ps_branding: string;
  custbody_ps_fees_enabled: string;
  custbody_ps_fullamount: boolean;
  custbody_ps_logo_url: string;
  custbody_ps_publishable_key: string;
  custbody_rec_cred_hold: boolean;
  custbody_report_timestamp: string;
  custbody_sii_article_61d: boolean;
  custbody_sii_article_72_73: boolean;
  custbody_sii_is_third_party: boolean;
  custbody_sii_not_reported_in_time: boolean;
  custbody_solupay_billingschd_autopay: boolean;
  custbody_stc_amount_after_discount: number;
  custbody_stc_tax_after_discount: number;
  custbody_stc_total_after_discount: number;
  customForm: {
    id: string;
    refName: string;
  };
  discountTotal: number;
  entity: Reference;
  estGrossProfit: number;
  estGrossProfitPercent: number;
  exchangeRate: number;
  giftCertApplied: number;
  giftCertRedemption: AddressReference;
  handlingMode: {
    id: string;
    refName: string;
  };
  id: string;
  item: AddressReference;
  lastModifiedDate: string;
  linkedTrackingNumbers: string;
  location: Reference;
  memo: string;
  nextBill: string;
  orderStatus: {
    id: string;
    refName: string;
  };
  otherRefNum: string;
  prevDate: string;
  salesEffectiveDate: string;
  salesTeam: AddressReference;
  shipAddress: string;
  shipComplete: boolean;
  shipDate: string;
  shipIsResidential: boolean;
  shipMethod: Reference;
  shipOverride: boolean;
  shippingAddress: AddressReference;
  shippingAddress_text: string;
  shippingCost: number;
  shippingCostOverridden: boolean;
  status: {
    id: string;
    refName: string;
  };
  storeOrder: string;
  subsidiary: Reference;
  subtotal: number;
  toBeEmailed: boolean;
  toBeFaxed: boolean;
  toBePrinted: boolean;
  total: number;
  totalCostEstimate: number;
  tranDate: string;
  tranId: string;
  webStore: string;
}

export async function GET({ params }: APIEvent) {
  "use server";
  const soId = params.id;
  console.log(`Fetching sales order: ${soId}`);

  try {
    const record = (await netsuiteRequestWithRetry(
      `/services/rest/record/v1/salesorder/${soId}`,
      {
        method: "GET",
      },
      "standard", // Use standard retry strategy for sales order fetches
    )) as SORecord;

    console.log(`Successfully retrieved sales order: ${soId}`);
    return record;
  } catch (error) {
    console.error(`Failed to retrieve sales order ${soId}:`, error);

    // Return a proper error response
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve sales order",
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

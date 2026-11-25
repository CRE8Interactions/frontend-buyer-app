import type { BrandingOrganization } from "@/lib/branding";
import type { AddonCartItem, AddonQuote } from "@/lib/addonCatalog";

export type CheckoutCart = {
  id: string | number;
  tickets?: Array<Record<string, unknown>>;
  package_tickets?: Array<Record<string, unknown>>;
  package?: {
    uuid?: string | number;
    id?: string | number;
    name?: string;
    price?: number;
    pricingTiers?: Array<{ price?: number } | null> | null;
    start?: string;
    image?: { url?: string };
    events?: Array<{
      uuid?: string;
      name?: string;
      start?: string;
      venue?: { name?: string; timezone?: string };
      [key: string]: unknown;
    }>;
    venue?: { name?: string; timezone?: string };
    organization?: Record<string, unknown>;
  } | null;
  flex_pack?: {
    name?: string;
    price?: number;
    gameTickets?: number;
    start?: string;
    end?: string;
    image?: { url?: string };
    venue?: { name?: string; timezone?: string };
    organization?: Record<string, unknown>;
    [key: string]: unknown;
  } | null;
  access_pass_template?: {
    name?: string;
    price?: number;
    artwork?: { url?: string };
    events?: Array<{
      uuid?: string;
      name?: string;
      start?: string;
      [key: string]: unknown;
    }>;
    organization?: {
      connected_account_id?: string;
      test_connected_account_id?: string;
      uuid?: string;
      meta_pixel_id?: string;
      name?: string;
    };
    venue?: { timezone?: string; name?: string };
    [key: string]: unknown;
  } | null;
  event?: {
    uuid?: string;
    name?: string;
    start?: string;
    organization?: {
      connected_account_id?: string;
      test_connected_account_id?: string;
      uuid?: string;
      name?: string;
      branding?: BrandingOrganization["branding"];
    } & BrandingOrganization;
    venue?: { timezone?: string; name?: string };
    [key: string]: unknown;
  } | null;
  eventUUID?: string | null;
  event_uuid?: string | null;
  resaleListing?: unknown;
  addonItems?: AddonCartItem[] | null;
  addonQuote?: AddonQuote | null;
  total?: number;
  totalTax?: number;
  serviceFee?: number;
  processingFee?: number;
  estimatedProcessingFee?: number;
  discountApplied?: number;
  salesTax?: number;
  remainingTime?: number;
  ipAddress?: string;
  [key: string]: unknown;
};

export type TrackingOrganization = {
  id?: string | number;
  uuid?: string;
  tracking_enabled?: boolean;
  track_page_views?: boolean;
  track_checkout_started?: boolean;
  track_purchases?: boolean;
  google_tag_manager_id?: string;
  google_ads_id?: string;
  google_ads_conversion_label?: string;
  meta_pixel_id?: string;
  tiktok_pixel_id?: string;
  linkedin_partner_id?: string;
  [key: string]: unknown;
};

export type TrackingEvent = {
  id?: string | number;
  uuid?: string;
  name?: string;
  [key: string]: unknown;
};

export type TrackingTicket = {
  id?: string | number;
  seatId?: string | number;
  uuid?: string;
  name?: string;
  sectionName?: string;
  sectionNumber?: string | number;
  price?: number;
  quantity?: number;
  GA?: boolean;
  offer?: { name?: string; [key: string]: unknown };
  [key: string]: unknown;
};

export type TrackingCart = {
  id?: string | number;
  cartId?: string | number;
  total?: number;
  currency?: string;
  tickets?: TrackingTicket[];
  package?: {
    id?: string | number;
    uuid?: string;
    name?: string;
    [key: string]: unknown;
  } | null;
  flex_pack?: {
    id?: string | number;
    uuid?: string;
    name?: string;
    [key: string]: unknown;
  } | null;
  event?: (TrackingEvent & { organization?: TrackingOrganization }) | null;
  organization?: TrackingOrganization;
  [key: string]: unknown;
};

export type TrackingOrder = {
  orderId?: string | number;
  id?: string | number;
  total?: number;
  currency?: string;
  tickets?: TrackingTicket[];
  package?: {
    id?: string | number;
    uuid?: string;
    name?: string;
    [key: string]: unknown;
  } | null;
  flex_pack?: {
    id?: string | number;
    uuid?: string;
    name?: string;
    [key: string]: unknown;
  } | null;
  event?: (TrackingEvent & { organization?: TrackingOrganization }) | null;
  [key: string]: unknown;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track: (event: string, payload?: Record<string, unknown>) => void;
      page: () => void;
      load: (id: string) => void;
      methods?: string[];
      setAndDefer?: (obj: unknown, method: string) => void;
      _tiktokPixelId?: string;
      push?: (...args: unknown[]) => void;
      [key: string]: unknown;
    };
    lintrk?: {
      (action: string, payload?: Record<string, unknown>): void;
      q?: unknown[];
    };
    _linkedin_data_partner_ids?: string[];
    Intercom?: (...args: unknown[]) => void;
    intercomSettings?: Record<string, unknown>;
    hj?: (...args: unknown[]) => void;
    _hjSettings?: { hjid: number; hjsv: number };
    attachEvent?: (event: string, handler: () => void) => void;
  }
}

export {};

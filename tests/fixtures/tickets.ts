/**
 * Test adapters — always derive from lib/demo/fixtures.ts.
 * Do not duplicate seated listing / ticket-group payloads here.
 */
export {
  DEMO_SEATED_TICKET_GROUPS,
  demoLockedTicketingData,
  demoSeatedTicketingData,
} from "@/lib/demo/fixtures";

import {
  DEMO_SEATED_TICKET_GROUPS,
  demoLockedTicketingData,
  demoSeatedTicketingData,
} from "@/lib/demo/fixtures";

/** @deprecated Prefer demoSeatedTicketingData() */
export const seatedTicketingFixture = demoSeatedTicketingData();

/** @deprecated Prefer demoLockedTicketingData() */
export const lockedTicketingFixture = demoLockedTicketingData();

/** @deprecated Prefer DEMO_SEATED_TICKET_GROUPS */
export const rawGroupsFixture = DEMO_SEATED_TICKET_GROUPS;

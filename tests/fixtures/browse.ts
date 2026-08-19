/**
 * Test adapters — always derive from lib/demo/fixtures.ts.
 * Do not duplicate event/org/venue payloads here.
 */
import {
  demoBrowseEvents,
  demoBrowseOrgs,
  demoBrowseVenues,
} from "@/lib/demo/fixtures";

export {
  DEMO_EVENTS,
  DEMO_ORGS,
  demoBrowseEvents,
  demoBrowseOrgs,
  demoBrowseVenues,
} from "@/lib/demo/fixtures";

export const browseEventsFixture = demoBrowseEvents();
export const browseOrgsFixture = demoBrowseOrgs();
export const browseVenuesFixture = demoBrowseVenues();

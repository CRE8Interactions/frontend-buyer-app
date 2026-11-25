export type AddonPickupSource = {
  fulfillmentType?: string | null;
  fulfillment_type?: string | null;
  pickupLocation?: string | null;
  pickup_location?: string | null;
  pickupInstructions?: string | null;
  pickup_instructions?: string | null;
};

export function isPickupAddon(entry?: AddonPickupSource | null): boolean {
  const type = String(
    entry?.fulfillmentType || entry?.fulfillment_type || "",
  ).toUpperCase();
  return type === "PICKUP";
}

export function getAddonPickupDetails(entry?: AddonPickupSource | null): {
  location: string;
  instructions: string;
} {
  const location = String(
    entry?.pickupLocation ?? entry?.pickup_location ?? "",
  ).trim();
  const instructions = String(
    entry?.pickupInstructions ?? entry?.pickup_instructions ?? "",
  ).trim();
  return { location, instructions };
}

export function hasAddonPickupDetails(entry?: AddonPickupSource | null): boolean {
  if (!isPickupAddon(entry)) return false;
  const { location, instructions } = getAddonPickupDetails(entry);
  return Boolean(location || instructions);
}

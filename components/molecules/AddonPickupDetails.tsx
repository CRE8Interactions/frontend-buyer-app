import {
  getAddonPickupDetails,
  hasAddonPickupDetails,
  type AddonPickupSource,
} from "@/lib/addonPickup";

export default function AddonPickupDetails({
  product,
}: {
  product?: AddonPickupSource | null;
}) {
  if (!hasAddonPickupDetails(product)) return null;
  const { location, instructions } = getAddonPickupDetails(product);

  return (
    <div>
      {location ? (
        <p className="mb-1 text-[13px] text-[#4a5567]">
          <span className="font-semibold text-[#051b35]">Pickup: </span>
          {location}
        </p>
      ) : null}
      {instructions ? (
        <p className="mb-0 text-[13px] text-[#6e7180]">{instructions}</p>
      ) : null}
    </div>
  );
}

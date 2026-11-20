export function startingPrice(offer) {
  const prices = offer?.tiers?.map((t) => t.price).filter(Number.isFinite) || [];
  return prices.length ? Math.min(...prices) : null;
}
export const contrastText = (color) => {
  const hex = String(color || '').match(/^#([\da-f]{6})$/i)?.[1];
  if (!hex) return '#ffffff';
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255),
    linear = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)),
    luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.179 ? '#18181b' : '#ffffff';
};
export function createBuyerInventory({ getMap, getStore }) {
  let currencyFormatter, currencyCode;
  const money = (value) => {
    if (currencyCode !== getStore().inventory.currency) {
      currencyCode = getStore().inventory.currency;
      currencyFormatter = new Intl.NumberFormat(window.maps2d?.venue?.view2d?.locale || undefined, { // the venue's own locale when it names one, otherwise the buyer's
        style: 'currency',
        currency: currencyCode,
      });
    }
    return currencyFormatter.format(value / 100);
  };
  function publicOfferIds() {
    const ids = new Set();
    for (const seat of getMap().seats)
      if (getStore().status(seat.id) === 'available') {
        const id = getStore().inventory.assignments[seat.id];
        if (id) ids.add(id);
      }
    for (const section of getMap().sections.filter((section) => section.ga)) {
      const pool = getStore().inventory.ga[section.id];
      if (pool?.offerId && (!pool.locked || getStore().unlocked.has(section.id)))
        ids.add(pool.offerId);
    }
    return ids;
  }
  function selectedIDs() {
    return new Set([...getStore().cart.values()].flatMap((l) => l.seatIds || []));
  }
  function buyerSeatInteractive(id) {
    return ['available', 'locked'].includes(getStore().status(id)) || selectedIDs().has(id);
  }
  function buyerUnit(id) {
    const unit = getStore().unit(id);
    return unit.length ? unit : [id];
  }
  function seatNumberLabel(ids) {
    const nums = ids.map((id) => getMap().seatById.get(id)?.number).filter(Boolean);
    return nums.length > 1 ? `${nums[0]}-${nums[nums.length - 1]}` : nums[0] || '';
  }
  return { money, publicOfferIds, selectedIDs, buyerSeatInteractive, buyerUnit, seatNumberLabel };
}

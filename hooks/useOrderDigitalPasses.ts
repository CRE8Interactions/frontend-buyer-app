"use client";

import { useEffect, useState } from "react";
import {
  type DigitalAddonPass,
} from "@/lib/addonCatalog";
import { getOrderDigitalPasses } from "@/lib/api";

type PassOrder = {
  uuid?: unknown;
  digitalAddonPasses?: unknown;
};

function listedPasses(value: unknown): DigitalAddonPass[] | undefined {
  return Array.isArray(value) ? (value as DigitalAddonPass[]) : undefined;
}

export function useOrderDigitalPasses(
  order?: PassOrder | null,
  eventUUID?: string | null,
) {
  const embedded = listedPasses(order?.digitalAddonPasses);
  const [passes, setPasses] = useState<DigitalAddonPass[]>(embedded || []);
  const orderUuid = typeof order?.uuid === "string" ? order.uuid : "";

  useEffect(() => {
    if (embedded?.length) {
      setPasses(embedded);
      return undefined;
    }
    if (!orderUuid) {
      setPasses((current) => (current.length === 0 ? current : []));
      return undefined;
    }

    let cancelled = false;
    getOrderDigitalPasses(orderUuid, eventUUID || undefined)
      .then((res) => {
        if (!cancelled) {
          const listed = res?.data?.digitalPasses;
          setPasses(Array.isArray(listed) ? listed : []);
        }
      })
      .catch(() => {
        if (!cancelled) setPasses([]);
      });

    return () => {
      cancelled = true;
    };
  }, [orderUuid, eventUUID, embedded]);

  return passes;
}

"use client";

import AppShell from "@/components/templates/AppShell";
import PageSkeleton from "@/components/molecules/PageSkeleton";

export default function Loading() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1040px] pb-20 pt-6">
        <PageSkeleton variant="detail" label="Loading" />
      </div>
    </AppShell>
  );
}

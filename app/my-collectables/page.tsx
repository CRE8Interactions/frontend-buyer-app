"use client";

import WalletShell from "@/components/templates/WalletShell";
import EmptyState from "@/components/molecules/EmptyState";

/** Collectables — sparse/legacy surface; empty state until API expands. */
export default function MyCollectablesPage() {
  return (
    <WalletShell>
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="m12 3 2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9L12 3z" />
          </svg>
        }
      >
        No collectables yet. Digital keepsakes from events you attend will appear here when available.
      </EmptyState>
    </WalletShell>
  );
}

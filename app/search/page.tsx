"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import EventCard, { type EventCardEvent } from "@/components/organisms/EventCard";
import { searchEvents } from "@/lib/api";
import { getSingularOrPluralWord, sortByDate } from "@/lib/helpers";

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function SearchResultsInner({ query }: { query: string }) {
  const [results, setResults] = useState<EventCardEvent[]>([]);
  const [loading, setLoading] = useState(Boolean(query));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query) return;

    let cancelled = false;
    searchEvents({ data: query })
      .then((res) => {
        if (cancelled) return;
        setResults(sortByDate(asList<EventCardEvent>(res.data)));
      })
      .catch(() => {
        if (!cancelled) setError("Search failed. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="pb-16">
      {!query ? (
        <h1 className="text-[clamp(28px,3.5vw,40px)] font-semibold tracking-[-0.02em]">
          Search for events using the bar above.
        </h1>
      ) : (
        <h1 className="text-[clamp(28px,3.5vw,40px)] font-semibold tracking-[-0.02em]">
          We found {loading ? "…" : results.length}{" "}
          {!loading && results.length > 0
            ? getSingularOrPluralWord(results.length, "result")
            : "results"}{" "}
          for &ldquo;{query}&rdquo;
        </h1>
      )}

      {loading ? (
        <PageLoader message="Searching…" label="Searching" className="mt-10 min-h-[30vh]" />
      ) : error ? (
        <div className="mt-10">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
            }
          >
            {error}
          </EmptyState>
        </div>
      ) : query && results.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
            }
          >
            No events matched &ldquo;{query}&rdquo;. Try a different search.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((event) => (
            <EventCard
              key={String(event.uuid || event.id || event.slug || event.name)}
              event={event}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("query") || "").trim();
  return <SearchResultsInner key={query} query={query} />;
}

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense
        fallback={<PageLoader message="Loading search…" label="Loading search" />}
      >
        <SearchResults />
      </Suspense>
    </AppShell>
  );
}

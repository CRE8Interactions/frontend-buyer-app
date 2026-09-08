"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/organisms/Nav";
import SearchEventList from "@/components/organisms/SearchEventList";
import { BrandBlocks } from "@/components/molecules/BrandLoader";
import { fetchSearchEvents, type ShopperSearchEvent } from "@/lib/searchEvents";
import { getSingularOrPluralWord } from "@/lib/helpers";

function SearchLoading({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className="mt-10 flex min-h-[30vh] items-center justify-center"
    >
      <BrandBlocks />
    </div>
  );
}

function SearchNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-[rgba(5,27,53,0.18)] bg-white px-6 py-11 text-center">
      <p className="text-[17px] font-semibold tracking-[-0.015em]">{title}</p>
      <p className="text-[14px] text-[#6e7180]">{detail}</p>
    </div>
  );
}

function SearchResultsInner({ query }: { query: string }) {
  const [results, setResults] = useState<ShopperSearchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // The parent keys this component by query, so each search starts from the
    // loading state below rather than resetting it here.
    let cancelled = false;
    fetchSearchEvents(query)
      .then((events) => {
        if (cancelled) return;
        setResults(events);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Search failed. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  if (loading) {
    return <SearchLoading label="Searching" />;
  }

  return (
    <div className="pb-16">
      <h1 className="text-[clamp(28px,3.5vw,40px)] font-semibold tracking-[-0.02em]">
        {`We found ${results.length} ${getSingularOrPluralWord(
          results.length,
          "result",
        )} for “${query}”`}
      </h1>

      {error ? (
        <SearchNotice
          title={error}
          detail="Check your connection, then search again."
        />
      ) : results.length === 0 ? (
        <SearchNotice
          title={`No events matched “${query}”`}
          detail="Try a team, venue or city name."
        />
      ) : results.length > 0 ? (
        <div className="mt-10 rounded-[20px] border border-[rgba(5,27,53,0.10)] bg-white p-3">
          <SearchEventList events={results} query={query} />
        </div>
      ) : null}
    </div>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("query") || "").trim();
  // Opening a result swaps the search params for the destination route while
  // this page is still mounted, so an empty query means "on the way out" as
  // often as it means "landed here bare" — either way there is nothing to say.
  if (!query) return null;
  return <SearchResultsInner key={query} query={query} />;
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#051b35]">
      <Nav />
      <main className="mx-auto max-w-[1320px] px-5 pt-4 md:px-8 md:pt-7">
        <Suspense fallback={<SearchLoading label="Loading search" />}>
          <SearchResults />
        </Suspense>
      </main>
    </div>
  );
}

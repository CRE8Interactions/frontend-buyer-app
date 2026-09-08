"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Spinner from "@/components/atoms/Spinner";
import SearchEventList from "@/components/organisms/SearchEventList";
import {
  fetchSearchEvents,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
  SEARCH_SPINNER_COLOR,
  SEARCH_SUGGESTION_LIMIT,
  searchResultsHref,
  type ShopperSearchEvent,
} from "@/lib/searchEvents";

type SearchApi = {
  query: string;
  setQuery: (value: string) => void;
  results: ShopperSearchEvent[];
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  placeholder: string;
  submit: () => void;
  clear: () => void;
  close: () => void;
};

const SearchCtx = createContext<SearchApi | null>(null);

function useSearchApi() {
  const ctx = useContext(SearchCtx);
  if (!ctx) {
    throw new Error("ShopperSearchProvider is required");
  }
  return ctx;
}

function useShopperSearch(placeholder: string): SearchApi {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<ShopperSearchEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const requestIdRef = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    setSheetOpen(false);
  }, []);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setOpen(true);
  }, []);

  const clear = useCallback(() => {
    setQueryState("");
    setResults([]);
    setLoading(false);
    requestIdRef.current += 1;
  }, []);

  const submit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    close();
    router.push(searchResultsHref(trimmed));
  }, [close, query, router]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_CHARS) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timer = window.setTimeout(() => {
      fetchSearchEvents(trimmed)
        .then((events) => {
          if (requestIdRef.current !== requestId) return;
          setResults(events.slice(0, SEARCH_SUGGESTION_LIMIT));
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setResults([]);
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    close();
  }, [close, pathname]);

  return {
    query,
    setQuery,
    results,
    loading,
    open,
    setOpen,
    sheetOpen,
    setSheetOpen,
    placeholder,
    submit,
    clear,
    close,
  };
}

export function ShopperSearchProvider({
  children,
  placeholder = "Search for events",
}: {
  children: ReactNode;
  placeholder?: string;
}) {
  const api = useShopperSearch(placeholder);
  return <SearchCtx.Provider value={api}>{children}</SearchCtx.Provider>;
}

function SearchIcon({ stroke }: { stroke: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 17, height: 17, flexShrink: 0 }}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/** Typed text takes the field ink; `--ssb-ph` drives the placeholder rule. */
function placeholderStyle(palette: ShopperSearchTheme): CSSProperties {
  return { color: palette.ink, ["--ssb-ph" as string]: palette.muted };
}

function SuggestionPanel({
  onSelect,
}: {
  onSelect?: () => void;
}) {
  const { query, results, loading } = useSearchApi();
  const trimmed = query.trim();
  if (!trimmed) return null;

  return (
    <div className="p-2">
      <p className="px-2 pb-2 text-[13px] font-semibold text-[#051b35]">
        Search results for &ldquo;{trimmed}&rdquo;
      </p>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner
            size={20}
            variant="compact"
            color={SEARCH_SPINNER_COLOR}
            label="Searching"
          />
        </div>
      ) : results.length > 0 ? (
        <SearchEventList
          events={results}
          query={trimmed}
          showSeeAll
          onSelect={onSelect}
        />
      ) : (
        <p className="px-2 py-4 text-center text-[13px] text-[#6e7180]">
          Sorry, there are no results matching your search. Please try again
        </p>
      )}
    </div>
  );
}

export type ShopperSearchTheme = {
  /** Field fill. */
  bg: string;
  /** Field border. */
  line: string;
  /** Typed text. */
  ink: string;
  /** Placeholder and icon. */
  muted: string;
};

const PLATFORM_NAV_THEME: ShopperSearchTheme = {
  bg: "rgba(255,255,255,0.10)",
  line: "rgba(158,182,216,0.22)",
  ink: "#fff",
  muted: "rgba(255,255,255,0.65)",
};

export function ShopperSearchField({
  variant = "nav",
  theme,
  iconSide = "left",
  style,
}: {
  variant?: "nav" | "shell";
  /** Colors for a tenant-branded header; defaults to the platform navy nav. */
  theme?: ShopperSearchTheme;
  iconSide?: "left" | "right";
  /** Width / flex sizing from the host header. */
  style?: CSSProperties;
}) {
  const {
    query,
    setQuery,
    open,
    setOpen,
    submit,
    clear,
    close,
    placeholder,
  } = useSearchApi();
  const rootRef = useRef<HTMLDivElement>(null);
  const isNav = variant === "nav";
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [close, setOpen]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const palette = theme || PLATFORM_NAV_THEME;
  // The platform nav lights up on focus; a tenant header keeps its own colors.
  const searchBg = theme || !open ? palette.bg : "rgba(255,255,255,0.18)";
  const searchLine = theme || !open ? palette.line : "rgba(166,231,115,0.65)";

  return (
    <div ref={rootRef} className="ssb-desktop relative w-full" style={style}>
      <form onSubmit={onSubmit}>
        {isNav ? (
          <div
            className="bt-focus-edge flex cursor-text items-center gap-2.5 rounded-full px-[18px] py-2.5 transition-colors"
            style={{ background: searchBg, border: `1px solid ${searchLine}` }}
            onClick={() => setOpen(true)}
          >
            {iconSide === "left" ? <SearchIcon stroke={palette.muted} /> : null}
            <input
              data-seamless-focus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="ssb-input min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none"
              style={placeholderStyle(palette)}
            />
            {hasQuery ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  clear();
                }}
                aria-label="Clear search"
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full p-0"
                style={{
                  background: theme ? "transparent" : "rgba(255,255,255,0.14)",
                  border: theme ? `1px solid ${palette.line}` : "none",
                  color: palette.ink,
                }}
              >
                ×
              </button>
            ) : null}
            {iconSide === "right" ? (
              <button
                type="submit"
                aria-label="Search"
                style={{ color: palette.muted, display: "inline-flex" }}
              >
                <SearchIcon stroke="currentColor" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="bt-focus-edge flex h-11 items-center gap-3 rounded-xl border border-white/15 bg-[#051B35] px-4">
            <input
              data-seamless-focus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="w-full bg-transparent text-[14px] text-white outline-none placeholder-[#7c88a3]"
            />
            <button type="submit" aria-label="Search" className="text-[#9DA2B3]">
              <SearchIcon stroke="currentColor" />
            </button>
          </div>
        )}
      </form>
      {open && hasQuery ? (
        <div
          className="absolute left-0 right-0 z-40 mt-2 max-h-[460px] overflow-y-auto rounded-[20px] border border-[rgba(5,27,53,0.10)] bg-white p-2 text-[#051b35] shadow-[0_30px_60px_-24px_rgba(3,16,31,0.6)]"
          data-testid="search-suggestions"
        >
          <SuggestionPanel onSelect={close} />
        </div>
      ) : null}
    </div>
  );
}

export function ShopperSearchMobile() {
  const {
    query,
    setQuery,
    sheetOpen,
    setSheetOpen,
    placeholder,
    submit,
    clear,
    close,
  } = useSearchApi();
  const hasQuery = query.trim().length > 0;

  return (
    <>
      <div
        className="ssb-mobile border-b border-[rgba(5,27,53,0.10)] bg-white px-5 py-3"
      >
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Open search"
          className="flex w-full cursor-text items-center gap-2.5 rounded-full border border-[rgba(5,27,53,0.10)] bg-[#f1f3f8] px-4 py-3 text-left"
        >
          <SearchIcon stroke="#6e7180" />
          <span
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[15px]"
            style={{ color: query ? "#051b35" : "#6e7180" }}
          >
            {query || placeholder}
          </span>
        </button>
      </div>
      {sheetOpen ? (
        <div
          className="ssb-sheet fixed inset-0 z-[100] flex flex-col bg-white"
          role="dialog"
          aria-label="Search"
        >
          <div className="flex shrink-0 items-center gap-3 bg-[#051b35] px-4 py-3">
            <form
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-[rgba(166,231,115,0.55)] bg-white/14 px-4 py-3"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <SearchIcon stroke="rgba(255,255,255,0.7)" />
              <input
                data-seamless-focus
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-white outline-none"
              />
              {hasQuery ? (
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Clear search"
                  className="text-white"
                >
                  ×
                </button>
              ) : null}
            </form>
            <button
              type="button"
              onClick={close}
              className="shrink-0 border-0 bg-transparent px-1 py-1.5 text-[15px] font-semibold text-white"
            >
              Cancel
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-3.5 py-2">
            <SuggestionPanel onSelect={close} />
          </div>
        </div>
      ) : null}
    </>
  );
}

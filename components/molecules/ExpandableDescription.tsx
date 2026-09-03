"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

export const DESCRIPTION_CLAMP_MOBILE_LINES = 3;
export const DESCRIPTION_CLAMP_DESKTOP_LINES = 5;

function clampStyle(maxLines: number, expanded: boolean): CSSProperties {
  if (expanded) return {};
  return {
    display: "-webkit-box",
    WebkitLineClamp: maxLines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

export default function ExpandableDescription({
  text,
  mobile,
  className = "",
  style,
  toggleColor = "#1a3a6b",
}: {
  text: string;
  /** When omitted, uses `(max-width: 767px)` to pick 3 vs 5 lines. */
  mobile?: boolean;
  className?: string;
  style?: CSSProperties;
  toggleColor?: string;
}) {
  const trimmed = text.trim();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [viewportMobile, setViewportMobile] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  const isMobile = mobile ?? viewportMobile;
  const maxLines = isMobile
    ? DESCRIPTION_CLAMP_MOBILE_LINES
    : DESCRIPTION_CLAMP_DESKTOP_LINES;

  useEffect(() => {
    if (mobile != null) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setViewportMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [mobile]);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || !trimmed) {
      setOverflows(false);
      return;
    }
    if (expanded) {
      setOverflows(true);
      return;
    }
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [trimmed, expanded, maxLines, isMobile]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [trimmed, expanded, maxLines, isMobile]);

  if (!trimmed) return null;

  const showToggle = overflows || expanded;

  return (
    <div>
      <p
        ref={bodyRef}
        className={className}
        style={{ ...style, ...clampStyle(maxLines, expanded) }}
      >
        {trimmed}
      </p>
      {showToggle ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="mt-1 font-semibold underline decoration-solid underline-offset-[3px]"
          style={{
            fontFamily: "inherit",
            fontSize: style?.fontSize ?? 14,
            color: toggleColor,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          {expanded ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  );
}

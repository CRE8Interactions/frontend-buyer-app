"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  type SeatmapMapping,
  type SeatmapSection,
  zoomableCoverPathD,
} from "@/lib/seatmapLookups";
import useSeatmapStore from "@/stores/seatmapStore";
import type { SeatmapTooltipTarget } from "./SeatmapTooltip";

function isWheelchairCompanionSection(section: SeatmapSection) {
  const compact = String(section.sectionNumber ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  return /^WC[A-Z]$/.test(compact);
}

function computeLabelLayout(
  rect: DOMRect | SVGRect | null,
  label?: string | number,
) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  const rawText = String(label ?? "").trim();
  if (!rawText) return null;
  const upper = rawText.toUpperCase();
  const isNumeric = /^\d+$/.test(upper);
  const text =
    upper.includes(" ") && rect.height >= 1.4 * rect.width
      ? upper.replace(/\s+/, "\n")
      : upper;
  const longestLine = text
    .split("\n")
    .reduce((max, line) => Math.max(max, line.length), 1);
  const maxByHeight = rect.height * (isNumeric ? 0.32 : 0.24);
  const maxByWidth = rect.width / (longestLine * 0.72);
  return {
    text,
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height * 0.5,
    fontSize: Math.max(10, Math.min(isNumeric ? 68 : 40, maxByHeight, maxByWidth * 0.95)),
  };
}

type Props = {
  data: SeatmapMapping;
  sectionCoversEnabled?: boolean;
  showCovers?: boolean;
  focusedSectionId?: string | null;
  onZoomableSectionClick?: (sectionId: string, bounds: DOMRect) => void;
  onTooltip: (target: SeatmapTooltipTarget | null, force?: boolean) => void;
  /** polished focus: the section you zoom into stays a tinted shape behind its seats and the others step back, instead of every cover going blank white */
  polish?: boolean;
  /** polished: the section under the pointer (null when it leaves), for the price tip */
  onHover?: (t: { sectionId: string; x: number; y: number } | null) => void;
};

const SeatmapSections = memo(function SeatmapSections({
  data,
  sectionCoversEnabled = false,
  showCovers = true,
  focusedSectionId = null,
  onZoomableSectionClick,
  onTooltip,
  polish = false,
  onHover,
}: Props) {
  const sectionLookupTable = useSeatmapStore((s) => s.sectionLookupTable);
  const seatLookupTable = useSeatmapStore((s) => s.seatLookupTable);
  /* polished: a section with seats but none you can buy (sold out, or held back) is drawn as a faint grey cover instead of a blue one */
  const { soldOut, few } = useMemo(() => {
    const out = new Set<string>();
    const low = new Set<string>();
    if (!polish || !data.sections) return { soldOut: out, few: low };
    for (const sec of Object.values(data.sections)) {
      const rowIds = sec.rows ?? [];
      if (!rowIds.length) continue;
      let left = 0;
      for (const rid of rowIds) for (const id of data.rows?.[rid]?.seats ?? []) if (seatLookupTable[String(id)]) left += 1;
      if (left === 0) out.add(String(sec.sectionId));
      else if (left <= 8) low.add(String(sec.sectionId));
    }
    return { soldOut: out, few: low };
  }, [polish, data.sections, data.rows, seatLookupTable]);
  /* polished: the name under the pointer is underlined (as in the player) */
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverTip = (t: { sectionId: string; x: number; y: number } | null) => { setHoverId(t ? t.sectionId : null); onHover?.(t); };
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const idRefs = useRef<Record<string, SVGPathElement | null>>({});
  /* polished: where the status dot goes, to the left of a section's drawn name (the names of most sections are artwork, not text) */
  const [dots, setDots] = useState<Record<string, { cx: number; cy: number; r: number }>>({});
  const [labels, setLabels] = useState<
    Record<string, { text: string; x: number; y: number; fontSize: number }>
  >({});

  const sectionsList = useMemo(() => {
    if (!data.sections) return [];
    const seen = new Set<string>();
    return Object.values(data.sections).filter((section) => {
      const sid = String(section.sectionId ?? "");
      if (!sid || seen.has(sid)) return false;
      seen.add(sid);
      return true;
    });
  }, [data.sections]);

  useLayoutEffect(() => {
    const next: typeof labels = {};
    sectionsList.forEach((section) => {
      const el = pathRefs.current[String(section.sectionId)];
      if (!el) return;
      const layout = computeLabelLayout(el.getBBox(), section.sectionNumber);
      if (layout) next[String(section.sectionId)] = layout;
    });
    setLabels(next);
    if (polish) {
      const d: typeof dots = {};
      for (const [sid, el] of Object.entries(idRefs.current)) {
        if (!el) continue;
        const b = el.getBBox();
        if (b.width && b.height) d[sid] = { cx: b.x - b.height * 0.32, cy: b.y + b.height / 2, r: Math.max(b.height * 0.13, 1.5) };
      }
      setDots(d);
    }
  }, [sectionsList, showCovers, focusedSectionId, sectionCoversEnabled, polish]);

  return (
    <g className="polygons">
      {sectionsList.map((section) => {
        const sid = String(section.sectionId);
        const isZoomable = Boolean(section.zoomable);

        if (isZoomable && !sectionCoversEnabled) return null;

        if (isZoomable) {
          const uncovered =
            focusedSectionId != null && focusedSectionId === sid;
          const overlayVisible = showCovers && !uncovered;
          const coverD = zoomableCoverPathD(section);
          const pathD = overlayVisible || polish ? coverD : section.path || coverD;
          const gone = soldOut.has(sid);
          const tint = gone ? "#7F8697" : section.coverFill ?? section.fill ?? "#3E8BF7";
          /* the section you are in carries no hue (it is the ground for its seats): a plain light fill and a neutral outline */
          const fill = overlayVisible
            ? tint
            : polish ? "#FFFFFF" : section.uncoveredFill ?? "#FFFFFF";
          /* a sold-out cover is drawn exactly like a sold-out general-admission area: the same grey, the same fine outline */
          const stroke = overlayVisible
            ? polish && gone ? section.stroke || "rgba(255,255,255,0.4)" : section.coverStroke ?? section.stroke ?? "rgba(255,255,255,0.95)"
            : polish ? "#8F95A3" : "rgba(0,0,0,0)";
          const strokeWidth = overlayVisible
            ? polish && gone ? Number(section.strokeWidth ?? 1) : Number(section.coverStrokeWidth ?? section.strokeWidth ?? 2)
            : polish ? 2 : 0;
          /* polished: the focused section is a soft tint under its seats, the rest step back to a quarter strength (a transition, not a cut) */
          /* neighbours keep their own colour (blue if they have seats, grey if sold out); only the focused section changes */
          const stepBack = false;

          return (
            <g key={sid} data-zoomable-section="true" data-section-root="true">
              <path
                ref={(el) => {
                  pathRefs.current[sid] = el;
                }}
                id={sid}
                d={pathD}
                stroke={stroke}
                strokeWidth={strokeWidth}
                fill={stepBack ? "#7F8697" : fill}
                fillOpacity={polish ? (uncovered ? 0.85 : gone ? 0.6 : stepBack ? 0.45 : undefined) : undefined}
                strokeOpacity={polish && uncovered ? 0.55 : undefined}
                opacity={stepBack ? 0.55 : 1}
                style={polish ? { transition: "fill 320ms cubic-bezier(0.2,0,0,1), stroke 320ms, fill-opacity 320ms cubic-bezier(0.2,0,0,1), stroke-width 320ms, stroke-opacity 320ms, opacity 260ms " } : undefined}
                className={polish ? "cursor-pointer" : "cursor-pointer"}
                onMouseEnter={polish ? (e) => hoverTip({ sectionId: sid, x: e.clientX, y: e.clientY }) : undefined}
                onMouseMove={polish ? (e) => hoverTip({ sectionId: sid, x: e.clientX, y: e.clientY }) : undefined}
                onMouseLeave={polish ? () => hoverTip(null) : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  /* the section already zoomed to: a click on it only clears the hover and any card, it does not move the view again */
                  if (polish && focusedSectionId === sid) { onTooltip(null, true); hoverTip(null); return; }
                  const el = pathRefs.current[sid];
                  if (!el || !onZoomableSectionClick) return;
                  onZoomableSectionClick(sid, el.getBBox() as unknown as DOMRect);
                }}
              />
              {section.identifier?.path && (overlayVisible || polish) ? (
                <path
                  ref={(el) => { idRefs.current[sid] = el; }}
                  d={section.identifier.path}
                  fill={section.identifier.fill || "white"}
                  opacity={(section.identifier.opacity ?? 1) * (polish && uncovered ? 0 : 1)}
                  fillRule={section.identifier.evenodd ? "evenodd" : undefined}
                  pointerEvents="none"
                  style={polish ? { transition: "opacity 260ms cubic-bezier(0.2,0,0,1)" } : undefined}
                />
              ) : null}
            </g>
          );
        }

        // GA / non-zoomable section
        const gaGroups = sectionLookupTable[sid] || [];
        const hasInventory = gaGroups.length > 0;
        const hideIdentifierArt = isWheelchairCompanionSection(section);
        return (
          <g key={sid} data-section-root="true">
            <path
              ref={(el) => {
                pathRefs.current[sid] = el;
              }}
              id={sid}
              d={section.path || ""}
              fill={polish ? (hasInventory ? section.fill || "#3E8BF7" : "#7F8697") : section.fill || (hasInventory ? "#3E8BF7" : "#9DA2B3")}
              stroke={section.stroke || "rgba(255,255,255,0.4)"}
              strokeWidth={Number(section.strokeWidth ?? 1)}
              className={hasInventory ? (polish ? "cursor-pointer" : "cursor-pointer") : undefined}
              onMouseEnter={polish ? (e) => hoverTip({ sectionId: sid, x: e.clientX, y: e.clientY }) : undefined}
              onMouseMove={polish ? (e) => hoverTip({ sectionId: sid, x: e.clientX, y: e.clientY }) : undefined}
              onMouseLeave={polish ? () => hoverTip(null) : undefined}
              opacity={polish ? 1 : hasInventory ? 1 : 0.45}
              fillOpacity={polish && !hasInventory ? 0.6 : undefined}
              style={polish ? { transition: "opacity 260ms cubic-bezier(0.2,0,0,1) " } : undefined}
              onClick={
                hasInventory
                  ? (e) => {
                      e.stopPropagation();
                      onTooltip({
                        kind: "section",
                        sectionId: sid,
                        x: e.clientX,
                        y: e.clientY,
                        pinned: true,
                      });
                    }
                  : undefined
              }
            />
            {!hideIdentifierArt && section.identifier?.path ? (
              <path
                d={section.identifier.path}
                fill={section.identifier.fill || "white"}
                opacity={section.identifier.opacity ?? 1}
                fillRule={section.identifier.evenodd ? "evenodd" : "nonzero"}
                clipRule={section.identifier.evenodd ? "evenodd" : "nonzero"}
                pointerEvents="none"
              />
            ) : null}
          </g>
        );
      })}

      {polish && hoverId && focusedSectionId == null ? (() => {
        const hs = sectionsList.find((x) => String(x.sectionId) === hoverId);
        const d = hs ? (hs.zoomable ? zoomableCoverPathD(hs) : hs.path) : null;
        return d ? (
          /* the section under the pointer: a dark wash over its own colour, so it reads as pressed-in on blue and on grey alike (no outline) */
          <path d={d} fill="#0B1220" fillOpacity={0.24} pointerEvents="none" style={{ animation: "bt-fade-in 110ms ease-out both" }} />
        ) : null;
      })() : null}

      <g className="section-number-labels" pointerEvents="none">
        {sectionsList.map((section) => {
          const sid = String(section.sectionId);
          if (isWheelchairCompanionSection(section)) return null;
          if (section.identifier?.path) return null;
          if (section.zoomable && sectionCoversEnabled) {
            const uncovered =
              focusedSectionId != null && focusedSectionId === sid;
            if (!polish && (!showCovers || uncovered)) return null;
          }
          const layout = labels[sid];
          if (!layout) return null;
          const faint = soldOut.has(sid);
          const lines = layout.text.split("\n");
          return (
            <text
              key={`label-${sid}`}
              x={layout.x}
              y={layout.y}
              fill="white"
              opacity={polish && section.zoomable && focusedSectionId === sid ? 0 : polish && faint ? 0.75 : 1}
              style={polish ? { transition: "opacity 260ms cubic-bezier(0.2,0,0,1)" } : undefined}
              fontSize={layout.fontSize}
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
              textDecoration={polish && hoverId === sid ? "underline" : undefined}
            >
              {lines.map((line, index) => (
                <tspan
                  key={`${line}-${index}`}
                  x={layout.x}
                  dy={index === 0 ? 0 : layout.fontSize * 0.9}
                >
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </g>
    </g>
  );
});

export default SeatmapSections;

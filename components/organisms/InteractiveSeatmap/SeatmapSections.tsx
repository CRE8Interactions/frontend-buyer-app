"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createSectionInventoryTable,
  type SeatmapMapping,
  type SeatmapSection,
  zoomableCoverPathD,
} from "@/lib/seatmapLookups";
import useSeatmapStore from "@/stores/seatmapStore";
import type { SeatmapTooltipTarget } from "./SeatmapTooltip";

const AVAILABLE_FILL = "#3E8BF7";
const UNAVAILABLE_FILL = "#9DA2B3";

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
  onTooltip: (target: SeatmapTooltipTarget | null) => void;
};

const SeatmapSections = memo(function SeatmapSections({
  data,
  sectionCoversEnabled = false,
  showCovers = true,
  focusedSectionId = null,
  onZoomableSectionClick,
  onTooltip,
}: Props) {
  const sectionLookupTable = useSeatmapStore((s) => s.sectionLookupTable);
  const seatLookupTable = useSeatmapStore((s) => s.seatLookupTable);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
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

  const sectionInventory = useMemo(
    () => createSectionInventoryTable(data, sectionLookupTable, seatLookupTable),
    [data, sectionLookupTable, seatLookupTable],
  );

  useLayoutEffect(() => {
    const next: typeof labels = {};
    sectionsList.forEach((section) => {
      const el = pathRefs.current[String(section.sectionId)];
      if (!el) return;
      const layout = computeLabelLayout(el.getBBox(), section.sectionNumber);
      if (layout) next[String(section.sectionId)] = layout;
    });
    setLabels(next);
  }, [sectionsList, showCovers, focusedSectionId, sectionCoversEnabled]);

  return (
    <g className="polygons">
      {sectionsList.map((section) => {
        const sid = String(section.sectionId);
        const isZoomable = Boolean(section.zoomable);
        const hasInventory = sectionInventory[sid] ?? false;

        if (isZoomable && !sectionCoversEnabled) return null;

        if (isZoomable) {
          const uncovered =
            focusedSectionId != null && focusedSectionId === sid;
          const overlayVisible = showCovers && !uncovered;
          const coverD = zoomableCoverPathD(section);
          const pathD = overlayVisible ? coverD : section.path || coverD;
          const coverFill = hasInventory
            ? section.coverFill ?? section.fill ?? AVAILABLE_FILL
            : UNAVAILABLE_FILL;
          const fill = overlayVisible
            ? coverFill
            : section.uncoveredFill ?? "#FFFFFF";
          const stroke = overlayVisible
            ? section.coverStroke ?? section.stroke ?? "rgba(255,255,255,0.95)"
            : "rgba(0,0,0,0)";
          const strokeWidth = overlayVisible
            ? Number(section.coverStrokeWidth ?? section.strokeWidth ?? 2)
            : 0;

          return (
            <g key={sid} data-zoomable-section="true" data-section-root="true">
              <path
                ref={(el) => {
                  pathRefs.current[sid] = el;
                }}
                id={sid}
                d={pathD}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={overlayVisible && !hasInventory ? 0.45 : 1}
                className={overlayVisible ? "cursor-pointer" : undefined}
                pointerEvents={overlayVisible ? "auto" : "none"}
                onClick={(e) => {
                  e.stopPropagation();
                  const el = pathRefs.current[sid];
                  if (!el || !onZoomableSectionClick) return;
                  onZoomableSectionClick(sid, el.getBBox() as unknown as DOMRect);
                }}
                onTouchEnd={(e) => {
                  if (!overlayVisible) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const el = pathRefs.current[sid];
                  if (!el || !onZoomableSectionClick) return;
                  onZoomableSectionClick(sid, el.getBBox() as unknown as DOMRect);
                }}
              />
              {section.identifier?.path && overlayVisible ? (
                <path
                  d={section.identifier.path}
                  fill={section.identifier.fill || "white"}
                  opacity={section.identifier.opacity ?? 1}
                  fillRule={section.identifier.evenodd ? "evenodd" : undefined}
                  pointerEvents="none"
                />
              ) : null}
            </g>
          );
        }

        // GA / non-zoomable section. Only GA groups drive the section tooltip;
        // seated inventory here is reachable through its seats instead.
        const gaGroups = sectionLookupTable[sid] || [];
        const hideIdentifierArt = isWheelchairCompanionSection(section);
        return (
          <g key={sid} data-section-root="true">
            <path
              ref={(el) => {
                pathRefs.current[sid] = el;
              }}
              id={sid}
              d={section.path || ""}
              fill={
                hasInventory
                  ? section.fill || AVAILABLE_FILL
                  : UNAVAILABLE_FILL
              }
              stroke={section.stroke || "rgba(255,255,255,0.4)"}
              strokeWidth={Number(section.strokeWidth ?? 1)}
              className={gaGroups.length > 0 ? "cursor-pointer" : undefined}
              opacity={hasInventory ? 1 : 0.45}
              onClick={
                gaGroups.length > 0
                  ? (e) => {
                      e.stopPropagation();
                      onTooltip({
                        kind: "section",
                        sectionId: sid,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }
                  : undefined
              }
              onTouchEnd={
                gaGroups.length > 0
                  ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const touch = e.changedTouches[0];
                      onTooltip({
                        kind: "section",
                        sectionId: sid,
                        x: touch?.clientX ?? 0,
                        y: touch?.clientY ?? 0,
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

      <g className="section-number-labels" pointerEvents="none">
        {sectionsList.map((section) => {
          const sid = String(section.sectionId);
          if (isWheelchairCompanionSection(section)) return null;
          if (section.identifier?.path) return null;
          if (section.zoomable && sectionCoversEnabled) {
            const uncovered =
              focusedSectionId != null && focusedSectionId === sid;
            if (!showCovers || uncovered) return null;
          }
          const layout = labels[sid];
          if (!layout) return null;
          const lines = layout.text.split("\n");
          return (
            <text
              key={`label-${sid}`}
              x={layout.x}
              y={layout.y}
              fill="white"
              fontSize={layout.fontSize}
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
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

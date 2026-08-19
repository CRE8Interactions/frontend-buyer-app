/** BlockMarker — the green square block motif (brand mark, allowed green). */
export default function BlockMarker({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const dims = size === "sm" ? "h-3 w-3 rounded-[3.5px]" : "h-3.5 w-3.5 rounded-[4px]";
  return <span className={`inline-block shrink-0 bg-[#a6e773] ${dims} ${className}`} />;
}

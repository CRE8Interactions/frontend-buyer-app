import Spinner from "@/components/atoms/Spinner";

/** Centered branded loading state for page-level fetches and route transitions. */
export default function PageLoader({
  message,
  label = "Loading",
  className = "",
  size = 96,
}: {
  message?: string;
  label?: string;
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`flex min-h-[50vh] flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <Spinner size={size} variant="assemble" label={label} />
      {message ? (
        <p className="text-[14px] text-[#9DA2B3]">{message}</p>
      ) : null}
    </div>
  );
}

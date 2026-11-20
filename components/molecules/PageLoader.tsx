import LoaderQuip from "@/components/atoms/LoaderQuip";
import LottieLoader from "@/components/atoms/LottieLoader";

/** Centered branded loading state for page-level fetches and route transitions. */
export default function PageLoader({
  message,
  label = "Loading",
  className = "",
  size = 180,
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
      <LottieLoader size={size} label={label} />
      <LoaderQuip className="text-[15px] font-medium text-foreground" />
      {message ? (
        <p className="text-[13px] text-ink2">{message}</p>
      ) : null}
    </div>
  );
}

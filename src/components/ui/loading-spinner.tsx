import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const sizeClass = {
  sm: "h-5 w-5 border-2",
  md: "h-9 w-9 border-2",
  lg: "h-12 w-12 border-[3px]",
} as const;

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  return (
    <div
      className={cn("inline-flex flex-col items-center justify-center gap-2", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          "loading-spin animate-spin rounded-full border-sky-500/25 border-t-sky-400",
          sizeClass[size],
        )}
        aria-hidden
      />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}

type LoadingPanelProps = {
  label?: string;
  compact?: boolean;
  timedOut?: boolean;
  timeoutMessage?: string;
  onRetry?: () => void;
  className?: string;
};

export function LoadingPanel({
  label = "Loading…",
  compact = false,
  timedOut = false,
  timeoutMessage = "This is taking longer than usual. The server may be slow or offline.",
  onRetry,
  className,
}: LoadingPanelProps) {
  if (timedOut) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 text-center",
          compact ? "px-4 py-6" : "min-h-[28vh] px-4 py-10",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-muted-foreground max-w-md">{timeoutMessage}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        compact ? "px-4 py-6" : "min-h-[28vh] px-4 py-10",
        className,
      )}
    >
      <LoadingSpinner size={compact ? "sm" : "md"} label={label} />
    </div>
  );
}

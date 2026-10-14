import { LoadingPanel } from "@/components/ui/loading-spinner";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { cn } from "@/lib/utils";

type PageLoaderProps = {
  label?: string;
  /** Compact spinner for in-layout route transitions (dashboard). */
  compact?: boolean;
  className?: string;
  onRetry?: () => void;
};

export function PageLoader({ label = "Loading…", compact = false, className, onRetry }: PageLoaderProps) {
  const timedOut = useLoadingTimeout(true, 15_000);

  return (
    <LoadingPanel
      label={label}
      compact={compact}
      timedOut={timedOut}
      onRetry={onRetry}
      className={cn(className)}
    />
  );
}

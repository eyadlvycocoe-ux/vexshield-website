import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function RouteErrorFallback({
  title = "Page failed to load",
  message = "A script or request may have been blocked by your browser (Brave Shields, uBlock, etc.). Try disabling shields for this site, then reload.",
  onRetry,
}: Props) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="max-w-md text-sm text-slate-400">{message}</p>
      <Button
        type="button"
        onClick={() => (onRetry ? onRetry() : window.location.reload())}
      >
        Reload page
      </Button>
    </div>
  );
}

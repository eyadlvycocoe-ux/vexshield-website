import { Component, type ErrorInfo, type ReactNode } from "react";
import { RouteErrorFallback } from "@/components/RouteErrorFallback";

type Props = { children: ReactNode };

type State = { error: Error | null };

function cacheBustingReload() {
  // Clear service-worker caches so fresh HTML (with correct chunk refs) is fetched.
  if ("caches" in window) {
    caches.keys().then((names) => names.forEach((n) => caches.delete(n))).catch(() => {});
  }
  // Append a timestamp to bypass the browser's in-memory cache.
  const url = new URL(window.location.href);
  url.searchParams.set("t", Date.now().toString(36));
  window.location.href = url.toString();
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RouteErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || "";
      const blocked =
        /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror/i.test(
          msg,
        );
      return (
        <RouteErrorFallback
          title={blocked ? "Content blocked" : "Something went wrong"}
          message={
            blocked
              ? "Your browser blocked part of this site (common with Brave Shields or ad blockers). Allow scripts for aircore.xyz, then reload."
              : "An unexpected error occurred while loading this page."
          }
          onRetry={() => {
            this.setState({ error: null });
            cacheBustingReload();
          }}
        />
      );
    }
    return this.props.children;
  }
}

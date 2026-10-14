import { useLocation } from "react-router-dom";

export function isDemoPathname(pathname: string | null | undefined): boolean {
  const p = (pathname || "").trim();
  return p === "/demo" || p.startsWith("/demo/");
}

/** True when the current route is under `/demo/*`. */
export function useIsDemoMode(): boolean {
  const location = useLocation();
  return isDemoPathname(location.pathname);
}


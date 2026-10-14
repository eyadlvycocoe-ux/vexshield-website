import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Lazy import with retries — recovers from transient network failures and
 * handles newly deployed asset chunk hashes by auto-reloading if a 404 occurs.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const component = await factory();
        sessionStorage.removeItem("chunk_reload_attempts");
        return component;
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
        }
      }
    }

    const errStr = String(lastError || "");
    const isChunkError =
      errStr.includes("Failed to fetch dynamically imported module") ||
      errStr.includes("Importing a module script failed") ||
      errStr.includes("chunk") ||
      errStr.includes("404");

    if (isChunkError) {
      const reloadCount = Number(sessionStorage.getItem("chunk_reload_attempts") || 0);
      if (reloadCount < 2) {
        sessionStorage.setItem("chunk_reload_attempts", String(reloadCount + 1));
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
    }

    throw lastError;
  });
}

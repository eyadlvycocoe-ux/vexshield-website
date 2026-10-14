import { apiMutationHeaders, apiUrl, ensureCsrfCookie } from "@/lib/api-base";

/** Increment the public load counter when a shared config is imported (non-blocking). */
export async function recordSharedConfigLoad(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  try {
    await ensureCsrfCookie();
    await fetch(apiUrl("/api/shared-configs/record-load"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...apiMutationHeaders(),
      },
      body: JSON.stringify({ code: normalized }),
    });
  } catch {
    /* counter is best-effort */
  }
}

/**
 * Client-side lookup credit system.
 * 2 free lookups per 10 minutes, stored in localStorage.
 * No backend token system — purely client-side rate limiting.
 */

const STORAGE_KEY = "airshield_lookup_credits";
const MAX_CREDITS = 2;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface CreditRecord {
  timestamps: number[];
}

function read(): CreditRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { timestamps: [] };
    const parsed = JSON.parse(raw) as CreditRecord;
    if (!Array.isArray(parsed.timestamps)) return { timestamps: [] };
    return parsed;
  } catch {
    return { timestamps: [] };
  }
}

function write(data: CreditRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Remove timestamps outside the 10-minute window. */
function prune(timestamps: number[]): number[] {
  const cutoff = Date.now() - WINDOW_MS;
  return timestamps.filter((t) => t > cutoff);
}

/** Get the number of remaining free lookups. */
export function getRemainingCredits(): number {
  const active = prune(read().timestamps);
  return Math.max(0, MAX_CREDITS - active.length);
}

/** Get seconds until the next credit refreshes (or 0 if credits are available). */
export function getSecondsUntilRefresh(): number {
  const active = prune(read().timestamps);
  if (active.length === 0) return 0;
  const oldest = Math.min(...active);
  const remaining = Math.max(0, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000));
  return remaining;
}

/** Consume one credit. Returns true if successful, false if no credits left. */
export function consumeCredit(): boolean {
  const record = read();
  record.timestamps = prune(record.timestamps);
  if (record.timestamps.length >= MAX_CREDITS) return false;
  record.timestamps.push(Date.now());
  write(record);
  return true;
}

/** Get the full credit state for UI display. */
export function getCreditState() {
  const active = prune(read().timestamps);
  const remaining = Math.max(0, MAX_CREDITS - active.length);
  const oldest = active.length > 0 ? Math.min(...active) : 0;
  const secondsUntilRefresh = oldest > 0
    ? Math.max(0, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000))
    : 0;
  return { remaining, total: MAX_CREDITS, secondsUntilRefresh };
}

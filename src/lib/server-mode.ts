import type { ConnectedServerSession } from "@/lib/connected-server";
import { readConnectedServer } from "@/lib/connected-server";

export function entFlag(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  const n = Number(v);
  return !Number.isNaN(n) ? n !== 0 : !!v;
}

export function isPcCheckerOnlyMode(_session?: ConnectedServerSession | null): boolean {
  return false;
}

export function isPageAllowedForPcCheckerOnly(_page: string): boolean {
  return true;
}

export function defaultPathForServer(_session?: ConnectedServerSession | null): string {
  return "dashboard";
}

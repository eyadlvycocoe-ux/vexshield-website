/**
 * Dashboard permission keys stored in server_admins.permissions (jsonb array).
 * Use `page` for full access, or `page:view` / `page:edit` for split access.
 */
export type AdminPermissionDefinition = {
  id: string;
  label: string;
  description: string;
  group: "core" | "moderation" | "management" | "support";
};

export const ADMIN_PERMISSION_DEFINITIONS: AdminPermissionDefinition[] = [
  { id: "all", label: "Full access", description: "All pages and actions", group: "core" },
  { id: "dashboard", label: "Dashboard", description: "Overview & download", group: "core" },
  { id: "users", label: "Users", description: "User search, analytics & list", group: "core" },
  { id: "players", label: "Players", description: "Player list & actions", group: "moderation" },
  { id: "map", label: "Map", description: "Live map", group: "moderation" },
  { id: "search", label: "Search", description: "Search players & data", group: "moderation" },
  { id: "warns", label: "Warns", description: "Warnings (full)", group: "moderation" },
  { id: "warns:view", label: "Warns - view", description: "View warnings only", group: "moderation" },
  { id: "warns:edit", label: "Warns - manage", description: "Create / edit warnings", group: "moderation" },
  { id: "kicks", label: "Kicks", description: "Kicks (full)", group: "moderation" },
  { id: "kicks:view", label: "Kicks - view", description: "View kick history", group: "moderation" },
  { id: "kicks:edit", label: "Kicks - manage", description: "Perform kicks", group: "moderation" },
  { id: "bans", label: "Bans", description: "Bans (full)", group: "moderation" },
  { id: "bans:view", label: "Bans - view", description: "View ban list only", group: "moderation" },
  { id: "bans:edit", label: "Bans - manage", description: "Create / remove bans", group: "moderation" },
  { id: "blacklist-detections", label: "Blacklist detections", description: "Anticheat detections", group: "moderation" },
  { id: "servers", label: "Servers", description: "Server health & anticheat panel", group: "management" },
  { id: "console", label: "Console", description: "Server console", group: "management" },
  { id: "live-view", label: "Live View", description: "Live camera view", group: "moderation" },
  { id: "resources", label: "Resources", description: "Resource management", group: "management" },
  { id: "admins", label: "Admins", description: "Admin list (full)", group: "management" },
  { id: "admins:view", label: "Admins - view", description: "View admin list", group: "management" },
  { id: "admins:edit", label: "Admins - manage", description: "Add / remove / edit admins", group: "management" },
  { id: "activity", label: "Activity log", description: "Audit log", group: "management" },
  { id: "settings", label: "Settings", description: "Server settings (full)", group: "management" },
  { id: "settings:view", label: "Settings - view", description: "View settings", group: "management" },
  { id: "settings:edit", label: "Settings - edit", description: "Change settings", group: "management" },
];

const PERMISSION_ORDER = new Map(ADMIN_PERMISSION_DEFINITIONS.map((permission, index) => [permission.id, index]));
const PERMISSION_LABELS = new Map(ADMIN_PERMISSION_DEFINITIONS.map((permission) => [permission.id, permission.label]));

function permissionBase(permissionId: string): string {
  return permissionId.split(":")[0];
}

function isSplitPermission(permissionId: string): boolean {
  return permissionId.endsWith(":view") || permissionId.endsWith(":edit");
}

export function normalizeAdminPermissions(permissions: string[]): string[] {
  const unique = Array.from(new Set(permissions.map((p) => p.trim()).filter(Boolean)));
  if (unique.includes("all")) return ["all"];

  const fullPagePermissions = new Set(unique.filter((p) => !isSplitPermission(p)).map(permissionBase));
  return unique
    .filter((permission) => !(isSplitPermission(permission) && fullPagePermissions.has(permissionBase(permission))))
    .sort((a, b) => {
      const aOrder = PERMISSION_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = PERMISSION_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
      return aOrder === bOrder ? a.localeCompare(b) : aOrder - bOrder;
    });
}

export function toggleAdminPermissionSelection(
  currentPermissions: string[],
  permissionId: string,
  checked: boolean,
): string[] {
  if (permissionId === "all") return checked ? ["all"] : [];

  const targetBase = permissionBase(permissionId);
  const targetIsSplit = isSplitPermission(permissionId);
  const next = currentPermissions
    .filter((p) => p !== "all")
    .filter((p) => p !== permissionId)
    .filter((p) => {
      if (!checked) return true;
      if (!targetIsSplit) return permissionBase(p) !== targetBase;
      return p !== targetBase;
    });

  if (checked) next.push(permissionId);
  return normalizeAdminPermissions(next);
}

export function getAdminPermissionLabel(permissionId: string): string {
  return PERMISSION_LABELS.get(permissionId) ?? permissionId;
}

/** Permissions an owner may grant to support staff (never full `all`). */
export const SUPPORT_GRANTABLE_PERMISSION_IDS = new Set(
  ADMIN_PERMISSION_DEFINITIONS.filter((p) => p.id !== "all").map((p) => p.id),
);

/** Page key used in routes / sidebar (before :view / :edit suffix). */
export type PageKey =
  | "dashboard"
  | "users"
  | "players"
  | "map"
  | "search"
  | "live-view"
  | "warns"
  | "kicks"
  | "bans"
  | "blacklist-detections"
  | "servers"
  | "console"
  | "resources"
  | "admins"
  | "activity"
  | "settings";

export function hasPageAccess(permissions: string[], page: PageKey | string): boolean {
  if (permissions.includes("all")) return true;
  if (permissions.includes(page)) return true;
  if (permissions.includes(`${page}:view`)) return true;
  if (permissions.includes(`${page}:edit`)) return true;
  return false;
}

/** Whether the user may perform mutating actions on a page (not read-only). */
export function canEditPage(permissions: string[], page: PageKey | string): boolean {
  if (permissions.includes("all")) return true;
  if (permissions.includes(page)) return true;
  if (permissions.includes(`${page}:edit`)) return true;
  return false;
}

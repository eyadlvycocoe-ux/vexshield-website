/**
 * VexShield Single Source of Truth Role & Permission Configuration
 * Ascending Level Hierarchy: 0 (Member) -> 9 (Head Management / Owner)
 */

export interface RoleLevelDefinition {
  level: number;
  id: string;
  label: string;
  badgeColor: string;
}

export const ROLE_LEVELS: RoleLevelDefinition[] = [
  { level: 0, id: 'member', label: 'Member', badgeColor: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  { level: 1, id: 'trial_support', label: 'Trial Support', badgeColor: 'bg-amber-600/20 text-amber-400 border-amber-600/30' },
  { level: 2, id: 'support', label: 'Support', badgeColor: 'bg-sky-400/20 text-sky-400 border-sky-400/30' },
  { level: 3, id: 'head_support', label: 'Head Support', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { level: 4, id: 'moderator', label: 'Moderator', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { level: 5, id: 'head_moderator', label: 'Head Moderator', badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-500/40' },
  { level: 6, id: 'admin', label: 'Admin', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { level: 7, id: 'head_admin', label: 'Head Admin', badgeColor: 'bg-red-600/20 text-red-300 border-red-500/40' },
  { level: 8, id: 'management', label: 'Management', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { level: 9, id: 'head_management', label: 'Head Management (Owner)', badgeColor: 'bg-blue-600/25 text-blue-200 border-blue-500/40' },
];

export interface CapabilityDefinition {
  id: string;
  label: string;
  viewLevels: number[];
  fullLevels: number[];
}

export const CAPABILITIES: Record<string, CapabilityDefinition> = {
  manage_products: {
    id: 'manage_products',
    label: 'Server Management (Manage Products)',
    viewLevels: [3, 4, 5, 6, 7, 8, 9],
    fullLevels: [6, 7, 8, 9],
  },
  manage_orders: {
    id: 'manage_orders',
    label: 'Customer Orders (Manage Orders)',
    viewLevels: [2, 3, 4, 5, 6, 7, 8, 9],
    fullLevels: [5, 6, 7, 8, 9],
  },
  manage_users: {
    id: 'manage_users',
    label: 'User Accounts (Manage Users)',
    viewLevels: [4, 5, 6, 7, 8, 9],
    fullLevels: [8, 9],
  },
  funds: {
    id: 'funds',
    label: 'Wallet Edits (User Funds)',
    viewLevels: [9],
    fullLevels: [9],
  },
  support_logs: {
    id: 'support_logs',
    label: 'Support Staff & Logs',
    viewLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    fullLevels: [3, 4, 5, 6, 7, 8, 9],
  },
  manage_blacklist: {
    id: 'manage_blacklist',
    label: 'Blocked Servers (Manage Blacklist)',
    viewLevels: [2, 3, 4, 5, 6, 7, 8, 9],
    fullLevels: [4, 5, 6, 7, 8, 9],
  },
  pcchecker_blacklist: {
    id: 'pcchecker_blacklist',
    label: 'PC Checker Blacklist',
    viewLevels: [2, 3, 4, 5, 6, 7, 8, 9],
    fullLevels: [5, 6, 7, 8, 9],
  },
  restricted_users: {
    id: 'restricted_users',
    label: 'Restricted Users',
    viewLevels: [2, 3, 4, 5, 6, 7, 8, 9],
    fullLevels: [6, 7, 8, 9],
  },
  redeem_codes: {
    id: 'redeem_codes',
    label: 'Redeem Codes',
    viewLevels: [7, 8, 9],
    fullLevels: [8, 9],
  },
  coupon_codes: {
    id: 'coupon_codes',
    label: 'Coupon Codes',
    viewLevels: [7, 8, 9],
    fullLevels: [8, 9],
  },
  promotions: {
    id: 'promotions',
    label: 'Promotions',
    viewLevels: [5, 6, 7, 8, 9],
    fullLevels: [7, 8, 9],
  },
  activity_log: {
    id: 'activity_log',
    label: 'Activity Log',
    viewLevels: [3, 4, 5, 6, 7, 8, 9],
    fullLevels: [8, 9],
  },
  db_backups: {
    id: 'db_backups',
    label: 'Database Backups',
    viewLevels: [8, 9],
    fullLevels: [9],
  },
  settings: {
    id: 'settings',
    label: 'Global Settings',
    viewLevels: [8, 9],
    fullLevels: [9],
  },
  anticheat_files: {
    id: 'anticheat_files',
    label: 'Anticheat File Management',
    viewLevels: [6, 7, 8, 9],
    fullLevels: [7, 8, 9],
  },
  broadcast: {
    id: 'broadcast',
    label: 'Broadcast Notification',
    viewLevels: [7, 8, 9],
    fullLevels: [7, 8, 9],
  },
  grant_admin_levels: {
    id: 'grant_admin_levels',
    label: 'Grant/revoke admin levels',
    viewLevels: [8, 9],
    fullLevels: [8, 9],
  },
  server_ip_reset: {
    id: 'server_ip_reset',
    label: 'Server IP reset',
    viewLevels: [2, 3, 6, 7, 8, 9],
    fullLevels: [2, 3, 6, 7, 8, 9],
  },
  pricing: {
    id: 'pricing',
    label: 'Shop Pricing Matrix',
    viewLevels: [9],
    fullLevels: [9],
  },
};

export function getRoleByLevel(level: number | null | undefined): RoleLevelDefinition {
  const lvlNum = typeof level === 'number' ? level : 0;
  return ROLE_LEVELS.find((r) => r.level === lvlNum) || ROLE_LEVELS[0];
}

export function hasCapabilityAccess(level: number | null | undefined, capabilityKey: string, mode: 'view' | 'full' = 'view'): boolean {
  const lvlNum = typeof level === 'number' ? level : 0;
  const cap = CAPABILITIES[capabilityKey];
  if (!cap) return false;
  const allowed = mode === 'full' ? cap.fullLevels : cap.viewLevels;
  return allowed.includes(lvlNum);
}

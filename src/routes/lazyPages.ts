import { lazyWithRetry } from "@/lib/lazy-with-retry";

/** Public & marketing - Home is lazy-loaded in App.tsx (separate chunk). */
export const Pricing = lazyWithRetry(() => import("@/pages/Pricing"));
export const PlanDetails = lazyWithRetry(() => import("@/pages/PlanDetails"));
export const Terms = lazyWithRetry(() => import("@/pages/Terms"));
export const Privacy = lazyWithRetry(() => import("@/pages/Privacy"));
export const Refund = lazyWithRetry(() => import("@/pages/Refund"));
export const FAQs = lazyWithRetry(() => import("@/pages/FAQs"));
export const Partners = lazyWithRetry(() => import("@/pages/Partners"));
export const Documentation = lazyWithRetry(() => import("@/pages/Documentation"));
export const Support = lazyWithRetry(() => import("@/pages/Support"));
export const StaffPanel = lazyWithRetry(() => import("@/pages/StaffPanel"));

/** About & Contact Pages */
export const AboutPage = lazyWithRetry(() => import("@/pages/AboutPage"));
export const ContactPage = lazyWithRetry(() => import("@/pages/ContactPage"));

/** Auth & account */
export const Auth = lazyWithRetry(() => import("@/pages/Auth"));
export const MfaVerify = lazyWithRetry(() => import("@/pages/MfaVerify"));
export const ResetPassword = lazyWithRetry(() => import("@/pages/ResetPassword"));
export const ProfileSettings = lazyWithRetry(() => import("@/pages/ProfileSettings"));
export const MyServers = lazyWithRetry(() => import("@/pages/MyServers"));

/** Admin */
export const AdminLogin = lazyWithRetry(() => import("@/pages/AdminLogin"));
export const Admin2faVerify = lazyWithRetry(() => import("@/pages/Admin2faVerify"));
export const Support2faVerify = lazyWithRetry(() => import("@/pages/Support2faVerify"));
export const AdminDashboard = lazyWithRetry(() => import("@/pages/AdminDashboard"));
export const AdminProducts = lazyWithRetry(() => import("@/pages/AdminProducts"));
export const AdminServers = lazyWithRetry(() => import("@/pages/AdminServers"));
export const AdminBlacklistedServers = lazyWithRetry(() => import("@/pages/AdminBlacklistedServers"));
export const AdminBlockedUsers = lazyWithRetry(() => import("@/pages/AdminBlockedUsers"));
export const AdminUsers = lazyWithRetry(() => import("@/pages/AdminUsers"));
export const AdminGlobalBans = lazyWithRetry(() => import("@/pages/AdminGlobalBans"));
export const AdminRedeemCodes = lazyWithRetry(() => import("@/pages/AdminRedeemCodes"));
export const AdminCouponCodes = lazyWithRetry(() => import("@/pages/AdminCouponCodes"));
export const AdminPromotions = lazyWithRetry(() => import("@/pages/AdminPromotions"));
export const AdminAirEye = lazyWithRetry(() => import("@/pages/AdminAirEye"));
export const AdminActivityLog = lazyWithRetry(() => import("@/pages/AdminActivityLog"));
export const AdminBackups = lazyWithRetry(() => import("@/pages/AdminBackups"));
export const AdminSharedConfigs = lazyWithRetry(() => import("@/pages/AdminSharedConfigs"));
export const AdminTickets = lazyWithRetry(() => import("@/pages/AdminTickets"));
export const AdminOrders = lazyWithRetry(() => import("@/pages/AdminOrders"));
export const AdminBanRemovalRequests = lazyWithRetry(() => import("@/pages/AdminBanRemovalRequests"));

/** Server dashboard shell */
export const ServerLayout = lazyWithRetry(() => import("@/pages/ServerLayout"));

/** Shared dashboard pages (server + demo routes) */
export const Search = lazyWithRetry(() => import("@/pages/Search"));
export const Demo = lazyWithRetry(() => import("@/pages/Demo"));
export const ServerAnalyticsPage = lazyWithRetry(() => import("@/pages/Analytics"));
export const Dashboard = lazyWithRetry(() => import("@/pages/Dashboard"));
export const Players = lazyWithRetry(() => import("@/pages/Players"));
export const ServerPlayers = lazyWithRetry(() => import("@/pages/ServerPlayers"));
export const ServerDashboard = lazyWithRetry(() => import("@/pages/ServerDashboard"));
export const Vehicles = lazyWithRetry(() => import("@/pages/Vehicles"));
export const Activity = lazyWithRetry(() => import("@/pages/Activity"));
export const DashboardSupport = lazyWithRetry(() => import("@/pages/DashboardSupport"));
export const Settings = lazyWithRetry(() => import("@/pages/Settings"));
export const ConfigLibrary = lazyWithRetry(() => import("@/pages/ConfigLibrary"));
export const Bans = lazyWithRetry(() => import("@/pages/Bans"));
export const BanHistory = lazyWithRetry(() => import("@/pages/BanHistory"));
export const Logs = lazyWithRetry(() => import("@/pages/Logs"));
export const Console = lazyWithRetry(() => import("@/pages/Console"));
export const ServerConsole = lazyWithRetry(() => import("@/pages/ServerConsole"));
export const Resources = lazyWithRetry(() => import("@/pages/Resources"));
export const Admins = lazyWithRetry(() => import("@/pages/Admins"));
export const WhitelistAdmin = lazyWithRetry(() =>
  import("@/pages/Admins").then((m) => ({ default: m.WhitelistAdmin })),
);
export const DownloadPage = lazyWithRetry(() => import("@/pages/DownloadPage"));
export const Map = lazyWithRetry(() => import("@/pages/Map"));
export const ServerMonitoring = lazyWithRetry(() => import("@/pages/ServerMonitoring"));
export const BlacklistDetections = lazyWithRetry(() => import("@/pages/BlacklistDetections"));
export const UsersSearch = lazyWithRetry(() => import("@/pages/Search"));
export const UsersGraph = lazyWithRetry(() => import("@/pages/UsersGraph"));
export const UsersList = lazyWithRetry(() => import("@/pages/UsersList"));
export const ServerPanel = lazyWithRetry(() => import("@/pages/ServerPanel"));
export const Models = lazyWithRetry(() => import("@/pages/Models"));
export const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));
import { NavLink, useLocation, useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  AnimatedLayoutGrid,
  AnimatedActivity,
  AnimatedPackage,
  AnimatedSearch,
  AnimatedShield,
  AnimatedServer,
  AnimatedFolderCog,
  AnimatedUsers,
  AnimatedHome,
  AnimatedBell,
  AnimatedClock,
  AnimatedTerminal,
  AnimatedWifi,
  AnimatedKey,
  AnimatedChevronRight,
  AnimatedHelpCircle,
  AnimatedBan,
  AnimatedFolder,
  AnimatedSliders,
} from "@/components/animate-icons";
import {
  HelpCircle,
  ChevronRight,
  ChevronsUpDown,
  Home,
  Key,
  LogOut,
  Shield,
  Server,
  FolderCog,
  LayoutDashboard,
  ChartLine,
  Download,
  Users,
  Search,
  MapPin,
  Cctv,
  Gavel,
  Fingerprint,
  Terminal,
  Layers,
  UserRound,
  BadgeCheck,
  ClipboardList,
  Settings,
  Gauge,
  BookOpen,
  Package,
  Bot,
  Headphones,
  ShieldAlert,
} from "lucide-react";
import { RedeemKeyModal } from "@/components/RedeemKeyModal";
import { AnimateIcon, type IconProps } from "@/components/AnimateIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useAdminPermissions, hasPermission, type Permission } from "@/hooks/useAdminPermissions";
import { UserAvatar } from "./UserAvatar";
import { NotificationBell } from "./NotificationBell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useIsDemoMode } from "@/demo/demoMode";
import { dashboardPathSegment, prefetchDashboardPage } from "@/lib/prefetch-dashboard-pages";
import { readConnectedServer } from "@/lib/connected-server";
import { getAuthUserName } from "@/lib/discord-avatar";

const BRAND_LOGO = "/logo.png";

type AnimatedIcon = React.ComponentType<IconProps<string>>;

interface MenuItem {
  titleKey: string;
  url: string;
  icon: AnimatedIcon;
  permission: Permission;
  licenseOwnerOnly?: boolean;
}

const dashboardItems = (baseUrl: string): MenuItem[] => [
  { titleKey: "sidebar.dashboard", url: `${baseUrl}/dashboard`, icon: AnimatedLayoutGrid as unknown as AnimatedIcon, permission: "dashboard" },
  { titleKey: "sidebar.models", url: `${baseUrl}/models`, icon: AnimatedPackage as unknown as AnimatedIcon, permission: "settings" },
];



const moderationItems = (baseUrl: string): MenuItem[] => [
  { titleKey: "sidebar.players", url: `${baseUrl}/players`, icon: AnimatedUsers as unknown as AnimatedIcon, permission: "players" },
  { titleKey: "sidebar.map", url: `${baseUrl}/map`, icon: MapPin as unknown as AnimatedIcon, permission: "map" },
  { titleKey: "sidebar.liveView", url: `${baseUrl}/live-view`, icon: Cctv as unknown as AnimatedIcon, permission: "live-view" },
  { titleKey: "sidebar.bans", url: `${baseUrl}/bans`, icon: AnimatedBan as unknown as AnimatedIcon, permission: "bans" },
];

const serversItems = (baseUrl: string): MenuItem[] => [
  { titleKey: "sidebar.serverPanel", url: `${baseUrl}/server-panel`, icon: AnimatedSliders as unknown as AnimatedIcon, permission: "servers" },
];

const managementItems = (baseUrl: string): MenuItem[] => [
  { titleKey: "sidebar.resources", url: `${baseUrl}/resources`, icon: Layers as unknown as AnimatedIcon, permission: "resources" },
  { titleKey: "sidebar.admins", url: `${baseUrl}/admins`, icon: UserRound as unknown as AnimatedIcon, permission: "admins" },
  { titleKey: "sidebar.whitelistAdmin", url: `${baseUrl}/whitelist-admin`, icon: BadgeCheck as unknown as AnimatedIcon, permission: "settings" },
  { titleKey: "sidebar.activityLog", url: `${baseUrl}/activity`, icon: ClipboardList as unknown as AnimatedIcon, permission: "activity" },
  { titleKey: "sidebar.settings", url: `${baseUrl}/settings`, icon: Settings as unknown as AnimatedIcon, permission: "settings" },
  { titleKey: "sidebar.configLibrary", url: `${baseUrl}/config-library`, icon: AnimatedFolder as unknown as AnimatedIcon, permission: "settings" },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { serverId } = useParams();
  const isDemoMode = useIsDemoMode();
  const { permissions, isOwner } = useAdminPermissions();
  const isLicenseOwner = isOwner;
  const { setShowAuthModal, disconnectAll } = useAuth();
  const { user, signOut: userSignOut } = useUserAuth();
  const { state } = useSidebar();

  const activeServer = isDemoMode ? "demo" : serverId ? serverId : readConnectedServer()?.server_id || null;
  const baseUrl = isDemoMode ? "/demo" : activeServer ? `/${activeServer}` : "/demo";

  const currentPath = location.pathname;

  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(true);
  const [managementOpen, setManagementOpen] = useState(true);

  const isMyServersPage =
    currentPath === "/my-servers" ||
    currentPath === "/servers" ||
    currentPath === "/profile-settings" ||
    (!serverId && !isDemoMode && (currentPath === "/configs-library" || currentPath === "/library" || currentPath === "/models" || currentPath === "/download"));

  const customerAreaItems: MenuItem[] = [
    { titleKey: "sidebar.dashboard", url: "/my-servers", icon: AnimatedLayoutGrid as unknown as AnimatedIcon, permission: "dashboard" },
    { titleKey: "sidebar.profile", url: "/profile-settings", icon: UserRound as unknown as AnimatedIcon, permission: "dashboard" },
    { titleKey: "sidebar.redeem", url: "#redeem", icon: Key as unknown as AnimatedIcon, permission: "dashboard" },
    { titleKey: "sidebar.configLibrary", url: "/configs-library", icon: AnimatedFolder as unknown as AnimatedIcon, permission: "settings" },
    { titleKey: "sidebar.models", url: "/models", icon: AnimatedPackage as unknown as AnimatedIcon, permission: "settings" },
  ];

  const dashItems = dashboardItems(baseUrl);
  const modItems = moderationItems(baseUrl);
  const mgmtItems = managementItems(baseUrl);

  const overviewItems = isMyServersPage ? customerAreaItems : dashItems;

  const filterNav = (items: MenuItem[]) => {
    if (isDemoMode) return items;
    return items.filter((item) => {
      if (item.licenseOwnerOnly && !isLicenseOwner) return false;
      return hasPermission(permissions, item.permission);
    });
  };

  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (isMyServersPage) {
      if (path === "#redeem") return false;
      if (path === "/my-servers") return currentPath === "/my-servers" || currentPath === "/servers";
      if (path === "/profile-settings") return currentPath === "/profile-settings";
      if (path === "/configs-library") return currentPath === "/configs-library" || currentPath === "/library";
      if (path === "/models") return currentPath === "/models";
    }
    if (path === `${baseUrl}/dashboard`) {
      return currentPath === `${baseUrl}/dashboard`;
    }
    return currentPath.startsWith(path);
  };

  const prefetchForUrl = (url: string) => {
    prefetchDashboardPage(dashboardPathSegment(url, baseUrl));
  };

  const userName = getAuthUserName(user) || user?.display_name || user?.username || (user?.email ? user.email.split('@')[0] : "Account");
  const userEmail = user?.email || "user@vexshield.com";

  const renderCollapsibleTreeGroup = (
    groupKey: string,
    groupLabel: string,
    GroupIcon: React.ComponentType<{ className?: string }>,
    items: MenuItem[],
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
  ) => {
    const filteredItems = filterNav(items);
    if (filteredItems.length === 0) return null;

    const isAnyActive = filteredItems.some((item) => isActive(item.url));

    return (
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={collapsed ? groupLabel : undefined}
              isActive={isAnyActive && !isOpen}
              className="group/menuitem w-full h-10 min-h-[40px] px-3 py-2 rounded-md justify-between hover:bg-white/[0.06] hover:text-white transition-colors text-zinc-300 font-medium"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <GroupIcon className="size-4 shrink-0 text-zinc-400 transition-transform duration-200 group-hover/menuitem:scale-110 group-hover/menuitem:text-white" />
                {!collapsed && <span className="font-medium text-sm truncate">{groupLabel}</span>}
              </div>
              {!collapsed && (
                <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="my-1 border-l border-white/10 ml-3.5 pl-2.5 space-y-1">
              {filteredItems.map((item) => {
                const ItemIcon = item.icon;
                const active = isActive(item.url);
                return (
                  <SidebarMenuSubItem key={item.titleKey}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={active}
                      className={cn(
                        "group/subitem text-sm font-medium transition-all duration-150 rounded-md px-3 py-2 h-9 min-h-[36px] w-full",
                        active
                          ? "bg-gradient-to-r from-[#092545] to-[#061c35] text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-semibold"
                          : "text-zinc-400 hover:text-white hover:bg-cyan-500/10",
                      )}
                    >
                      <NavLink
                        to={item.url}
                        onMouseEnter={() => prefetchForUrl(item.url)}
                        onFocus={() => prefetchForUrl(item.url)}
                      >
                        <ItemIcon className="size-4 shrink-0 transition-transform duration-200 group-hover/subitem:scale-110" strokeWidth={1.8} />
                        <span>{t(item.titleKey)}</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon" className="!border-r-0 border-none bg-[#030d1b] [&_[data-sidebar=sidebar]]:!bg-[#030d1b] [&_[data-slot=sidebar-container]]:!border-r-0 border-r border-cyan-500/20">
      {/* Official Shadcn Workspace Header Switcher */}
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1.5">
            <Link
              to="/"
              title={t("nav.home", "Home")}
              className="flex size-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-[#06192e] hover:bg-[#0a2542] text-cyan-300 hover:text-white transition-all shrink-0 shadow-sm"
            >
              <Home className="h-4 w-4" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                >
                  <div className="flex size-8 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/35 p-1 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                    <img src={BRAND_LOGO} alt="VexShield" className="size-full object-contain" />
                  </div>
                  {!collapsed && (
                    <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                      <span className="truncate font-bold text-white text-sm">
                        VexShield
                      </span>
                      <span className="truncate text-[11px] text-cyan-300/70">Customer Area</span>
                    </div>
                  )}
                  {!collapsed && <ChevronsUpDown className="ml-auto size-4 text-muted-foreground shrink-0" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-popover border-border text-popover-foreground shadow-lg"
                side={collapsed ? "right" : "bottom"}
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">Workspace</DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-sidebar-accent focus:bg-sidebar-accent"
                  onClick={() => navigate("/my-servers")}
                >
                  <Server className="mr-2 h-4 w-4 text-blue-400" />
                  <div className="grid flex-1">
                    <span className="font-medium text-sm">My Servers</span>
                    <span className="text-xs text-muted-foreground">Manage connected servers</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-sidebar-accent focus:bg-sidebar-accent"
                  onClick={() => (activeServer ? disconnectAll() : setShowAuthModal(true))}
                >
                  <div className="flex size-6 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/30 p-0.5 mr-2 shrink-0">
                    <img src={BRAND_LOGO} alt="VexShield" className="size-full object-contain" />
                  </div>
                  <div className="grid flex-1">
                    <span className="font-medium text-sm">VexShield Workspace</span>
                    <span className="text-xs text-muted-foreground">{activeServer ? "Connected" : "Disconnected"}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-sidebar-accent focus:bg-sidebar-accent"
                  onClick={() => (activeServer ? disconnectAll() : setShowAuthModal(true))}
                >
                  <Key className="mr-2 h-4 w-4" />
                  <span>{activeServer ? "Disconnect Server" : "Connect Server"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <SidebarTrigger className="shrink-0 size-8 text-muted-foreground hover:text-foreground" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="mx-2" />

      {/* Main Content with Shadcn Tree Architecture */}
      <SidebarContent className="px-2 py-1">
        {/* Overview Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider px-2 py-1">
            {isMyServersPage ? "GENERAL" : t("sidebar.overview", "Overview")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {overviewItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={collapsed ? t(item.titleKey) : undefined}
                      className={cn(
                        "group/item text-sm font-medium rounded-md px-3 py-2.5 h-10 min-h-[40px] w-full transition-all duration-150",
                        active
                          ? "bg-gradient-to-r from-[#092545] to-[#061c35] text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-semibold"
                          : "text-zinc-300 hover:text-white hover:bg-cyan-500/10",
                      )}
                    >
                      {item.url === "#redeem" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setRedeemModalOpen(true);
                          }}
                          className="flex w-full items-center gap-2.5 text-left"
                        >
                          <Icon className="size-4 shrink-0 transition-transform duration-300 group-hover/item:scale-125 group-hover/item:rotate-6 text-zinc-400 group-hover/item:text-cyan-300" strokeWidth={1.8} />
                          <span>{t(item.titleKey, "Redeem")}</span>
                        </button>
                      ) : (
                        <NavLink
                          to={item.url}
                          end={item.url === `${baseUrl}/dashboard` || item.url === "/my-servers"}
                          onMouseEnter={() => !isMyServersPage && prefetchForUrl(item.url)}
                          onFocus={() => !isMyServersPage && prefetchForUrl(item.url)}
                          className="flex w-full items-center gap-2.5"
                        >
                          <Icon className={cn("size-4 shrink-0 transition-transform duration-300 group-hover/item:scale-125 group-hover/item:rotate-6", active ? "text-cyan-400" : "text-zinc-400 group-hover/item:text-cyan-300")} strokeWidth={1.8} />
                          <span>{t(item.titleKey, item.titleKey === "sidebar.profile" ? "Profile" : undefined)}</span>
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tree Submenu Navigation Groups */}
        {!isMyServersPage && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
              {t("sidebar.sections", "Navigation")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderCollapsibleTreeGroup("moderation", t("sidebar.moderation"), AnimatedShield as any, modItems, moderationOpen, setModerationOpen)}
                {renderCollapsibleTreeGroup("management", t("sidebar.management"), AnimatedFolderCog as any, mgmtItems, managementOpen, setManagementOpen)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Bottom Support & Documentation pill buttons matching EchoShield */}
      {!collapsed && (
        <div className="px-3 pb-2 pt-1 flex items-center gap-2">
          <a
            href="https://discord.gg/5WgtMWbtgD"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
          >
            <Headphones className="size-3.5 text-zinc-400" />
            <span>Support</span>
          </a>
          <Link
            to="/documentation"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
          >
            <BookOpen className="size-3.5 text-zinc-400" />
            <span>Documentation</span>
          </Link>
        </div>
      )}

      <SidebarSeparator className="mx-2" />

      {/* Official Shadcn User Profile Dropdown Footer */}
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                >
                  <UserAvatar size="sm" className="shrink-0" />
                  {!collapsed && (
                    <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                      <span className="truncate font-semibold text-sidebar-foreground">{userName}</span>
                      <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                    </div>
                  )}
                  {!collapsed && <ChevronsUpDown className="ml-auto size-4 text-muted-foreground shrink-0" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-popover border-border text-popover-foreground shadow-lg"
                side={collapsed ? "right" : "top"}
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 text-left text-sm bg-cyan-950/30 rounded-t-lg border-b border-white/5">
                    <UserAvatar size="sm" />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-white">{userName}</span>
                      <span className="truncate text-[11px] text-zinc-400">{userEmail}</span>
                    </div>
                    <NotificationBell />
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-cyan-500/10 focus:bg-cyan-500/10 text-zinc-200 hover:text-white"
                  onClick={() => navigate("/profile-settings")}
                >
                  <UserRound className="mr-2 h-4 w-4 text-cyan-400" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-cyan-500/10 focus:bg-cyan-500/10 text-zinc-200 hover:text-white"
                  onClick={() => navigate("/my-servers")}
                >
                  <Server className="mr-2 h-4 w-4 text-blue-400" />
                  <span>My Servers</span>
                </DropdownMenuItem>
                {(user?.is_admin || user?.site_admin || ['1505242741091598418', '1134674389254803456', '1284209480824786987', '1339366537085321257'].includes(String(user?.id || ''))) && (
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-cyan-500/10 focus:bg-cyan-500/10 text-cyan-300 hover:text-cyan-200"
                    onClick={() => navigate("/admin")}
                  >
                    <ShieldAlert className="mr-2 h-4 w-4 text-cyan-400" />
                    <span>Admin Matrix</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-cyan-500/10 focus:bg-cyan-500/10 text-zinc-200 hover:text-white"
                  onClick={() => window.open("https://discord.gg/5WgtMWbtgD", "_blank")}
                >
                  <HelpCircle className="mr-2 h-4 w-4 text-indigo-400" />
                  <span>Support Discord</span>
                </DropdownMenuItem>
                {user && (
                  <>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem
                      className="cursor-pointer text-rose-400 focus:text-rose-300 hover:bg-rose-500/10 focus:bg-rose-500/10"
                      onClick={() => userSignOut()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <RedeemKeyModal open={redeemModalOpen} onOpenChange={setRedeemModalOpen} />
    </Sidebar>
  );
}

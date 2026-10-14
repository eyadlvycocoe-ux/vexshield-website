import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { hasPageAccess } from "@/lib/admin-permissions";
import { isPcCheckerOnlyMode, isPageAllowedForPcCheckerOnly } from "@/lib/server-mode";
import { useTranslation } from "react-i18next";
import { PageLoader } from "@/components/PageLoader";

type Props = {
  page: string;
  licenseOwnerOnly?: boolean;
  children: React.ReactNode;
};

export function RequirePageAccess({ page, licenseOwnerOnly, children }: Props) {
  const { t } = useTranslation();
  const { serverId } = useParams();
  const navigate = useNavigate();
  const { permissions, isOwner, isLicenseOwner, isLoading } = useAdminPermissions();
  const blockedAtRef = useRef(0);

  const pcOnly = isPcCheckerOnlyMode();
  const pcOnlyBlocked = pcOnly && !isPageAllowedForPcCheckerOnly(page);

  const allowed =
    !isLoading &&
    !pcOnlyBlocked &&
    (isOwner ||
      permissions.includes("all") ||
      (licenseOwnerOnly
        ? isLicenseOwner
        : hasPageAccess(permissions, page)));

  useEffect(() => {
    if (isLoading || !serverId) return;
    if (allowed) {
      blockedAtRef.current = 0;
      return;
    }
    const now = Date.now();
    if (blockedAtRef.current === 0) {
      blockedAtRef.current = now;
    }
    if (now - blockedAtRef.current < 3000) return;
    toast.error(pcOnlyBlocked ? t("dashboard.common.pcTrialNoAccess") : t("dashboard.common.noAccess"));
    navigate(`/${serverId}/${pcOnly ? "search" : "dashboard"}`, { replace: true });
  }, [allowed, isLoading, navigate, serverId, pcOnly, pcOnlyBlocked, page, t]);

  if (isLoading || (!allowed && blockedAtRef.current > 0)) {
    return <PageLoader compact />;
  }

  if (!allowed) return null;

  return <>{children}</>;
}

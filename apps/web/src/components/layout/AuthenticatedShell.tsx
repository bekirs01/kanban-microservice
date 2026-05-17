import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { useTranslation } from "@/i18n/useTranslation";
import { isAdminRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { toast } from "sonner";

export function AuthenticatedShell({
  children,
  headerTitleKey = "dashboard.appTitle",
  mainClassName,
  globalSearchPlaceholderKey,
  globalSearchValue,
  onGlobalSearchChange,
}: {
  children: ReactNode;
  headerTitleKey?: string;
  mainClassName?: string;
  globalSearchPlaceholderKey?: string;
  globalSearchValue?: string;
  onGlobalSearchChange?: (next: string) => void;
}) {
  const { t } = useTranslation();
  const ws = useWebSocket();
  const { user, logout } = useAuth();
  const admin = isAdminRole(user?.role);

  const handleLogout = async () => {
    await logout();
    toast.success(t("board.logoutToast"));
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/25">
      <div className="flex min-h-0 flex-1">
        <DashboardSidebar isAdmin={admin} />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader
            isConnected={ws.isConnected}
            user={user}
            onLogout={handleLogout}
            titleKey={headerTitleKey}
            globalSearchPlaceholderKey={globalSearchPlaceholderKey}
            globalSearchValue={globalSearchValue}
            onGlobalSearchChange={onGlobalSearchChange}
          />
          <RealtimeProvider value={{ isConnected: ws.isConnected }}>
            <main
              className={cn(
                "min-h-0 flex-1 overflow-y-auto",
                mainClassName ?? "",
              )}
            >
              {children}
            </main>
          </RealtimeProvider>
        </div>
      </div>
    </div>
  );
}

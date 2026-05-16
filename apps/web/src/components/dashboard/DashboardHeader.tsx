import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/useTranslation";
import type { LocaleCode } from "@/i18n/types";
import { isAdminRole } from "@/lib/rbac";
import type { UserRole } from "@challenge/types";
import { LayoutGrid, LogOut, Wifi, WifiOff } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface DashboardHeaderProps {
  isConnected: boolean;
  user: {
    id: string;
    username: string;
    role: UserRole;
  } | null;
  layoutMode: "kanban" | "calendar";
  onLayoutMode: (mode: "kanban" | "calendar") => void;
  onLogout: () => void;
  titleKey?: string;
  showLayoutToggle?: boolean;
}

const ROLE_KEYS: Record<UserRole, string> = {
  ADMIN: "admin.role.admin",
  MANAGER: "admin.role.manager",
  USER: "admin.role.user",
};

export function DashboardHeader({
  isConnected,
  user,
  layoutMode,
  onLayoutMode,
  onLogout,
  titleKey = "board.title",
  showLayoutToggle = true,
}: DashboardHeaderProps) {
  const { t, locale, setLanguage } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {t(titleKey)}
          </h1>
          <div
            className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("board.connected")}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-destructive" />
                <span>{t("board.disconnected")}</span>
              </>
            )}
          </div>

          {showLayoutToggle ? (
            <div className="hidden md:flex items-center rounded-lg border bg-muted/40 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={layoutMode === "kanban" ? "default" : "ghost"}
                className="h-8 rounded-md px-3"
                onClick={() => onLayoutMode("kanban")}
              >
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                {t("dashboard.viewKanban")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={layoutMode === "calendar" ? "default" : "ghost"}
                className="h-8 rounded-md px-3"
                onClick={() => onLayoutMode("calendar")}
              >
                {t("dashboard.calendar")}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {t("common.language")}
          </span>
          <Select
            value={locale}
            onValueChange={(next) => setLanguage(next as LocaleCode)}
          >
            <SelectTrigger className="h-9 w-[130px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("language.labelEnglish")}</SelectItem>
              <SelectItem value="ru">{t("language.labelRussian")}</SelectItem>
              <SelectItem value="tr">{t("language.labelTurkish")}</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden h-8 w-px bg-border sm:block" />

          <div className="flex min-w-0 max-w-[200px] flex-col text-right leading-tight">
            <span className="truncate text-xs text-muted-foreground sm:text-sm">
              {t("board.greetingHello", { username: user?.username ?? "" })}
            </span>
            <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
              {user?.role ? t(ROLE_KEYS[user.role]) : ""}
            </span>
          </div>

          {isAdminRole(user?.role) ? (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to="/admin">{t("common.adminPanel")}</Link>
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onLogout}
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">{t("common.logout")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

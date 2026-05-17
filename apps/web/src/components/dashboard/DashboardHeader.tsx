import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { displayUsername } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";
import type { ResponseUserDto } from "@challenge/types";
import { Globe2, LogOut, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface DashboardHeaderProps {
  isConnected: boolean;
  user: ResponseUserDto | null;
  onLogout: () => void;
  titleKey?: string;
  searchSlot?: ReactNode;
  globalSearchPlaceholderKey?: string;
  globalSearchValue?: string;
  onGlobalSearchChange?: (next: string) => void;
}

function roleTranslationKey(role: ResponseUserDto["role"]): string {
  return role === "ADMIN" ? "admin.role.admin" : "dashboard.roleWorker";
}

export function DashboardHeader({
  isConnected,
  user,
  onLogout,
  titleKey = "dashboard.appTitle",
  searchSlot,
  globalSearchPlaceholderKey = "dashboard.globalSearchPlaceholder",
  globalSearchValue,
  onGlobalSearchChange,
}: DashboardHeaderProps) {
  const { t, locale, setLanguage } = useTranslation();

  const showWideSearch =
    typeof globalSearchValue === "string" &&
    typeof onGlobalSearchChange === "function";

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex flex-col gap-3 px-4 py-3 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-[1_1_auto] flex-wrap items-center gap-3 lg:gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                {t(titleKey)}
              </h1>
            </div>

            <div
              className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isConnected ? "bg-emerald-500" : "bg-destructive",
                  )}
                />
                {isConnected ? t("board.connected") : t("board.disconnected")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isConnected ? "bg-primary/70" : "bg-muted-foreground/30",
                  )}
                />
                {t("dashboard.realtimeLabel")}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 w-full max-w-full flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:w-auto">
            <div className="flex items-center gap-1.5">
              <Globe2 className="hidden h-4 w-4 text-muted-foreground sm:block" />
              <Select
                value={locale}
                onValueChange={(next) => setLanguage(next as LocaleCode)}
              >
                <SelectTrigger className="h-9 w-[120px] text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("language.labelEnglish")}</SelectItem>
                  <SelectItem value="ru">{t("language.labelRussian")}</SelectItem>
                  <SelectItem value="tr">{t("language.labelTurkish")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden h-8 w-px shrink-0 bg-border sm:block" />

            <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 sm:flex-nowrap sm:gap-4">
              <div className="flex min-w-0 max-w-[min(17rem,calc(100vw-14rem))] flex-col text-right leading-tight">
                <span className="truncate text-xs text-muted-foreground sm:text-sm">
                  {user ? displayUsername(user) : ""}
                </span>
                <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  {user?.role ? t(roleTranslationKey(user.role)) : ""}
                </span>
              </div>

              {isAdminRole(user?.role) ? (
                <Button asChild variant="secondary" size="sm" className="shrink-0">
                  <Link to="/admin">{t("common.adminPanel")}</Link>
                </Button>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                className="ml-1 shrink-0 sm:ml-0"
                onClick={() => void onLogout()}
              >
              <LogOut className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">{t("common.logout")}</span>
            </Button>
            </div>
          </div>
        </div>

        {(showWideSearch || searchSlot) && (
          <div className="flex flex-wrap items-center gap-2">
            {showWideSearch ? (
              <div className="relative min-w-[200px] max-w-xl flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalSearchValue}
                  onChange={(e) => onGlobalSearchChange?.(e.target.value)}
                  placeholder={t(globalSearchPlaceholderKey)}
                  className="h-10 pl-9"
                  aria-label={t(globalSearchPlaceholderKey)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-px text-[10px] text-muted-foreground sm:inline">
                  ⌘K
                </span>
              </div>
            ) : null}
            {searchSlot}
          </div>
        )}
      </div>
    </header>
  );
}

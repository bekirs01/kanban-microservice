import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";
import {
  Archive as ArchiveIcon,
  BarChart3,
  Calendar,
  KanbanSquare,
  Settings,
  UserPlus,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType } from "react";

interface DashboardSidebarProps {
  isAdmin: boolean;
}

type Item =
  | {
      kind: "link";
      to: string;
      labelKey: string;
      icon: ComponentType<{ className?: string }>;
      matchPrefix?: boolean;
      adminOnly?: boolean;
    }
  | {
      kind: "disabled";
      labelKey: string;
      hintKey: string;
      icon: ComponentType<{ className?: string }>;
    };

const ITEMS: Item[] = [
  { kind: "link", to: "/kanban", labelKey: "nav.taskBoard", icon: KanbanSquare },
  {
    kind: "link",
    to: "/calendar",
    labelKey: "nav.calendar",
    icon: Calendar,
    matchPrefix: true,
  },
  {
    kind: "link",
    to: "/analytics",
    labelKey: "nav.analytics",
    icon: BarChart3,
  },
  {
    kind: "link",
    to: "/archive",
    labelKey: "nav.archive",
    icon: ArchiveIcon,
  },
  {
    kind: "link",
    to: "/profile",
    labelKey: "nav.settings",
    icon: Settings,
    matchPrefix: true,
  },
];

export function DashboardSidebar({ isAdmin }: DashboardSidebarProps) {
  const { t } = useTranslation();

  const { pathname } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname }),
  });

  const navBtnClass = (active: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
    );

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-card/90 shadow-sm backdrop-blur-sm lg:sticky lg:top-0">
      <div className="flex items-center gap-2 border-b px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          K
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dashboard.appBrand")}
          </p>
          <p className="truncate text-sm font-semibold leading-tight">
            {t("dashboard.shellProductName")}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {ITEMS.map((item, idx) => {
          if (item.kind === "disabled") {
            return (
              <button
                key={`d-${idx}`}
                type="button"
                disabled
                title={t(item.hintKey)}
                className={cn(navBtnClass(false), "cursor-not-allowed opacity-60")}
              >
                <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="truncate text-left">{t(item.labelKey)}</span>
              </button>
            );
          }
          if (item.adminOnly && !isAdmin) {
            return (
              <button
                key={item.to}
                type="button"
                disabled
                title={t("nav.adminOnlyNav")}
                className={cn(navBtnClass(false), "cursor-not-allowed opacity-60")}
              >
                <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="truncate text-left">{t(item.labelKey)}</span>
              </button>
            );
          }
          const active = item.matchPrefix
            ? pathname === item.to || pathname.startsWith(`${item.to}/`)
            : pathname === item.to;
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={navBtnClass(active)}>
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
              <span className="truncate text-left">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        {isAdmin ? (
          <Button asChild className="w-full shadow-sm" size="sm">
            <Link to="/admin">
              <UserPlus className="mr-2 h-4 w-4" />
              {t("dashboard.invite")}
            </Link>
          </Button>
        ) : null}
      </div>
    </aside>
  );
}

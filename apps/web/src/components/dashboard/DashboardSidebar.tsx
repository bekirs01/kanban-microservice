import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";
import type { ResponseUserDto } from "@challenge/types";
import {
  CalendarDays,
  LayoutDashboard,
  UserCircle2,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";

export type DashboardNavId =
  | "board"
  | "calendar"
  | "myTasks"
  | "participants";

interface DashboardSidebarProps {
  activeNav: DashboardNavId;
  onNav: (id: DashboardNavId) => void;
  teamUsers: ResponseUserDto[];
  showInvite: boolean;
  showParticipantsNav?: boolean;
}

export function DashboardSidebar({
  activeNav,
  onNav,
  teamUsers,
  showInvite,
  showParticipantsNav = false,
}: DashboardSidebarProps) {
  const { t } = useTranslation();
  const displayUsers = teamUsers.slice(0, 6);
  const extra = Math.max(0, teamUsers.length - displayUsers.length);

  const Item = ({
    id,
    icon: Icon,
    labelKey,
    disabled,
    hintKey,
  }: {
    id: DashboardNavId;
    icon: ComponentType<{ className?: string }>;
    labelKey: string;
    disabled?: boolean;
    hintKey?: string;
  }) => {
    const active = activeNav === id && !disabled;
    const btn = (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onNav(id)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          disabled && "cursor-not-allowed opacity-55 hover:bg-transparent",
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
        <span className="truncate text-left">{t(labelKey)}</span>
      </button>
    );
    if (!disabled) return btn;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right">
          {t(hintKey ?? "dashboard.navComingSoon")}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-card/90 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b px-4 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.appShortName")}
            </p>
            <p className="truncate text-sm font-semibold leading-tight">
              {t("board.title")}
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          <Item
            id="board"
            icon={LayoutDashboard}
            labelKey="dashboard.taskBoard"
          />
          <Item
            id="calendar"
            icon={CalendarDays}
            labelKey="dashboard.calendar"
          />
          <Item
            id="myTasks"
            icon={UserCircle2}
            labelKey="dashboard.myTasks"
          />
          {showParticipantsNav ? (
            <Item
              id="participants"
              icon={Users}
              labelKey="dashboard.participants"
            />
          ) : null}
        </nav>

        <div className="border-t p-3 space-y-3">
          <div>
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.teamOnline")}
            </p>
            <div className="mt-2 flex items-center gap-2 px-1">
              <div className="flex -space-x-2">
                {displayUsers.map((u) => (
                  <Avatar key={u.id} className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-[10px]">
                      {u.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {extra > 0 ? (
                <span className="text-xs text-muted-foreground">+{extra}</span>
              ) : null}
            </div>
          </div>
          {showInvite ? (
            <Button asChild className="w-full" size="sm" variant="secondary">
              <Link to="/admin">
                <UserPlus className="mr-2 h-4 w-4" />
                {t("dashboard.invite")}
              </Link>
            </Button>
          ) : null}
        </div>
      </aside>
    </TooltipProvider>
  );
}

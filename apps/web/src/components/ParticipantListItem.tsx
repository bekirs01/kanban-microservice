import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { displayUsername, userInitials } from "@/lib/userDisplay";
import type { ResponseUserDto } from "@challenge/types";
import { Link } from "@tanstack/react-router";
import { Trash } from "lucide-react";
import React from "react";

interface Props {
  user: Pick<ResponseUserDto, "id"> &
    Partial<Pick<ResponseUserDto, "username" | "email" | "displayName" | "avatarData">>;
  onRemove: (id: string) => void;
  isRemoving?: boolean;
  allowRemove?: boolean;
}

export const ParticipantListItem: React.FC<Props> = ({
  user,
  onRemove,
  isRemoving,
  allowRemove = true,
}) => {
  const { t } = useTranslation();

  const usernameLabel =
    typeof user.username === "string"
      ? user.username
      : t("history.historyParticipantFallback");

  const emailDisplay =
    typeof user.email === "string" ? user.email : "user@email.com";
  const profileLabel =
    typeof user.username === "string"
      ? displayUsername({
          username: user.username,
          displayName: user.displayName ?? null,
        })
      : t("participants.loadingLabel");
  const initials =
    typeof user.username === "string"
      ? userInitials({
          username: user.username,
          displayName: user.displayName ?? null,
        })
      : "?";

  return (
    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-background border border-transparent hover:border-border transition-all">
      <Link
        to="/workers/$workerId"
        params={{ workerId: String(user.id ?? "") }}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="h-8 w-8 border">
          {user.avatarData ? <AvatarImage src={user.avatarData} alt="" /> : null}
          <AvatarFallback className="text-xs bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-none truncate">
            {profileLabel}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 truncate">
            {emailDisplay}
          </p>
        </div>
      </Link>
      <div className="ml-2">
        {allowRemove ? (
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${isRemoving ? "opacity-100" : ""}`}
            onClick={() => onRemove(String(user.id ?? ""))}
            disabled={isRemoving}
            aria-label={t("history.historyAriaRemove", {
              username: usernameLabel,
            })}
          >
            <Trash className="h-4 w-4 text-destructive" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default ParticipantListItem;

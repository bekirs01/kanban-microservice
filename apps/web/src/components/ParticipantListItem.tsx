import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import type { ResponseUserDto } from "@challenge/types";
import { Trash } from "lucide-react";
import React from "react";

interface Props {
  user: Pick<ResponseUserDto, "id"> &
    Partial<Pick<ResponseUserDto, "username" | "email">>;
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

  return (
    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-background border border-transparent hover:border-border transition-all">
      <Avatar className="h-8 w-8 border">
        <AvatarFallback className="text-xs bg-muted">
          {(typeof user.username === "string" &&
            user.username[0]?.toUpperCase()) ||
            "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none truncate">
          {typeof user.username === "string"
            ? user.username
            : t("participants.loadingLabel")}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {emailDisplay}
        </p>
      </div>
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

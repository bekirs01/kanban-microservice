import ParticipantListItem from "@/components/ParticipantListItem";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/i18n/useTranslation";
import type { ResponseUserDto } from "@challenge/types";
import { Check, Plus } from "lucide-react";
import React from "react";

interface Props {
  taskAssignees: string[];
  users: ResponseUserDto[];
  candidateUsers: ResponseUserDto[];
  isLoadingAllUsers: boolean;
  openAssign: boolean;
  setOpenAssign: (b: boolean) => void;
  handleToggleAssign: (userId: string) => Promise<void>;
  handleRemoveAssignee: (userId: string) => Promise<void>;
  removingAssignee: string | null;
}

export const TaskParticipants: React.FC<Props> = ({
  taskAssignees,
  users,
  candidateUsers,
  isLoadingAllUsers,
  openAssign,
  setOpenAssign,
  handleToggleAssign,
  handleRemoveAssignee,
  removingAssignee,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("participants.title")}
        </h4>
        <Popover open={openAssign} onOpenChange={setOpenAssign}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2 hover:bg-background"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-60" align="end">
            <Command>
              <CommandInput placeholder={t("participants.searchPlaceholder")} />
              <CommandList>
                <CommandEmpty>{t("participants.emptySuggest")}</CommandEmpty>
                <CommandGroup heading={t("participants.groupLabel")}>
                  {isLoadingAllUsers ? (
                    <CommandItem disabled className="flex items-center justify-between">
                      <span>{t("participants.loadingLabel")}</span>
                    </CommandItem>
                  ) : (
                    (candidateUsers ?? []).map((candidate) => {
                      const uid = String(candidate.id ?? "");
                      const isAssigned = (taskAssignees ?? []).includes(uid);
                      return (
                        <CommandItem
                          key={uid}
                          value={String(candidate.username ?? uid)}
                          onSelect={() => handleToggleAssign(uid)}
                          className="flex items-center justify-between"
                        >
                          <span>{String(candidate.username ?? uid)}</span>
                          {isAssigned ? <Check className="h-4 w-4" /> : null}
                        </CommandItem>
                      );
                    })
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        {taskAssignees?.length ? (
          taskAssignees.map((id) => {
            const fallback = {
              id,
              username: t("participants.loadingLabel"),
              email: "",
            };
            const participant =
              users.find((x) => String(x.id) === id) ?? fallback;
            return (
              <ParticipantListItem
                key={id}
                user={participant}
                onRemove={(uid) => handleRemoveAssignee(uid)}
                isRemoving={removingAssignee === id}
              />
            );
          })
        ) : (
          <div className="text-xs text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
            {t("participants.noneMessage")}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskParticipants;

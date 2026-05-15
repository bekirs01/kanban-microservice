import HistoryListItem from "@/components/HistoryListItem";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/useTranslation";
import React from "react";

interface Props {
  history: Record<string, unknown>[];
  isLoadingHistory: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  getHistoryUsername: (id?: string) => string;
  formatChangedFields: (entry: unknown) => string;
  getFirstName: (fullName?: string) => string;
}

export const TaskHistory: React.FC<Props> = ({
  history,
  isLoadingHistory,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  getHistoryUsername,
  formatChangedFields,
  getFirstName,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col min-h-[150px]">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        {t("history.sectionTitle")}
      </h4>
      <ScrollArea className="flex-1 -mr-4 pr-4">
        <div className="space-y-4">
          {isLoadingHistory ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ) : history.length > 0 ? (
            history.map((entry: Record<string, unknown>, idx: number) => (
              <HistoryListItem
                key={String(entry.id ?? idx)}
                entry={entry}
                getHistoryUsername={getHistoryUsername}
                formatChangedFields={(historicalEntry: unknown) =>
                  formatChangedFields(historicalEntry)
                }
                getFirstName={getFirstName}
              />
            ))
          ) : (
            <div className="text-xs text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
              {t("history.empty")}
            </div>
          )}
          {hasNextPage ? (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? t("history.loadMoreBusy") : t("history.loadMoreIdle")}
              </Button>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TaskHistory;

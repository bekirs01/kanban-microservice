import { useTranslation } from "@/i18n/useTranslation";
import { format } from "date-fns";
import React from "react";

interface Props {
  entry: Record<string, unknown>;
  getHistoryUsername: (id?: string) => string;
  formatChangedFields: (entry: unknown) => string;
  getFirstName: (fullName?: string) => string;
}

export const HistoryListItem: React.FC<Props> = ({
  entry,
  getHistoryUsername,
  formatChangedFields,
  getFirstName,
}) => {
  const { dateFnsLocale, t } = useTranslation();

  const rawAuthorId = entry.authorId;
  const authorId =
    typeof rawAuthorId === "string" ? rawAuthorId : undefined;

  const timelineSource = entry.changedAt ?? entry.createdAt;
  let timeline = t("common.dash");
  if (
    typeof timelineSource === "string" ||
    timelineSource instanceof Date
  ) {
    timeline = format(
      new Date(timelineSource as string | Date),
      "dd MMM yy • HH:mm",
      { locale: dateFnsLocale },
    );
  }

  return (
    <div className="flex gap-3 text-sm relative pb-4 border-l ml-1.5 pl-4 last:border-0 last:pb-0">
      <div
        className={`absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full ${entry.type === "system" ? "bg-muted-foreground/30" : "bg-blue-500"}`}
      />
      <div>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {getFirstName(getHistoryUsername(authorId))}
          </span>{" "}
          {formatChangedFields(entry)}
        </p>
        <span className="text-[10px] text-muted-foreground mt-0.5 block">
          {timeline}
        </span>
      </div>
    </div>
  );
};

export default HistoryListItem;

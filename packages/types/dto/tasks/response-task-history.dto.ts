import { ActionType } from "../../enums/index.js";

export interface ResponseTaskHistoryDto {
  authorId: string;
  action: ActionType;
  content: string;
  changedAt: string;
  rawChanges?: any;
}
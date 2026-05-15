import type { PaginationQueryPayload } from "../../dto/pagination/pagination-query.dto.js";

export interface TaskHistoryPayload extends PaginationQueryPayload {
  taskId: string;
}
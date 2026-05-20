import { TaskStatus } from '@challenge/types';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface TaskDeadlineRow {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  deadline: Date;
  creatorId: string;
  assigneesRaw: string | null;
  archivedAt: Date | null;
}

@Injectable()
export class TaskDeadlineQueryService {
  constructor(private readonly dataSource: DataSource) {}

  async findTasksWithDeadlineWithinHours(windowHours: number): Promise<TaskDeadlineRow[]> {
    const rows = await this.dataSource.query(
      `
        SELECT
          t.id,
          t.title,
          t.description,
          t.priority::text AS priority,
          t.status::text AS status,
          t.deadline AS deadline,
          t."creatorId" AS "creatorId",
          t.assignees AS "assigneesRaw",
          t."archivedAt" AS "archivedAt"
        FROM task_service.tasks t
        WHERE t."archivedAt" IS NULL
          AND t.status::text <> $1
          AND t.deadline > NOW()
          AND t.deadline <= NOW() + ($2::text || ' hours')::interval
        ORDER BY t.deadline ASC
      `,
      [TaskStatus.DONE, String(windowHours)],
    );

    return rows as TaskDeadlineRow[];
  }

  async findTaskById(taskId: string): Promise<TaskDeadlineRow | null> {
    const rows = await this.dataSource.query(
      `
        SELECT
          t.id,
          t.title,
          t.description,
          t.priority::text AS priority,
          t.status::text AS status,
          t.deadline AS deadline,
          t."creatorId" AS "creatorId",
          t.assignees AS "assigneesRaw",
          t."archivedAt" AS "archivedAt"
        FROM task_service.tasks t
        WHERE t.id = $1
        LIMIT 1
      `,
      [taskId],
    );

    return (rows[0] as TaskDeadlineRow | undefined) ?? null;
  }

  async resolveUserDisplayNames(userIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const map = new Map<string, string>();
    if (uniqueIds.length === 0) return map;

    const rows = await this.dataSource.query(
      `
        SELECT u.id::text AS id, COALESCE(NULLIF(TRIM(u."displayName"), ''), u.username) AS name
        FROM auth_service.users u
        WHERE u.id::text = ANY($1::text[])
      `,
      [uniqueIds],
    );

    for (const row of rows as Array<{ id: string; name: string }>) {
      map.set(row.id, row.name);
    }

    return map;
  }
}

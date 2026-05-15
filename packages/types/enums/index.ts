export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT"
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  DONE = "DONE"
}

export enum ActionType {
  ASSIGNED = "ASSIGNED",
  STATUS_CHANGE = "STATUS_CHANGE",
  UPDATE = "UPDATE",
  CREATED = "CREATED",
  COMMENT = "COMMENT",
  DELETE = "DELETE"
}
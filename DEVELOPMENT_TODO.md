# Development TODO

**Rule for Cursor and all contributors:** Before every development step, read **`PROJECT_RULES.md`**, **`HACKATHON_CASE_REQUIREMENTS.md`**, **`I18N_IMPLEMENTATION_PLAN.md`**, and this file (**`DEVELOPMENT_TODO.md`**).

**Maintenance:** When work completes, update this checklist—mark finished items with **`[x]`**, keep pending items as **`[ ]`**. Never mark something complete unless it is verified done. Prefer small edits that mirror actual merged behavior.

---

## 1. Project Setup

- [x] Inspect current project structure
- [x] Identify frontend framework
- [x] Identify backend framework
- [x] Identify database
- [x] Identify real-time technology
- [x] Identify queue/message broker technology
- [x] Check how to run the project locally
- [x] Verify and document PostgreSQL Docker Compose wiring (see `DATABASE_CONNECTION_REPORT.md`)

## 2. Kanban Board

- [ ] Display board columns
- [ ] Display task cards
- [ ] Create task
- [ ] Edit task
- [ ] Delete task
- [ ] Move task between columns
- [ ] Support custom columns if possible

## 3. Task Fields

- [ ] Add task ID
- [ ] Add title
- [ ] Add description
- [ ] Add status
- [ ] Add priority
- [ ] Add tags
- [ ] Add created date
- [ ] Add deadline

## 4. Real-Time Synchronization

- [x] Detect current real-time implementation
- [x] Sync task creation
- [x] Sync task updates
- [x] Sync task movement
- [x] Sync task deletion
- [x] Show connection status

## 5. Event-Driven Logic

- [x] Emit task created event
- [x] Emit task updated event
- [x] Emit task moved event
- [x] Emit task deleted event
- [x] Store or process events if required

## 6. Automation

- [x] Add notification when task is created
- [x] Add notification when task is moved
- [ ] Add rule-based task movement
- [ ] Add tag-based flags
- [ ] Add deadline-based reactions

## 7. Queue Processing

- [x] Inspect RabbitMQ or Kafka setup
- [ ] Add incoming task API if missing
- [ ] Add validation
- [ ] Add deduplication
- [ ] Add enrichment
- [ ] Add error handling

## 8. Notifications

- [ ] Show system notifications
- [ ] Show user notifications
- [x] Send real-time notifications (board + toasts via WebSocket)
- [x] Avoid duplicate notifications (actor-based toast mute for own actions)

## 9. Internationalization

- [x] Create i18n structure
- [x] Add English translations
- [x] Add Russian translations
- [x] Add Turkish translations
- [x] Replace hardcoded UI text
- [x] Add language selector
- [x] Save selected language

## 10. UI and Demo Quality

- [ ] Improve visual consistency
- [ ] Make board understandable for jury
- [ ] Make buttons and forms clear
- [ ] Add empty states
- [ ] Add loading states
- [ ] Add error states

## 11. Reliability

- [ ] Handle API errors
- [ ] Handle real-time disconnect
- [ ] Prevent data loss
- [ ] Prevent duplicate tasks
- [ ] Prevent invalid task movement
- [ ] Keep UI state consistent

## 12. Documentation

- [ ] Update README
- [ ] Add architecture description
- [ ] Add technologies used
- [ ] Add local run instructions
- [ ] Add deployment instructions
- [ ] Add demo scenario

## 13. Deployment

- [ ] Choose deployment target
- [ ] Configure environment variables
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Test deployed app
- [ ] Add deployed URL to README

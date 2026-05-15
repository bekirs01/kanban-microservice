# Internationalization (i18n) Implementation Plan

## Purpose

This document describes how to add **three-language UI support**—**English**, **Russian**, and **Turkish**—to the Kanban web client with **English as the default**. It is a **planning artifact only**; execution should follow `PROJECT_RULES.md` and `.cursor/rules/i18n-rules.mdc`.

---

## 1. Current problem

| Issue | Description |
| ----- | ----------- |
| **Incomplete internationalization** | Visible strings are not consistently routed through a translation layer. |
| **Hardcoded UI text** | Labels, buttons, empty states, errors, and headings appear as literals inside components and related hooks. |
| **Portuguese remnants** | Parts of the UI still show **Portuguese** copy, which does not match the target locales for this hackathon roadmap. |
| **Locale gap** | The application must surface **English**, **Russian**, and **Turkish** for **all** user-visible text; today that coverage is missing or inconsistent. |

---

## 2. Target result

| Goal | Acceptance |
| ---- | ---------- |
| **Language selector** | Users choose **English**, **Russian**, or **Turkish** from the UI (`English`, `Русский`, `Türkçe`). |
| **Persisted choice** | Selected language is **saved locally** (recommended: `localStorage`; alternative: cookie if SSR constraints appear later). |
| **Immediate UI update** | Changing language re-renders affected UI without full reload; a refresh MUST restore the saved locale. |
| **Default** | First visit with no saved preference uses **English (`en`)**. |
| **No hardcoded visible strings** | JSX and client-visible `toast`/`dialog`/validation messages use **translation keys**, not raw literals (except truly dynamic values such as user names or numeric IDs, which stay data—not copy). |

---

## 3. Translation structure

### 3.1 Recommended layout (adapt to repo)

This monorepo hosts the SPA under **`apps/web/`**. Prefer co-locating i18n with the web package rather than a repository-root `src/` folder.

**Recommended:**

```
apps/web/src/i18n/
  index.ts           # i18n bootstrap, resource registration, helper exports
  locales/
    en.json          # English (source of truth for keys)
    ru.json          # Russian
    tr.json          # Turkish
```

Optional later splits if files grow large:

```
apps/web/src/i18n/locales/
  board.en.json
  auth.en.json
```

Merge at build-time or in `index.ts`; keep **key parity** across locales.

### 3.2 Technology suggestion

Use a maintained stack such as **`i18next`** + **`react-i18next`** + **`i18next-browser-languagedetector`** (detector optional if custom persistence is preferred). Justify any deviation in the implementing PR (bundle size, SSR, team familiarity).

### 3.3 Fallback chain

- Missing key in `ru` or `tr`: fall back to **`en`** string to avoid blank UI during incremental migration.
- Log missing keys in **development only** if the chosen library supports it.

---

## 4. Translation key examples

Use **stable, English, dot-separated** keys. **Do not** encode Russian or Turkish in key names.

Examples:

| Key | Typical usage |
| --- | ------------- |
| `board.title` | Page or board header |
| `board.connected` | Connection status chip |
| `board.disconnected` | Connection lost state |
| `board.addTask` | Primary action button |
| `board.columns.todo` | Column header |
| `board.columns.inProgress` | Column header |
| `board.columns.review` | Column header |
| `board.columns.done` | Column header |
| `auth.logout` | Sign-out control |
| `task.title` | Label for title field |
| `task.description` | Label for description |
| `task.priority` | Priority selector label |
| `task.deadline` | Deadline picker label |
| `notification.taskCreated` | Toast / realtime banner |
| `notification.taskMoved` | Toast / realtime banner |

Extend with namespaces only if needed (`auth.login.submit`, `errors.network`), keeping depth shallow enough for grep-friendly maintenance.

---

## 5. Language selector plan

### 5.1 Placement

- Add a compact control in the **global shell**: header, settings menu, or profile dropdown—whichever matches existing layout with minimal visual churn.
- Labels shown in the menu use **endonym** spelling: **English**, **Русский**, **Türkçe**.

### 5.2 Behaviour

- Selecting a locale calls `i18next.changeLanguage(code)` (or equivalent) and persists `en` | `ru` | `tr`.
- Realtime hooks (WebSocket listeners, query caches) **must not** unsubscribe or reset board state on language switch; only **presentation strings** change.

### 5.3 Accessibility

- Expose `aria-label` on the selector via translated strings.
- Preserve keyboard operability if the control is a custom component.

---

## 6. Persistence

| Mechanism | Recommendation |
| --------- | --------------- |
| **Primary** | `localStorage` key such as `locale` or `i18nextLng` aligned with library conventions |
| **Scope** | Device-local; document that multi-device sync is out of scope unless user accounts store preference server-side later |
| **Hydration** | On app bootstrap, read storage **before** first paint of static chrome if possible to avoid flash-of-wrong-language |

If a future SSR layer is introduced, revisit storage vs cookie; current Vite SPA likely uses `localStorage` only.

---

## 7. Rules for implementation

| Rule | Detail |
| ---- | ------ |
| **No hardcoded UI text** | Strings visible to users go through the translation function / component. |
| **No mixed languages in one component** | A single active locale applies; dynamic interpolation uses parameters, not bilingual literals. |
| **Do not translate internal code names** | Types, enums in code, routes, and API field names stay English. |
| **Do not rename identifiers to Russian or Turkish** | Variables, functions, files, folders remain English per project standards. |
| **Translations live in locale files** | `en.json`, `ru.json`, `tr.json`—not scattered constants. |
| **No code comments** unless the stakeholder explicitly requests them. |
| **No unrelated UI redesign** | Typography and layout changes only where required for text length or overflow. |
| **Preserve realtime** | Language changes must not tear down sockets or lose optimistic updates. |
| **Preserve Kanban** | Drag-and-drop, ordering, and mutations behave identically across locales. |

### 7.1 Migrating Portuguese strings

- Inventory Portuguese literals.
- Replace each with a **key** and supply **English**, **Russian**, and **Turkish** values; treat English as the authoring reference.
- Remove Portuguese from default resources once parity is verified.

### 7.2 Backend-originated messages

- If API returns human-readable errors, prefer **stable error codes** and map them to translated strings on the client. Avoid breaking contracts; coordinate any payload change with gateway and services.

---

## 8. Step-by-step future implementation checklist

Copy this list into the task tracker when execution begins; mark items as work completes.

- [ ] Inspect project structure (`apps/web/src`, routing, layout shell)
- [ ] Detect framework stack and any existing i18n hooks or dependencies
- [ ] Find all hardcoded UI texts (including Portuguese) via search and manual sweep
- [ ] Create translation file structure under `apps/web/src/i18n/` (or adapted path)
- [ ] Add English translations (complete key set for targeted screens)
- [ ] Add Russian translations (parity with English keys)
- [ ] Add Turkish translations (parity with English keys)
- [ ] Replace hardcoded texts with translation lookups / components
- [ ] Add language selector (`English`, `Русский`, `Türkçe`)
- [ ] Save selected language locally and restore on load
- [ ] Test all primary pages and flows
- [ ] Test real-time board behaviour after language switches (no regression)

---

## 9. Testing checklist

Perform these **manual** passes after implementation (desktop; repeat spot-check on mobile viewport if supported).

| # | Test |
| - | ---- |
| 1 | Switch **English → Russian**; verify all touched screens update |
| 2 | Switch **Russian → Turkish**; verify consistent coverage |
| 3 | **Refresh** the page; verify **saved language** restores |
| 4 | **Create task**; labels, buttons, validation, success feedback translated |
| 5 | **Move task** across columns; headers and tooltips remain correct |
| 6 | **Delete task**; confirmations and empty states translated |
| 7 | Trigger **notifications** (create/move); titles and bodies localized |
| 8 | Open **empty board** state; copy is translated and layout intact |
| 9 | **Login / logout** flows; all visible strings localized |
|10 | **Column names** reflect locale (including any custom columns once supported) |

Regression focus:

- Websocket reconnect still shows `board.connected` / `board.disconnected` appropriately.
- Long strings (especially Russian) do not clip critical controls.

---

## Deliverable note

This file is documentation only. Implementation PRs should reference it, update `README.md` with **how to add a new key**, and keep diffs small per `PROJECT_RULES.md`.

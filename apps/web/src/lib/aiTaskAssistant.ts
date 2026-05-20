import type { TaskPriority } from "@challenge/types";
import type { TaskChecklistItem } from "@challenge/types";

export interface AiTaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  deadlineLocal: string;
  checklist: TaskChecklistItem[];
  language: "ru" | "en";
}

interface DeadlineHints {
  isUrgent: boolean;
  isHigh: boolean;
  tomorrowHour: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toLocalDateTimeString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function tomorrowAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return toLocalDateTimeString(d);
}

function makeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as Crypto).randomUUID === "function"
  ) {
    return (crypto as Crypto).randomUUID();
  }
  return `cl-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function toChecklist(items: string[]): TaskChecklistItem[] {
  return items
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => ({ id: makeId(), title, completed: false }));
}

function detectLanguage(input: string): "ru" | "en" {
  return /[\u0400-\u04FF]/.test(input) ? "ru" : "en";
}

function detectKeywords(lower: string): {
  dishes: boolean;
  presentation: boolean;
  auth: boolean;
  meeting: boolean;
  release: boolean;
  test: boolean;
} {
  return {
    dishes:
      /wash.*dish|dishes|посуд|помыть посуд|вымыть посуд|помой посуд/.test(lower),
    presentation:
      /presentation|демо|демонстрац|презентац|slide|слайд/.test(lower),
    auth:
      /\bauth\b|authentication|авториз|аутентифик|jwt|login|логин|вход|регистраци|register/.test(
        lower,
      ),
    meeting: /\bmeet(ing)?\b|встреч|совещан/.test(lower),
    release: /release|релиз|deploy|деплой|выпуск/.test(lower),
    test: /\btest(ing)?\b|тест|проверк/.test(lower),
  };
}

function detectDeadlineHints(lower: string): DeadlineHints {
  const isUrgent =
    /urgent|critical|asap|now|immediately|срочно|немедленно|критич/.test(lower);
  const isHigh =
    /tomorrow|завтра|today|сегодня|deadline|дедлайн|до конца дня|by tomorrow/.test(
      lower,
    );
  const hour =
    /demo|демо|presentation|презентац|вечером|evening|tonight/.test(lower)
      ? 20
      : 18;
  return { isUrgent, isHigh, tomorrowHour: hour };
}

function titleFromInput(input: string, lang: "ru" | "en"): string {
  const cleaned = input
    .replace(/^[\s\-•\d.\)]+/g, "")
    .replace(/[\.!?…]+$/g, "")
    .trim();
  const firstSentence =
    cleaned.split(/[.!?\n]/).find((part) => part.trim().length > 0) ?? cleaned;
  const trimmed = firstSentence.trim();
  if (!trimmed) {
    return lang === "ru" ? "Новая задача" : "New task";
  }
  if (lang === "ru") {
    const withoutPrefix = trimmed.replace(
      /^(нужно|надо|сделать|необходимо|требуется|please|please,?)\s+/i,
      "",
    );
    const finalText = withoutPrefix || trimmed;
    return finalText.charAt(0).toUpperCase() + finalText.slice(1);
  }
  const withoutPrefix = trimmed.replace(
    /^(you need to|i need to|please|we should|we need to|need to|todo:)\s+/i,
    "",
  );
  const finalText = withoutPrefix || trimmed;
  return finalText.charAt(0).toUpperCase() + finalText.slice(1);
}

function genericDescription(input: string, lang: "ru" | "en"): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (lang === "ru") {
    return `Описание задачи на основе запроса: «${trimmed}». Уточните цели, ожидаемый результат и ответственного перед стартом работы.`;
  }
  return `Task draft based on the request: "${trimmed}". Refine goals, expected outcome, and ownership before starting.`;
}

function genericChecklist(lang: "ru" | "en"): TaskChecklistItem[] {
  if (lang === "ru") {
    return toChecklist([
      "Проанализировать требования",
      "Подготовить реализацию",
      "Выполнить основную работу",
      "Проверить результат",
      "Сообщить о завершении",
    ]);
  }
  return toChecklist([
    "Analyze the requirement",
    "Prepare implementation",
    "Complete the main work",
    "Test the result",
    "Report completion",
  ]);
}

export function generateAiTaskDraft(rawInput: string): AiTaskDraft {
  const input = (rawInput ?? "").trim();
  const lang = detectLanguage(input);
  const lower = input.toLowerCase();
  const hints = detectDeadlineHints(lower);
  const keywords = detectKeywords(lower);

  if (!input) {
    return {
      title: lang === "ru" ? "Новая задача" : "New task",
      description:
        lang === "ru"
          ? "Пустой запрос. Уточните задачу, и помощник подготовит черновик."
          : "Empty prompt. Provide a short description so the assistant can prepare a draft.",
      priority: "MEDIUM" as TaskPriority,
      deadlineLocal: tomorrowAt(18),
      checklist: genericChecklist(lang),
      language: lang,
    };
  }

  if (keywords.dishes) {
    return {
      title: "Wash the dishes",
      description:
        "Clean all used dishes, organize the kitchen area, and make sure everything is ready for the next use.",
      priority: "MEDIUM" as TaskPriority,
      deadlineLocal: tomorrowAt(18),
      checklist: toChecklist([
        "Collect all dirty dishes",
        "Wash plates, glasses, and cutlery",
        "Dry or place dishes in the drying area",
        "Wipe the sink and kitchen surface",
        "Confirm the kitchen is clean",
      ]),
      language: lang,
    };
  }

  if (keywords.presentation && lang === "ru") {
    return {
      title: "Подготовить презентацию к демо",
      description:
        "Подготовить финальную презентацию проекта для демонстрации: структура, слайды, архитектура, функциональность и ключевые преимущества.",
      priority: "HIGH" as TaskPriority,
      deadlineLocal: tomorrowAt(20),
      checklist: toChecklist([
        "Проверить структуру презентации",
        "Добавить слайд с архитектурой",
        "Добавить слайд с интерфейсом приложения",
        "Проверить текст и визуальный стиль",
        "Подготовить короткий сценарий выступления",
      ]),
      language: lang,
    };
  }

  if (keywords.presentation) {
    return {
      title: "Prepare the demo presentation",
      description:
        "Prepare the final project presentation for the demo: structure, slides, architecture, functionality, and key strengths.",
      priority: "HIGH" as TaskPriority,
      deadlineLocal: tomorrowAt(20),
      checklist: toChecklist([
        "Review the presentation outline",
        "Add the architecture slide",
        "Add the product UI slide",
        "Polish copy and visual style",
        "Prepare a short speaking script",
      ]),
      language: lang,
    };
  }

  if (keywords.auth) {
    if (lang === "ru") {
      return {
        title: "Исправить ошибку авторизации",
        description:
          "Разобраться и исправить ошибку авторизации, проверить вход и регистрацию, убедиться, что доступ по ролям работает корректно.",
        priority: "HIGH" as TaskPriority,
        deadlineLocal: tomorrowAt(18),
        checklist: toChecklist([
          "Воспроизвести ошибку авторизации",
          "Посмотреть логи auth-service",
          "Проверить JWT и обработку ролей",
          "Исправить проблему",
          "Проверить вход, регистрацию и доступ администратора",
        ]),
        language: lang,
      };
    }
    return {
      title: "Fix auth bug",
      description:
        "Investigate and fix the authentication bug, verify login/register flow, and confirm that role-based access still works correctly.",
      priority: "HIGH" as TaskPriority,
      deadlineLocal: tomorrowAt(18),
      checklist: toChecklist([
        "Reproduce the authentication bug",
        "Check auth-service logs",
        "Verify JWT and role handling",
        "Fix the issue",
        "Test login, register, and admin access",
      ]),
      language: lang,
    };
  }

  const priority: TaskPriority = (
    hints.isUrgent ? "URGENT" : hints.isHigh ? "HIGH" : "MEDIUM"
  ) as TaskPriority;

  return {
    title: titleFromInput(input, lang),
    description: genericDescription(input, lang),
    priority,
    deadlineLocal: tomorrowAt(hints.tomorrowHour),
    checklist: genericChecklist(lang),
    language: lang,
  };
}

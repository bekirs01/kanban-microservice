import type { TranslateFn } from "@/i18n/types";
import { TASKS_QUERY_ROOT } from "@/hooks/useTasks";
import { useTranslation } from "@/i18n/useTranslation";
import { authService } from "@/services/auth.service";
import type { ResponseNotificationDto } from "@challenge/types";
import type { Query } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

const SOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || "http://localhost:3004";
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
const BOARD_SYNC_DEBOUNCE_MS = 200;

function isTaskRelatedQuery(query: Query) {
  const key = query.queryKey;
  return (
    Array.isArray(key) &&
    key.length > 0 &&
    (key[0] === TASKS_QUERY_ROOT || key[0] === "task")
  );
}

export function useWebSocket() {
  const { t } = useTranslation();
  const tRef = useRef<TranslateFn>(t);
  tRef.current = t;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const boardSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const getStoredUserId = (): string | null => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: string };
      return parsed?.id ?? null;
    } catch {
      return null;
    }
  };

  const shouldMuteToastForActor = (actorId?: string) =>
    !!(actorId && getStoredUserId() === actorId);

  const scheduleBoardSync = () => {
    if (boardSyncTimerRef.current) {
      clearTimeout(boardSyncTimerRef.current);
    }
    boardSyncTimerRef.current = setTimeout(() => {
      boardSyncTimerRef.current = null;
      void queryClient
        .invalidateQueries({ predicate: isTaskRelatedQuery })
        .then(() => {
          void queryClient.refetchQueries({
            type: "active",
            predicate: isTaskRelatedQuery,
          });
        });
    }, BOARD_SYNC_DEBOUNCE_MS);
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    socketRef.current = io(SOCKET_URL, {
      auth: {
        token,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      transports: ["websocket"],
      reconnection: false,
    });

    socketRef.current.on("connect", () => {
      setIsConnected(true);
      setReconnectAttempts(0);
      reconnectAttemptsRef.current = 0;

      toast.success(tRef.current("notification.connected"), {
        duration: 2000,
      });
    });

    socketRef.current.on("disconnect", (reason: string) => {
      setIsConnected(false);

      if (reason === "io server disconnect" || reason === "auth_error") {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          setReconnectAttempts(reconnectAttemptsRef.current);

          reconnectTimeoutRef.current = setTimeout(() => {
            refreshTokenAndRetry();
          }, RECONNECT_DELAY);
        } else {
          toast.error(tRef.current("notification.reconnectFail"));
          navigate({ to: "/login" });
        }
      } else if (
        reason !== "io client namespace disconnect" &&
        reason !== "client namespace disconnect"
      ) {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          setReconnectAttempts(reconnectAttemptsRef.current);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, RECONNECT_DELAY);
        } else {
          toast.error(tRef.current("notification.lostConnection"));
        }
      }
    });

    socketRef.current.on(
      "connect_error",
      (error: Error & { data?: { message: string } }) => {
        console.error("WebSocket connection error:", error);

        if (
          error.message === "Authentication error" ||
          error.data?.message === "Invalid token"
        ) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1;
            setReconnectAttempts(reconnectAttemptsRef.current);

            reconnectTimeoutRef.current = setTimeout(() => {
              refreshTokenAndRetry();
            }, RECONNECT_DELAY);
          } else {
            toast.error(tRef.current("notification.authFail"));
            navigate({ to: "/login" });
          }
        }
      },
    );

    socketRef.current.on("board:changed", () => {
      scheduleBoardSync();
    });

    socketRef.current.on("task:moved", () => {
      scheduleBoardSync();
    });

    socketRef.current.on("task:created", (data: ResponseNotificationDto) => {
      scheduleBoardSync();
      if (!shouldMuteToastForActor(data.actorId)) {
        toast.success(tRef.current("notification.taskCreated"), {
          description: data.content,
        });
      }
    });

    socketRef.current.on("task:updated", (data: ResponseNotificationDto) => {
      scheduleBoardSync();
      if (!shouldMuteToastForActor(data.actorId)) {
        toast.info(tRef.current("notification.taskUpdated"), {
          description: data.content,
        });
      }
    });

    socketRef.current.on("task:deleted", (data: ResponseNotificationDto) => {
      scheduleBoardSync();
      if (!shouldMuteToastForActor(data.actorId)) {
        toast.info(tRef.current("notification.taskDeleted"), {
          description: data.content,
        });
      }
    });

    socketRef.current.on("task:assigned", (data: ResponseNotificationDto) => {
      scheduleBoardSync();
      if (!shouldMuteToastForActor(data.actorId)) {
        toast.info(tRef.current("notification.taskAssigned"), {
          description: data.content,
        });
      }
    });

    socketRef.current.on("comment:new", (data: ResponseNotificationDto) => {
      scheduleBoardSync();
      if (!shouldMuteToastForActor(data.actorId)) {
        toast.info(tRef.current("notification.commentAdded"), {
          description: data.content,
        });
      }
      try {
        queryClient.invalidateQueries({ queryKey: ["taskHistory"] });
      } catch (e) {
        queryClient.invalidateQueries();
      }
    });
  };

  const refreshTokenAndRetry = async () => {
    try {
      await authService.refreshToken();

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      connectWebSocket();
    } catch (error) {
      console.error("Failed to refresh session token:", error);
      toast.error(tRef.current("notification.sessionExpired"));
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      navigate({ to: "/login" });
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (boardSyncTimerRef.current) {
        clearTimeout(boardSyncTimerRef.current);
        boardSyncTimerRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    reconnectAttempts,
  };
}

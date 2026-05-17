import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export type RealtimeContextValue = {
  isConnected: boolean;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
});

export function RealtimeProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: RealtimeContextValue;
}) {
  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}

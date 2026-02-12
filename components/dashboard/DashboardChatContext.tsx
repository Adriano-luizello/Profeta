"use client";

import { createContext, useContext } from "react";

export type TriggerChatFn = (prompt: string) => void;

const DashboardChatContext = createContext<TriggerChatFn | null>(null);

export function DashboardChatProvider({
  children,
  triggerChat,
}: {
  children: React.ReactNode;
  triggerChat: TriggerChatFn;
}) {
  return (
    <DashboardChatContext.Provider value={triggerChat}>
      {children}
    </DashboardChatContext.Provider>
  );
}

export function useDashboardChat() {
  return useContext(DashboardChatContext);
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  TrendingUp,
  ShoppingCart,
  PackageX,
  Target,
  Upload,
  Settings,
  LogOut,
  Bot,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { DashboardChatProvider } from "./DashboardChatContext";
import { ProfetaLogo } from "@/components/profeta";
import { cn } from "@/lib/utils";

type NavItemPage = {
  type: "page";
  href: string;
  icon: LucideIcon;
  label: string;
};
type NavItemChat = {
  type: "chat";
  icon: LucideIcon;
  label: string;
  prompt: string;
  badge?: number | null;
};

type NavItem = NavItemPage | NavItemChat;

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      {
        type: "page",
        href: "/dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
      },
      {
        type: "chat",
        icon: Link2,
        label: "Supply Chain",
        badge: null,
        prompt:
          "Mostre a análise completa de supply chain com reorder points, alertas hierárquicos e projeção de ruptura dos meus produtos.",
      },
      {
        type: "chat",
        icon: TrendingUp,
        label: "Forecast",
        prompt:
          "Mostre o forecast de demanda dos meus produtos para os próximos 90 dias.",
      },
      {
        type: "chat",
        icon: ShoppingCart,
        label: "Vendas",
        prompt:
          "Mostre a análise de vendas: receita total, unidades vendidas e performance por produto.",
      },
    ],
  },
  {
    label: "Análise",
    items: [
      {
        type: "chat",
        icon: PackageX,
        label: "Estoque Parado",
        prompt:
          "Analise meu estoque parado: quais produtos estão sem venda, qual o capital preso e quais devem ser descontinuados?",
      },
      {
        type: "chat",
        icon: Target,
        label: "Pareto 80/20",
        prompt:
          "Mostre a análise Pareto 80/20: quais produtos geram 80% da receita e quais bottom sellers têm capital preso.",
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      { type: "page", href: "/dashboard/upload", icon: Upload, label: "Upload" },
      {
        type: "page",
        href: "/dashboard/settings",
        icon: Settings,
        label: "Configurações",
      },
    ],
  },
];

export interface DashboardShellProps {
  children: React.ReactNode;
  userEmail: string;
  organizationName: string | null;
  plan: string | null;
  produtosEmRisco: number;
  logoutAction: () => Promise<void>;
}

function getInitials(email: string): string {
  const part = email.split("@")[0];
  if (!part) return "?";
  const match = part.match(/^([a-z0-9])/i);
  return match ? match[1].toUpperCase() : "?";
}

export function DashboardShell({
  children,
  userEmail,
  organizationName,
  plan,
  produtosEmRisco,
  logoutAction,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [activeChatPrompt, setActiveChatPrompt] = useState<string | null>(null);

  const navSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.type === "chat" && item.label === "Supply Chain") {
        return { ...item, badge: produtosEmRisco };
      }
      return item;
    }),
  }));

  const handleChatItemClick = (prompt: string) => {
    setChatOpen(true);
    setActiveChatPrompt(prompt);
  };

  const handleChatPromptSent = () => {
    // Keep activeChatPrompt for visual state; parent doesn't need to clear
  };

  const sidebarWidth = sidebarCollapsed ? "w-[72px]" : "w-60";

  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden bg-profeta-bg">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-profeta-border bg-profeta-card transition-[width] duration-200",
          sidebarWidth
        )}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center border-b border-profeta-border px-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 overflow-hidden"
          >
            <ProfetaLogo size={34} />
            {!sidebarCollapsed && (
              <span className="truncate text-base font-bold text-profeta-text-primary">
                Profeta
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-profeta-text-muted">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isPage = item.type === "page";
                  const isActivePage =
                    isPage && pathname === (item as NavItemPage).href;
                  const isActiveChat =
                    !isPage &&
                    activeChatPrompt === (item as NavItemChat).prompt;
                  const isActive = isActivePage || isActiveChat;
                  const badge =
                    !isPage && "badge" in item ? item.badge : undefined;

                  if (isPage) {
                    const pageItem = item as NavItemPage;
                    return (
                      <li key={`${pageItem.href}-${pageItem.label}`}>
                        <Link
                          href={pageItem.href}
                          className={cn(
                            "flex items-center gap-2 rounded-component px-3 py-2.5 text-sm transition-colors",
                            sidebarCollapsed && "justify-center px-2",
                            isActive
                              ? "bg-profeta-green/10 font-medium text-profeta-green"
                              : "text-profeta-text-secondary hover:bg-profeta-elevated hover:text-profeta-text-primary"
                          )}
                          title={sidebarCollapsed ? pageItem.label : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!sidebarCollapsed && pageItem.label}
                        </Link>
                      </li>
                    );
                  }

                  const chatItem = item as NavItemChat;
                  return (
                    <li key={chatItem.prompt}>
                      <button
                        type="button"
                        onClick={() => handleChatItemClick(chatItem.prompt)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-component px-3 py-2.5 text-left text-sm transition-colors",
                          sidebarCollapsed && "justify-center px-2",
                          isActiveChat
                            ? "bg-profeta-green/10 font-medium text-profeta-green"
                            : "text-profeta-text-secondary hover:bg-profeta-elevated hover:text-profeta-text-primary"
                        )}
                        title={sidebarCollapsed ? chatItem.label : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate">
                              {chatItem.label}
                            </span>
                            {badge != null && badge > 0 && (
                              <span className="shrink-0 rounded-full bg-profeta-red px-1.5 py-0.5 text-[10px] font-medium text-white">
                                {badge}
                              </span>
                            )}
                            <Bot
                              className="h-3 w-3 shrink-0 opacity-40"
                              aria-hidden
                            />
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-profeta-border p-2">
          {!sidebarCollapsed && (
            <div className="mb-2 flex items-center gap-2 px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-profeta-elevated text-xs font-medium text-profeta-text-primary">
                {getInitials(userEmail)}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <p
                  className="truncate text-xs font-medium text-profeta-text-primary"
                  title={organizationName ?? undefined}
                >
                  {organizationName || "Empresa"}
                </p>
                <p className="truncate text-[10px] text-profeta-text-muted">
                  {plan === "pro" || plan === "enterprise"
                    ? `Plano ${plan}`
                    : "Plano free"}
                </p>
              </div>
            </div>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              className={cn(
                "flex w-full items-center gap-2 rounded-component px-3 py-2 text-sm text-profeta-text-secondary transition-colors hover:bg-profeta-elevated hover:text-profeta-text-primary",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? "Sair" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && "Sair"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={cn(
              "flex w-full items-center gap-2 rounded-component px-3 py-2 text-sm text-profeta-text-muted transition-colors hover:bg-profeta-elevated hover:text-profeta-text-primary",
              sidebarCollapsed && "justify-center px-2"
            )}
            title={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            aria-label={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                Recolher
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-h-0 min-w-0 flex-1 overflow-auto">
        <DashboardChatProvider triggerChat={handleChatItemClick}>
          {children}
        </DashboardChatProvider>
      </main>

      {/* Tab vertical fixa na borda direita — abre o chat quando fechado */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => handleChatItemClick("")}
          className="group fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl border border-r-0 border-profeta-border bg-profeta-card px-2 py-4 shadow-lg transition-colors hover:bg-profeta-elevated"
          aria-label="Abrir chat"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-profeta-green/10">
            <Bot size={16} className="text-profeta-green" />
          </div>
          <span
            className="rotate-180 text-[10px] font-semibold tracking-wider text-profeta-text-secondary"
            style={{ writingMode: "vertical-rl" }}
          >
            AI Chat
          </span>
          <span className="h-2 w-2 rounded-full bg-profeta-green animate-dot-pulse" />
        </button>
      )}

      {/* Chat — fixed right, overlay, slide-in */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[380px] transform border-l border-profeta-border bg-profeta-card shadow-xl transition-transform duration-300 ease-in-out",
          chatOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div
          className="flex h-full flex-col"
          style={
            {
              "--background": "#FFFFFF",
              "--foreground": "#212528",
              "--muted": "#F5F5F5",
              "--muted-foreground": "#6B7280",
              "--primary": "#52796A",
              "--primary-foreground": "#FFFFFF",
              "--border": "#E5E5E5",
            } as React.CSSProperties
          }
        >
          <ChatSidebar
            initialPrompt={activeChatPrompt}
            onPromptSent={handleChatPromptSent}
            onClose={() => setChatOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}

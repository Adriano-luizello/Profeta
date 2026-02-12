'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Send, Maximize2, Sparkles, TrendingUp, Package, AlertTriangle, BarChart3, Lightbulb, X } from 'lucide-react'
import { ProfetaLogo } from '@/components/profeta'
import { ChatMessage, type ChatMessageData } from './ChatMessage'

export interface ChatSidebarProps {
  /** Quando definido, envia automaticamente como mensagem do usuário (trigger externo da sidebar) */
  initialPrompt?: string | null
  /** Callback chamado após o prompt ser enviado (para o parent atualizar estado se necessário) */
  onPromptSent?: () => void
  /** Quando definido, exibe botão de fechar no header */
  onClose?: () => void
}

const QUICK_TRIGGERS = [
  { icon: <TrendingUp className="size-3" />, label: 'Previsão', query: 'Qual a previsão de demanda para os próximos 30 dias?' },
  { icon: <AlertTriangle className="size-3" />, label: 'Supply chain', query: 'Mostre análise de supply chain com lead time e MOQ' },
  { icon: <Package className="size-3" />, label: 'Alertas', query: 'O que devo fazer hoje? Quais produtos em risco?' },
  { icon: <BarChart3 className="size-3" />, label: 'Vendas por mês', query: 'Vendas agregadas por mês' },
  { icon: <Lightbulb className="size-3" />, label: 'Ajuda', query: 'O que você pode fazer?' }
]

const INITIAL_MESSAGE: ChatMessageData = {
  id: '0',
  type: 'assistant',
  content: 'Olá! Sou seu assistente de previsão de demanda. Pergunte sobre previsões, supply chain, alertas ou vendas por mês. Use os atalhos ou escreva em linguagem natural.'
}

/** Histórico no formato da API Claude (pass-through para contexto multi-turno) */
export function ChatSidebar({ initialPrompt, onPromptSent, onClose }: ChatSidebarProps = {}) {
  const [messages, setMessages] = useState<ChatMessageData[]>([INITIAL_MESSAGE])
  const [conversationHistory, setConversationHistory] = useState<unknown[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const lastSentPromptRef = useRef<string | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Trigger externo: quando initialPrompt muda, auto-envia como mensagem
  useEffect(() => {
    const prompt = typeof initialPrompt === 'string' ? initialPrompt.trim() : ''
    if (!prompt || prompt === lastSentPromptRef.current) return
    lastSentPromptRef.current = prompt
    send(prompt)
    onPromptSent?.()
  }, [initialPrompt])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const send = async (text: string) => {
    const msg = text.trim()
    if (!msg || loading) return

    const userMsg: ChatMessageData = {
      id: `u-${Date.now()}`,
      type: 'user',
      content: msg
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          conversationHistory,
        }),
      })

      // Tratamento específico para mensagem muito longa (413)
      if (res.status === 413) {
        const data = await res.json()
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            type: 'assistant',
            content: `📏 **Mensagem muito longa**\n\n${data.message || 'Sua mensagem excede o limite de caracteres. Por favor, resuma sua pergunta.'}`,
          },
        ])
        return
      }

      // Tratamento específico para rate limit (429)
      if (res.status === 429) {
        const data = await res.json()
        const retryAfter = res.headers.get('Retry-After')
        const waitMessage = retryAfter
          ? ` Tente novamente em ${retryAfter} segundos.`
          : ''
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            type: 'assistant',
            content: `⏱️ **Limite de uso atingido**\n\n${data.message || 'Você atingiu o limite de mensagens.'}${waitMessage}`,
          },
        ])
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao processar')

      if (Array.isArray(data.conversationHistory)) {
        setConversationHistory(data.conversationHistory)
      }

      const assistantMsg: ChatMessageData = {
        id: `a-${Date.now()}`,
        type: 'assistant',
        content: data.content ?? 'Sem resposta.',
      }
      if (data.chart?.chartType && data.chart?.chartData) {
        assistantMsg.chartType = data.chart.chartType
        assistantMsg.chartData = data.chart.chartData
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Erro ao processar'
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, type: 'assistant', content: `⚠️ ${err}` }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => send(input)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  const handleTrigger = (query: string) => {
    setInput(query)
    setTimeout(() => send(query), 50)
  }

  const toggleOverlay = () => setExpanded((e) => !e)

  const header = (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-profeta-border bg-profeta-card shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <ProfetaLogo size={28} variant="default" />
        <div className="min-w-0">
          <h2 className="font-semibold text-profeta-text-primary text-sm">AI Assistant</h2>
          <p className="flex items-center gap-1 text-xs text-profeta-green">
            <span className="h-1.5 w-1.5 rounded-full bg-profeta-green animate-dot-pulse" />
            Online
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-component p-2 text-profeta-text-muted transition-colors hover:bg-profeta-elevated hover:text-profeta-text-primary"
            aria-label="Fechar chat"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={toggleOverlay}
          className={`shrink-0 rounded-component font-medium transition-colors ${
            expanded
              ? 'flex items-center gap-2 px-3 py-2 bg-profeta-elevated text-profeta-text-primary hover:bg-profeta-border border border-profeta-border'
              : 'p-2 text-profeta-text-muted hover:bg-profeta-elevated hover:text-profeta-text-primary'
          }`}
          aria-label={expanded ? 'Fechar overlay' : 'Expandir tela cheia'}
        >
          {expanded ? (
            <>
              <X className="size-4" />
              <span className="text-sm">Fechar</span>
            </>
          ) : (
            <Maximize2 className="size-4" />
          )}
        </button>
      </div>
    </div>
  )

  const messagesArea = (
    <div className="flex-1 min-h-0 overflow-y-auto bg-profeta-bg p-4 space-y-4">
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      {loading && (
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-component bg-profeta-green shrink-0">
            <Sparkles className="size-4 text-white" />
          </div>
          <div className="rounded-2xl px-4 py-3 bg-profeta-elevated">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-profeta-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-profeta-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-profeta-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )

  const inputArea = (
    <div className="space-y-3 border-t border-profeta-border bg-profeta-card p-4 shrink-0">
      <div className="flex flex-wrap gap-2">
        {QUICK_TRIGGERS.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleTrigger(t.query)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-component border border-profeta-border bg-profeta-elevated px-3 py-1.5 text-xs font-medium text-profeta-text-secondary hover:bg-profeta-border disabled:opacity-50"
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre demanda, estoque, previsões..."
          className="flex-1 rounded-component border border-profeta-border bg-profeta-bg px-4 py-2 text-sm text-profeta-text-primary placeholder-profeta-text-muted focus:outline-none focus:ring-2 focus:ring-profeta-green"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="shrink-0 rounded-component bg-profeta-green p-2 text-white hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-5" />
        </button>
      </div>
    </div>
  )

  if (expanded && typeof document !== 'undefined') {
    return (
      <>
        {createPortal(
          <>
        <div
          className="fixed top-0 bottom-0 left-56 z-40 w-[calc(100vw-14rem)] max-w-[calc(100vw-14rem)] bg-black/30"
          role="presentation"
          aria-hidden
          onClick={() => setExpanded(false)}
        />
        <div className="fixed top-0 bottom-0 left-56 z-50 flex flex-col w-[calc(100vw-14rem)] max-w-[calc(100vw-14rem)] h-screen max-h-screen min-w-0 overflow-hidden bg-profeta-card shadow-2xl">
              {header}
              {messagesArea}
              {inputArea}
            </div>
          </>,
          document.body
        )}
        {/* Placeholder para manter o slot no layout */}
        <div className="h-full w-80 shrink-0" aria-hidden />
      </>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-profeta-card">
      {header}
      {messagesArea}
      {inputArea}
    </div>
  )
}

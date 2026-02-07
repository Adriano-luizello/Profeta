'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Send, Maximize2, Minimize2, Sparkles, TrendingUp, Package, AlertTriangle, BarChart3, Lightbulb, X } from 'lucide-react'
import { ChatMessage, type ChatMessageData } from './ChatMessage'

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
export function ChatSidebar() {
  const [messages, setMessages] = useState<ChatMessageData[]>([INITIAL_MESSAGE])
  const [conversationHistory, setConversationHistory] = useState<unknown[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shrink-0">
          <Sparkles className="size-4 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">AI Demand Assistant</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Previsão inteligente</p>
        </div>
      </div>
      <button
        type="button"
        onClick={toggleOverlay}
        className={`shrink-0 rounded-lg font-medium transition-colors ${
          expanded
            ? 'flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 border border-gray-300 dark:border-gray-500'
            : 'p-2 hover:bg-black/5 dark:hover:bg-white/5'
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
  )

  const messagesArea = (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      {loading && (
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Sparkles className="size-4 text-white" />
          </div>
          <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-700">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )

  const inputArea = (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3 shrink-0">
      <div className="flex flex-wrap gap-2">
        {QUICK_TRIGGERS.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleTrigger(t.query)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
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
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="shrink-0 p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 disabled:opacity-50"
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
        <div className="fixed top-0 bottom-0 left-56 z-50 flex flex-col w-[calc(100vw-14rem)] max-w-[calc(100vw-14rem)] h-screen max-h-screen min-w-0 overflow-hidden bg-white dark:bg-gray-800 shadow-2xl">
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
    <div className="h-full flex flex-col w-80 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {header}
      {messagesArea}
      {inputArea}
    </div>
  )
}

'use client'

import { User, Sparkles } from 'lucide-react'
import { ChatChart } from './ChatChart'
import type { ChartType } from '@/lib/analytics/chart-data-generator'

export interface ChatMessageData {
  id: string
  type: 'user' | 'assistant'
  content: string
  chartType?: ChartType
  chartData?: Record<string, unknown>[] | unknown[]
}

interface ChatMessageProps {
  message: ChatMessageData
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`shrink-0 rounded-component p-2 ${
          isUser ? 'bg-profeta-green/20 text-profeta-green' : 'bg-profeta-green text-white'
        }`}
      >
        {isUser ? (
          <User className="size-4" />
        ) : (
          <Sparkles className="size-4" />
        )}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 max-w-[85%] ${
            isUser
              ? 'bg-profeta-green text-white'
              : 'bg-profeta-bg text-profeta-text-primary'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          {message.chartData && message.chartType && (
            <ChatChart chartType={message.chartType} chartData={message.chartData} />
          )}
        </div>
      </div>
    </div>
  )
}

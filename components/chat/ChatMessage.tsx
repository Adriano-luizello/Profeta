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
        className={`shrink-0 p-2 rounded-lg ${
          isUser ? 'bg-gray-200 dark:bg-gray-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'
        }`}
      >
        {isUser ? (
          <User className="size-4 text-gray-700 dark:text-gray-200" />
        ) : (
          <Sparkles className="size-4 text-white" />
        )}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 max-w-[85%] ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
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

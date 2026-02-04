import { User, Sparkles } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chartData?: any;
  chartType?: 'line' | 'bar' | 'pie' | 'table' | 'forecast';
}

interface ChatMessageProps {
  message: Message;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`p-2 rounded-lg flex-shrink-0 ${
          isUser ? 'bg-gray-200' : 'bg-gradient-to-br from-blue-500 to-purple-600'
        }`}
      >
        {isUser ? (
          <User className="size-4 text-gray-700" />
        ) : (
          <Sparkles className="size-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 max-w-[85%] ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

          {/* Chart Visualization */}
          {message.chartData && message.chartType && (
            <div className="mt-4 bg-white rounded-lg p-4">
              {message.chartType === 'forecast' && (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={message.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stroke="none"
                      fill="#8b5cf6"
                      fillOpacity={0.1}
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stroke="none"
                      fill="#ffffff"
                      fillOpacity={1}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Real"
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      name="Previsão"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {message.chartType === 'line' && (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={message.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {message.chartType === 'bar' && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={message.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {message.chartType === 'pie' && (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={message.chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {message.chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {message.chartType === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {Object.keys(message.chartData[0]).map((key) => (
                          <th key={key} className="text-left py-2 px-3 font-semibold text-gray-700 capitalize">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {message.chartData.map((row: any, index: number) => (
                        <tr key={index} className="border-b last:border-b-0 border-gray-100">
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td key={cellIndex} className="py-2 px-3 text-gray-600">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <p className="text-xs opacity-70 mt-2">
            {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}
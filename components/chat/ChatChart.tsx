'use client'

import { useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import type { ChartType } from '@/lib/analytics/chart-data-generator'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
)

interface ChatChartProps {
  chartType: ChartType
  chartData: Record<string, unknown>[] | unknown[]
}

async function exportPng(el: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(el, { scale: 2, useCORS: true })
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = `profeta-chart-${Date.now()}.png`
  a.click()
}

async function exportPdf(el: HTMLElement) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ])
  const canvas = await html2canvas(el, { scale: 2, useCORS: true })
  const img = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const w = pdf.internal.pageSize.getWidth()
  const h = pdf.internal.pageSize.getHeight()
  pdf.addImage(img, 'PNG', 0, 0, w, h)
  pdf.save(`profeta-chart-${Date.now()}.pdf`)
}

export function ChatChart({ chartType, chartData }: ChatChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const rows = chartData as Record<string, unknown>[]
  if (!rows?.length) return null

  const handleExport = async (mode: 'png' | 'pdf') => {
    if (!containerRef.current || exporting) return
    setExporting(true)
    try {
      if (mode === 'png') await exportPng(containerRef.current)
      else await exportPdf(containerRef.current)
    } finally {
      setExporting(false)
    }
  }

  if (chartType === 'table') {
    const keys = Object.keys(rows[0])
    return (
      <div className="mt-3 space-y-2">
        <div ref={containerRef} className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                {keys.map((k) => (
                  <th key={k} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  {keys.map((k) => (
                    <td key={k} className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {String(row[k] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExport('png')}
            disabled={exporting}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Exportar PNG
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Exportar PDF
          </button>
        </div>
      </div>
    )
  }

  if (chartType === 'forecast') {
    const labels = rows.map((r) => String(r.date))
    const actual = rows.map((r) => (r.actual != null ? Number(r.actual) : null))
    const forecast = rows.map((r) => (r.forecast != null ? Number(r.forecast) : null))
    const data = {
      labels,
      datasets: [
        {
          label: 'Vendas reais',
          data: actual,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Previsão',
          data: forecast,
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.05)',
          borderDash: [5, 5],
          fill: true,
          tension: 0.3
        }
      ]
    }
    return (
      <div className="mt-3 space-y-2">
        <div ref={containerRef} className="h-[220px]">
          <Line
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'top' } },
              scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
            }}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExport('png')}
            disabled={exporting}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Exportar PNG
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Exportar PDF
          </button>
        </div>
      </div>
    )
  }

  if (chartType === 'line') {
    const labels = rows.map((r) => String(r.month))
    const values = rows.map((r) => Number(r.value))
    const data = {
      labels,
      datasets: [
        {
          label: 'Vendas',
          data: values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    }
    return (
      <div className="mt-3 space-y-2">
        <div ref={containerRef} className="h-[200px]">
          <Line
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
            }}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExport('png')}
            disabled={exporting}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Exportar PNG
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Exportar PDF
          </button>
        </div>
      </div>
    )
  }

  return null
}

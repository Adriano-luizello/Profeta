'use client'

import { useState, useEffect, useCallback } from 'react'

interface Supplier {
  id: string
  name: string
  lead_time_days: number
  moq: number
  notes: string | null
  created_at: string
}

export function SuppliersSettings() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', lead_time_days: 30, moq: 100, notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Supplier>>({})

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/suppliers')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar')
      setSuppliers(data.suppliers ?? [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar fornecedores'
      setError(msg + ' Se a migration 004 (suppliers) não foi rodada, execute-a no Supabase.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          lead_time_days: form.lead_time_days,
          moq: form.moq,
          notes: form.notes.trim() || undefined
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar')
      setForm({ name: '', lead_time_days: 30, moq: 100, notes: '' })
      await fetchSuppliers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar fornecedor')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editForm.name?.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar')
      setEditingId(null)
      setEditForm({})
      await fetchSuppliers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este fornecedor?')) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao remover')
      await fetchSuppliers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#fornecedores') {
      document.getElementById('fornecedores')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return (
    <div id="fornecedores" className="space-y-6 scroll-mt-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Fornecedores
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Lead time e MOQ por fornecedor. Use em produtos para a tabela Supply Chain.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex.: Fornecedor BR"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            required
          />
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead time (d)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={form.lead_time_days}
            onChange={(e) => setForm((f) => ({ ...f, lead_time_days: Math.max(1, parseInt(e.target.value, 10) || 30) }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">MOQ (un)</label>
          <input
            type="number"
            min={0}
            value={form.moq}
            onChange={(e) => setForm((f) => ({ ...f, moq: Math.max(0, parseInt(e.target.value, 10) || 100) }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Opcional"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !form.name.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Salvando…' : 'Adicionar'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando fornecedores…</p>
      ) : suppliers.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum fornecedor. Adicione um acima.</p>
      ) : (
        <ul className="space-y-2">
          {suppliers.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {editingId === s.id ? (
                <>
                  <input
                    type="text"
                    value={editForm.name ?? s.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="flex-1 min-w-[120px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={editForm.lead_time_days ?? s.lead_time_days}
                    onChange={(e) => setEditForm((f) => ({ ...f, lead_time_days: parseInt(e.target.value, 10) || 30 }))}
                    className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={editForm.moq ?? s.moq}
                    onChange={(e) => setEditForm((f) => ({ ...f, moq: parseInt(e.target.value, 10) || 100 }))}
                    className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(s.id)}
                    disabled={submitting}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setEditForm({}) }}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{s.lead_time_days}d</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">MOQ {s.moq}</span>
                  {s.notes && <span className="text-sm text-gray-400 truncate max-w-[200px]" title={s.notes}>{s.notes}</span>}
                  <button
                    type="button"
                    onClick={() => { setEditingId(s.id); setEditForm({ name: s.name, lead_time_days: s.lead_time_days, moq: s.moq }) }}
                    disabled={submitting}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 ml-auto"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    disabled={submitting}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    Remover
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

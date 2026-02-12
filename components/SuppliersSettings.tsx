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
        <h2 className="mb-1 text-lg font-semibold text-profeta-text-primary">
          Fornecedores
        </h2>
        <p className="text-sm text-profeta-text-secondary">
          Lead time e MOQ por fornecedor. Use em produtos para a tabela Supply
          Chain.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-profeta-border bg-profeta-surface p-4"
      >
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-sm font-medium text-profeta-text-secondary">
            Nome
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex.: Fornecedor BR"
            className="w-full rounded-xl border border-profeta-border bg-white px-4 py-2.5 text-sm text-profeta-text-primary placeholder:text-profeta-text-muted focus:border-profeta-green focus:outline-none focus:ring-2 focus:ring-profeta-green/20"
            required
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-sm font-medium text-profeta-text-secondary">
            Lead time (d)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={form.lead_time_days}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                lead_time_days: Math.max(1, parseInt(e.target.value, 10) || 30),
              }))
            }
            className="w-full rounded-xl border border-profeta-border bg-white px-4 py-2.5 text-sm text-profeta-text-primary focus:border-profeta-green focus:outline-none focus:ring-2 focus:ring-profeta-green/20"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-sm font-medium text-profeta-text-secondary">
            MOQ (un)
          </label>
          <input
            type="number"
            min={0}
            value={form.moq}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                moq: Math.max(0, parseInt(e.target.value, 10) || 100),
              }))
            }
            className="w-full rounded-xl border border-profeta-border bg-white px-4 py-2.5 text-sm text-profeta-text-primary focus:border-profeta-green focus:outline-none focus:ring-2 focus:ring-profeta-green/20"
          />
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-sm font-medium text-profeta-text-secondary">
            Notas
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Opcional"
            className="w-full rounded-xl border border-profeta-border bg-white px-4 py-2.5 text-sm text-profeta-text-primary placeholder:text-profeta-text-muted focus:border-profeta-green focus:outline-none focus:ring-2 focus:ring-profeta-green/20"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !form.name.trim()}
          className="rounded-xl bg-profeta-green px-6 py-2.5 font-medium text-white transition-colors hover:bg-profeta-green/90 disabled:opacity-50"
        >
          {submitting ? "Salvando…" : "Adicionar"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-profeta-text-secondary">
          Carregando fornecedores…
        </p>
      ) : suppliers.length === 0 ? (
        <p className="text-sm text-profeta-text-secondary">
          Nenhum fornecedor. Adicione um acima.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-profeta-border bg-profeta-card">
          <ul className="divide-y divide-profeta-border">
            {suppliers.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-profeta-surface/50"
              >
                {editingId === s.id ? (
                  <>
                    <input
                      type="text"
                      value={editForm.name ?? s.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="min-w-[120px] flex-1 rounded-xl border border-profeta-border bg-white px-4 py-2.5 text-sm text-profeta-text-primary focus:border-profeta-green focus:outline-none focus:ring-2 focus:ring-profeta-green/20"
                    />
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={editForm.lead_time_days ?? s.lead_time_days}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          lead_time_days:
                            parseInt(e.target.value, 10) || 30,
                        }))
                      }
                      className="w-20 rounded-xl border border-profeta-border bg-white px-4 py-2.5 text-sm text-profeta-text-primary focus:border-profeta-green focus:outline-none focus:ring-2 focus:ring-profeta-green/20"
                    />
                    <input
                      type="number"
                      min={0}
                      value={editForm.moq ?? s.moq}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          moq: parseInt(e.target.value, 10) || 100,
                        }))
                      }
                      className="w-20 rounded-xl border border-profeta-border bg-white px-4 py-2.5 text-sm text-profeta-text-primary focus:border-profeta-green focus:outline-none focus:ring-2 focus:ring-profeta-green/20"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(s.id)}
                      disabled={submitting}
                      className="text-sm font-medium text-profeta-green hover:underline disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditForm({});
                      }}
                      className="rounded-xl border border-profeta-border px-4 py-2.5 text-sm font-medium text-profeta-text-secondary transition-colors hover:bg-profeta-surface"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-profeta-text-primary">
                      {s.name}
                    </span>
                    <span className="text-sm text-profeta-text-secondary">
                      {s.lead_time_days}d
                    </span>
                    <span className="text-sm text-profeta-text-secondary">
                      MOQ {s.moq}
                    </span>
                    {s.notes && (
                      <span
                        className="max-w-[200px] truncate text-sm text-profeta-text-muted"
                        title={s.notes}
                      >
                        {s.notes}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(s.id);
                        setEditForm({
                          name: s.name,
                          lead_time_days: s.lead_time_days,
                          moq: s.moq,
                        });
                      }}
                      disabled={submitting}
                      className="ml-auto text-sm font-medium text-profeta-green hover:underline disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      disabled={submitting}
                      className="text-sm font-medium text-profeta-red hover:underline disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

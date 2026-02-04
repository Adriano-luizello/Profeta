'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Supplier {
  id: string
  name: string
}

interface ProductSupplierSelectProps {
  productId: string
  supplierId: string | null
  suppliers: Supplier[]
}

export function ProductSupplierSelect({
  productId,
  supplierId,
  suppliers
}: ProductSupplierSelectProps) {
  const router = useRouter()
  const [value, setValue] = useState(supplierId ?? '')
  const [loading, setLoading] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value
    setValue(next)
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: next || null })
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Erro ao atualizar')
      }
      router.refresh()
    } catch (err) {
      setValue(supplierId ?? '')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={loading}
      className="w-full max-w-[180px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-white disabled:opacity-50"
    >
      <option value="">— Sem fornecedor</option>
      {suppliers.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}

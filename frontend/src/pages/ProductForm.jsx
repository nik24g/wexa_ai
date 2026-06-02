import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, apiError } from '../api/client'
import { Alert, Button, Card, Input, Spinner } from '../components/ui'

const empty = {
  name: '',
  sku: '',
  description: '',
  quantity_on_hand: 0,
  cost_price: '',
  selling_price: '',
  low_stock_threshold: '',
}

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'new'
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    api
      .get(`/products/${id}/`)
      .then((res) => {
        const p = res.data
        setForm({
          name: p.name,
          sku: p.sku,
          description: p.description || '',
          quantity_on_hand: p.quantity_on_hand,
          cost_price: p.cost_price ?? '',
          selling_price: p.selling_price ?? '',
          low_stock_threshold: p.low_stock_threshold ?? '',
        })
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description,
      quantity_on_hand: Number(form.quantity_on_hand) || 0,
      cost_price: form.cost_price === '' ? null : form.cost_price,
      selling_price: form.selling_price === '' ? null : form.selling_price,
      low_stock_threshold:
        form.low_stock_threshold === '' ? null : Number(form.low_stock_threshold),
    }
    try {
      if (isEdit) {
        await api.put(`/products/${id}/`, payload)
      } else {
        await api.post('/products/', payload)
      }
      navigate('/products')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">
        {isEdit ? 'Edit product' : 'Add product'}
      </h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>{error}</Alert>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name *" value={form.name} onChange={update('name')} required />
            <Input label="SKU *" value={form.sku} onChange={update('sku')} required />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={update('description')}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Quantity on hand"
              type="number"
              value={form.quantity_on_hand}
              onChange={update('quantity_on_hand')}
            />
            <Input
              label="Low stock threshold"
              type="number"
              min="0"
              placeholder="Uses org default if empty"
              value={form.low_stock_threshold}
              onChange={update('low_stock_threshold')}
            />
            <Input
              label="Cost price"
              type="number"
              step="0.01"
              value={form.cost_price}
              onChange={update('cost_price')}
            />
            <Input
              label="Selling price"
              type="number"
              step="0.01"
              value={form.selling_price}
              onChange={update('selling_price')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiError } from '../api/client'
import { Alert, Badge, Button, Card, Input, Spinner } from '../components/ui'

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  return `$${Number(value).toFixed(2)}`
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load(searchTerm = '') {
    setLoading(true)
    try {
      const { data } = await api.get('/products/', {
        params: searchTerm ? { search: searchTerm } : {},
      })
      setProducts(data.results ?? data)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function adjust(product, delta) {
    setBusyId(product.id)
    setError('')
    try {
      const { data } = await api.post(`/products/${product.id}/adjust-stock/`, { delta })
      setProducts((list) => list.map((p) => (p.id === data.id ? data : p)))
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setBusyId(product.id)
    try {
      await api.delete(`/products/${product.id}/`)
      setProducts((list) => list.filter((p) => p.id !== product.id))
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link to="/products/new">
          <Button>+ Add product</Button>
        </Link>
      </div>

      <Alert>{error}</Alert>

      <Card>
        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No products yet. Click "Add product" to create your first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Quantity</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-5 py-3 text-slate-600">{p.sku}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          aria-label="Decrease"
                          disabled={busyId === p.id || p.quantity_on_hand === 0}
                          onClick={() => adjust(p, -1)}
                          className="h-6 w-6 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">
                          {p.quantity_on_hand}
                        </span>
                        <button
                          aria-label="Increase"
                          disabled={busyId === p.id}
                          onClick={() => adjust(p, 1)}
                          className="h-6 w-6 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatMoney(p.selling_price)}
                    </td>
                    <td className="px-5 py-3">
                      {p.is_low_stock ? (
                        <Badge tone="red">Low stock</Badge>
                      ) : (
                        <Badge tone="green">In stock</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Link to={`/products/${p.id}`}>
                          <Button variant="secondary" className="px-3 py-1">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="danger"
                          className="px-3 py-1"
                          disabled={busyId === p.id}
                          onClick={() => remove(p)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

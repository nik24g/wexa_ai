import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiError } from '../api/client'
import { Alert, Badge, Card, Spinner } from '../components/ui'

function StatCard({ label, value, accent }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent || 'text-slate-800'}`}>
        {value}
      </p>
    </Card>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/dashboard/')
      .then((res) => setData(res.data))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return <Alert>{error}</Alert>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total products" value={data.total_products} />
        <StatCard label="Total units in stock" value={data.total_quantity} />
        <StatCard
          label="Low stock items"
          value={data.low_stock_count}
          accent={data.low_stock_count > 0 ? 'text-red-600' : 'text-emerald-600'}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Low stock items</h2>
          <Link to="/products" className="text-sm font-medium text-indigo-600 hover:underline">
            View all products
          </Link>
        </div>
        {data.low_stock_items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Nothing is low on stock right now.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Qty on hand</th>
                <th className="px-5 py-3 font-medium">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {data.low_stock_items.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-5 py-3 text-slate-600">{p.sku}</td>
                  <td className="px-5 py-3">
                    <Badge tone="red">{p.quantity_on_hand}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{p.effective_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { api, apiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, Card, Input, Spinner } from '../components/ui'

export default function Settings() {
  const { user, setUser } = useAuth()
  const [threshold, setThreshold] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api
      .get('/settings/')
      .then((res) => setThreshold(String(res.data.default_low_stock_threshold)))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const { data } = await api.patch('/settings/', {
        default_low_stock_threshold: Number(threshold),
      })
      setThreshold(String(data.default_low_stock_threshold))
      setSuccess('Settings saved.')
      if (user?.organization) {
        setUser({
          ...user,
          organization: {
            ...user.organization,
            default_low_stock_threshold: data.default_low_stock_threshold,
          },
        })
      }
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Settings</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>{error}</Alert>
          <Alert tone="success">{success}</Alert>
          <Input
            label="Default low stock threshold"
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500">
            Applied to any product that doesn't set its own threshold. A product is
            flagged as low stock when its quantity on hand is at or below this value.
          </p>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
